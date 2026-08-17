import { RelationalDatabase } from '../database/RelationalDatabase.js';
import { LeaveAttendanceReconciliationRepository } from '../database/repositories/LeaveAttendanceReconciliationRepository.js';
import { AttendancePeriodRepository } from '../database/repositories/AttendancePeriodRepository.js';
import { AttendancePeriodSummaryRepository } from '../database/repositories/AttendancePeriodSummaryRepository.js';
import { DailyAttendanceRepository } from '../database/repositories/DailyAttendanceRepository.js';
import { LeaveRequestRepository } from '../database/repositories/LeaveRequestRepository.js';
import { LeaveLedgerRepository } from '../database/repositories/LeaveLedgerRepository.js';
import { LeaveTypeRepository } from '../database/repositories/LeaveTypeRepository.js';
import { LeavePolicyRepository } from '../database/repositories/LeavePolicyRepository.js';
import { EmployeeRepository } from '../database/repositories/EmployeeRepository.js';
import { HolidayRepository } from '../database/repositories/HolidayRepository.js';
import { WeeklyOffRepository } from '../database/repositories/WeeklyOffRepository.js';
import { OvertimeRequestRepository } from '../database/repositories/OvertimeRequestRepository.js';
import { AuditService } from './AuditService.js';
import { ServiceActor } from './OrganizationService.js';
import {
  LeaveAttendanceReconciliation,
  DateReconciliationExplanation,
  PeriodReconciliationReport,
  ReconciledCoverageType,
  ReconciliationConflictType,
} from '../../src/types/reconciliation.js';
import { AttendancePeriodSummary, AttendancePeriodStatus } from '../../src/types/period.js';
import { DailyAttendance, AttendanceStatus } from '../../src/types/attendance.js';

export class LeaveAttendanceReconciliationService {
  private static db = RelationalDatabase.getInstance();

  /**
   * Helper: format date YYYY-MM-DD
   */
  private static formatDate(d: Date): string {
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /**
   * Helper: get day of week name
   */
  private static getDayOfWeek(dateStr: string): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const d = new Date(dateStr + 'T00:00:00Z');
    return days[d.getUTCDay()];
  }

  /**
   * Reconciles a single employee for a single date.
   * Preserves raw attendance facts while authoritatively integrating approved leave and computing LOP.
   */
  public static async reconcileEmployeeDate(
    companyId: string,
    employeeId: string,
    date: string,
    options?: { version?: number; actor?: ServiceActor }
  ): Promise<{ reconciliation: LeaveAttendanceReconciliation; explanation: DateReconciliationExplanation }> {
    const version = options?.version || 1;
    const employee = await EmployeeRepository.findById(employeeId, companyId);
    if (!employee) {
      throw new Error(`Employee '${employeeId}' not found in company '${companyId}'.`);
    }

    // 1. Fetch raw daily attendance
    let dailyAtt = await DailyAttendanceRepository.findByEmployeeAndDate(employeeId, date, companyId);
    
    // 2. Fetch shift assignment & roster
    const shift = dailyAtt?.shiftId ? this.db.shifts.get(dailyAtt.shiftId) : undefined;
    const isHoliday = dailyAtt?.isHoliday ?? false;
    const isWeeklyOff = dailyAtt?.isWeeklyOff ?? false;
    const holiday = Array.from(this.db.holidays.values()).find((h) => h.companyId === companyId && h.date === date);
    const holidayName = holiday?.name || dailyAtt?.holidayName;

    // 3. Find APPROVED leave requests covering this date
    const leaveRequests = Array.from(this.db.leaveRequests.values()).filter((lr) => {
      return (
        lr.companyId === companyId &&
        lr.employeeId === employeeId &&
        lr.status === 'APPROVED' &&
        lr.fromDate <= date &&
        lr.toDate >= date
      );
    });

    const approvedRequest = leaveRequests.length > 0 ? leaveRequests[0] : null;

    let hasApprovedLeave = false;
    let leaveRequestId: string | undefined;
    let leaveTypeId: string | undefined;
    let leaveTypeCode: string | undefined;
    let leaveTypeName: string | undefined;
    let leavePolicyId: string | undefined;
    let leaveYearId: string | undefined;
    let leaveUnit: 'FULL_DAY' | 'HALF_DAY' | 'HOURS' = 'FULL_DAY';
    let leaveHalfDayPeriod: 'FIRST_HALF' | 'SECOND_HALF' | 'NONE' = 'NONE';
    let leavePaidType: 'PAID' | 'UNPAID' | 'SPECIAL' = 'PAID';
    let leaveReason: string | undefined;

    let reconciledCoverage: ReconciledCoverageType = 'NONE';
    let paidLeaveUnits = 0;
    let unpaidLeaveUnits = 0;
    let uncoveredAbsenceUnits = 0;
    let lossOfPayUnits = 0;
    let payableUnits = 0;

    let hasConflict = false;
    let conflictType: ReconciliationConflictType | undefined;
    let conflictDetails: string | undefined;
    let reconciliationNote = 'Standard attendance fact applied.';

    // Check if approved leave exists
    if (approvedRequest) {
      hasApprovedLeave = true;
      leaveRequestId = approvedRequest.id;
      leaveTypeId = approvedRequest.leaveTypeId;
      leavePolicyId = approvedRequest.leavePolicyId;
      leaveYearId = approvedRequest.leaveYearId;
      leaveReason = approvedRequest.reason;

      const leaveType = this.db.leaveTypes.get(approvedRequest.leaveTypeId);
      leaveTypeCode = leaveType?.code || 'LEAVE';
      leaveTypeName = leaveType?.name || 'Leave';
      leavePaidType = leaveType?.paidType || 'PAID';

      // 3.1 Consistency check: verify consumption ledger entry exists in employee_leave_ledger
      const ledgerEntries = Array.from(this.db.leaveLedgers.values()).filter((l) => {
        return (
          l.companyId === companyId &&
          l.employeeId === employeeId &&
          l.referenceType === 'LEAVE_REQUEST' &&
          l.referenceId === approvedRequest.id &&
          l.transactionType === 'LEAVE_CONSUMPTION'
        );
      });

      if (ledgerEntries.length === 0) {
        hasConflict = true;
        conflictType = 'MISSING_LEDGER_CONSUMPTION';
        conflictDetails = `Approved leave request ${approvedRequest.id} has no corresponding LEAVE_CONSUMPTION entry in the leave ledger.`;
      }

      // 3.2 Check if half day leave
      const isHalfDayLeave = approvedRequest.unit === 'HALF_DAY';
      leaveUnit = isHalfDayLeave ? 'HALF_DAY' : 'FULL_DAY';
      leaveHalfDayPeriod = (approvedRequest.halfDayPeriod || 'NONE') as any;

      const isPaidLeave = leavePaidType === 'PAID';
      const netWorkMins = dailyAtt?.netWorkMinutes || 0;
      const requiredFullDayMins = (shift?.fullDayHours || 8) * 60;
      const requiredHalfDayMins = (shift?.halfDayHours || 4) * 60;
      const hasFullAttendancePunches = netWorkMins >= requiredFullDayMins;
      const hasHalfAttendancePunches = netWorkMins >= requiredHalfDayMins;

      if (!isHalfDayLeave) {
        // --- FULL DAY LEAVE ---
        if (hasFullAttendancePunches) {
          // CONFLICT: Full day leave + Full day attendance work!
          hasConflict = true;
          conflictType = 'LEAVE_ATTENDANCE_CONFLICT';
          conflictDetails = `Employee has approved full-day leave (${leaveTypeCode}) but also worked full shift (${Math.round(netWorkMins / 60)} hrs) on ${date}.`;
          reconciledCoverage = 'CONFLICT';
          // Do not double count. Treat as work present with conflict flag.
          paidLeaveUnits = 0;
          unpaidLeaveUnits = 0;
          uncoveredAbsenceUnits = 0;
          lossOfPayUnits = 0;
          payableUnits = 1.0;
          reconciliationNote = 'CONFLICT: Full day leave approved while full day attendance worked. Requires HR resolution.';
        } else {
          // Legitimate full-day leave
          if (isPaidLeave) {
            reconciledCoverage = 'PAID';
            paidLeaveUnits = 1.0;
            unpaidLeaveUnits = 0;
            uncoveredAbsenceUnits = 0;
            lossOfPayUnits = 0;
            payableUnits = 1.0;
            reconciliationNote = `Approved full-day paid leave (${leaveTypeCode}) applied. Full pay, 0 LOP.`;
          } else {
            reconciledCoverage = 'UNPAID';
            paidLeaveUnits = 0;
            unpaidLeaveUnits = 1.0;
            uncoveredAbsenceUnits = 0;
            lossOfPayUnits = 1.0;
            payableUnits = 0.0;
            reconciliationNote = `Approved full-day unpaid leave (${leaveTypeCode}) applied. 1.0 LOP, 0 pay.`;
          }
        }
      } else {
        // --- HALF DAY LEAVE (0.5 day) ---
        if (isPaidLeave) {
          paidLeaveUnits = 0.5;
          if (hasHalfAttendancePunches || dailyAtt?.status === 'HALF_DAY' || dailyAtt?.status === 'PRESENT') {
            // Half day worked + Half day paid leave = 1.0 full day payable
            reconciledCoverage = 'PARTIAL';
            unpaidLeaveUnits = 0;
            uncoveredAbsenceUnits = 0;
            lossOfPayUnits = 0;
            payableUnits = 1.0; // 0.5 work + 0.5 paid leave
            reconciliationNote = `Half-day paid leave (${leaveTypeCode}) + half-day worked. 1.0 payable day, 0 LOP.`;
          } else {
            // Half day paid leave + half day absent (no work punches)
            reconciledCoverage = 'PARTIAL';
            unpaidLeaveUnits = 0;
            uncoveredAbsenceUnits = 0.5;
            lossOfPayUnits = 0.5;
            payableUnits = 0.5; // 0.5 paid leave only
            reconciliationNote = `Half-day paid leave (${leaveTypeCode}) + half-day unexplained absence. 0.5 LOP, 0.5 payable.`;
          }
        } else {
          // Half day unpaid leave
          unpaidLeaveUnits = 0.5;
          if (hasHalfAttendancePunches || dailyAtt?.status === 'HALF_DAY' || dailyAtt?.status === 'PRESENT') {
            // Half day worked + Half day unpaid leave
            reconciledCoverage = 'PARTIAL';
            paidLeaveUnits = 0;
            uncoveredAbsenceUnits = 0;
            lossOfPayUnits = 0.5;
            payableUnits = 0.5; // 0.5 work
            reconciliationNote = `Half-day unpaid leave (${leaveTypeCode}) + half-day worked. 0.5 LOP, 0.5 payable.`;
          } else {
            // Half day unpaid leave + half day absent
            reconciledCoverage = 'UNPAID';
            paidLeaveUnits = 0;
            uncoveredAbsenceUnits = 0.5;
            lossOfPayUnits = 1.0; // 0.5 unpaid + 0.5 uncovered
            payableUnits = 0.0;
            reconciliationNote = `Half-day unpaid leave (${leaveTypeCode}) + half-day unexplained absence. 1.0 LOP, 0 payable.`;
          }
        }
      }
    } else {
      // --- NO APPROVED LEAVE ON THIS DATE ---
      reconciledCoverage = 'NONE';
      paidLeaveUnits = 0;
      unpaidLeaveUnits = 0;

      if (isWeeklyOff || isHoliday) {
        uncoveredAbsenceUnits = 0;
        lossOfPayUnits = 0;
        payableUnits = 1.0;
        reconciliationNote = isHoliday ? `Official holiday (${holidayName || 'Holiday'}). Full pay.` : 'Scheduled weekly off. Full pay.';
      } else if (dailyAtt?.status === 'PRESENT') {
        uncoveredAbsenceUnits = 0;
        lossOfPayUnits = 0;
        payableUnits = 1.0;
        reconciliationNote = 'Present on duty. Full attendance fact.';
      } else if (dailyAtt?.status === 'HALF_DAY') {
        uncoveredAbsenceUnits = 0.5;
        lossOfPayUnits = 0.5;
        payableUnits = 0.5;
        reconciliationNote = 'Half-day worked without approved leave for remainder. 0.5 LOP.';
      } else if (dailyAtt?.status === 'ABSENT' || !dailyAtt) {
        uncoveredAbsenceUnits = 1.0;
        lossOfPayUnits = 1.0;
        payableUnits = 0.0;
        reconciliationNote = 'Unexplained absence (no punches, no approved leave). 1.0 LOP.';
      } else if (dailyAtt?.status === 'INCOMPLETE') {
        uncoveredAbsenceUnits = 1.0;
        lossOfPayUnits = 1.0;
        payableUnits = 0.0;
        reconciliationNote = 'Incomplete punch record. Pending regularization or LOP.';
      } else {
        uncoveredAbsenceUnits = 0;
        lossOfPayUnits = 0;
        payableUnits = 1.0;
        reconciliationNote = `Attendance status: ${dailyAtt?.status}.`;
      }
    }

    // Overtime
    const overtimeRequests = Array.from(this.db.overtimeRequests.values()).filter((ot) => {
      return (
        ot.companyId === companyId &&
        ot.employeeId === employeeId &&
        ot.attendanceDate === date &&
        ot.status === 'APPROVED'
      );
    });
    const approvedOvertimeMinutes = overtimeRequests.reduce((sum, ot) => sum + (ot.approvedMinutes || ot.requestedMinutes || 0), 0);

    // 4. Create or update LeaveAttendanceReconciliation record
    const reconId = `lar-${companyId.replace('comp-', '')}-${employeeId.replace('emp-', '')}-${date.replace(/-/g, '')}`;
    const nowIso = new Date().toISOString();

    const reconciliation: LeaveAttendanceReconciliation = {
      id: reconId,
      companyId,
      employeeId,
      attendanceDate: date,
      dailyAttendanceId: dailyAtt?.id,
      leaveRequestId,
      leaveTypeId,
      leaveTypeCode,
      leaveTypeName,
      leavePolicyId,
      leaveYearId,
      unit: leaveUnit,
      halfDayPeriod: leaveHalfDayPeriod,
      reconciledCoverage,
      paidLeaveUnits,
      unpaidLeaveUnits,
      uncoveredAbsenceUnits,
      lossOfPayUnits,
      payableUnits,
      hasConflict,
      conflictType,
      conflictDetails,
      status: 'ACTIVE',
      version,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: options?.actor?.id || 'system',
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : undefined,
      employeeCode: employee?.employeeCode,
      shiftCode: shift?.code,
      rawAttendanceStatus: dailyAtt?.status,
    };

    await LeaveAttendanceReconciliationRepository.save(reconciliation);

    // 5. Update daily_attendance record to retain trace
    if (dailyAtt) {
      const updatedDaily: DailyAttendance = {
        ...dailyAtt,
        reconciledLeaveStatus: hasApprovedLeave ? (leavePaidType === 'PAID' ? 'PAID_LEAVE' : 'UNPAID_LEAVE') : undefined,
        leaveCoverage: reconciledCoverage,
        paidLeaveUnits,
        unpaidLeaveUnits,
        lossOfPayUnits,
        reconciledPayableUnits: payableUnits,
        leaveRequestId,
        leaveTypeId,
        leaveTypeCode,
        leaveCoverageNote: reconciliationNote,
        reconciliationId: reconId,
        reconciledAt: nowIso,
        updatedAt: nowIso,
      };
      await DailyAttendanceRepository.save(updatedDaily);
    }

    const explanation: DateReconciliationExplanation = {
      date,
      dayOfWeek: this.getDayOfWeek(date),
      employeeId,
      employeeCode: employee.employeeCode,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      shiftId: shift?.id,
      shiftCode: shift?.code,
      shiftName: shift?.name,
      scheduledStart: shift?.startTime,
      scheduledEnd: shift?.endTime,
      isWeeklyOff,
      isHoliday,
      holidayName,
      firstCheckIn: dailyAtt?.firstCheckIn,
      lastCheckOut: dailyAtt?.lastCheckOut,
      grossWorkMinutes: dailyAtt?.grossWorkMinutes || 0,
      netWorkMinutes: dailyAtt?.netWorkMinutes || 0,
      rawAttendanceStatus: dailyAtt?.status || 'ABSENT',
      isLate: dailyAtt?.isLate || false,
      isEarlyExit: dailyAtt?.isEarlyExit || false,
      isHalfDay: dailyAtt?.status === 'HALF_DAY',
      hasApprovedLeave,
      leaveRequestId,
      leaveTypeCode,
      leaveTypeName,
      leavePaidType,
      leaveUnit,
      leaveHalfDayPeriod,
      leaveReason,
      reconciledCoverage,
      paidLeaveUnits,
      unpaidLeaveUnits,
      uncoveredAbsenceUnits,
      lossOfPayUnits,
      payableUnits,
      approvedOvertimeMinutes,
      hasConflict,
      conflictType,
      conflictDetails,
      reconciliationNote,
    };

    return { reconciliation, explanation };
  }

  /**
   * Reconciles all employees for an attendance period.
   * Computes authoritative draft summaries and detects period blockers.
   */
  public static async reconcilePeriod(
    companyId: string,
    periodId: string,
    actor: ServiceActor
  ): Promise<PeriodReconciliationReport> {
    const period = await AttendancePeriodRepository.findById(periodId, companyId);
    if (!period) {
      throw new Error(`Attendance period '${periodId}' not found for company '${companyId}'.`);
    }

    if (period.status === 'FINALIZED' || period.status === 'LOCKED') {
      throw new Error(`Attendance period '${period.name}' is already FINALIZED/LOCKED. Direct mutation blocked. Please reopen period first.`);
    }

    // Get all active employees
    const employees = await EmployeeRepository.findAll(companyId, { status: 'ACTIVE' });
    
    // Generate dates array for period
    const dates: string[] = [];
    const curr = new Date(period.startDate + 'T00:00:00Z');
    const end = new Date(period.endDate + 'T00:00:00Z');
    while (curr <= end) {
      dates.push(this.formatDate(curr));
      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    const conflicts: Array<{
      id: string;
      employeeId: string;
      employeeCode?: string;
      employeeName?: string;
      date: string;
      type: ReconciliationConflictType;
      details: string;
    }> = [];

    const summaries: AttendancePeriodSummary[] = [];
    const nowIso = new Date().toISOString();

    for (const emp of employees) {
      let presentDays = 0;
      let absentDays = 0;
      let halfDays = 0;
      let weeklyOffDays = 0;
      let holidayDays = 0;
      let missingPunchDays = 0;
      let lateArrivalsCount = 0;
      let earlyExitsCount = 0;
      let totalLateMinutes = 0;
      let totalEarlyExitMinutes = 0;
      let totalGrossWorkMinutes = 0;
      let totalNetWorkMinutes = 0;
      let calculatedOvertimeMinutes = 0;

      let empPaidLeaveDays = 0;
      let empUnpaidLeaveDays = 0;
      let empUncoveredAbsenceDays = 0;
      let empLossOfPayDays = 0;
      let empPayableDays = 0;
      let empConflictCount = 0;

      for (const d of dates) {
        const { reconciliation } = await this.reconcileEmployeeDate(companyId, emp.id, d, {
          version: period.lockVersion || 1,
          actor,
        });

        if (reconciliation.hasConflict && reconciliation.conflictType) {
          empConflictCount++;
          conflicts.push({
            id: reconciliation.id,
            employeeId: emp.id,
            employeeCode: emp.employeeCode,
            employeeName: `${emp.firstName} ${emp.lastName}`,
            date: d,
            type: reconciliation.conflictType,
            details: reconciliation.conflictDetails || 'Conflict detected during reconciliation.',
          });
        }

        empPaidLeaveDays += reconciliation.paidLeaveUnits;
        empUnpaidLeaveDays += reconciliation.unpaidLeaveUnits;
        empUncoveredAbsenceDays += reconciliation.uncoveredAbsenceUnits;
        empLossOfPayDays += reconciliation.lossOfPayUnits;
        empPayableDays += reconciliation.payableUnits;

        // Raw daily facts
        const daily = await DailyAttendanceRepository.findByEmployeeAndDate(emp.id, d, companyId);
        if (daily) {
          if (daily.status === 'PRESENT') presentDays++;
          else if (daily.status === 'ABSENT') absentDays++;
          else if (daily.status === 'HALF_DAY') halfDays++;
          else if (daily.status === 'WEEKLY_OFF') weeklyOffDays++;
          else if (daily.status === 'HOLIDAY') holidayDays++;
          else if (daily.status === 'INCOMPLETE') missingPunchDays++;

          if (daily.isLate) {
            lateArrivalsCount++;
            totalLateMinutes += daily.lateMinutes || 0;
          }
          if (daily.isEarlyExit) {
            earlyExitsCount++;
            totalEarlyExitMinutes += daily.earlyExitMinutes || 0;
          }
          totalGrossWorkMinutes += daily.grossWorkMinutes || 0;
          totalNetWorkMinutes += daily.netWorkMinutes || 0;
          calculatedOvertimeMinutes += daily.calculatedOvertimeMinutes || 0;
        } else {
          // If no daily record, treated as absent/uncovered unless holiday/off
          const dObj = new Date(d + 'T00:00:00Z');
          const isSun = dObj.getUTCDay() === 0;
          if (isSun) weeklyOffDays++;
          else absentDays++;
        }
      }

      // Approved Overtime
      const otRequests = await OvertimeRequestRepository.findByEmployeeAndPeriod(emp.id, period.startDate, period.endDate, companyId);
      const approvedOvertimeMinutes = otRequests
        .filter((ot) => ot.status === 'APPROVED')
        .reduce((sum, ot) => sum + (ot.approvedMinutes || ot.requestedMinutes || 0), 0);

      const summaryId = `aps-${period.id.replace('attp-', '')}-${emp.id.replace('emp-', '')}`;
      const attendanceEquivalentDays = presentDays + (halfDays * 0.5) + weeklyOffDays + holidayDays;

      const summary: AttendancePeriodSummary = {
        id: summaryId,
        periodId: period.id,
        companyId,
        employeeId: emp.id,
        calendarDays: dates.length,
        scheduledWorkDays: dates.length - (weeklyOffDays + holidayDays),
        presentDays,
        absentDays,
        halfDays,
        weeklyOffDays,
        holidayDays,
        missingPunchDays,
        attendanceEquivalentDays,
        paidLeaveDays: empPaidLeaveDays,
        unpaidLeaveDays: empUnpaidLeaveDays,
        lossOfPayDays: empLossOfPayDays,
        payableDays: empPayableDays,
        leaveIntegrationStatus: 'RECONCILED',
        uncoveredAbsenceDays: empUncoveredAbsenceDays,
        conflictDaysCount: empConflictCount,
        reconciliationVersion: period.lockVersion || 1,
        lateArrivalsCount,
        earlyExitsCount,
        totalLateMinutes,
        totalEarlyExitMinutes,
        totalGrossWorkMinutes,
        totalNetWorkMinutes,
        calculatedOvertimeMinutes,
        approvedOvertimeMinutes,
        status: period.status === 'OPEN' ? 'DRAFT' as any : 'FINALIZED' as any,
        version: period.lockVersion || 1,
        createdAt: nowIso,
        updatedAt: nowIso,
        employeeCode: emp.employeeCode,
        displayName: `${emp.firstName} ${emp.lastName}`,
        employeeName: `${emp.firstName} ${emp.lastName}`,
      };

      await AttendancePeriodSummaryRepository.save(summary);
      summaries.push(summary);
    }

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'RECONCILE_PERIOD_LEAVE_ATTENDANCE',
      targetModule: 'Attendance',
      targetRecordId: period.id,
      companyId,
      changesSummary: `Reconciled leave and attendance for period '${period.name}' across ${employees.length} employees. (${conflicts.length} conflicts found).`,
    });

    const totalPaidLeaveDays = summaries.reduce((s, x) => s + (x.paidLeaveDays || 0), 0);
    const totalUnpaidLeaveDays = summaries.reduce((s, x) => s + (x.unpaidLeaveDays || 0), 0);
    const totalLossOfPayDays = summaries.reduce((s, x) => s + (x.lossOfPayDays || 0), 0);
    const totalPayableDays = summaries.reduce((s, x) => s + (x.payableDays || 0), 0);

    return {
      periodId: period.id,
      companyId,
      totalEmployees: employees.length,
      reconciledCount: summaries.length,
      conflictCount: conflicts.length,
      totalPaidLeaveDays,
      totalUnpaidLeaveDays,
      totalLossOfPayDays,
      totalPayableDays,
      conflicts,
      summaries,
    };
  }

  /**
   * Retrieves comprehensive date-by-date reconciliation explanations for an employee over a period or date range.
   */
  public static async getEmployeeReconciliations(
    companyId: string,
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<DateReconciliationExplanation[]> {
    const dates: string[] = [];
    const curr = new Date(startDate + 'T00:00:00Z');
    const end = new Date(endDate + 'T00:00:00Z');
    while (curr <= end) {
      dates.push(this.formatDate(curr));
      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    const explanations: DateReconciliationExplanation[] = [];
    for (const d of dates) {
      const { explanation } = await this.reconcileEmployeeDate(companyId, employeeId, d);
      explanations.push(explanation);
    }

    return explanations;
  }
}
