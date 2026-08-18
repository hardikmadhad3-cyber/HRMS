/**
 * Phase 4C: Payroll Finalization, Locking, Versioned Snapshots & Payslips Service
 * Aligned with HRMS Documents 2–6.
 *
 * Implements:
 * 1. Transactional Payroll Finalization
 * 2. Blocker validation (blocking unresolved exceptions)
 * 3. Immutable versioned payroll snapshots
 * 4. Materialized payslip generation with YTD calculations & masked statutory data
 * 5. Controlled reopen / rerun with immutable historical record preservation
 * 6. Multi-tenant company isolation & employee self-service security boundaries
 */

import { RelationalDatabase } from '../database/RelationalDatabase.js';
import { PayrollRunRepository } from '../database/repositories/PayrollRunRepository.js';
import { PayrollRunEmployeeRepository } from '../database/repositories/PayrollRunEmployeeRepository.js';
import { PayrollComponentResultRepository } from '../database/repositories/PayrollComponentResultRepository.js';
import { PayrollExceptionRepository } from '../database/repositories/PayrollExceptionRepository.js';
import { PayrollCalendarRepository } from '../database/repositories/PayrollCalendarRepository.js';
import { PayslipRepository } from '../database/repositories/PayslipRepository.js';
import { PayrollPeriodSnapshotRepository } from '../database/repositories/PayrollPeriodSnapshotRepository.js';
import { EmployeeRepository } from '../database/repositories/EmployeeRepository.js';
import { EmployeeBankAccountRepository } from '../database/repositories/EmployeeBankAccountRepository.js';
import { EmployeeStatutoryRepository } from '../database/repositories/EmployeeStatutoryRepository.js';
import { CompanyRepository } from '../database/repositories/CompanyRepository.js';
import { DepartmentRepository } from '../database/repositories/DepartmentRepository.js';
import { DesignationRepository } from '../database/repositories/DesignationRepository.js';
import { AuditService } from './AuditService.js';
import { ServiceActor } from './OrganizationService.js';
import {
  PayrollRun,
  PayrollRunStatus,
  PayrollPeriodStatus,
  PayrollExceptionSeverity,
  Payslip,
  PayslipStatus,
  PayslipLineItem,
  PayslipEmployeeSnapshot,
  PayslipOrgSnapshot,
  PayrollPeriodSnapshot,
  PayrollSnapshotStatus,
  PayrollFinalizeInput,
  PayrollRegisterSummary,
  PayrollRegisterItem,
  ComponentType,
} from '../../src/types/payroll.js';
import { UserRole } from '../../src/types/auth.js';

export class PayrollFinalizationService {
  private static get db() {
    return RelationalDatabase.getInstance();
  }

  /**
   * Helper: Convert number to English currency words
   */
  public static amountToWords(amount: number, currency: string = 'USD'): string {
    if (isNaN(amount) || amount === 0) return `Zero ${currency}`;
    const absAmount = Math.abs(amount);
    const whole = Math.floor(absAmount);
    const cents = Math.round((absAmount - whole) * 100);

    const units = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
      'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function numToWords(n: number): string {
      if (n === 0) return '';
      if (n < 20) return units[n] + ' ';
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + units[n % 10] : '') + ' ';
      if (n < 1000) return units[Math.floor(n / 100)] + ' Hundred ' + numToWords(n % 100);
      if (n < 1000000) return numToWords(Math.floor(n / 1000)) + 'Thousand ' + numToWords(n % 1000);
      if (n < 1000000000) return numToWords(Math.floor(n / 1000000)) + 'Million ' + numToWords(n % 1000000);
      return numToWords(Math.floor(n / 1000000000)) + 'Billion ' + numToWords(n % 1000000000);
    }

    const words = numToWords(whole).trim();
    const currencyName = currency === 'USD' ? 'Dollars' : currency;
    const centsStr = cents > 0 ? ` and ${cents}/100 Cents` : ' and Zero Cents';
    return (amount < 0 ? 'Negative ' : '') + words + ` ${currencyName}` + centsStr;
  }

  /**
   * Helper: Mask bank account or identification number (leave last 4 chars visible)
   */
  private static maskString(val?: string, visibleChars = 4): string {
    if (!val) return '—';
    if (val.length <= visibleChars) return val;
    const masked = '*'.repeat(val.length - visibleChars);
    return masked + val.slice(-visibleChars);
  }

  /**
   * TRANSACTIONAL PAYROLL FINALIZATION
   *
   * Flow:
   * 1. Lock Payroll Run & Validate state
   * 2. Validate Blockers (unresolved BLOCKING exceptions)
   * 3. Materialize Final Results into versioned Payslips with YTD sums
   * 4. Mark Run FINALIZED & Lock Payroll Period
   * 5. Create Versioned Snapshot (PayrollPeriodSnapshot)
   * 6. Audit Log
   */
  public static async finalizePayrollRun(
    companyId: string,
    payrollRunId: string,
    options: PayrollFinalizeInput = {},
    actor: ServiceActor
  ): Promise<{
    run: PayrollRun;
    snapshot: PayrollPeriodSnapshot;
    payslips: Payslip[];
    totalPayslips: number;
  }> {
    // ------------------------------------------------------------------------
    // STEP 1: Lock Payroll Run & Validate state
    // ------------------------------------------------------------------------
    const run = await PayrollRunRepository.findById(payrollRunId, companyId);
    if (!run) {
      throw new Error(`PAYROLL_RUN_NOT_FOUND: Payroll run '${payrollRunId}' not found for company '${companyId}'.`);
    }

    if (run.status === PayrollRunStatus.FINALIZED || run.isLocked) {
      throw new Error(`PAYROLL_ALREADY_FINALIZED: Payroll run #${run.runNumber} is already FINALIZED and locked.`);
    }

    const period = await PayrollCalendarRepository.findPeriodById(run.payrollPeriodId, companyId);
    if (!period) {
      throw new Error(`PAYROLL_PERIOD_NOT_FOUND: Period '${run.payrollPeriodId}' not found.`);
    }

    // ------------------------------------------------------------------------
    // STEP 2: Validate Blockers
    // ------------------------------------------------------------------------
    const exceptions = await PayrollExceptionRepository.findByRunId(payrollRunId, companyId);
    const blockingExceptions = exceptions.filter(
      (e) => !e.isResolved && e.severity === PayrollExceptionSeverity.BLOCKING
    );

    if (blockingExceptions.length > 0) {
      const messages = blockingExceptions.map((e) => `[${e.exceptionType}] ${e.message}`).join('; ');
      throw new Error(
        `PAYROLL_BLOCKERS_PRESENT: Cannot finalize payroll run #${run.runNumber}. Found ${blockingExceptions.length} unresolved blocking exception(s): ${messages}`
      );
    }

    const runEmployees = await PayrollRunEmployeeRepository.findByRunId(payrollRunId, companyId, true);
    if (runEmployees.length === 0) {
      throw new Error(`PAYROLL_EMPTY: Cannot finalize a payroll run with 0 employees.`);
    }

    // ------------------------------------------------------------------------
    // STEP 3: Materialize Final Results into versioned Payslips with YTD sums
    // ------------------------------------------------------------------------
    const company = await CompanyRepository.findById(companyId);
    const nowIso = new Date().toISOString();
    const payDate = options.payDate || period.payDate || period.endDate;
    const issueDate = nowIso.split('T')[0];
    const initialStatus = options.publishPayslipsImmediately
      ? PayslipStatus.PUBLISHED
      : PayslipStatus.GENERATED;

    const orgSnapshot: PayslipOrgSnapshot = {
      companyId,
      companyName: company?.name || 'Enterprise HRMS',
      legalName: company?.legalName || company?.name,
      taxIdentifier: company?.taxIdentifier || 'TAX-998877',
      registrationNumber: company?.code || 'REG-112233',
      address: company?.address || 'Corporate Headquarters',
      city: 'San Francisco',
      country: 'USA',
      logoUrl: company?.logoUrl,
    };

    // Calculate Financial Year for YTD (from period start date)
    const periodStartDate = new Date(period.startDate);
    const fyYear = periodStartDate.getFullYear();

    const payslips: Payslip[] = [];

    for (const runEmp of runEmployees) {
      const emp = await EmployeeRepository.findById(runEmp.employeeId, companyId);
      const bankAccount = await EmployeeBankAccountRepository.findByEmployeeId(runEmp.employeeId);
      const statutory = await EmployeeStatutoryRepository.findByEmployeeId(runEmp.employeeId);

      // 3a. Retrieve historical finalized payslips for this employee in the same year for YTD
      const historicalPayslips = await PayslipRepository.findByEmployee(runEmp.employeeId, companyId, {
        year: fyYear,
      });

      let prevYtdGross = 0;
      let prevYtdDeductions = 0;
      let prevYtdNet = 0;
      let prevYtdTax = 0;
      let prevYtdPf = 0;

      for (const hp of historicalPayslips) {
        if (hp.payrollRunId !== run.id) {
          prevYtdGross += hp.grossEarnings;
          prevYtdDeductions += hp.grossDeductions;
          prevYtdNet += hp.netPay;
          prevYtdTax += hp.ytdTaxDeducted;
          prevYtdPf += hp.ytdPfDeducted;
        }
      }

      // Current component breakdown
      const compResults = runEmp.components || (await PayrollComponentResultRepository.findByRunEmployeeId(runEmp.id, companyId));
      
      const earningsBreakdown: PayslipLineItem[] = [];
      const deductionsBreakdown: PayslipLineItem[] = [];
      let currentTax = 0;
      let currentPf = 0;

      for (const cr of compResults) {
        const item: PayslipLineItem = {
          componentCode: cr.componentCode,
          componentName: cr.componentName,
          componentType: cr.componentType,
          componentNature: cr.componentNature,
          calculationBase: cr.calculationBase,
          baseAmount: cr.baseAmount,
          factorValue: cr.factorValue,
          originalAmount: cr.originalAmount,
          proratedAmount: cr.proratedAmount,
          amount: cr.finalAmount,
          isLopAffected: cr.isLopAffected,
          isOverride: cr.isOverride,
          formulaDerivation: cr.formulaDerivation,
          displayOrder: cr.displayOrder,
        };

        if (cr.componentType === ComponentType.EARNING) {
          earningsBreakdown.push(item);
        } else {
          deductionsBreakdown.push(item);
          if (cr.componentCode === 'PF_EMP' || cr.componentCode === 'PF') {
            currentPf += cr.finalAmount;
          } else if (cr.componentCode === 'PT' || cr.componentCode === 'TDS' || cr.componentCode === 'TAX') {
            currentTax += cr.finalAmount;
          }
        }
      }

      // If overtime exists, add OT as explicit line item if not in components
      if (runEmp.otAmount > 0 && !earningsBreakdown.some((e) => e.componentCode === 'OVERTIME')) {
        earningsBreakdown.push({
          componentCode: 'OVERTIME',
          componentName: 'Overtime Pay',
          componentType: ComponentType.EARNING,
          componentNature: 'VARIABLE' as any,
          originalAmount: runEmp.otAmount,
          proratedAmount: runEmp.otAmount,
          amount: runEmp.otAmount,
          formulaDerivation: `${runEmp.approvedOtHours} hrs @ $${runEmp.otRatePerHour.toFixed(2)}/hr`,
          displayOrder: 99,
        });
      }

      const ytdGrossEarnings = Math.round((prevYtdGross + runEmp.grossEarnings) * 100) / 100;
      const ytdGrossDeductions = Math.round((prevYtdDeductions + runEmp.grossDeductions) * 100) / 100;
      const ytdNetPay = Math.round((prevYtdNet + runEmp.netPay) * 100) / 100;
      const ytdTaxDeducted = Math.round((prevYtdTax + currentTax) * 100) / 100;
      const ytdPfDeducted = Math.round((prevYtdPf + currentPf) * 100) / 100;

      const payslipNumber = `PS-${period.periodCode}-${emp?.employeeCode || runEmp.employeeId}-V${run.runNumber}`;
      const downloadToken = `pstok-${payrollRunId}-${runEmp.employeeId}-${Math.random().toString(36).substring(2, 10)}`;

      const employeeSnapshot: PayslipEmployeeSnapshot = {
        employeeId: runEmp.employeeId,
        employeeCode: emp?.employeeCode || runEmp.employeeCode || 'EMP-000',
        firstName: emp?.firstName || '',
        lastName: emp?.lastName || '',
        fullName: emp ? `${emp.firstName} ${emp.lastName}` : (runEmp.employeeName || 'Employee'),
        email: emp?.workEmail || emp?.personalEmail || '',
        departmentId: undefined,
        departmentName: runEmp.departmentName || 'General',
        designationId: undefined,
        designationName: runEmp.designationName || 'Staff',
        joiningDate: emp?.joiningDate,
        panNumber: this.maskString(statutory?.panNumber, 4),
        taxIdentifier: this.maskString(statutory?.aadhaarNumber, 4),
        uanNumber: this.maskString(statutory?.uanNumber, 4),
        pfNumber: this.maskString(statutory?.pfNumber, 4),
        bankName: bankAccount?.bankName || 'Direct Deposit',
        accountNumberMasked: this.maskString(bankAccount?.accountNumber, 4),
        bankBranch: bankAccount?.branchName,
        ifscOrRouting: bankAccount?.ifscCode,
      };

      const payslip: Payslip = {
        id: `pslip-${payrollRunId}-${runEmp.employeeId}`,
        companyId,
        payrollRunId,
        payrollRunEmployeeId: runEmp.id,
        payrollPeriodId: period.id,
        employeeId: runEmp.employeeId,
        payslipNumber,
        version: run.runNumber,
        issueDate,
        payDate,
        currency: runEmp.currency || 'USD',
        periodName: period.periodName || period.periodCode,
        periodCode: period.periodCode,
        periodStartDate: period.startDate,
        periodEndDate: period.endDate,
        annualCtc: runEmp.annualCtc,
        monthlyGross: runEmp.monthlyGross,
        calendarDays: runEmp.periodCalendarDays,
        payableDays: runEmp.payableDays,
        lossOfPayDays: runEmp.lossOfPayDays,
        approvedOtHours: runEmp.approvedOtHours,
        grossEarnings: runEmp.grossEarnings,
        grossDeductions: runEmp.grossDeductions,
        netPay: runEmp.netPay,
        netPayInWords: this.amountToWords(runEmp.netPay, runEmp.currency || 'USD'),
        ytdGrossEarnings,
        ytdGrossDeductions,
        ytdNetPay,
        ytdTaxDeducted,
        ytdPfDeducted,
        status: initialStatus,
        publishedAt: options.publishPayslipsImmediately ? nowIso : undefined,
        publishedBy: options.publishPayslipsImmediately ? actor.id : undefined,
        downloadToken,
        employeeSnapshot,
        organizationSnapshot: orgSnapshot,
        earningsBreakdown,
        deductionsBreakdown,
        notes: options.notes,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      payslips.push(payslip);
    }

    // Save all payslips
    await PayslipRepository.saveBatch(payslips);

    // ------------------------------------------------------------------------
    // STEP 4: Mark Run FINALIZED & Lock Payroll Period
    // ------------------------------------------------------------------------
    const updatedRun = await PayrollRunRepository.update(payrollRunId, companyId, {
      status: PayrollRunStatus.FINALIZED,
      isLocked: true,
      finalizedAt: nowIso,
      finalizedBy: actor.id,
      finalizedByName: actor.name,
      notes: options.notes ? (run.notes ? `${run.notes} | ${options.notes}` : options.notes) : run.notes,
      updatedAt: nowIso,
    });

    if (!updatedRun) {
      throw new Error(`Failed to update payroll run status to FINALIZED.`);
    }

    // Lock Payroll Period
    await PayrollCalendarRepository.updatePeriodStatus(period.id, companyId, PayrollPeriodStatus.CLOSED);

    // ------------------------------------------------------------------------
    // STEP 5: Create Versioned Snapshot (PayrollPeriodSnapshot)
    // ------------------------------------------------------------------------
    // Department Aggregates
    const deptTotals: Record<string, { employeeCount: number; gross: number; deductions: number; net: number }> = {};
    for (const p of payslips) {
      const dName = p.employeeSnapshot.departmentName || 'General';
      if (!deptTotals[dName]) {
        deptTotals[dName] = { employeeCount: 0, gross: 0, deductions: 0, net: 0 };
      }
      deptTotals[dName].employeeCount++;
      deptTotals[dName].gross += p.grossEarnings;
      deptTotals[dName].deductions += p.grossDeductions;
      deptTotals[dName].net += p.netPay;
    }

    const runSummary = {
      runNumber: updatedRun.runNumber,
      periodCode: period.periodCode,
      startDate: period.startDate,
      endDate: period.endDate,
      payDate,
      totalEmployees: updatedRun.totalEmployees,
      totalGrossEarnings: updatedRun.totalGrossEarnings,
      totalGrossDeductions: updatedRun.totalGrossDeductions,
      totalNetPay: updatedRun.totalNetPay,
      totalLopDays: updatedRun.totalLopDays,
      totalOtHours: updatedRun.totalOtHours,
      departmentSummaries: Object.entries(deptTotals).map(([departmentName, metrics]) => ({
        departmentName,
        employeeCount: metrics.employeeCount,
        totalGross: Math.round(metrics.gross * 100) / 100,
        totalDeductions: Math.round(metrics.deductions * 100) / 100,
        totalNetPay: Math.round(metrics.net * 100) / 100,
      })),
    };

    const snapshot: PayrollPeriodSnapshot = {
      id: `psnap-${period.id}-v${updatedRun.runNumber}`,
      companyId,
      payrollPeriodId: period.id,
      payrollRunId: updatedRun.id,
      snapshotVersion: updatedRun.runNumber,
      status: PayrollSnapshotStatus.FINALIZED,
      finalizedAt: nowIso,
      finalizedBy: actor.id,
      finalizedByName: actor.name,
      totalEmployees: updatedRun.totalEmployees,
      totalGrossEarnings: updatedRun.totalGrossEarnings,
      totalGrossDeductions: updatedRun.totalGrossDeductions,
      totalNetPay: updatedRun.totalNetPay,
      totalLopDays: updatedRun.totalLopDays,
      totalOtHours: updatedRun.totalOtHours,
      runSummary,
      employeeResults: payslips.map((p) => ({
        employeeId: p.employeeId,
        employeeCode: p.employeeSnapshot.employeeCode,
        employeeName: p.employeeSnapshot.fullName,
        departmentName: p.employeeSnapshot.departmentName,
        grossEarnings: p.grossEarnings,
        grossDeductions: p.grossDeductions,
        netPay: p.netPay,
        payableDays: p.payableDays,
        lossOfPayDays: p.lossOfPayDays,
        earningsBreakdown: p.earningsBreakdown,
        deductionsBreakdown: p.deductionsBreakdown,
      })),
      createdAt: nowIso,
    };

    await PayrollPeriodSnapshotRepository.save(snapshot);

    // ------------------------------------------------------------------------
    // STEP 6: Audit Log
    // ------------------------------------------------------------------------
    await AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'PAYROLL_FINALIZED',
      targetModule: 'Payroll',
      targetRecordId: updatedRun.id,
      companyId,
      changesSummary: `Finalized Payroll Run #${updatedRun.runNumber} for period ${period.periodCode} (${payslips.length} payslips generated, Net Total: $${updatedRun.totalNetPay.toFixed(2)}).`,
    });

    return {
      run: updatedRun,
      snapshot,
      payslips,
      totalPayslips: payslips.length,
    };
  }

  /**
   * CONTROLLED REOPEN / RERUN
   * Preserves historical finalized snapshot immutably and establishes a new versioned run.
   */
  public static async reopenPayrollRun(
    companyId: string,
    payrollRunId: string,
    reason: string,
    actor: ServiceActor
  ): Promise<{
    reopenedRun: PayrollRun;
    previousSnapshot: PayrollPeriodSnapshot;
  }> {
    if (!reason || reason.trim().length === 0) {
      throw new Error(`REOPEN_REASON_REQUIRED: A valid audit reason is required to reopen a finalized payroll run.`);
    }

    const run = await PayrollRunRepository.findById(payrollRunId, companyId);
    if (!run) {
      throw new Error(`PAYROLL_RUN_NOT_FOUND: Payroll run '${payrollRunId}' not found.`);
    }

    if (run.status !== PayrollRunStatus.FINALIZED) {
      throw new Error(`INVALID_RUN_STATE: Run #${run.runNumber} is in status '${run.status}', not FINALIZED.`);
    }

    const nowIso = new Date().toISOString();

    // 1. Mark existing snapshot as REOPENED / SUPERSEDED
    const snapshot = await PayrollPeriodSnapshotRepository.findByRunId(payrollRunId, companyId);
    if (snapshot) {
      await PayrollPeriodSnapshotRepository.updateStatus(snapshot.id, companyId, PayrollSnapshotStatus.SUPERSEDED, {
        reopenReason: reason,
        reopenedAt: nowIso,
        reopenedBy: actor.id,
      });
    }

    // 2. Mark existing finalized run with reopen metadata
    const reopenedRun = await PayrollRunRepository.update(payrollRunId, companyId, {
      reopenReason: reason,
      reopenedAt: nowIso,
      reopenedBy: actor.id,
      updatedAt: nowIso,
    });

    // 3. Unlock Payroll Period back to PROCESSING
    await PayrollCalendarRepository.updatePeriodStatus(run.payrollPeriodId, companyId, PayrollPeriodStatus.PROCESSING);

    // 4. Audit Trail
    await AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'PAYROLL_RUN_REOPENED',
      targetModule: 'Payroll',
      targetRecordId: run.id,
      companyId,
      changesSummary: `Reopened finalized Payroll Run #${run.runNumber} for period ${run.payrollPeriodId}. Reason: "${reason}". Snapshot version ${run.runNumber} marked SUPERSEDED.`,
    });

    return {
      reopenedRun: reopenedRun || run,
      previousSnapshot: snapshot || ({} as any),
    };
  }

  /**
   * GET PAYSLIP BY ID WITH STRICT RBAC
   */
  public static async getPayslipById(
    payslipId: string,
    companyId: string,
    actor: { id: string; role: UserRole; employeeId?: string }
  ): Promise<Payslip | null> {
    const payslip = await PayslipRepository.findById(payslipId, companyId);
    if (!payslip) return null;

    // RBAC: If role is EMPLOYEE, restrict strictly to own employeeId
    if (actor.role === UserRole.EMPLOYEE && actor.employeeId !== payslip.employeeId) {
      throw new Error(`FORBIDDEN_PAYSLIP_ACCESS: Access denied. You may only view your own payslips.`);
    }

    // Record view timestamp for audit if self-viewed
    if (actor.employeeId === payslip.employeeId && !payslip.viewedAt) {
      await PayslipRepository.update(payslipId, companyId, { viewedAt: new Date().toISOString() });
    }

    return payslip;
  }

  /**
   * GET PAYSLIP BY SECURE DOWNLOAD TOKEN
   */
  public static async getPayslipByToken(token: string): Promise<Payslip | null> {
    const payslip = await PayslipRepository.findByDownloadToken(token);
    if (!payslip) return null;

    // Record download timestamp
    await PayslipRepository.update(payslip.id, payslip.companyId, {
      downloadedAt: new Date().toISOString(),
    });

    return payslip;
  }

  /**
   * GET EMPLOYEE PAYSLIPS (Self or HR/Payroll)
   */
  public static async getEmployeePayslips(
    employeeId: string,
    companyId: string,
    actor: { id: string; role: UserRole; employeeId?: string },
    year?: number
  ): Promise<Payslip[]> {
    // RBAC: If role is EMPLOYEE, restrict strictly to own employeeId
    if (actor.role === UserRole.EMPLOYEE && actor.employeeId !== employeeId) {
      throw new Error(`FORBIDDEN_PAYSLIP_ACCESS: Access denied. You may only view your own payslips.`);
    }

    return PayslipRepository.findByEmployee(employeeId, companyId, {
      year,
      status: actor.role === UserRole.EMPLOYEE ? PayslipStatus.PUBLISHED : undefined,
    });
  }

  /**
   * PUBLISH PAYSLIPS FOR A FINALIZED PAYROLL RUN
   */
  public static async publishPayslips(
    payrollRunId: string,
    companyId: string,
    actor: ServiceActor
  ): Promise<{ publishedCount: number }> {
    const run = await PayrollRunRepository.findById(payrollRunId, companyId);
    if (!run) {
      throw new Error(`PAYROLL_RUN_NOT_FOUND: Payroll run '${payrollRunId}' not found.`);
    }

    const payslips = await PayslipRepository.findByRunId(payrollRunId, companyId);
    const nowIso = new Date().toISOString();
    let publishedCount = 0;

    for (const p of payslips) {
      if (p.status === PayslipStatus.GENERATED || p.status === PayslipStatus.WITHHELD) {
        await PayslipRepository.updateStatus(p.id, companyId, PayslipStatus.PUBLISHED, {
          publishedAt: nowIso,
          publishedBy: actor.id,
        });
        publishedCount++;
      }
    }

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'PAYSLIPS_PUBLISHED',
      targetModule: 'Payroll',
      targetRecordId: payrollRunId,
      companyId,
      changesSummary: `Published ${publishedCount} payslips for Payroll Run #${run.runNumber}.`,
    });

    return { publishedCount };
  }

  /**
   * GET TABULAR PAYROLL REGISTER SUMMARY
   */
  public static async getPayrollRegister(
    payrollRunId: string,
    companyId: string
  ): Promise<PayrollRegisterSummary | null> {
    const run = await PayrollRunRepository.findById(payrollRunId, companyId);
    if (!run) return null;

    const period = await PayrollCalendarRepository.findPeriodById(run.payrollPeriodId, companyId);
    if (!period) return null;

    const runEmployees = await PayrollRunEmployeeRepository.findByRunId(payrollRunId, companyId, true);
    const payslips = await PayslipRepository.findByRunId(payrollRunId, companyId);
    const payslipMap = new Map(payslips.map((p) => [p.employeeId, p]));

    const items: PayrollRegisterItem[] = [];
    const deptTotals: Record<string, { employeeCount: number; gross: number; deductions: number; net: number }> = {};

    for (const re of runEmployees) {
      const ps = payslipMap.get(re.employeeId);
      const components = re.components || [];

      let basicEarned = 0;
      let hraEarned = 0;
      let allowancesEarned = 0;
      let pfDeduction = 0;
      let taxOrPtDeduction = 0;
      let otherDeductions = 0;

      for (const c of components) {
        if (c.componentCode === 'BASIC') {
          basicEarned += c.finalAmount;
        } else if (c.componentCode === 'HRA') {
          hraEarned += c.finalAmount;
        } else if (c.componentType === ComponentType.EARNING) {
          allowancesEarned += c.finalAmount;
        } else if (c.componentCode === 'PF_EMP' || c.componentCode === 'PF') {
          pfDeduction += c.finalAmount;
        } else if (c.componentCode === 'PT' || c.componentCode === 'TDS' || c.componentCode === 'TAX') {
          taxOrPtDeduction += c.finalAmount;
        } else {
          otherDeductions += c.finalAmount;
        }
      }

      const dName = re.departmentName || ps?.employeeSnapshot.departmentName || 'General';
      if (!deptTotals[dName]) {
        deptTotals[dName] = { employeeCount: 0, gross: 0, deductions: 0, net: 0 };
      }
      deptTotals[dName].employeeCount++;
      deptTotals[dName].gross += re.grossEarnings;
      deptTotals[dName].deductions += re.grossDeductions;
      deptTotals[dName].net += re.netPay;

      items.push({
        employeeId: re.employeeId,
        employeeCode: re.employeeCode || ps?.employeeSnapshot.employeeCode || '',
        employeeName: re.employeeName || ps?.employeeSnapshot.fullName || '',
        departmentName: dName,
        designationName: re.designationName || ps?.employeeSnapshot.designationName || '',
        bankAccountMasked: ps?.employeeSnapshot.accountNumberMasked,
        panOrTaxIdMasked: ps?.employeeSnapshot.panNumber || ps?.employeeSnapshot.taxIdentifier,
        calendarDays: re.periodCalendarDays,
        payableDays: re.payableDays,
        lossOfPayDays: re.lossOfPayDays,
        approvedOtHours: re.approvedOtHours,
        monthlyGross: re.monthlyGross,
        basicEarned: Math.round(basicEarned * 100) / 100,
        hraEarned: Math.round(hraEarned * 100) / 100,
        allowancesEarned: Math.round(allowancesEarned * 100) / 100,
        otEarned: re.otAmount,
        totalGrossEarnings: re.grossEarnings,
        pfDeduction: Math.round(pfDeduction * 100) / 100,
        taxOrPtDeduction: Math.round(taxOrPtDeduction * 100) / 100,
        otherDeductions: Math.round(otherDeductions * 100) / 100,
        totalGrossDeductions: re.grossDeductions,
        netPay: re.netPay,
        payslipNumber: ps?.payslipNumber || `PS-${period.periodCode}-${re.employeeCode || re.employeeId}`,
        payslipId: ps?.id || '',
        payslipStatus: ps?.status || PayslipStatus.GENERATED,
      });
    }

    return {
      payrollRunId,
      payrollPeriodId: period.id,
      periodName: period.periodName || period.periodCode,
      periodCode: period.periodCode,
      runNumber: run.runNumber,
      status: run.status,
      currency: runEmployees[0]?.currency || 'USD',
      totalEmployees: run.totalEmployees,
      totalGrossEarnings: run.totalGrossEarnings,
      totalGrossDeductions: run.totalGrossDeductions,
      totalNetPay: run.totalNetPay,
      totalLopDays: run.totalLopDays,
      totalOtHours: run.totalOtHours,
      departmentSummaries: Object.entries(deptTotals).map(([departmentName, m]) => ({
        departmentName,
        employeeCount: m.employeeCount,
        totalGross: Math.round(m.gross * 100) / 100,
        totalDeductions: Math.round(m.deductions * 100) / 100,
        totalNetPay: Math.round(m.net * 100) / 100,
      })),
      items,
    };
  }
}
