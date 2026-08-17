import { OvertimePolicy, OvertimeRequest, SubmitOvertimeDTO, ActionOvertimeDTO, OvertimeFilter, OvertimeEligibilityResult } from '../../src/types/overtime.js';
import { AuthUser, UserRole, PermissionKey } from '../../src/types/auth.js';
import { RelationalDatabase } from '../database/RelationalDatabase.js';
import { OvertimePolicyRepository } from '../database/repositories/OvertimePolicyRepository.js';
import { OvertimeRequestRepository } from '../database/repositories/OvertimeRequestRepository.js';
import { DailyAttendanceRepository } from '../database/repositories/DailyAttendanceRepository.js';
import { AttendancePeriodRepository } from '../database/repositories/AttendancePeriodRepository.js';
import { AuditService } from './AuditService.js';

export class OvertimeService {
  private static db = RelationalDatabase.getInstance();

  /**
   * 1. Calculate Overtime Eligibility for an Employee on a given date based on Policy
   */
  public static async calculateEligibility(
    companyId: string,
    employeeId: string,
    attendanceDate: string
  ): Promise<OvertimeEligibilityResult> {
    const policy = await OvertimePolicyRepository.findByCompanyId(companyId);
    if (!policy || policy.status !== 'ACTIVE') {
      return {
        isEligible: false,
        calculatedMinutes: 0,
        reason: 'No active overtime policy configured for this company',
        grossWorkMinutes: 0,
        netWorkMinutes: 0,
        scheduledShiftMinutes: 0,
      };
    }

    const daily = await DailyAttendanceRepository.findByEmployeeAndDate(employeeId, attendanceDate, companyId);
    if (!daily) {
      return {
        isEligible: false,
        calculatedMinutes: 0,
        reason: 'No attendance record found for this date',
        grossWorkMinutes: 0,
        netWorkMinutes: 0,
        scheduledShiftMinutes: 0,
      };
    }

    const shift = daily.shiftId ? this.db.shifts.get(daily.shiftId) : undefined;
    const isWeeklyOff = daily.isWeeklyOff;
    const isHoliday = daily.isHoliday;

    // Check weekly off / holiday eligibility
    if (isWeeklyOff && !policy.weeklyOffEligible) {
      return {
        isEligible: false,
        calculatedMinutes: 0,
        reason: 'Overtime on weekly offs is not eligible per company policy',
        grossWorkMinutes: daily.grossWorkMinutes,
        netWorkMinutes: daily.netWorkMinutes,
        scheduledShiftMinutes: 0,
      };
    }

    if (isHoliday && !policy.holidayEligible) {
      return {
        isEligible: false,
        calculatedMinutes: 0,
        reason: 'Overtime on holidays is not eligible per company policy',
        grossWorkMinutes: daily.grossWorkMinutes,
        netWorkMinutes: daily.netWorkMinutes,
        scheduledShiftMinutes: 0,
      };
    }

    // Determine baseline scheduled minutes
    let scheduledMinutes = 0;
    if (isWeeklyOff || isHoliday) {
      scheduledMinutes = 0;
    } else if (shift) {
      const [sh, sm] = shift.startTime.split(':').map(Number);
      const [eh, em] = shift.endTime.split(':').map(Number);
      let sMinutes = (eh * 60 + em) - (sh * 60 + sm);
      if (shift.isOvernight || sMinutes < 0) sMinutes += 1440;
      // Deduct unpaid break if shift has one
      const unpaidBreaks = Array.from(this.db.shiftBreaks.values())
        .filter((b) => b.shiftId === shift.id && !b.isPaid)
        .reduce((sum, b) => sum + b.durationMinutes, 0);
      scheduledMinutes = Math.max(0, sMinutes - unpaidBreaks);
    } else {
      scheduledMinutes = 480; // Default 8 hours
    }

    const netWorkMinutes = daily.netWorkMinutes || 0;
    const excessMinutes = Math.max(0, netWorkMinutes - scheduledMinutes);

    // Rule: Must exceed minQualifyingMinutes
    if (excessMinutes < policy.minQualifyingMinutes) {
      return {
        isEligible: false,
        calculatedMinutes: 0,
        reason: `Excess work time (${excessMinutes}m) is below minimum qualifying threshold (${policy.minQualifyingMinutes}m)`,
        policyCode: policy.code,
        grossWorkMinutes: daily.grossWorkMinutes,
        netWorkMinutes: daily.netWorkMinutes,
        scheduledShiftMinutes: scheduledMinutes,
      };
    }

    // Rule: Apply Rounding Interval (round down to nearest interval)
    const roundedMinutes = Math.floor(excessMinutes / policy.roundingIntervalMinutes) * policy.roundingIntervalMinutes;

    // Rule: Cap at daily max OT
    const calculatedMinutes = Math.min(roundedMinutes, policy.maxDailyOtMinutes);

    return {
      isEligible: calculatedMinutes > 0,
      calculatedMinutes,
      policyCode: policy.code,
      grossWorkMinutes: daily.grossWorkMinutes,
      netWorkMinutes: daily.netWorkMinutes,
      scheduledShiftMinutes: scheduledMinutes,
    };
  }

  /**
   * 2. Submit Overtime Request
   */
  public static async submitRequest(
    companyId: string,
    actor: AuthUser,
    dto: SubmitOvertimeDTO
  ): Promise<OvertimeRequest> {
    // 1. Resolve employee target
    let targetEmployeeId = dto.employeeId;
    if (!targetEmployeeId || actor.role === UserRole.EMPLOYEE) {
      const selfEmp = Array.from(this.db.employees.values()).find(
        (e) => e.companyId === companyId && (e.workEmail === actor.email || e.employeeCode === actor.employeeCode)
      );
      if (!selfEmp) {
        throw new Error('Employee profile not found for the authenticated user');
      }
      targetEmployeeId = selfEmp.id;
    }

    // 2. Check period lock status
    const period = await AttendancePeriodRepository.findByDate(companyId, dto.attendanceDate);
    if (period && (period.status === 'FINALIZED' || period.status === 'LOCKED')) {
      throw new Error('ATTENDANCE_PERIOD_LOCKED: Attendance for this period is finalized and locked for payroll.');
    }

    // 3. Check for existing request on this date
    const existing = await OvertimeRequestRepository.findByEmployeeAndDate(
      targetEmployeeId,
      dto.attendanceDate,
      companyId
    );
    if (existing && existing.status !== 'CANCELLED') {
      throw new Error('OVERTIME_ALREADY_SUBMITTED: An overtime request already exists for this date.');
    }

    // 4. Calculate eligibility
    const eligibility = await this.calculateEligibility(companyId, targetEmployeeId, dto.attendanceDate);
    if (!eligibility.isEligible) {
      throw new Error(`OVERTIME_NOT_ELIGIBLE: ${eligibility.reason || 'Not eligible for overtime on this date'}`);
    }

    if (dto.requestedMinutes <= 0 || dto.requestedMinutes > eligibility.calculatedMinutes) {
      throw new Error(
        `OVERTIME_INVALID_MINUTES: Requested minutes (${dto.requestedMinutes}) exceeds calculated eligible minutes (${eligibility.calculatedMinutes}).`
      );
    }

    // 5. Create request
    const daily = await DailyAttendanceRepository.findByEmployeeAndDate(targetEmployeeId, dto.attendanceDate, companyId);
    const id = `ot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newReq: OvertimeRequest = {
      id,
      companyId,
      employeeId: targetEmployeeId,
      attendanceDate: dto.attendanceDate,
      dailyAttendanceId: daily?.id,
      calculatedMinutes: eligibility.calculatedMinutes,
      requestedMinutes: dto.requestedMinutes,
      approvedMinutes: 0,
      reason: dto.reason,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: actor.id,
    };

    const saved = await OvertimeRequestRepository.create(newReq);

    // Link calculated OT to daily record
    if (daily) {
      await DailyAttendanceRepository.update(daily.id, companyId, {
        calculatedOvertimeMinutes: eligibility.calculatedMinutes,
        overtimeRequestId: saved.id,
      });
    }

    // Audit log
    await AuditService.log({
      companyId,
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: 'OVERTIME_REQUESTED',
      targetModule: 'ATTENDANCE',
      targetRecordId: saved.id,
      changesSummary: `Submitted OT request for ${saved.attendanceDate} (${saved.requestedMinutes} mins)`,
    });

    return saved;
  }

  /**
   * 3. Action (Approve / Reject) Overtime Request
   */
  public static async actionRequest(
    companyId: string,
    requestId: string,
    actor: AuthUser,
    dto: ActionOvertimeDTO
  ): Promise<OvertimeRequest> {
    const req = await OvertimeRequestRepository.findById(requestId, companyId);
    if (!req) {
      throw new Error('Overtime request not found');
    }

    if (req.status !== 'PENDING') {
      throw new Error('OVERTIME_ALREADY_ACTIONED: This overtime request has already been processed.');
    }

    // Check period lock
    const period = await AttendancePeriodRepository.findByDate(companyId, req.attendanceDate);
    if (period && (period.status === 'FINALIZED' || period.status === 'LOCKED')) {
      throw new Error('ATTENDANCE_PERIOD_LOCKED: Attendance for this period is finalized and locked for payroll.');
    }

    // Role permission check
    const isApprover =
      actor.role === UserRole.SUPER_ADMIN ||
      actor.role === UserRole.HR_ADMIN ||
      actor.role === UserRole.PAYROLL_MANAGER ||
      actor.role === UserRole.MANAGER ||
      actor.permissions.includes(PermissionKey.OVERTIME_APPROVE);

    if (!isApprover) {
      throw new Error('FORBIDDEN: You do not have permission to approve or reject overtime requests.');
    }

    // Self-approval restriction (unless SUPER_ADMIN)
    const selfEmp = Array.from(this.db.employees.values()).find(
      (e) => e.companyId === companyId && (e.workEmail === actor.email || e.employeeCode === actor.employeeCode)
    );
    if (selfEmp && selfEmp.id === req.employeeId && actor.role !== UserRole.SUPER_ADMIN) {
      throw new Error('FORBIDDEN: You cannot approve your own overtime request.');
    }

    const approverEmployeeId = selfEmp?.id || actor.id;
    const approvedMinutes = dto.status === 'APPROVED' ? (dto.approvedMinutes ?? req.requestedMinutes) : 0;

    const updated = await OvertimeRequestRepository.update(requestId, companyId, {
      status: dto.status,
      approvedMinutes,
      approverId: approverEmployeeId,
      approverComments: dto.approverComments,
      actionedAt: new Date().toISOString(),
    });

    if (!updated) throw new Error('Failed to update overtime request');

    // Synchronize Daily Attendance record with approved overtime
    const daily = req.dailyAttendanceId
      ? await DailyAttendanceRepository.findById(req.dailyAttendanceId, companyId)
      : await DailyAttendanceRepository.findByEmployeeAndDate(req.employeeId, req.attendanceDate, companyId);

    if (daily) {
      await DailyAttendanceRepository.update(daily.id, companyId, {
        calculatedOvertimeMinutes: req.calculatedMinutes,
        approvedOvertimeMinutes: approvedMinutes,
        overtimeRequestId: updated.id,
      });
    }

    // Audit log
    await AuditService.log({
      companyId,
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: dto.status === 'APPROVED' ? 'OVERTIME_APPROVED' : 'OVERTIME_REJECTED',
      targetModule: 'ATTENDANCE',
      targetRecordId: updated.id,
      changesSummary: `${dto.status} OT request for ${updated.attendanceDate} (${approvedMinutes} mins approved)`,
    });

    return updated;
  }

  /**
   * 4. List Overtime Requests with Role-Scoping
   */
  public static async listRequests(
    companyId: string,
    actor: AuthUser,
    filter?: OvertimeFilter
  ): Promise<OvertimeRequest[]> {
    let requests = await OvertimeRequestRepository.findAll(companyId, filter);

    // Apply role-based visibility scoping
    if (actor.role === UserRole.EMPLOYEE) {
      const selfEmp = Array.from(this.db.employees.values()).find(
        (e) => e.companyId === companyId && (e.workEmail === actor.email || e.employeeCode === actor.employeeCode)
      );
      if (selfEmp) {
        requests = requests.filter((r) => r.employeeId === selfEmp.id);
      } else {
        return [];
      }
    } else if (actor.role === UserRole.MANAGER) {
      const selfEmp = Array.from(this.db.employees.values()).find(
        (e) => e.companyId === companyId && (e.workEmail === actor.email || e.employeeCode === actor.employeeCode)
      );
      if (selfEmp) {
        const reportingEmpIds = Array.from(this.db.employeeAssignments.values())
          .filter((a) => a.managerId === selfEmp.id)
          .map((a) => a.employeeId);
        reportingEmpIds.push(selfEmp.id); // Include self
        requests = requests.filter((r) => reportingEmpIds.includes(r.employeeId));
      }
    }

    return requests;
  }
}
