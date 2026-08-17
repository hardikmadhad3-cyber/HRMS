import {
  AttendancePunch,
  DailyAttendance,
  AttendanceRegularizationRequest,
  PunchType,
  PunchSource,
  AttendanceStatus,
  DailyAttendanceFilter,
  MonthlyAttendanceQuery,
  MonthlyAttendanceMatrixItem,
  AttendanceSummaryMetrics,
  EmployeeAttendanceStatus,
  SubmitRegularizationDTO,
  ActionRegularizationDTO,
} from '../../src/types/attendance.js';
import { AuthUser, UserRole, PermissionKey } from '../../src/types/auth.js';
import { AttendancePunchRepository } from '../database/repositories/AttendancePunchRepository.js';
import { DailyAttendanceRepository } from '../database/repositories/DailyAttendanceRepository.js';
import { AttendanceRegularizationRepository } from '../database/repositories/AttendanceRegularizationRepository.js';
import { AttendancePeriodRepository } from '../database/repositories/AttendancePeriodRepository.js';
import { ShiftRepository } from '../database/repositories/ShiftRepository.js';
import { ShiftAssignmentRepository } from '../database/repositories/ShiftAssignmentRepository.js';
import { HolidayRepository } from '../database/repositories/HolidayRepository.js';
import { EmployeeRepository } from '../database/repositories/EmployeeRepository.js';
import { EmployeeAssignmentRepository } from '../database/repositories/EmployeeAssignmentRepository.js';
import { ShiftService } from './ShiftService.js';
import { AuditService } from './AuditService.js';
import { AttendancePeriodService } from './AttendancePeriodService.js';
import { RelationalDatabase } from '../database/RelationalDatabase.js';

export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class AttendanceService {
  private static db = RelationalDatabase.getInstance();

  /**
   * Helper: Format Date object to YYYY-MM-DD
   */
  private static formatDate(d: Date): string {
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Helper: Parse HH:MM to minutes from midnight
   */
  private static parseTimeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }

  /**
   * Helper: Extract HH:MM from ISO string or Time string
   */
  private static extractTimeStr(isoOrTime: string): string {
    if (isoOrTime.includes('T')) {
      const d = new Date(isoOrTime);
      const h = String(d.getUTCHours()).padStart(2, '0');
      const m = String(d.getUTCMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    }
    return isoOrTime.slice(0, 5);
  }

  /**
   * Resolve effective shift for an employee on a given date
   */
  public static async resolveShiftForDate(
    employeeId: string,
    companyId: string,
    date: string
  ) {
    // 1. Check Shift Roster entry for this employee and date
    const rosterEntries = Array.from(this.db.shiftRosterEntries.values()).filter(
      (r) => r.companyId === companyId && r.employeeId === employeeId && r.rosterDate === date
    );
    if (rosterEntries.length > 0 && rosterEntries[0].shiftId) {
      const shift = await ShiftRepository.findById(rosterEntries[0].shiftId, companyId);
      if (shift) return shift;
    }

    // 2. Check Effective-Dated Shift Assignment
    const shiftAsg = await ShiftAssignmentRepository.findCurrentByEmployeeId(
      employeeId,
      companyId,
      date
    );
    if (shiftAsg) {
      const shift = await ShiftRepository.findById(shiftAsg.shiftId, companyId);
      if (shift) return shift;
    }

    // 3. Fallback to default General Day Shift of company if any exists
    const allShifts = await ShiftRepository.findAll(companyId);
    return allShifts[0] || null;
  }

  /**
   * Resolve business date for punch (crucial for overnight shifts)
   */
  public static async resolveBusinessDate(
    employeeId: string,
    companyId: string,
    punchTimeUtc: Date,
    punchType: PunchType
  ): Promise<string> {
    const todayDate = this.formatDate(punchTimeUtc);
    const punchHours = punchTimeUtc.getUTCHours();

    // If check-out occurs in early morning (e.g. 00:00 to 11:00), check if yesterday was an overnight shift
    if (punchType === 'CHECK_OUT' && punchHours < 12) {
      const yesterday = new Date(punchTimeUtc);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayDate = this.formatDate(yesterday);

      const yesterdayShift = await this.resolveShiftForDate(employeeId, companyId, yesterdayDate);
      if (yesterdayShift?.isOvernight) {
        // Check if employee checked in yesterday
        const yesterdayPunches = await AttendancePunchRepository.findByEmployeeAndDateRange(
          employeeId,
          companyId,
          `${yesterdayDate}T00:00:00Z`,
          `${yesterdayDate}T23:59:59Z`
        );
        const hasYesterdayCheckIn = yesterdayPunches.some((p) => p.punchType === 'CHECK_IN');
        if (hasYesterdayCheckIn) {
          return yesterdayDate;
        }
      }
    }

    return todayDate;
  }

  /**
   * Record a raw attendance punch & recalculate daily attendance
   */
  public static async recordPunch(
    employeeId: string,
    companyId: string,
    payload: {
      punchType: PunchType;
      punchTime?: string;
      source?: PunchSource;
      deviceId?: string;
      latitude?: number;
      longitude?: number;
      locationAddress?: string;
      notes?: string;
    },
    actor: AuthUser
  ): Promise<{ punch: AttendancePunch; dailyAttendance: DailyAttendance }> {
    // 1. Validate employee
    const employee = await EmployeeRepository.findById(employeeId, companyId);
    if (!employee) {
      throw new AppError('Employee not found in company.', 'EMPLOYEE_NOT_FOUND', 404);
    }

    const punchDateObj = payload.punchTime ? new Date(payload.punchTime) : new Date();
    if (isNaN(punchDateObj.getTime())) {
      throw new AppError('Invalid punch timestamp.', 'INVALID_PUNCH_TIME', 400);
    }

    const punchIso = punchDateObj.toISOString();
    const punchDateStr = punchIso.slice(0, 10);

    // Check if period is finalized / locked
    const isLocked = await AttendancePeriodService.isDateLocked(companyId, punchDateStr);
    if (isLocked) {
      throw new AppError(
        'ATTENDANCE_PERIOD_LOCKED: Attendance for this period is finalized and locked for payroll.',
        'ATTENDANCE_PERIOD_LOCKED',
        400
      );
    }

    // 2. Validate punch sequence & prevent duplicate punches
    const lastPunch = await AttendancePunchRepository.findLastPunchByEmployee(employeeId, companyId);

    if (payload.punchType === 'CHECK_IN') {
      if (lastPunch && lastPunch.punchType === 'CHECK_IN') {
        // Check if last check-in was within 16 hours (active shift window)
        const lastPunchTime = new Date(lastPunch.punchTime).getTime();
        const diffHours = (punchDateObj.getTime() - lastPunchTime) / (1000 * 60 * 60);
        if (diffHours < 16) {
          throw new AppError(
            'Employee is already checked in. Please check out before checking in again.',
            'ATTENDANCE_ALREADY_CHECKED_IN',
            400
          );
        }
      }
    } else if (payload.punchType === 'CHECK_OUT') {
      if (!lastPunch || lastPunch.punchType === 'CHECK_OUT') {
        throw new AppError(
          'No active check-in found to check out from.',
          'ATTENDANCE_NOT_CHECKED_IN',
          400
        );
      }
    }

    // 3. Create raw immutable punch record
    const punchId = `pnch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newPunch: AttendancePunch = {
      id: punchId,
      companyId,
      employeeId,
      punchTime: punchIso,
      punchType: payload.punchType,
      source: payload.source || 'WEB',
      deviceId: payload.deviceId,
      latitude: payload.latitude,
      longitude: payload.longitude,
      locationAddress: payload.locationAddress,
      notes: payload.notes,
      createdAt: new Date().toISOString(),
      createdBy: actor.id,
    };

    const savedPunch = await AttendancePunchRepository.create(newPunch);

    // 4. Resolve business date & calculate daily attendance
    const businessDate = await this.resolveBusinessDate(
      employeeId,
      companyId,
      punchDateObj,
      payload.punchType
    );

    const calculatedDaily = await this.calculateDailyAttendance(
      employeeId,
      companyId,
      businessDate,
      actor
    );

    // 5. Audit log
    await AuditService.log({
      companyId,
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: payload.punchType === 'CHECK_IN' ? 'ATTENDANCE_CHECK_IN' : 'ATTENDANCE_CHECK_OUT',
      targetModule: 'ATTENDANCE',
      targetRecordId: savedPunch.id,
      changesSummary: `${payload.punchType} recorded for ${employee.displayName} (${employee.employeeCode}) at ${punchIso} [Source: ${payload.source || 'WEB'}]`,
    });

    return { punch: savedPunch, dailyAttendance: calculatedDaily };
  }

  /**
   * Deterministic Daily Attendance Calculation Engine
   * Calculates work hours, breaks, late entry, early exit, exceptions, and daily status.
   */
  public static async calculateDailyAttendance(
    employeeId: string,
    companyId: string,
    attendanceDate: string,
    actor?: AuthUser
  ): Promise<DailyAttendance> {
    const employee = await EmployeeRepository.findById(employeeId, companyId);
    if (!employee) {
      throw new AppError('Employee not found.', 'EMPLOYEE_NOT_FOUND', 404);
    }

    // 1. Resolve Shift & Shift Rules
    const shift = await this.resolveShiftForDate(employeeId, companyId, attendanceDate);
    const scheduledStart = shift?.startTime || '09:30';
    const scheduledEnd = shift?.endTime || '18:30';
    const isOvernight = !!shift?.isOvernight;
    const lateGrace = shift?.lateEntryGraceMinutes ?? 15;
    const earlyGrace = shift?.earlyExitGraceMinutes ?? 15;
    const fullDayThreshold = (shift?.fullDayHours ?? 8.0) * 60; // minutes
    const halfDayThreshold = (shift?.halfDayHours ?? 4.5) * 60; // minutes

    // 2. Check Holiday
    const holidays = await HolidayRepository.findAll({
      companyId,
      year: parseInt(attendanceDate.slice(0, 4), 10),
    });
    const isHoliday = holidays.some((h) => h.date === attendanceDate && h.status === 'ACTIVE');

    // 3. Check Weekly Off
    let isWeeklyOff = false;
    if (shift && shift.weeklyOffRule) {
      const dateObj = new Date(`${attendanceDate}T00:00:00Z`);
      const daysOfWeekMap = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const dayName = daysOfWeekMap[dateObj.getUTCDay()];

      if (shift.weeklyOffRule.daysOfWeek.includes(dayName as any)) {
        isWeeklyOff = true;
      } else if (dayName === 'SATURDAY' && shift.weeklyOffRule.alternateSaturday) {
        // Calculate week of month
        const dayOfMonth = dateObj.getUTCDate();
        const weekNumber = Math.ceil(dayOfMonth / 7);
        if (shift.weeklyOffRule.alternateSaturdayWeeks?.includes(weekNumber as any)) {
          isWeeklyOff = true;
        }
      }
    } else {
      // Default Sunday weekly off
      const dayOfWeek = new Date(`${attendanceDate}T00:00:00Z`).getUTCDay();
      if (dayOfWeek === 0) isWeeklyOff = true;
    }

    // 4. Check for Approved Regularization Request
    const approvedReg = await AttendanceRegularizationRepository.findByEmployeeAndDate(
      employeeId,
      attendanceDate,
      companyId
    );
    const isRegularized = approvedReg?.status === 'APPROVED';

    // 5. Gather punches for this business date
    let punches: AttendancePunch[] = [];
    if (isOvernight) {
      // Overnight window: from attendanceDate 12:00:00Z to nextDay 14:00:00Z
      const nextDay = new Date(`${attendanceDate}T00:00:00Z`);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      const nextDayDate = this.formatDate(nextDay);

      punches = await AttendancePunchRepository.findByEmployeeAndDateRange(
        employeeId,
        companyId,
        `${attendanceDate}T12:00:00Z`,
        `${nextDayDate}T14:00:00Z`
      );
    } else {
      // Day shift window: from attendanceDate 00:00:00Z to attendanceDate 23:59:59Z
      punches = await AttendancePunchRepository.findByEmployeeAndDateRange(
        employeeId,
        companyId,
        `${attendanceDate}T00:00:00Z`,
        `${attendanceDate}T23:59:59Z`
      );
    }

    // Identify first check-in and last check-out
    const checkIns = punches.filter((p) => p.punchType === 'CHECK_IN');
    const checkOuts = punches.filter((p) => p.punchType === 'CHECK_OUT');

    let firstCheckIn = checkIns.length > 0 ? checkIns[0].punchTime : undefined;
    let lastCheckOut = checkOuts.length > 0 ? checkOuts[checkOuts.length - 1].punchTime : undefined;

    // If regularized, override/substitute times if punch was missing
    if (isRegularized && approvedReg) {
      if (approvedReg.requestedCheckIn) firstCheckIn = approvedReg.requestedCheckIn;
      if (approvedReg.requestedCheckOut) lastCheckOut = approvedReg.requestedCheckOut;
    }

    // 6. Calculate Work Durations & Metrics
    let grossWorkMinutes = 0;
    let breakMinutes = 0;
    let netWorkMinutes = 0;
    let lateMinutes = 0;
    let earlyExitMinutes = 0;
    let isLate = false;
    let isEarlyExit = false;
    let isHalfDay = false;
    let hasException = false;
    let exceptionType: DailyAttendance['exceptionType'] = undefined;
    let status: AttendanceStatus = 'ABSENT';

    if (!firstCheckIn && !lastCheckOut) {
      // No punches on this day
      if (isHoliday) {
        status = 'HOLIDAY';
      } else if (isWeeklyOff) {
        status = 'WEEKLY_OFF';
      } else {
        status = 'ABSENT';
        hasException = true;
        exceptionType = 'MISSING_IN';
      }
    } else if (firstCheckIn && !lastCheckOut) {
      // Incomplete: only check-in present
      status = 'INCOMPLETE';
      hasException = true;
      exceptionType = 'MISSING_OUT';

      // Evaluate late arrival on check-in
      const inTimeStr = this.extractTimeStr(firstCheckIn);
      const scheduledInMinutes = this.parseTimeToMinutes(scheduledStart);
      const actualInMinutes = this.parseTimeToMinutes(inTimeStr);
      if (actualInMinutes > scheduledInMinutes + lateGrace) {
        isLate = true;
        lateMinutes = actualInMinutes - scheduledInMinutes;
      }
    } else if (!firstCheckIn && lastCheckOut) {
      // Incomplete: only check-out present
      status = 'INCOMPLETE';
      hasException = true;
      exceptionType = 'MISSING_IN';
    } else if (firstCheckIn && lastCheckOut) {
      // Complete punches available!
      const inDate = new Date(firstCheckIn);
      const outDate = new Date(lastCheckOut);

      const diffMs = outDate.getTime() - inDate.getTime();
      grossWorkMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));

      // Calculate shift breaks (unpaid breaks deducted)
      if (shift && shift.breaks) {
        for (const b of shift.breaks) {
          if (!b.isPaid) {
            breakMinutes += b.durationMinutes;
          }
        }
      }

      netWorkMinutes = Math.max(0, grossWorkMinutes - breakMinutes);

      // Late Arrival Evaluation
      const inTimeStr = this.extractTimeStr(firstCheckIn);
      const scheduledInMinutes = this.parseTimeToMinutes(scheduledStart);
      const actualInMinutes = this.parseTimeToMinutes(inTimeStr);
      if (actualInMinutes > scheduledInMinutes + lateGrace) {
        isLate = true;
        lateMinutes = actualInMinutes - scheduledInMinutes;
      }

      // Early Exit Evaluation
      const outTimeStr = this.extractTimeStr(lastCheckOut);
      const scheduledOutMinutes = this.parseTimeToMinutes(scheduledEnd);
      let actualOutMinutes = this.parseTimeToMinutes(outTimeStr);
      if (isOvernight && actualOutMinutes < scheduledInMinutes) {
        // Adjust for overnight next day
        actualOutMinutes += 24 * 60;
      }
      let adjustedScheduledOut = scheduledOutMinutes;
      if (isOvernight && scheduledOutMinutes < scheduledInMinutes) {
        adjustedScheduledOut += 24 * 60;
      }

      if (actualOutMinutes < adjustedScheduledOut - earlyGrace) {
        isEarlyExit = true;
        earlyExitMinutes = adjustedScheduledOut - actualOutMinutes;
      }

      // Status Evaluation based on hours worked
      if (netWorkMinutes >= fullDayThreshold) {
        status = 'PRESENT';
      } else if (netWorkMinutes >= halfDayThreshold) {
        status = 'HALF_DAY';
        isHalfDay = true;
      } else {
        status = 'ABSENT';
      }

      // Exception flagging
      if (isLate && isEarlyExit) {
        hasException = true;
        exceptionType = 'LATE_AND_EARLY';
      } else if (isLate) {
        hasException = true;
        exceptionType = 'LATE_ARRIVAL';
      } else if (isEarlyExit) {
        hasException = true;
        exceptionType = 'EARLY_EXIT';
      } else if (status === 'HALF_DAY' || status === 'ABSENT') {
        hasException = true;
        exceptionType = 'INSUFFICIENT_HOURS';
      }
    }

    // 7. Assemble and persist DailyAttendance record
    const dailyRecordId = `da-${employeeId}-${attendanceDate.replace(/-/g, '')}`;
    const dailyRecord: DailyAttendance = {
      id: dailyRecordId,
      companyId,
      employeeId,
      attendanceDate,
      shiftId: shift?.id,
      shiftCode: shift?.code,
      shiftName: shift?.name,
      scheduledStart,
      scheduledEnd,
      isOvernight,
      firstCheckIn,
      lastCheckOut,
      grossWorkMinutes,
      breakMinutes,
      netWorkMinutes,
      lateMinutes,
      earlyExitMinutes,
      status,
      calculationStatus: isRegularized ? 'REGULARIZED' : 'CALCULATED',
      isLate,
      isEarlyExit,
      isHalfDay,
      isHoliday,
      isWeeklyOff,
      isOnLeave: false,
      hasException,
      exceptionType,
      regularizationId: approvedReg?.id,
      calculationVersion: 1,
      calculatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await DailyAttendanceRepository.upsert(dailyRecord);
    return saved;
  }

  /**
   * Get employee attendance status for today (ESS dashboard view)
   */
  public static async getEmployeeTodayStatus(
    employeeId: string,
    companyId: string
  ): Promise<EmployeeAttendanceStatus> {
    const employee = await EmployeeRepository.findById(employeeId, companyId);
    if (!employee) {
      throw new AppError('Employee not found.', 'EMPLOYEE_NOT_FOUND', 404);
    }

    const todayDate = this.formatDate(new Date());
    const shift = await this.resolveShiftForDate(employeeId, companyId, todayDate);
    const lastPunch = await AttendancePunchRepository.findLastPunchByEmployee(employeeId, companyId);

    // Fetch today's punches
    const punches = await AttendancePunchRepository.findByEmployeeAndDateRange(
      employeeId,
      companyId,
      `${todayDate}T00:00:00Z`,
      `${todayDate}T23:59:59Z`
    );

    // Fetch or calculate today's daily attendance
    let daily = await DailyAttendanceRepository.findByEmployeeAndDate(employeeId, todayDate, companyId);
    if (!daily) {
      daily = await this.calculateDailyAttendance(employeeId, companyId, todayDate);
    }

    const isCheckedIn = !!lastPunch && lastPunch.punchType === 'CHECK_IN';

    return {
      employeeId,
      employeeCode: employee.employeeCode,
      displayName: employee.displayName,
      todayDate,
      currentShift: shift
        ? {
            id: shift.id,
            code: shift.code,
            name: shift.name,
            startTime: shift.startTime,
            endTime: shift.endTime,
            isOvernight: shift.isOvernight,
            lateEntryGraceMinutes: shift.lateEntryGraceMinutes,
            earlyExitGraceMinutes: shift.earlyExitGraceMinutes,
          }
        : null,
      lastPunch,
      isCheckedIn,
      todayPunches: punches,
      todayDailyRecord: daily,
    };
  }

  /**
   * List Daily Attendance with Filters & RBAC Scoping
   */
  public static async getDailyAttendanceList(
    companyId: string,
    filter: DailyAttendanceFilter,
    actor: AuthUser
  ): Promise<{ items: DailyAttendance[]; total: number; summary: AttendanceSummaryMetrics }> {
    const targetDate = filter.date || this.formatDate(new Date());

    // 1. RBAC and Manager Scope enforcement
    let employeeIdsToInclude: string[] | null = null;

    if (actor.role === UserRole.EMPLOYEE) {
      // Employee can only view own attendance
      const selfEmp = Array.from(this.db.employees.values()).find(
        (e) => e.companyId === companyId && (e.workEmail === actor.email || e.employeeCode === actor.employeeCode)
      );
      employeeIdsToInclude = selfEmp ? [selfEmp.id] : [];
    } else if (actor.role === UserRole.MANAGER) {
      // Manager can view team + self
      const selfEmp = Array.from(this.db.employees.values()).find(
        (e) => e.companyId === companyId && (e.workEmail === actor.email || e.employeeCode === actor.employeeCode)
      );
      if (selfEmp) {
        const teamEmpIds = Array.from(this.db.employeeAssignments.values())
          .filter((a) => a.companyId === companyId && a.managerId === selfEmp.id)
          .map((a) => a.employeeId);
        employeeIdsToInclude = [selfEmp.id, ...teamEmpIds];
      }
    }

    // 2. Fetch all records for targetDate
    let records = await DailyAttendanceRepository.findAll(companyId, {
      ...filter,
      date: targetDate,
    });

    if (employeeIdsToInclude !== null) {
      records = records.filter((r) => employeeIdsToInclude!.includes(r.employeeId));
    }

    // 3. Compute Summary Metrics for the date
    const summary: AttendanceSummaryMetrics = {
      attendanceDate: targetDate,
      totalScheduled: records.length,
      presentCount: records.filter((r) => r.status === 'PRESENT').length,
      absentCount: records.filter((r) => r.status === 'ABSENT').length,
      halfDayCount: records.filter((r) => r.status === 'HALF_DAY').length,
      onLeaveCount: records.filter((r) => r.status === 'ON_LEAVE').length,
      weeklyOffCount: records.filter((r) => r.status === 'WEEKLY_OFF').length,
      holidayCount: records.filter((r) => r.status === 'HOLIDAY').length,
      lateArrivalCount: records.filter((r) => r.isLate).length,
      earlyExitCount: records.filter((r) => r.isEarlyExit).length,
      exceptionCount: records.filter((r) => r.hasException).length,
    };

    return {
      items: records,
      total: records.length,
      summary,
    };
  }

  /**
   * Monthly Attendance Matrix View
   */
  public static async getMonthlyMatrix(
    companyId: string,
    query: MonthlyAttendanceQuery,
    actor: AuthUser
  ): Promise<{
    month: number;
    year: number;
    daysInMonth: number;
    matrix: MonthlyAttendanceMatrixItem[];
  }> {
    const { month, year } = query;
    const daysInMonth = new Date(year, month, 0).getDate();

    // 1. Get employees in company matching filters & permissions
    let employees = Array.from(this.db.employees.values()).filter(
      (e) => e.companyId === companyId && e.status === 'ACTIVE'
    );

    if (actor.role === UserRole.EMPLOYEE) {
      employees = employees.filter(
        (e) => e.workEmail === actor.email || e.employeeCode === actor.employeeCode
      );
    } else if (actor.role === UserRole.MANAGER) {
      const selfEmp = employees.find(
        (e) => e.workEmail === actor.email || e.employeeCode === actor.employeeCode
      );
      if (selfEmp) {
        const teamIds = Array.from(this.db.employeeAssignments.values())
          .filter((a) => a.companyId === companyId && a.managerId === selfEmp.id)
          .map((a) => a.employeeId);
        employees = employees.filter((e) => e.id === selfEmp.id || teamIds.includes(e.id));
      }
    }

    if (query.employeeId) {
      employees = employees.filter((e) => e.id === query.employeeId);
    }

    if (query.search) {
      const q = query.search.toLowerCase();
      employees = employees.filter(
        (e) =>
          e.displayName.toLowerCase().includes(q) ||
          e.employeeCode.toLowerCase().includes(q)
      );
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    // 2. Fetch all daily records for this month
    const allDailyRecords = await DailyAttendanceRepository.findAll(companyId, {
      startDate,
      endDate,
    });

    const matrix: MonthlyAttendanceMatrixItem[] = [];

    for (const emp of employees) {
      const empDailyRecords = allDailyRecords.filter((r) => r.employeeId === emp.id);
      const asg = Array.from(this.db.employeeAssignments.values()).find(
        (a) => a.employeeId === emp.id && (!a.effectiveTo || a.effectiveTo >= startDate)
      );
      const dept = asg?.departmentId ? this.db.departments.get(asg.departmentId) : undefined;
      const desig = asg?.designationId ? this.db.designations.get(asg.designationId) : undefined;

      const daysMap: MonthlyAttendanceMatrixItem['days'] = {};
      const totals: MonthlyAttendanceMatrixItem['totals'] = {
        presentDays: 0,
        absentDays: 0,
        halfDays: 0,
        weeklyOffDays: 0,
        holidays: 0,
        leaveDays: 0,
        missingPunchDays: 0,
        totalWorkMinutes: 0,
        totalLateMinutes: 0,
      };

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        let record = empDailyRecords.find((r) => r.attendanceDate === dateStr);

        let abbr: 'P' | 'A' | 'HD' | 'WO' | 'H' | 'L' | 'MP' | 'INC' = 'A';
        let status: AttendanceStatus = 'ABSENT';
        let netMins = 0;
        let isLate = false;
        let isEarlyExit = false;

        if (record) {
          status = record.status;
          netMins = record.netWorkMinutes;
          isLate = record.isLate;
          isEarlyExit = record.isEarlyExit;

          switch (record.status) {
            case 'PRESENT':
              abbr = 'P';
              totals.presentDays++;
              totals.totalWorkMinutes += record.netWorkMinutes;
              break;
            case 'HALF_DAY':
              abbr = 'HD';
              totals.halfDays++;
              totals.totalWorkMinutes += record.netWorkMinutes;
              break;
            case 'WEEKLY_OFF':
              abbr = 'WO';
              totals.weeklyOffDays++;
              break;
            case 'HOLIDAY':
              abbr = 'H';
              totals.holidays++;
              break;
            case 'ON_LEAVE':
              abbr = 'L';
              totals.leaveDays++;
              break;
            case 'INCOMPLETE':
            case 'MISSING_PUNCH':
              abbr = 'MP';
              totals.missingPunchDays++;
              break;
            case 'ABSENT':
            default:
              abbr = 'A';
              totals.absentDays++;
              break;
          }

          if (record.isLate) {
            totals.totalLateMinutes += record.lateMinutes;
          }
        } else {
          // If past date and no record, default to Weekly Off if weekend, else Absent
          const dayOfWeek = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
          if (dayOfWeek === 0) {
            abbr = 'WO';
            status = 'WEEKLY_OFF';
            totals.weeklyOffDays++;
          } else {
            abbr = 'A';
            status = 'ABSENT';
            totals.absentDays++;
          }
        }

        daysMap[dateStr] = {
          date: dateStr,
          status,
          abbreviation: abbr,
          netWorkMinutes: netMins,
          isLate,
          isEarlyExit,
          firstCheckIn: record?.firstCheckIn,
          lastCheckOut: record?.lastCheckOut,
          shiftCode: record?.shiftCode,
        };
      }

      matrix.push({
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        displayName: emp.displayName,
        departmentName: dept?.name,
        designationName: desig?.name,
        avatarUrl: emp.avatarUrl,
        days: daysMap,
        totals,
      });
    }

    return {
      month,
      year,
      daysInMonth,
      matrix: matrix.sort((a, b) => a.employeeCode.localeCompare(b.employeeCode)),
    };
  }

  /**
   * Submit Attendance Regularization Request
   */
  public static async submitRegularization(
    employeeId: string,
    companyId: string,
    dto: SubmitRegularizationDTO,
    actor: AuthUser
  ): Promise<AttendanceRegularizationRequest> {
    const employee = await EmployeeRepository.findById(employeeId, companyId);
    if (!employee) {
      throw new AppError('Employee not found.', 'EMPLOYEE_NOT_FOUND', 404);
    }

    if (!dto.attendanceDate) {
      throw new AppError('Attendance date is required.', 'INVALID_REGULARIZATION_DATE', 400);
    }

    const isLocked = await AttendancePeriodService.isDateLocked(companyId, dto.attendanceDate);
    if (isLocked) {
      throw new AppError(
        'ATTENDANCE_PERIOD_LOCKED: Attendance for this period is finalized and locked for payroll.',
        'ATTENDANCE_PERIOD_LOCKED',
        400
      );
    }

    if (!dto.reason || dto.reason.trim().length === 0) {
      throw new AppError('Reason for regularization is required.', 'INVALID_REGULARIZATION_REASON', 400);
    }

    // Check if duplicate pending regularization exists
    const existing = await AttendanceRegularizationRepository.findByEmployeeAndDate(
      employeeId,
      dto.attendanceDate,
      companyId
    );
    if (existing && existing.status === 'PENDING') {
      throw new AppError(
        'A pending regularization request already exists for this date.',
        'ATTENDANCE_REGULARIZATION_EXISTS',
        400
      );
    }

    const regId = `reg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newRequest: AttendanceRegularizationRequest = {
      id: regId,
      companyId,
      employeeId,
      attendanceDate: dto.attendanceDate,
      requestedCheckIn: dto.requestedCheckIn,
      requestedCheckOut: dto.requestedCheckOut,
      reason: dto.reason,
      reasonDetails: dto.reasonDetails,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: actor.id,
    };

    const saved = await AttendanceRegularizationRepository.create(newRequest);

    // Audit log
    await AuditService.log({
      companyId,
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: 'ATTENDANCE_REGULARIZATION_SUBMITTED',
      targetModule: 'ATTENDANCE',
      targetRecordId: saved.id,
      changesSummary: `Regularization requested by ${employee.displayName} (${employee.employeeCode}) for ${dto.attendanceDate}: ${dto.reason}`,
    });

    return saved;
  }

  /**
   * Approve or Reject Attendance Regularization Request
   */
  public static async actionRegularization(
    requestId: string,
    companyId: string,
    dto: ActionRegularizationDTO,
    actor: AuthUser
  ): Promise<AttendanceRegularizationRequest> {
    const request = await AttendanceRegularizationRepository.findById(requestId, companyId);
    if (!request) {
      throw new AppError('Regularization request not found.', 'REGULARIZATION_NOT_FOUND', 404);
    }

    if (request.status !== 'PENDING') {
      throw new AppError(
        `Request cannot be actioned because its current status is ${request.status}.`,
        'INVALID_REGULARIZATION_STATE',
        400
      );
    }

    const isLocked = await AttendancePeriodService.isDateLocked(companyId, request.attendanceDate);
    if (isLocked) {
      throw new AppError(
        'ATTENDANCE_PERIOD_LOCKED: Attendance for this period is finalized and locked for payroll.',
        'ATTENDANCE_PERIOD_LOCKED',
        400
      );
    }

    const updated = await AttendanceRegularizationRepository.update(requestId, companyId, {
      status: dto.status,
      approverId: actor.employeeCode, // or actor.id
      approverComments: dto.approverComments,
      actionedAt: new Date().toISOString(),
    });

    if (!updated) {
      throw new AppError('Failed to update regularization request.', 'UPDATE_FAILED', 500);
    }

    // If APPROVED, trigger automatic recalculation of Daily Attendance
    if (dto.status === 'APPROVED') {
      await this.calculateDailyAttendance(
        request.employeeId,
        companyId,
        request.attendanceDate,
        actor
      );
    }

    // Audit log
    await AuditService.log({
      companyId,
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: dto.status === 'APPROVED' ? 'ATTENDANCE_REGULARIZATION_APPROVED' : 'ATTENDANCE_REGULARIZATION_REJECTED',
      targetModule: 'ATTENDANCE',
      targetRecordId: request.id,
      changesSummary: `Regularization request for ${request.employeeCode || request.employeeId} on ${request.attendanceDate} ${dto.status} by ${actor.fullName}. Comments: ${dto.approverComments || 'None'}`,
    });

    return updated;
  }

  /**
   * List Regularization Requests with Role Scoping
   */
  public static async listRegularizationRequests(
    companyId: string,
    filter: {
      employeeId?: string;
      status?: AttendanceRegularizationRequest['status'];
      startDate?: string;
      endDate?: string;
    },
    actor: AuthUser
  ): Promise<AttendanceRegularizationRequest[]> {
    let requests = await AttendanceRegularizationRepository.findAll(companyId, filter);

    if (actor.role === UserRole.EMPLOYEE) {
      // Employee only sees own requests
      const selfEmp = Array.from(this.db.employees.values()).find(
        (e) => e.companyId === companyId && (e.workEmail === actor.email || e.employeeCode === actor.employeeCode)
      );
      if (selfEmp) {
        requests = requests.filter((r) => r.employeeId === selfEmp.id);
      }
    } else if (actor.role === UserRole.MANAGER) {
      const selfEmp = Array.from(this.db.employees.values()).find(
        (e) => e.companyId === companyId && (e.workEmail === actor.email || e.employeeCode === actor.employeeCode)
      );
      if (selfEmp) {
        const teamIds = Array.from(this.db.employeeAssignments.values())
          .filter((a) => a.companyId === companyId && a.managerId === selfEmp.id)
          .map((a) => a.employeeId);
        requests = requests.filter((r) => r.employeeId === selfEmp.id || teamIds.includes(r.employeeId));
      }
    }

    return requests;
  }

  /**
   * Recalculate Attendance (Batch / Idempotent)
   */
  public static async recalculateAttendance(
    companyId: string,
    params: { employeeId?: string; date?: string; startDate?: string; endDate?: string },
    actor: AuthUser
  ): Promise<{ success: boolean; recalculatedCount: number; message: string }> {
    let employees = Array.from(this.db.employees.values()).filter(
      (e) => e.companyId === companyId && e.status === 'ACTIVE'
    );
    if (params.employeeId) {
      employees = employees.filter((e) => e.id === params.employeeId);
    }

    const dates: string[] = [];
    if (params.date) {
      dates.push(params.date);
    } else if (params.startDate && params.endDate) {
      let curr = new Date(params.startDate);
      const end = new Date(params.endDate);
      while (curr <= end) {
        dates.push(this.formatDate(curr));
        curr.setUTCDate(curr.getUTCDate() + 1);
      }
    } else {
      dates.push(this.formatDate(new Date()));
    }

    // Check if any target date is locked
    for (const d of dates) {
      const isLocked = await AttendancePeriodService.isDateLocked(companyId, d);
      if (isLocked) {
        throw new AppError(
          `ATTENDANCE_PERIOD_LOCKED: Attendance for date ${d} is in a finalized period and cannot be recalculated.`,
          'ATTENDANCE_PERIOD_LOCKED',
          400
        );
      }
    }

    let count = 0;
    for (const emp of employees) {
      for (const d of dates) {
        await this.calculateDailyAttendance(emp.id, companyId, d, actor);
        count++;
      }
    }

    await AuditService.log({
      companyId,
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: 'ATTENDANCE_BATCH_RECALCULATED',
      targetModule: 'ATTENDANCE',
      changesSummary: `Recalculated attendance for ${employees.length} employee(s) across ${dates.length} date(s) (Total records: ${count})`,
    });

    return {
      success: true,
      recalculatedCount: count,
      message: `Successfully recalculated ${count} daily attendance records.`,
    };
  }
}
