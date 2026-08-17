import {
  LeaveAccrualLog,
  LeaveLedgerEntry,
  PostAccrualRunDTO,
  LeavePolicyRuleEvaluation,
} from '../../src/types/leave.js';
import { AuthUser } from '../../src/types/auth.js';
import { LeaveAccrualLogRepository } from '../database/repositories/LeaveAccrualLogRepository.js';
import { LeaveLedgerRepository } from '../database/repositories/LeaveLedgerRepository.js';
import { LeaveYearRepository } from '../database/repositories/LeaveYearRepository.js';
import { LeaveTypeRepository } from '../database/repositories/LeaveTypeRepository.js';
import { EmployeeRepository } from '../database/repositories/EmployeeRepository.js';
import { LeaveLedgerService } from './LeaveLedgerService.js';
import { LeaveEligibilityService } from './LeaveEligibilityService.js';
import { AuditService } from './AuditService.js';

export class LeaveAccrualService {
  /**
   * Run batch leave accrual engine with strict idempotency and proration logic
   */
  public static async runAccrual(
    companyId: string,
    actor: AuthUser,
    dto: PostAccrualRunDTO
  ): Promise<{
    log: LeaveAccrualLog;
    employeesProcessed: number;
    totalUnitsAccrued: number;
    summary: Array<{
      employeeId: string;
      employeeCode: string;
      employeeName: string;
      leaveTypeCode: string;
      accruedUnits: number;
      remarks: string;
    }>;
  }> {
    if (!dto.accrualPeriod) {
      const err = new Error('accrualPeriod (e.g. YYYY-MM) is required for accrual processing.') as any;
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 400;
      throw err;
    }

    // Resolve posting date (default to last day of month or given posting date)
    const [yearStr, monthStr] = dto.accrualPeriod.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const postingDate = dto.postingDate || `${dto.accrualPeriod}-${String(lastDayOfMonth).padStart(2, '0')}`;

    // Resolve Leave Year
    let leaveYearId = dto.leaveYearId;
    if (!leaveYearId) {
      const leaveYear = await LeaveYearRepository.findByDate(postingDate, companyId);
      if (!leaveYear) {
        const err = new Error(`No active leave year covers posting date '${postingDate}' in company.`) as any;
        err.code = 'LEAVE_YEAR_NOT_FOUND';
        err.statusCode = 400;
        throw err;
      }
      leaveYearId = leaveYear.id;
    }

    const leaveYear = await LeaveYearRepository.findById(leaveYearId, companyId);
    if (!leaveYear) {
      const err = new Error(`Leave year '${leaveYearId}' not found.`) as any;
      err.code = 'LEAVE_YEAR_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    // Target leave types
    const allLeaveTypes = (await LeaveTypeRepository.findAll(companyId)).filter((lt) => lt.status === 'ACTIVE');
    const targetLeaveTypes = dto.leaveTypeId
      ? allLeaveTypes.filter((lt) => lt.id === dto.leaveTypeId)
      : allLeaveTypes;

    if (targetLeaveTypes.length === 0) {
      const err = new Error('No active leave types found for accrual processing.') as any;
      err.code = 'NO_LEAVE_TYPES';
      err.statusCode = 400;
      throw err;
    }

    // 1. Enforce Strict Idempotency Key
    const typeKey = dto.leaveTypeId ? targetLeaveTypes[0].code : 'ALL';
    const accrualRunKey = `${companyId}:${dto.accrualPeriod}:${leaveYear.code}:${typeKey}`;

    const existingLog = await LeaveAccrualLogRepository.findByRunKey(companyId, accrualRunKey);
    if (existingLog && !dto.dryRun) {
      const err = new Error(`Accrual run '${accrualRunKey}' has already been successfully processed. Duplicate execution rejected.`) as any;
      err.code = 'ACCRUAL_ALREADY_PROCESSED';
      err.statusCode = 409;
      throw err;
    }

    // 2. Fetch all active employees in company
    const employees = await EmployeeRepository.findAllByCompany(companyId);
    const activeEmployees = employees.filter((e) => e.status === 'ACTIVE');

    let totalProcessed = 0;
    let totalUnitsAccrued = 0;
    const summary: Array<{
      employeeId: string;
      employeeCode: string;
      employeeName: string;
      leaveTypeCode: string;
      accruedUnits: number;
      remarks: string;
    }> = [];

    const now = new Date().toISOString();

    for (const emp of activeEmployees) {
      // Evaluate policy rules on posting date
      const evalResult = await LeaveEligibilityService.evaluateEligibility(
        emp.id,
        companyId,
        postingDate
      );

      for (const lt of targetLeaveTypes) {
        const rule = evalResult.rules.find((r) => r.leaveTypeId === lt.id);
        if (!rule) continue;

        // Check overall eligibility
        if (!rule.eligible) {
          summary.push({
            employeeId: emp.id,
            employeeCode: emp.employeeCode,
            employeeName: emp.displayName,
            leaveTypeCode: lt.code,
            accruedUnits: 0,
            remarks: `Ineligible: ${rule.ineligibilityReasons.join('; ')}`,
          });
          continue;
        }

        // Check Probation constraint
        if (!rule.allowDuringProbation && evalResult.isProbation) {
          summary.push({
            employeeId: emp.id,
            employeeCode: emp.employeeCode,
            employeeName: emp.displayName,
            leaveTypeCode: lt.code,
            accruedUnits: 0,
            remarks: 'Accrual skipped: Employee is on probation and policy restricts probation accruals.',
          });
          continue;
        }

        // Check Minimum Service Days requirement
        if (rule.minServiceDaysRequired > 0 && evalResult.serviceDays < rule.minServiceDaysRequired) {
          summary.push({
            employeeId: emp.id,
            employeeCode: emp.employeeCode,
            employeeName: emp.displayName,
            leaveTypeCode: lt.code,
            accruedUnits: 0,
            remarks: `Accrual skipped: Service tenure (${evalResult.serviceDays} days) < Required (${rule.minServiceDaysRequired} days).`,
          });
          continue;
        }

        // Calculate periodic accrual quota
        let divisor = 12; // default MONTHLY
        if (rule.accrualFrequency === 'QUARTERLY') divisor = 4;
        else if (rule.accrualFrequency === 'HALF_YEARLY') divisor = 2;
        else if (rule.accrualFrequency === 'ANNUAL_UPFRONT') divisor = 1;

        const basePeriodicAccrual = rule.annualEntitlement / divisor;
        let accruedUnits = basePeriodicAccrual;
        let prorationRemark = `Standard ${rule.accrualFrequency.toLowerCase()} accrual (${rule.annualEntitlement}/${divisor})`;

        // Joining Date Proration Check
        if (emp.joiningDate) {
          const joiningDate = emp.joiningDate;
          const periodStart = `${dto.accrualPeriod}-01`;
          const periodEnd = postingDate;

          if (joiningDate > periodStart && joiningDate <= periodEnd) {
            // Joined during this accrual period
            if (rule.prorationRule === 'PRORATE_BY_DAYS') {
              const totalDaysInMonth = lastDayOfMonth;
              const joiningDay = new Date(joiningDate).getUTCDate();
              const activeDays = totalDaysInMonth - joiningDay + 1;
              const ratio = activeDays / totalDaysInMonth;
              accruedUnits = Number((basePeriodicAccrual * ratio).toFixed(2));
              prorationRemark = `Prorated by days: Joined on ${joiningDate} (${activeDays}/${totalDaysInMonth} days active)`;
            } else if (rule.prorationRule === 'PRORATE_BY_MONTHS') {
              const joiningDay = new Date(joiningDate).getUTCDate();
              if (joiningDay > 15) {
                accruedUnits = Number((basePeriodicAccrual * 0.5).toFixed(2));
                prorationRemark = `Prorated by months: Joined after 15th (${joiningDate})`;
              }
            }
          } else if (joiningDate > periodEnd) {
            // Future joiner
            accruedUnits = 0;
            prorationRemark = `Joined after accrual period (${joiningDate})`;
          }
        }

        accruedUnits = Number(accruedUnits.toFixed(2));

        if (accruedUnits > 0 && !dto.dryRun) {
          const ledgerId = `led-acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const ledgerEntry: LeaveLedgerEntry = {
            id: ledgerId,
            companyId,
            employeeId: emp.id,
            leaveTypeId: lt.id,
            leaveYearId,
            transactionType: 'ACCRUAL',
            quantity: accruedUnits,
            effectiveDate: postingDate,
            referenceType: 'ACCRUAL_RUN',
            referenceId: accrualRunKey,
            policyRuleId: rule.ruleId,
            remarks: `${prorationRemark} [Run Key: ${accrualRunKey}]`,
            createdBy: actor.id,
            createdAt: now,
          };

          await LeaveLedgerRepository.create(ledgerEntry);
          await LeaveLedgerService.rebuildEmployeeLeaveBalance(emp.id, lt.id, leaveYearId, companyId);
        }

        if (accruedUnits > 0) {
          totalUnitsAccrued += accruedUnits;
          totalProcessed++;
        }

        summary.push({
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          employeeName: emp.displayName,
          leaveTypeCode: lt.code,
          accruedUnits,
          remarks: prorationRemark,
        });
      }
    }

    totalUnitsAccrued = Number(totalUnitsAccrued.toFixed(2));

    const logId = `acc-log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const log: LeaveAccrualLog = {
      id: logId,
      companyId,
      accrualRunKey,
      accrualPeriod: dto.accrualPeriod,
      leaveYearId,
      leaveTypeId: dto.leaveTypeId || targetLeaveTypes[0].id,
      postingDate,
      totalEmployeesProcessed: totalProcessed,
      totalUnitsAccrued,
      status: 'COMPLETED',
      createdBy: actor.id,
      createdAt: now,
    };

    if (!dto.dryRun) {
      await LeaveAccrualLogRepository.create(log);

      await AuditService.log({
        actorId: actor.id,
        actorName: actor.fullName,
        actorEmail: actor.email,
        action: 'LEAVE_ACCRUAL_PROCESSED',
        targetModule: 'Leave Management',
        targetRecordId: log.id,
        companyId,
        changesSummary: `Executed leave accrual run '${accrualRunKey}' for period ${dto.accrualPeriod}. Processed ${totalProcessed} employees, total ${totalUnitsAccrued} units accrued.`,
      });
    }

    return {
      log,
      employeesProcessed: totalProcessed,
      totalUnitsAccrued,
      summary,
    };
  }

  public static async getLogs(companyId: string, accrualPeriod?: string): Promise<LeaveAccrualLog[]> {
    return LeaveAccrualLogRepository.findAll(companyId, accrualPeriod);
  }
}
