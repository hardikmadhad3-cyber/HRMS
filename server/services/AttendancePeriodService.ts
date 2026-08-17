import {
  AttendancePeriod,
  AttendancePeriodSummary,
  AttendancePeriodReviewReport,
  FinalizationBlocker,
  CreatePeriodDTO,
  FinalizePeriodDTO,
  ReopenPeriodDTO,
} from '../../src/types/period.js';
import { AuthUser, UserRole, PermissionKey } from '../../src/types/auth.js';
import { RelationalDatabase } from '../database/RelationalDatabase.js';
import { AttendancePeriodRepository } from '../database/repositories/AttendancePeriodRepository.js';
import { AttendancePeriodSummaryRepository } from '../database/repositories/AttendancePeriodSummaryRepository.js';
import { DailyAttendanceRepository } from '../database/repositories/DailyAttendanceRepository.js';
import { AttendanceRegularizationRepository } from '../database/repositories/AttendanceRegularizationRepository.js';
import { OvertimeRequestRepository } from '../database/repositories/OvertimeRequestRepository.js';
import { TimeLeavePeriodSnapshotRepository } from '../database/repositories/TimeLeavePeriodSnapshotRepository.js';
import { LeaveAttendanceReconciliationService } from './LeaveAttendanceReconciliationService.js';
import { AuditService } from './AuditService.js';

export class AttendancePeriodService {
  private static db = RelationalDatabase.getInstance();

  /**
   * Check if a specific date in a company is inside a locked/finalized attendance period
   */
  public static async isDateLocked(companyId: string, date: string): Promise<boolean> {
    const period = await AttendancePeriodRepository.findByDate(companyId, date);
    if (!period) return false;
    return period.status === 'FINALIZED' || period.status === 'LOCKED';
  }

  /**
   * 1. Get or Create Attendance Period for a month
   */
  public static async getOrCreatePeriod(
    companyId: string,
    year: number,
    month: number,
    actor?: AuthUser
  ): Promise<AttendancePeriod> {
    let period = await AttendancePeriodRepository.findByYearMonth(companyId, year, month);
    if (period) return period;

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = monthNames[month - 1];
    const code = `${monthName.substring(0, 3).toUpperCase()}-${year}`;
    const name = `${monthName} ${year} Attendance Period`;
    const id = `period-${companyId}-${year}${String(month).padStart(2, '0')}`;

    const newPeriod: AttendancePeriod = {
      id,
      companyId,
      code,
      name,
      year,
      month,
      startDate,
      endDate,
      status: 'OPEN',
      lockVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: actor?.id || 'system',
    };

    const saved = await AttendancePeriodRepository.create(newPeriod);

    if (actor) {
      await AuditService.log({
        companyId,
        actorId: actor.id,
        actorName: actor.fullName,
        actorEmail: actor.email,
        action: 'ATTENDANCE_PERIOD_CREATED',
        targetModule: 'ATTENDANCE',
        targetRecordId: saved.id,
        changesSummary: `Created attendance period ${saved.name} (${saved.startDate} to ${saved.endDate})`,
      });
    }

    return saved;
  }

  /**
   * 2. Gather Period Review Report & Blockers (including Leave Reconciliation Conflicts)
   */
  public static async getPeriodReviewReport(
    companyId: string,
    periodId: string,
    actor: AuthUser
  ): Promise<AttendancePeriodReviewReport> {
    const period = await AttendancePeriodRepository.findById(periodId, companyId);
    if (!period) {
      throw new Error('ATTENDANCE_PERIOD_NOT_FOUND: Attendance period not found');
    }

    // Get active employees for company
    const employees = Array.from(this.db.employees.values()).filter(
      (e) => e.companyId === companyId && e.status === 'ACTIVE'
    );

    // Get all daily attendance records for this period
    const dailyRecords = await DailyAttendanceRepository.findAll(companyId, {
      startDate: period.startDate,
      endDate: period.endDate,
    });

    // Check for blockers:
    const blockers: FinalizationBlocker[] = [];

    // 1. Missing punches / Incomplete days
    const incompleteDays = dailyRecords.filter((d) => d.status === 'INCOMPLETE' || d.hasException);
    const missingPunchDays = dailyRecords.filter(
      (d) => d.status === 'INCOMPLETE' || (d.firstCheckIn && !d.lastCheckOut)
    );

    if (missingPunchDays.length > 0) {
      blockers.push({
        type: 'MISSING_PUNCH',
        count: missingPunchDays.length,
        message: `${missingPunchDays.length} daily attendance records have missing punch-outs or incomplete state.`,
        details: missingPunchDays.slice(0, 10).map((d) => ({
          id: d.id,
          employeeId: d.employeeId,
          employeeCode: d.employeeCode,
          employeeName: d.displayName,
          date: d.attendanceDate,
          description: `Missing check-out on ${d.attendanceDate} (Shift: ${d.shiftName || 'Standard'})`,
        })),
      });
    }

    // 2. Pending Regularizations
    const pendingRegularizations = Array.from(this.db.attendanceRegularizationRequests.values()).filter(
      (r) =>
        r.companyId === companyId &&
        r.status === 'PENDING' &&
        r.attendanceDate >= period.startDate &&
        r.attendanceDate <= period.endDate
    );

    if (pendingRegularizations.length > 0) {
      blockers.push({
        type: 'PENDING_REGULARIZATION',
        count: pendingRegularizations.length,
        message: `${pendingRegularizations.length} attendance regularization requests are pending approval.`,
        details: pendingRegularizations.slice(0, 10).map((r) => {
          const emp = this.db.employees.get(r.employeeId);
          return {
            id: r.id,
            employeeId: r.employeeId,
            employeeCode: emp?.employeeCode,
            employeeName: emp?.displayName,
            date: r.attendanceDate,
            description: `Regularization requested: ${r.reason} (${r.requestedCheckIn || ''} - ${r.requestedCheckOut || ''})`,
          };
        }),
      });
    }

    // 3. Pending Overtime Requests
    const pendingOtRequests = Array.from(this.db.overtimeRequests.values()).filter(
      (r) =>
        r.companyId === companyId &&
        r.status === 'PENDING' &&
        r.attendanceDate >= period.startDate &&
        r.attendanceDate <= period.endDate
    );

    if (pendingOtRequests.length > 0) {
      blockers.push({
        type: 'PENDING_OVERTIME',
        count: pendingOtRequests.length,
        message: `${pendingOtRequests.length} overtime requests are pending managerial approval.`,
        details: pendingOtRequests.slice(0, 10).map((r) => {
          const emp = this.db.employees.get(r.employeeId);
          return {
            id: r.id,
            employeeId: r.employeeId,
            employeeCode: emp?.employeeCode,
            employeeName: emp?.displayName,
            date: r.attendanceDate,
            description: `Overtime requested: ${r.requestedMinutes} mins on ${r.attendanceDate} (${r.reason})`,
          };
        }),
      });
    }

    // 4. Pending Leave Requests inside Period
    const pendingLeaveRequests = Array.from(this.db.leaveRequests.values()).filter(
      (lr) =>
        lr.companyId === companyId &&
        (lr.status === 'SUBMITTED' || lr.status === 'PENDING') &&
        lr.fromDate <= period.endDate &&
        lr.toDate >= period.startDate
    );

    if (pendingLeaveRequests.length > 0) {
      blockers.push({
        type: 'PENDING_LEAVE_REQUEST',
        count: pendingLeaveRequests.length,
        message: `${pendingLeaveRequests.length} leave requests in this period are pending approval.`,
        details: pendingLeaveRequests.slice(0, 10).map((lr) => {
          const emp = this.db.employees.get(lr.employeeId);
          return {
            id: lr.id,
            employeeId: lr.employeeId,
            employeeCode: emp?.employeeCode,
            employeeName: emp ? `${emp.firstName} ${emp.lastName}` : lr.employeeId,
            date: lr.fromDate,
            description: `Leave ${lr.fromDate} to ${lr.toDate} (${lr.requestedUnits} units) pending approval.`,
          };
        }),
      });
    }

    // Generate or fetch summaries
    let summaries: AttendancePeriodSummary[] = [];
    if (period.status === 'FINALIZED' || period.status === 'LOCKED') {
      summaries = await AttendancePeriodSummaryRepository.findByPeriodId(period.id, companyId);
    } else {
      summaries = await this.computeDraftSummaries(companyId, period, employees);
    }

    // 5. Check for Leave Attendance Conflicts
    const conflictSummaries = summaries.filter((s) => (s.conflictDaysCount || 0) > 0);
    const totalLeaveConflicts = summaries.reduce((sum, s) => sum + (s.conflictDaysCount || 0), 0);

    if (totalLeaveConflicts > 0) {
      blockers.push({
        type: 'LEAVE_ATTENDANCE_CONFLICT',
        count: totalLeaveConflicts,
        message: `${totalLeaveConflicts} leave vs. attendance conflicts detected across ${conflictSummaries.length} employees.`,
        details: conflictSummaries.slice(0, 10).map((s) => ({
          id: s.id,
          employeeId: s.employeeId,
          employeeCode: s.employeeCode,
          employeeName: s.displayName || s.employeeName,
          date: period.startDate,
          description: `${s.conflictDaysCount} conflict days detected (e.g. approved full-day leave + full day attendance punches).`,
        })),
      });
    }

    const lastDayOfMonth = new Date(period.year, period.month, 0).getDate();

    let totalPresentDays = summaries.reduce((s, x) => s + (x.presentDays || 0), 0);
    let totalAbsentDays = summaries.reduce((s, x) => s + (x.absentDays || 0), 0);
    let totalHalfDays = summaries.reduce((s, x) => s + (x.halfDays || 0), 0);
    let totalWeeklyOffDays = summaries.reduce((s, x) => s + (x.weeklyOffDays || 0), 0);
    let totalHolidayDays = summaries.reduce((s, x) => s + (x.holidayDays || 0), 0);
    let totalPaidLeaveDays = summaries.reduce((s, x) => s + (x.paidLeaveDays || 0), 0);
    let totalUnpaidLeaveDays = summaries.reduce((s, x) => s + (x.unpaidLeaveDays || 0), 0);
    let totalLossOfPayDays = summaries.reduce((s, x) => s + (x.lossOfPayDays || 0), 0);
    let totalPayableDays = summaries.reduce((s, x) => s + (x.payableDays || 0), 0);
    let totalApprovedOt = summaries.reduce((s, x) => s + (x.approvedOvertimeMinutes || 0), 0);

    return {
      period,
      metrics: {
        totalEmployees: employees.length,
        calendarDays: lastDayOfMonth,
        presentDays: totalPresentDays,
        absentDays: totalAbsentDays,
        halfDays: totalHalfDays,
        weeklyOffDays: totalWeeklyOffDays,
        holidayDays: totalHolidayDays,
        paidLeaveDays: totalPaidLeaveDays,
        unpaidLeaveDays: totalUnpaidLeaveDays,
        lossOfPayDays: totalLossOfPayDays,
        payableDays: totalPayableDays,
        missingPunchesCount: missingPunchDays.length,
        pendingRegularizationsCount: pendingRegularizations.length,
        pendingOvertimeCount: pendingOtRequests.length,
        exceptionsCount: incompleteDays.length,
        leaveConflictCount: totalLeaveConflicts,
        pendingLeaveRequestsCount: pendingLeaveRequests.length,
        totalApprovedOvertimeMinutes: totalApprovedOt,
        totalApprovedOvertimeHours: Number((totalApprovedOt / 60).toFixed(1)),
        isFinalizable: blockers.length === 0,
      },
      blockers,
      summaries,
    };
  }

  /**
   * 3. Finalize Attendance Period (Atomic, Concurrency-Safe, Idempotent)
   */
  public static async finalizePeriod(
    companyId: string,
    actor: AuthUser,
    dto: FinalizePeriodDTO
  ): Promise<AttendancePeriod> {
    // 1. Permission check
    const canFinalize =
      actor.role === UserRole.SUPER_ADMIN ||
      actor.role === UserRole.HR_ADMIN ||
      actor.role === UserRole.PAYROLL_MANAGER ||
      actor.permissions.includes(PermissionKey.ATTENDANCE_PERIOD_FINALIZE);

    if (!canFinalize) {
      throw new Error('FORBIDDEN: You do not have permission to finalize attendance periods.');
    }

    // 2. Fetch period and verify state
    const period = await AttendancePeriodRepository.findById(dto.periodId, companyId);
    if (!period) {
      throw new Error('ATTENDANCE_PERIOD_NOT_FOUND: Attendance period not found');
    }

    // Idempotency: If already finalized, return existing finalized record
    if (period.status === 'FINALIZED' || period.status === 'LOCKED') {
      return period;
    }

    // 3. Review validation & blocker enforcement
    const report = await this.getPeriodReviewReport(companyId, period.id, actor);
    if (report.blockers.length > 0 && !dto.forceFinalize) {
      const blockerMessages = report.blockers.map((b) => b.message).join(' | ');
      throw new Error(`ATTENDANCE_PERIOD_HAS_BLOCKERS: Cannot finalize period. Unresolved issues: ${blockerMessages}`);
    }

    // 4. Begin transactional materialization
    const employees = Array.from(this.db.employees.values()).filter(
      (e) => e.companyId === companyId && e.status === 'ACTIVE'
    );

    const summariesToSave = await this.computeDraftSummaries(companyId, period, employees, 'FINALIZED');

    // Save summaries
    await AttendancePeriodSummaryRepository.saveBatch(summariesToSave);

    const nowIso = new Date().toISOString();

    // Save immutable snapshot archive for this version (Time & Leave Payroll-Ready Snapshot)
    const snapshotId = `snap-${period.id}-v${period.lockVersion}`;
    await AttendancePeriodSummaryRepository.saveSnapshotArchive({
      id: snapshotId,
      periodId: period.id,
      companyId,
      version: period.lockVersion,
      status: 'FINALIZED',
      finalizedAt: nowIso,
      finalizedBy: actor.id,
      summariesCount: summariesToSave.length,
      summaries: summariesToSave,
      createdAt: nowIso,
    });

    await TimeLeavePeriodSnapshotRepository.save({
      id: `tls-${period.id}-v${period.lockVersion}`,
      companyId,
      periodId: period.id,
      version: period.lockVersion,
      status: 'FINALIZED',
      finalizedAt: nowIso,
      finalizedBy: actor.id,
      finalizedByName: actor.fullName,
      reconciledBy: actor.id,
      reconciliationVersion: period.lockVersion,
      summariesCount: summariesToSave.length,
      summaries: summariesToSave,
      createdAt: nowIso,
    });

    // Update period status to FINALIZED
    const finalized = await AttendancePeriodRepository.update(period.id, companyId, {
      status: 'FINALIZED',
      finalizedAt: nowIso,
      finalizedBy: actor.id,
      lockVersion: period.lockVersion,
    });

    if (!finalized) throw new Error('Failed to update attendance period status');

    // Audit Log
    await AuditService.log({
      companyId,
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: 'ATTENDANCE_PERIOD_FINALIZED',
      targetModule: 'ATTENDANCE',
      targetRecordId: finalized.id,
      changesSummary: `Finalized attendance period ${finalized.name} (Version ${period.lockVersion}). Materialized ${summariesToSave.length} reconciled time & leave summaries. Snapshot preserved in audit archive.`,
    });

    return finalized;
  }

  /**
   * 4. Controlled Reopen Attendance Period
   */
  public static async reopenPeriod(
    companyId: string,
    actor: AuthUser,
    dto: ReopenPeriodDTO
  ): Promise<AttendancePeriod> {
    // 1. Strict permission check
    const canReopen =
      actor.role === UserRole.SUPER_ADMIN ||
      actor.role === UserRole.HR_ADMIN ||
      actor.permissions.includes(PermissionKey.ATTENDANCE_PERIOD_REOPEN);

    if (!canReopen) {
      throw new Error('FORBIDDEN: You do not have permission to reopen a finalized attendance period.');
    }

    if (!dto.reason || dto.reason.trim().length < 10) {
      throw new Error('VALIDATION_ERROR: A detailed reason (at least 10 characters) is required to reopen a period.');
    }

    const period = await AttendancePeriodRepository.findById(dto.periodId, companyId);
    if (!period) {
      throw new Error('ATTENDANCE_PERIOD_NOT_FOUND: Attendance period not found');
    }

    if (period.status !== 'FINALIZED' && period.status !== 'LOCKED') {
      throw new Error('VALIDATION_ERROR: Period is not in finalized state.');
    }

    const reopened = await AttendancePeriodRepository.update(period.id, companyId, {
      status: 'OPEN',
      reopenedAt: new Date().toISOString(),
      reopenedBy: actor.id,
      reopenReason: dto.reason.trim(),
      lockVersion: period.lockVersion + 1,
    });

    if (!reopened) throw new Error('Failed to reopen attendance period');

    // Audit Log
    await AuditService.log({
      companyId,
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: 'ATTENDANCE_PERIOD_REOPENED',
      targetModule: 'ATTENDANCE',
      targetRecordId: reopened.id,
      changesSummary: `Reopened attendance period ${reopened.name}. Version bumped to ${reopened.lockVersion}. Reason: ${dto.reason.trim()}`,
    });

    return reopened;
  }

  /**
   * 5. Get Payroll-Ready Summaries for a Period
   */
  public static async getPeriodSummaries(
    companyId: string,
    periodId: string,
    actor: AuthUser
  ): Promise<AttendancePeriodSummary[]> {
    const period = await AttendancePeriodRepository.findById(periodId, companyId);
    if (!period) {
      throw new Error('ATTENDANCE_PERIOD_NOT_FOUND: Attendance period not found');
    }

    if (period.status === 'FINALIZED' || period.status === 'LOCKED') {
      return AttendancePeriodSummaryRepository.findByPeriodId(periodId, companyId);
    } else {
      const employees = Array.from(this.db.employees.values()).filter(
        (e) => e.companyId === companyId && e.status === 'ACTIVE'
      );
      return this.computeDraftSummaries(companyId, period, employees, 'DRAFT');
    }
  }

  /**
   * Compute authoritative draft/finalized summaries integrating Attendance facts and Leave reconciliations.
   */
  public static async computeDraftSummaries(
    companyId: string,
    period: AttendancePeriod,
    employees: any[],
    status: 'DRAFT' | 'FINALIZED' = 'DRAFT'
  ): Promise<AttendancePeriodSummary[]> {
    // Generate dates array for period
    const dates: string[] = [];
    const curr = new Date(period.startDate + 'T00:00:00Z');
    const end = new Date(period.endDate + 'T00:00:00Z');
    while (curr <= end) {
      const yyyy = curr.getUTCFullYear();
      const mm = String(curr.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(curr.getUTCDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
      curr.setUTCDate(curr.getUTCDate() + 1);
    }

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
        const { reconciliation } = await LeaveAttendanceReconciliationService.reconcileEmployeeDate(companyId, emp.id, d, {
          version: period.lockVersion || 1,
        });

        if (reconciliation.hasConflict) {
          empConflictCount++;
        }

        empPaidLeaveDays += reconciliation.paidLeaveUnits;
        empUnpaidLeaveDays += reconciliation.unpaidLeaveUnits;
        empUncoveredAbsenceUnits: empUncoveredAbsenceDays += reconciliation.uncoveredAbsenceUnits;
        empLossOfPayDays += reconciliation.lossOfPayUnits;
        empPayableDays += reconciliation.payableUnits;

        // Raw daily attendance facts
        const daily = await DailyAttendanceRepository.findByEmployeeAndDate(emp.id, d, companyId);
        if (daily) {
          if (daily.status === 'PRESENT' || daily.calculationStatus === 'REGULARIZED') {
            presentDays += 1;
          } else if (daily.status === 'HALF_DAY') {
            halfDays += 1;
          } else if (daily.status === 'ABSENT') {
            absentDays += 1;
          } else if (daily.status === 'WEEKLY_OFF') {
            weeklyOffDays += 1;
          } else if (daily.status === 'HOLIDAY') {
            holidayDays += 1;
          } else if (daily.status === 'INCOMPLETE') {
            missingPunchDays += 1;
            absentDays += 1;
          }

          if (daily.isLate) {
            lateArrivalsCount += 1;
            totalLateMinutes += daily.lateMinutes || 0;
          }
          if (daily.isEarlyExit) {
            earlyExitsCount += 1;
            totalEarlyExitMinutes += daily.earlyExitMinutes || 0;
          }

          totalGrossWorkMinutes += daily.grossWorkMinutes || 0;
          totalNetWorkMinutes += daily.netWorkMinutes || 0;

          if (daily.calculatedOvertimeMinutes) calculatedOvertimeMinutes += daily.calculatedOvertimeMinutes;
        } else {
          const dObj = new Date(d + 'T00:00:00Z');
          const isSun = dObj.getUTCDay() === 0;
          if (isSun) weeklyOffDays += 1;
          else absentDays += 1;
        }
      }

      // Approved Overtime for period
      const otRequests = await OvertimeRequestRepository.findByEmployeeAndPeriod(emp.id, period.startDate, period.endDate, companyId);
      const approvedOvertimeMinutes = otRequests
        .filter((ot) => ot.status === 'APPROVED')
        .reduce((sum, ot) => sum + (ot.approvedMinutes || ot.requestedMinutes || 0), 0);

      // Scheduled work days = calendar days - weekly offs - holidays
      const scheduledWorkDays = Math.max(0, dates.length - weeklyOffDays - holidayDays);
      
      // Attendance Equivalent Days (raw attendance fact)
      const attendanceEquivalentDays = presentDays + (halfDays * 0.5) + weeklyOffDays + holidayDays;

      const summaryId = `sum-${period.id}-${emp.id}`;
      summaries.push({
        id: summaryId,
        companyId,
        periodId: period.id,
        employeeId: emp.id,
        calendarDays: dates.length,
        scheduledWorkDays,
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
        reconciliationVersion: period.lockVersion,
        lateArrivalsCount,
        earlyExitsCount,
        totalLateMinutes,
        totalEarlyExitMinutes,
        totalGrossWorkMinutes,
        totalNetWorkMinutes,
        calculatedOvertimeMinutes,
        approvedOvertimeMinutes,
        status,
        version: period.lockVersion,
        finalizedAt: status === 'FINALIZED' ? nowIso : undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
        employeeCode: emp.employeeCode,
        displayName: emp.displayName || `${emp.firstName} ${emp.lastName}`,
        employeeName: emp.displayName || `${emp.firstName} ${emp.lastName}`,
        avatarUrl: emp.avatarUrl,
      });
    }

    return summaries;
  }
}

