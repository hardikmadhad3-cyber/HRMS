/**
 * Phase 4B: Deterministic Server-Side Payroll Calculation Engine
 * Aligned with HRMS Documents 2–6.
 * Consumes:
 * - Effective-dated Employee Compensation & Salary Structure
 * - FINALIZED Phase 3C Time & Leave Snapshot (Authoritative LOP & Overtime)
 */

import {
  PayrollRun,
  PayrollRunEmployee,
  PayrollComponentResult,
  PayrollException,
  PayrollRunStatus,
  PayrollRunEmployeeStatus,
  PayrollExceptionType,
  PayrollExceptionSeverity,
  PayrollCalculationInput,
  PayrollRunSummary,
  ComponentType,
  CalculationBase,
  EmployeeCompensationAssignment,
} from '../../src/types/payroll.js';
import { TimeLeavePeriodSnapshot } from '../../src/types/reconciliation.js';
import { ServiceActor } from './OrganizationService.js';
import { AuditService } from './AuditService.js';
import { RelationalDatabase } from '../database/RelationalDatabase.js';
import { PayrollRunRepository } from '../database/repositories/PayrollRunRepository.js';
import { PayrollRunEmployeeRepository } from '../database/repositories/PayrollRunEmployeeRepository.js';
import { PayrollComponentResultRepository } from '../database/repositories/PayrollComponentResultRepository.js';
import { PayrollExceptionRepository } from '../database/repositories/PayrollExceptionRepository.js';
import { PayrollCalendarRepository } from '../database/repositories/PayrollCalendarRepository.js';
import { EmployeeCompensationRepository } from '../database/repositories/EmployeeCompensationRepository.js';
import { TimeLeavePeriodSnapshotRepository } from '../database/repositories/TimeLeavePeriodSnapshotRepository.js';

export class PayrollCalculationService {
  private static get db() {
    return RelationalDatabase.getInstance();
  }

  /**
   * Helper to parse date strings (YYYY-MM-DD)
   */
  private static getDaysBetween(start: string, end: string): number {
    const d1 = new Date(start);
    const d2 = new Date(end);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * Resolve authoritative Time & Leave Snapshot for a Payroll Period
   */
  public static async resolveFinalizedSnapshot(
    payrollPeriodId: string,
    companyId: string,
    providedSnapshotId?: string
  ): Promise<TimeLeavePeriodSnapshot | null> {
    if (providedSnapshotId) {
      const snap = await TimeLeavePeriodSnapshotRepository.findById(providedSnapshotId, companyId);
      if (snap && (snap.status === 'FINALIZED' || snap.status === 'LOCKED')) {
        return snap;
      }
      return null;
    }

    const period = await PayrollCalendarRepository.findPeriodById(payrollPeriodId, companyId);
    if (!period) return null;

    // 1. Search Time & Leave Snapshots by matching period dates or company snapshots
    const allSnaps = Array.from(this.db.timeLeavePeriodSnapshots.values())
      .filter((s) => s.companyId === companyId && (s.status === 'FINALIZED' || s.status === 'LOCKED'))
      .sort((a, b) => b.version - a.version);

    if (allSnaps.length > 0) {
      // Find snapshot matching period date bounds
      const matching = allSnaps.find((s) => {
        const attPeriod = this.db.attendancePeriods.get(s.periodId);
        if (!attPeriod) return false;
        return (
          (attPeriod.startDate === period.startDate && attPeriod.endDate === period.endDate) ||
          attPeriod.code.includes(period.periodCode) ||
          period.periodCode.includes(attPeriod.code)
        );
      });
      if (matching) return matching;

      // Otherwise return latest finalized snapshot
      return allSnaps[0];
    }

    return null;
  }

  /**
   * INITIATE OR RECALCULATE PAYROLL RUN
   * Transactional, deterministic execution
   */
  public static async calculatePayrollRun(
    companyId: string,
    input: PayrollCalculationInput,
    actor: ServiceActor
  ): Promise<PayrollRunSummary> {
    const { payrollPeriodId, attendanceSnapshotId, notes } = input;

    // 1. Validate Payroll Period
    const period = await PayrollCalendarRepository.findPeriodById(payrollPeriodId, companyId);
    if (!period) {
      throw new Error(`Payroll period '${payrollPeriodId}' not found for company '${companyId}'.`);
    }

    if (period.status === 'CLOSED') {
      throw new Error(`Payroll period '${period.periodCode}' is CLOSED. Cannot run payroll.`);
    }

    // 2. Validate Finalized Time & Leave Snapshot (MANDATORY per Document specifications)
    const snapshot = await this.resolveFinalizedSnapshot(payrollPeriodId, companyId, attendanceSnapshotId);
    if (!snapshot) {
      throw new Error(
        `PAYROLL_BLOCKED: No FINALIZED Time & Leave Snapshot found for period ${period.periodCode}. Payroll requires authoritative finalized attendance.`
      );
    }

    // 3. Find or Create Run Header
    let existingRuns = await PayrollRunRepository.findByPeriodId(payrollPeriodId, companyId);
    let run = existingRuns.find((r) => r.status === PayrollRunStatus.DRAFT || r.status === PayrollRunStatus.CALCULATED);

    const now = new Date().toISOString();
    const runId = run ? run.id : `prun-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const runNumber = run ? run.runNumber : await PayrollRunRepository.getNextRunNumber(payrollPeriodId, companyId);

    // If recalculating existing draft run, clear existing child records first
    if (run) {
      await PayrollRunEmployeeRepository.deleteByRunId(run.id, companyId);
      await PayrollComponentResultRepository.deleteByRunId(run.id, companyId);
      await PayrollExceptionRepository.deleteByRunId(run.id, companyId);
    }

    // 4. Discover eligible employees for calculation
    const allEmployees = Array.from(this.db.employees.values()).filter(
      (e) => e.companyId === companyId && (e.status === 'ACTIVE' || e.status === 'PROBATION' || e.status === 'NOTICE_PERIOD')
    );

    const periodCalendarDays = this.getDaysBetween(period.startDate, period.endDate);

    const calculatedEmployees: PayrollRunEmployee[] = [];
    const calculatedComponentResults: PayrollComponentResult[] = [];
    const exceptions: PayrollException[] = [];

    let totalGrossEarnings = 0;
    let totalGrossDeductions = 0;
    let totalNetPay = 0;
    let totalLopDays = 0;
    let totalOtHours = 0;

    for (const emp of allEmployees) {
      const empResult = await this.calculateEmployeePayroll({
        runId,
        companyId,
        employee: emp,
        period,
        periodCalendarDays,
        snapshot,
        now,
      });

      calculatedEmployees.push(empResult.runEmployee);
      calculatedComponentResults.push(...empResult.componentResults);
      exceptions.push(...empResult.exceptions);

      totalGrossEarnings += empResult.runEmployee.grossEarnings;
      totalGrossDeductions += empResult.runEmployee.grossDeductions;
      totalNetPay += empResult.runEmployee.netPay;
      totalLopDays += empResult.runEmployee.lossOfPayDays;
      totalOtHours += empResult.runEmployee.approvedOtHours;
    }

    // 5. Construct & Save Run Master
    const blockingExceptionsCount = exceptions.filter((e) => e.severity === PayrollExceptionSeverity.BLOCKING).length;

    const savedRun: PayrollRun = {
      id: runId,
      companyId,
      payrollPeriodId,
      attendanceSnapshotId: snapshot.id,
      runNumber,
      runDate: period.payDate || now.substring(0, 10),
      status: blockingExceptionsCount > 0 ? PayrollRunStatus.DRAFT : PayrollRunStatus.CALCULATED,
      totalEmployees: calculatedEmployees.length,
      totalGrossEarnings: Math.round(totalGrossEarnings * 100) / 100,
      totalGrossDeductions: Math.round(totalGrossDeductions * 100) / 100,
      totalNetPay: Math.round(totalNetPay * 100) / 100,
      totalLopDays: Math.round(totalLopDays * 100) / 100,
      totalOtHours: Math.round(totalOtHours * 100) / 100,
      exceptionsCount: exceptions.length,
      calculatedAt: now,
      calculatedBy: actor.id,
      calculatedByName: actor.name,
      notes: notes || `Payroll run #${runNumber} for period ${period.periodName}`,
      createdAt: run ? run.createdAt : now,
      updatedAt: now,
      createdBy: run ? run.createdBy : actor.id,
    };

    // Save batch records atomically
    await PayrollRunRepository.save(savedRun);
    await PayrollRunEmployeeRepository.saveBatch(calculatedEmployees);
    await PayrollComponentResultRepository.saveBatch(calculatedComponentResults);
    await PayrollExceptionRepository.saveBatch(exceptions);

    // Audit Logging
    await AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: run ? 'PAYROLL_RUN_RECALCULATED' : 'PAYROLL_RUN_INITIATED',
      targetModule: 'Payroll',
      targetRecordId: savedRun.id,
      companyId,
      changesSummary: `Executed payroll calculation run #${savedRun.runNumber} for period ${period.periodCode} (${calculatedEmployees.length} employees, Net Pay: $${savedRun.totalNetPay.toLocaleString()}).`,
    });

    return {
      run: savedRun,
      employees: calculatedEmployees,
      exceptions,
      period,
    };
  }

  /**
   * Deterministic Calculation for a Single Employee
   */
  private static async calculateEmployeePayroll(params: {
    runId: string;
    companyId: string;
    employee: any;
    period: any;
    periodCalendarDays: number;
    snapshot: TimeLeavePeriodSnapshot;
    now: string;
  }): Promise<{
    runEmployee: PayrollRunEmployee;
    componentResults: PayrollComponentResult[];
    exceptions: PayrollException[];
  }> {
    const { runId, companyId, employee, period, periodCalendarDays, snapshot, now } = params;

    const runEmpId = `pre-${runId}-${employee.id}`;
    const componentResults: PayrollComponentResult[] = [];
    const exceptions: PayrollException[] = [];

    // 1. Get Effective Compensation Assignment
    const compAssignments = await EmployeeCompensationRepository.findByEmployeeId(employee.id, companyId);
    // Active assignment effective for the period
    const effectiveAssignment = compAssignments.find((a) => {
      const isEffFrom = a.effectiveFrom <= period.endDate;
      const isEffTo = !a.effectiveTo || a.effectiveTo >= period.startDate;
      return isEffFrom && isEffTo && a.status === 'ACTIVE';
    }) || compAssignments.find((a) => a.status === 'ACTIVE') || null;

    if (!effectiveAssignment) {
      const excId = `pexc-${runId}-${employee.id}-nocomp`;
      exceptions.push({
        id: excId,
        companyId,
        payrollRunId: runId,
        payrollRunEmployeeId: runEmpId,
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        employeeCode: employee.employeeCode,
        exceptionType: PayrollExceptionType.MISSING_COMPENSATION,
        severity: PayrollExceptionSeverity.BLOCKING,
        message: `No active compensation assignment found for employee ${employee.employeeCode} in period ${period.periodCode}.`,
        isResolved: false,
        createdAt: now,
      });
    }

    // 2. Get Authoritative Attendance & Leave Metrics from Finalized Snapshot
    const attSummary = snapshot.summaries.find((s) => s.employeeId === employee.id);
    if (!attSummary) {
      const excId = `pexc-${runId}-${employee.id}-noatt`;
      exceptions.push({
        id: excId,
        companyId,
        payrollRunId: runId,
        payrollRunEmployeeId: runEmpId,
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        employeeCode: employee.employeeCode,
        exceptionType: PayrollExceptionType.MISSING_ATTENDANCE_SNAPSHOT,
        severity: PayrollExceptionSeverity.BLOCKING,
        message: `Employee ${employee.employeeCode} is missing from finalized Time & Leave snapshot ${snapshot.id}.`,
        isResolved: false,
        createdAt: now,
      });
    }

    // Extract Attendance Metrics with deterministic defaults
    const presentDays = attSummary?.presentDays ?? 0;
    const paidLeaveDays = attSummary?.paidLeaveDays ?? 0;
    const unpaidLeaveDays = attSummary?.unpaidLeaveDays ?? 0;
    const uncoveredAbsenceDays = attSummary?.uncoveredAbsenceDays ?? 0;
    const lossOfPayDays = attSummary?.lossOfPayDays ?? (unpaidLeaveDays + uncoveredAbsenceDays);
    
    // Check for mid-month joining proration
    let effectivePeriodDays = periodCalendarDays;
    const joiningDate = employee.joiningDate;
    if (joiningDate && joiningDate > period.startDate) {
      // Joined during this period
      const activeDays = this.getDaysBetween(joiningDate, period.endDate);
      effectivePeriodDays = Math.min(periodCalendarDays, Math.max(1, activeDays));
    }

    // Authoritative payable days
    let payableDays = attSummary?.payableDays ?? Math.max(0, effectivePeriodDays - lossOfPayDays);
    if (joiningDate && joiningDate > period.startDate) {
      payableDays = Math.max(0, effectivePeriodDays - lossOfPayDays);
    }

    // Proration Factor (bounded 0.0 to 1.0)
    const prorationFactor = periodCalendarDays > 0 ? Math.min(1.0, Math.max(0.0, payableDays / periodCalendarDays)) : 1.0;

    // Overtime
    const approvedOtMinutes = attSummary?.approvedOvertimeMinutes ?? 0;
    const approvedOtHours = Math.round((approvedOtMinutes / 60) * 100) / 100;

    // 3. Compensation Breakdown Calculation
    const annualCtc = effectiveAssignment?.annualCtc ?? 0;
    const monthlyGross = effectiveAssignment?.monthlyGross ?? Math.round((annualCtc / 12) * 100) / 100;
    const currency = effectiveAssignment?.currency ?? 'USD';

    // OT hourly rate = monthlyGross / (calendarDays * 8)
    const otRatePerHour = periodCalendarDays > 0 ? Math.round((monthlyGross / (periodCalendarDays * 8)) * 100) / 100 : 0;
    const otAmount = approvedOtHours > 0 ? Math.round(approvedOtHours * otRatePerHour * 1.5 * 100) / 100 : 0;

    let baseGrossEarnings = 0;
    let proratedGrossEarnings = 0;
    let grossDeductions = 0;

    const explanationBreakdown: Array<{
      component: string;
      base: string;
      original: number;
      prorated: number;
      formula: string;
    }> = [];

    // Evaluate Structure Components
    if (effectiveAssignment && effectiveAssignment.salaryStructureId) {
      const struct = this.db.salaryStructures.get(effectiveAssignment.salaryStructureId);
      const structComps = Array.from(this.db.salaryStructureComponents.values())
        .filter((sc) => sc.salaryStructureId === effectiveAssignment.salaryStructureId && sc.companyId === companyId)
        .sort((a, b) => a.displayOrder - b.displayOrder);

      const overrides = effectiveAssignment.overrides || [];

      // Pass 1: Calculate Basic Salary first (as base for percentages)
      let unproratedBasic = 0;
      let proratedBasic = 0;

      const basicStructComp = structComps.find((sc) => {
        const c = this.db.salaryComponents.get(sc.salaryComponentId);
        return c?.code === 'BASIC' || c?.name.toLowerCase().includes('basic');
      }) || structComps[0];

      if (basicStructComp) {
        const basicComp = this.db.salaryComponents.get(basicStructComp.salaryComponentId);
        const override = overrides.find((o) => o.salaryComponentId === basicStructComp.salaryComponentId);
        const isOverride = !!override;
        const factor = isOverride ? override.overrideValue : basicStructComp.factorValue;
        const calcType = isOverride ? override.calculationType : basicStructComp.calculationType;

        if (calcType === CalculationBase.PERCENTAGE_OF_CTC) {
          unproratedBasic = Math.round(((annualCtc / 12) * factor) * 100) / 100;
        } else if (calcType === CalculationBase.PERCENTAGE_OF_GROSS) {
          unproratedBasic = Math.round((monthlyGross * factor) * 100) / 100;
        } else if (calcType === CalculationBase.FLAT_AMOUNT) {
          unproratedBasic = factor;
        } else {
          unproratedBasic = Math.round((monthlyGross * 0.5) * 100) / 100;
        }

        const isLop = basicComp ? basicComp.isLopAffected : true;
        proratedBasic = isLop ? Math.round(unproratedBasic * prorationFactor * 100) / 100 : unproratedBasic;
      }

      // Pass 2: Calculate all Components
      for (const sc of structComps) {
        const comp = this.db.salaryComponents.get(sc.salaryComponentId);
        if (!comp) continue;

        const override = overrides.find((o) => o.salaryComponentId === sc.salaryComponentId);
        const isOverride = !!override;
        const factor = isOverride ? override.overrideValue : sc.factorValue;
        const calcType = isOverride ? override.calculationType : sc.calculationType;

        let unproratedAmount = 0;
        let derivationText = '';

        if (comp.code === 'BASIC' || (basicStructComp && sc.id === basicStructComp.id)) {
          unproratedAmount = unproratedBasic;
          derivationText = `${calcType} (${factor}) => $${unproratedAmount.toFixed(2)}`;
        } else if (calcType === CalculationBase.PERCENTAGE_OF_BASIC) {
          unproratedAmount = Math.round(unproratedBasic * factor * 100) / 100;
          derivationText = `${(factor * 100).toFixed(0)}% of Basic ($${unproratedBasic.toFixed(2)}) => $${unproratedAmount.toFixed(2)}`;
        } else if (calcType === CalculationBase.PERCENTAGE_OF_GROSS) {
          unproratedAmount = Math.round(monthlyGross * factor * 100) / 100;
          derivationText = `${(factor * 100).toFixed(0)}% of Monthly Gross ($${monthlyGross.toFixed(2)}) => $${unproratedAmount.toFixed(2)}`;
        } else if (calcType === CalculationBase.PERCENTAGE_OF_CTC) {
          unproratedAmount = Math.round(((annualCtc / 12) * factor) * 100) / 100;
          derivationText = `${(factor * 100).toFixed(0)}% of Monthly CTC ($${(annualCtc / 12).toFixed(2)}) => $${unproratedAmount.toFixed(2)}`;
        } else if (calcType === CalculationBase.FLAT_AMOUNT) {
          unproratedAmount = factor;
          derivationText = `Flat amount ${isOverride ? '(Override)' : ''} => $${unproratedAmount.toFixed(2)}`;
        } else {
          unproratedAmount = factor;
          derivationText = `Custom calculation => $${unproratedAmount.toFixed(2)}`;
        }

        let finalAmount = unproratedAmount;
        let proratedAmount = unproratedAmount;

        if (comp.type === ComponentType.EARNING) {
          if (comp.isLopAffected) {
            proratedAmount = Math.round(unproratedAmount * prorationFactor * 100) / 100;
            finalAmount = proratedAmount;
            derivationText += ` | Prorated: ${payableDays}/${periodCalendarDays} days (${(prorationFactor * 100).toFixed(1)}%) => $${finalAmount.toFixed(2)}`;
          } else {
            finalAmount = unproratedAmount;
            proratedAmount = unproratedAmount;
            derivationText += ` | Non-prorated fixed earning => $${finalAmount.toFixed(2)}`;
          }

          baseGrossEarnings += unproratedAmount;
          proratedGrossEarnings += finalAmount;
        } else if (comp.type === ComponentType.DEDUCTION) {
          // If deduction is statutory percentage of Basic (e.g. PF), compute from earned/prorated basic or unprorated basic
          if (calcType === CalculationBase.PERCENTAGE_OF_BASIC && comp.isLopAffected) {
            proratedAmount = Math.round(proratedBasic * factor * 100) / 100;
            finalAmount = proratedAmount;
            derivationText += ` | Based on earned Basic ($${proratedBasic.toFixed(2)}) => $${finalAmount.toFixed(2)}`;
          } else {
            finalAmount = unproratedAmount;
            proratedAmount = unproratedAmount;
            derivationText += ` | Fixed standard deduction => $${finalAmount.toFixed(2)}`;
          }

          grossDeductions += finalAmount;
        }

        const compResult: PayrollComponentResult = {
          id: `pcr-${runId}-${employee.id}-${comp.id}`,
          companyId,
          payrollRunId: runId,
          payrollRunEmployeeId: runEmpId,
          employeeId: employee.id,
          salaryComponentId: comp.id,
          componentCode: comp.code,
          componentName: comp.name,
          componentType: comp.type,
          componentNature: comp.nature,
          calculationBase: calcType,
          baseAmount: unproratedAmount,
          factorValue: factor,
          isOverride,
          originalAmount: unproratedAmount,
          isLopAffected: comp.isLopAffected,
          proratedAmount,
          finalAmount,
          formulaDerivation: derivationText,
          displayOrder: sc.displayOrder,
          createdAt: now,
          updatedAt: now,
        };

        componentResults.push(compResult);

        explanationBreakdown.push({
          component: comp.name,
          base: calcType,
          original: unproratedAmount,
          prorated: finalAmount,
          formula: derivationText,
        });
      }
    } else {
      // Fallback if no structure: standard full gross allocation
      baseGrossEarnings = monthlyGross;
      proratedGrossEarnings = Math.round(monthlyGross * prorationFactor * 100) / 100;
    }

    // Add Approved Overtime to Gross Earnings
    const grossEarnings = Math.round((proratedGrossEarnings + otAmount) * 100) / 100;
    const lopDeductionAmount = Math.round((baseGrossEarnings - proratedGrossEarnings) * 100) / 100;
    grossDeductions = Math.round(grossDeductions * 100) / 100;
    const netPay = Math.round((grossEarnings - grossDeductions) * 100) / 100;

    // Check for Exceptions
    if (netPay < 0) {
      const excId = `pexc-${runId}-${employee.id}-negnet`;
      exceptions.push({
        id: excId,
        companyId,
        payrollRunId: runId,
        payrollRunEmployeeId: runEmpId,
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        employeeCode: employee.employeeCode,
        exceptionType: PayrollExceptionType.NEGATIVE_NET_PAY,
        severity: PayrollExceptionSeverity.BLOCKING,
        message: `Employee ${employee.employeeCode} has negative net pay ($${netPay.toFixed(2)}). Gross: $${grossEarnings.toFixed(2)}, Deductions: $${grossDeductions.toFixed(2)}.`,
        details: { grossEarnings, grossDeductions, netPay },
        isResolved: false,
        createdAt: now,
      });
    }

    if (payableDays === 0) {
      const excId = `pexc-${runId}-${employee.id}-zerodays`;
      exceptions.push({
        id: excId,
        companyId,
        payrollRunId: runId,
        payrollRunEmployeeId: runEmpId,
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        employeeCode: employee.employeeCode,
        exceptionType: PayrollExceptionType.ZERO_PAYABLE_DAYS,
        severity: PayrollExceptionSeverity.WARNING,
        message: `Employee ${employee.employeeCode} has 0.00 payable days in period ${period.periodCode} (Full period Loss of Pay).`,
        isResolved: false,
        createdAt: now,
      });
    }

    const runEmployeeStatus = exceptions.length > 0
      ? PayrollRunEmployeeStatus.HAS_EXCEPTIONS
      : PayrollRunEmployeeStatus.CALCULATED;

    // Immutable Snapshots for Run Employee
    const compensationSnapshot = {
      assignmentId: effectiveAssignment?.id,
      annualCtc,
      monthlyGross,
      currency,
      salaryStructureId: effectiveAssignment?.salaryStructureId,
      effectiveFrom: effectiveAssignment?.effectiveFrom,
      effectiveTo: effectiveAssignment?.effectiveTo,
      overrides: effectiveAssignment?.overrides || [],
      capturedAt: now,
    };

    const attendanceSnapshot = {
      snapshotId: snapshot.id,
      periodCalendarDays,
      presentDays,
      paidLeaveDays,
      unpaidLeaveDays,
      uncoveredAbsenceDays,
      lossOfPayDays,
      payableDays,
      prorationFactor,
      approvedOtMinutes,
      approvedOtHours,
      capturedAt: now,
    };

    const calculationExplanation = {
      proration: {
        calendarDays: periodCalendarDays,
        effectiveDays: effectivePeriodDays,
        lossOfPayDays,
        payableDays,
        factor: prorationFactor,
        joinedMidMonth: joiningDate && joiningDate > period.startDate ? joiningDate : null,
      },
      overtime: {
        minutes: approvedOtMinutes,
        hours: approvedOtHours,
        hourlyRate: otRatePerHour,
        multiplier: 1.5,
        totalAmount: otAmount,
      },
      earnings: {
        baseGross: baseGrossEarnings,
        proratedGross: proratedGrossEarnings,
        otAmount,
        totalGross: grossEarnings,
        lopDeduction: lopDeductionAmount,
      },
      deductions: {
        totalGrossDeductions: grossDeductions,
      },
      netPay,
      components: explanationBreakdown,
    };

    const runEmployee: PayrollRunEmployee = {
      id: runEmpId,
      companyId,
      payrollRunId: runId,
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeCode: employee.employeeCode,
      compensationAssignmentId: effectiveAssignment?.id,
      salaryStructureId: effectiveAssignment?.salaryStructureId,
      annualCtc,
      monthlyGross,
      currency,
      periodCalendarDays,
      presentDays,
      paidLeaveDays,
      unpaidLeaveDays,
      uncoveredAbsenceDays,
      lossOfPayDays,
      payableDays,
      prorationFactor,
      approvedOtMinutes,
      approvedOtHours,
      otRatePerHour,
      otAmount,
      baseGrossEarnings,
      proratedGrossEarnings,
      lopDeductionAmount,
      grossEarnings,
      grossDeductions,
      netPay,
      status: runEmployeeStatus,
      compensationSnapshot,
      attendanceSnapshot,
      calculationExplanation,
      components: componentResults,
      exceptions,
      createdAt: now,
      updatedAt: now,
    };

    return {
      runEmployee,
      componentResults,
      exceptions,
    };
  }

  /**
   * Recalculate a single employee in a DRAFT / CALCULATED payroll run
   */
  public static async recalculateEmployee(
    payrollRunId: string,
    employeeId: string,
    companyId: string,
    actor: ServiceActor
  ): Promise<PayrollRunEmployee> {
    const run = await PayrollRunRepository.findById(payrollRunId, companyId);
    if (!run) {
      throw new Error(`Payroll run '${payrollRunId}' not found.`);
    }

    if (run.status === PayrollRunStatus.FINALIZED || run.isLocked) {
      throw new Error(`PAYROLL_RUN_LOCKED: Cannot recalculate employee in a finalized and locked payroll run.`);
    }

    if (run.status === PayrollRunStatus.APPROVED) {
      throw new Error(`Cannot recalculate employee in APPROVED payroll run.`);
    }

    const employee = this.db.employees.get(employeeId);
    if (!employee || employee.companyId !== companyId) {
      throw new Error(`Employee '${employeeId}' not found in company '${companyId}'.`);
    }

    const period = await PayrollCalendarRepository.findPeriodById(run.payrollPeriodId, companyId);
    if (!period) {
      throw new Error(`Payroll period for run '${payrollRunId}' not found.`);
    }

    const snapshot = await TimeLeavePeriodSnapshotRepository.findById(run.attendanceSnapshotId, companyId);
    if (!snapshot) {
      throw new Error(`Time & Leave Snapshot '${run.attendanceSnapshotId}' not found.`);
    }

    const periodCalendarDays = this.getDaysBetween(period.startDate, period.endDate);
    const now = new Date().toISOString();

    // 1. Delete existing employee calculation records
    const existingRunEmp = await PayrollRunEmployeeRepository.findByRunAndEmployee(payrollRunId, employeeId, companyId, false);
    if (existingRunEmp) {
      await PayrollComponentResultRepository.deleteByRunEmployeeId(existingRunEmp.id, companyId);
      await PayrollExceptionRepository.deleteByRunEmployeeId(existingRunEmp.id, companyId);
    }

    // 2. Re-execute calculation
    const calc = await this.calculateEmployeePayroll({
      runId: payrollRunId,
      companyId,
      employee,
      period,
      periodCalendarDays,
      snapshot,
      now,
    });

    // 3. Save updated records
    await PayrollRunEmployeeRepository.save(calc.runEmployee);
    await PayrollComponentResultRepository.saveBatch(calc.componentResults);
    await PayrollExceptionRepository.saveBatch(calc.exceptions);

    // 4. Update Run Master financial totals
    const allRunEmps = await PayrollRunEmployeeRepository.findByRunId(payrollRunId, companyId, false);
    let totalGrossEarnings = 0;
    let totalGrossDeductions = 0;
    let totalNetPay = 0;
    let totalLopDays = 0;
    let totalOtHours = 0;

    for (const re of allRunEmps) {
      totalGrossEarnings += re.grossEarnings;
      totalGrossDeductions += re.grossDeductions;
      totalNetPay += re.netPay;
      totalLopDays += re.lossOfPayDays;
      totalOtHours += re.approvedOtHours;
    }

    const allExceptions = await PayrollExceptionRepository.findByRunId(payrollRunId, companyId);

    await PayrollRunRepository.update(payrollRunId, companyId, {
      totalGrossEarnings: Math.round(totalGrossEarnings * 100) / 100,
      totalGrossDeductions: Math.round(totalGrossDeductions * 100) / 100,
      totalNetPay: Math.round(totalNetPay * 100) / 100,
      totalLopDays: Math.round(totalLopDays * 100) / 100,
      totalOtHours: Math.round(totalOtHours * 100) / 100,
      exceptionsCount: allExceptions.length,
      updatedAt: now,
    });

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'PAYROLL_EMPLOYEE_RECALCULATED',
      targetModule: 'Payroll',
      targetRecordId: calc.runEmployee.id,
      companyId,
      changesSummary: `Recalculated payroll for employee ${employee.employeeCode} in run #${run.runNumber} (Net: $${calc.runEmployee.netPay.toFixed(2)}).`,
    });

    return calc.runEmployee;
  }

  /**
   * Get Payroll Run Summary with all children
   */
  public static async getPayrollRunSummary(
    payrollRunId: string,
    companyId: string
  ): Promise<PayrollRunSummary | null> {
    const run = await PayrollRunRepository.findById(payrollRunId, companyId);
    if (!run) return null;

    const period = await PayrollCalendarRepository.findPeriodById(run.payrollPeriodId, companyId);
    if (!period) return null;

    const employees = await PayrollRunEmployeeRepository.findByRunId(payrollRunId, companyId, true);
    const exceptions = await PayrollExceptionRepository.findByRunId(payrollRunId, companyId);

    return {
      run,
      employees,
      exceptions,
      period,
    };
  }

  /**
   * Update Payroll Run Status (e.g. to REVIEW or APPROVED)
   */
  public static async updateRunStatus(
    payrollRunId: string,
    companyId: string,
    status: PayrollRunStatus,
    actor: ServiceActor
  ): Promise<PayrollRun> {
    const run = await PayrollRunRepository.findById(payrollRunId, companyId);
    if (!run) {
      throw new Error(`Payroll run '${payrollRunId}' not found.`);
    }

    if (run.status === PayrollRunStatus.FINALIZED || run.isLocked) {
      throw new Error(`PAYROLL_RUN_LOCKED: Cannot modify status of FINALIZED and locked payroll run.`);
    }

    const now = new Date().toISOString();
    const updateData: Partial<PayrollRun> = {
      status,
      updatedAt: now,
    };

    if (status === PayrollRunStatus.APPROVED) {
      updateData.approvedAt = now;
      updateData.approvedBy = actor.id;
      updateData.approvedByName = actor.name;
    }

    const updated = await PayrollRunRepository.update(payrollRunId, companyId, updateData);
    if (!updated) {
      throw new Error(`Failed to update payroll run status.`);
    }

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'PAYROLL_RUN_STATUS_CHANGED',
      targetModule: 'Payroll',
      targetRecordId: payrollRunId,
      companyId,
      changesSummary: `Updated payroll run #${run.runNumber} status to ${status}.`,
    });

    return updated;
  }

  /**
   * Employee Self-Service (ESS) Preview for own payroll
   */
  public static async getEmployeePayrollPreview(
    employeeId: string,
    companyId: string,
    payrollRunId?: string
  ): Promise<PayrollRunEmployee | null> {
    if (payrollRunId) {
      return PayrollRunEmployeeRepository.findByRunAndEmployee(payrollRunId, employeeId, companyId, true);
    }
    return PayrollRunEmployeeRepository.findLatestByEmployee(employeeId, companyId, true);
  }
}
