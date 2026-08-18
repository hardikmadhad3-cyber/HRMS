import {
  LeaveCalculationResult,
  LeaveDayCalculationDetail,
  LeaveUnit,
  HalfDayPeriod,
  DayOfWeek,
  LeavePolicyRule,
} from '../../src/types/leave.js';
import { RelationalDatabase } from '../database/RelationalDatabase.js';
import { HolidayRepository } from '../database/repositories/HolidayRepository.js';
import { ShiftRepository } from '../database/repositories/ShiftRepository.js';
import { LeaveTypeRepository } from '../database/repositories/LeaveTypeRepository.js';
import { EmployeeRepository } from '../database/repositories/EmployeeRepository.js';
import { EmployeeAssignmentRepository } from '../database/repositories/EmployeeAssignmentRepository.js';
import { LeaveEligibilityService } from './LeaveEligibilityService.js';

export interface CalculateLeaveDTO {
  employeeId: string;
  leaveTypeId: string;
  fromDate: string;
  toDate: string;
  unit?: LeaveUnit;
  halfDayPeriod?: HalfDayPeriod;
}

export class LeaveCalculationService {
  private static db = RelationalDatabase.getInstance();

  /**
   * Calculate leave duration, date-by-date breakdown, sandwich days, and rule validations
   */
  public static async calculateLeave(
    companyId: string,
    dto: CalculateLeaveDTO
  ): Promise<LeaveCalculationResult> {
    if (!dto.employeeId || !dto.leaveTypeId || !dto.fromDate || !dto.toDate) {
      const err = new Error('employeeId, leaveTypeId, fromDate, and toDate are required.') as any;
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 400;
      throw err;
    }

    if (dto.toDate < dto.fromDate) {
      const err = new Error(`To Date (${dto.toDate}) cannot be earlier than From Date (${dto.fromDate}).`) as any;
      err.code = 'INVALID_DATE_RANGE';
      err.statusCode = 400;
      throw err;
    }

    const unit: LeaveUnit = dto.unit || 'FULL_DAY';
    const halfDayPeriod: HalfDayPeriod = dto.halfDayPeriod || (unit === 'HALF_DAY' ? 'FIRST_HALF' : 'NONE');

    if (unit === 'HALF_DAY' && dto.fromDate !== dto.toDate) {
      const err = new Error('Half-day leave requests can only be applied for a single calendar day.') as any;
      err.code = 'INVALID_HALF_DAY_RANGE';
      err.statusCode = 400;
      throw err;
    }

    const emp = await EmployeeRepository.findById(dto.employeeId, companyId);
    if (!emp) {
      const err = new Error(`Employee '${dto.employeeId}' not found in active company.`) as any;
      err.code = 'EMPLOYEE_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    const leaveType = await LeaveTypeRepository.findById(dto.leaveTypeId, companyId);
    if (!leaveType) {
      const err = new Error(`Leave type '${dto.leaveTypeId}' not found in active company.`) as any;
      err.code = 'LEAVE_TYPE_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    // 1. Get Employee Effective Assignment for Work Location & Department as of fromDate
    const orgAsg = await EmployeeAssignmentRepository.findAssignmentAsOf(emp.id, dto.fromDate);
    const workLocationId = orgAsg?.workLocationId;

    // 2. Evaluate Policy Rules & Eligibility
    const evalResult = await LeaveEligibilityService.evaluateEligibility(
      emp.id,
      companyId,
      dto.fromDate,
      dto.leaveTypeId
    );

    const ruleEval = evalResult.rules.find((r) => r.leaveTypeId === dto.leaveTypeId);
    const ineligibilityReasons: string[] = [];

    if (!ruleEval) {
      ineligibilityReasons.push(`No active leave policy rule configured for leave type '${leaveType.code}'.`);
    } else if (!ruleEval.eligible) {
      ineligibilityReasons.push(...ruleEval.ineligibilityReasons);
    }

    // Backdated Check
    if (ruleEval) {
      const todayStr = new Date().toISOString().slice(0, 10);
      if (dto.fromDate < todayStr) {
        if (!ruleEval.allowBackdated) {
          ineligibilityReasons.push(`Backdated leave applications are not permitted for ${leaveType.name}.`);
        } else if (ruleEval.maxBackdatedDays > 0) {
          const diffDays = Math.floor(
            (new Date(todayStr).getTime() - new Date(dto.fromDate).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (diffDays > ruleEval.maxBackdatedDays) {
            ineligibilityReasons.push(
              `Backdated application exceeds the maximum allowed ${ruleEval.maxBackdatedDays} days (Requested ${diffDays} days in past).`
            );
          }
        }
      }
    }

    // 3. Fetch Holidays for Company & Location
    const holidays = await HolidayRepository.findAll({
      companyId,
      status: 'ACTIVE',
      workLocationId,
    });
    const holidayMap = new Map<string, string>();
    for (const h of holidays) {
      holidayMap.set(h.date, h.name);
    }

    // 4. Fetch Shift Weekly Off Rule for Employee
    const defaultShifts = await ShiftRepository.findAll(companyId);
    const defaultShift = defaultShifts[0];

    // Generate date range
    const dates = this.generateDateRange(dto.fromDate, dto.toDate);
    const dateBreakdown: LeaveDayCalculationDetail[] = [];

    let workingDays = 0;
    let holidaysCount = 0;
    let weeklyOffsCount = 0;
    let sandwichDaysCount = 0;
    let chargeableUnits = 0;

    const sandwichRuleEnabled = ruleEval
      ? !!(ruleEval.sandwichRuleEnabled || (ruleEval as any).sandwichHoliday || (ruleEval as any).sandwichWeeklyOff)
      : false;
    const includeHolidays = ruleEval ? !!(ruleEval.includeHolidays || (ruleEval as any).sandwichHoliday) : false;
    const includeWeeklyOffs = ruleEval ? !!(ruleEval.includeWeeklyOffs || (ruleEval as any).sandwichWeeklyOff) : false;

    for (let i = 0; i < dates.length; i++) {
      const dateStr = dates[i];
      const d = new Date(dateStr);
      const dayIndex = d.getUTCDay();
      const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const dayOfWeek = dayNames[dayIndex];

      const holidayName = holidayMap.get(dateStr);
      const isHoliday = !!holidayName;

      // Find effective shift assignment
      const shiftAsg = Array.from(this.db.employeeShiftAssignments.values()).find(
        (a) =>
          a.employeeId === emp.id &&
          a.companyId === companyId &&
          a.status === 'ACTIVE' &&
          a.effectiveFrom <= dateStr &&
          (!a.effectiveTo || a.effectiveTo >= dateStr)
      );

      const shift = shiftAsg ? this.db.shifts.get(shiftAsg.shiftId) : defaultShift;
      const isWeeklyOff = this.isDayWeeklyOff(dateStr, shift?.weeklyOffRule);

      if (isHoliday) holidaysCount++;
      if (isWeeklyOff) weeklyOffsCount++;
      if (!isHoliday && !isWeeklyOff) workingDays++;

      let isChargeable = false;
      let isSandwich = false;
      let units = 0;
      let reason: LeaveDayCalculationDetail['reason'] = 'WORKING_DAY';

      if (!isHoliday && !isWeeklyOff) {
        // Regular working day
        isChargeable = true;
        units = unit === 'HALF_DAY' ? 0.5 : 1.0;
        reason = unit === 'HALF_DAY'
          ? halfDayPeriod === 'SECOND_HALF'
            ? 'HALF_DAY_SECOND'
            : 'HALF_DAY_FIRST'
          : 'WORKING_DAY';
      } else {
        // It is a Holiday or Weekly Off
        if (sandwichRuleEnabled) {
          // In sandwich rule: if the leave spans across weekends/holidays (surrounded or inside leave span)
          // it is treated as a chargeable sandwich day
          isSandwich = true;
          isChargeable = true;
          units = unit === 'HALF_DAY' ? 0.5 : 1.0;
          sandwichDaysCount++;
          reason = 'SANDWICH_CHARGEABLE';
        } else {
          // Regular policy exclusions / inclusions
          if (isHoliday && includeHolidays) {
            isChargeable = true;
            units = unit === 'HALF_DAY' ? 0.5 : 1.0;
            reason = 'WORKING_DAY';
          } else if (isHoliday) {
            isChargeable = false;
            units = 0;
            reason = 'EXCLUDED_HOLIDAY';
          } else if (isWeeklyOff && includeWeeklyOffs) {
            isChargeable = true;
            units = unit === 'HALF_DAY' ? 0.5 : 1.0;
            reason = 'WORKING_DAY';
          } else {
            isChargeable = false;
            units = 0;
            reason = 'EXCLUDED_WEEKLY_OFF';
          }
        }
      }

      if (isChargeable) {
        chargeableUnits += units;
      }

      dateBreakdown.push({
        date: dateStr,
        dayOfWeek,
        isHoliday,
        holidayName,
        isWeeklyOff,
        isSandwich,
        isChargeable,
        chargeableUnits: units,
        reason,
      });
    }

    chargeableUnits = Number(chargeableUnits.toFixed(2));

    // 5. Consecutive / Min Days Validations
    if (ruleEval) {
      if (ruleEval.minDaysPerRequest > 0 && chargeableUnits > 0 && chargeableUnits < ruleEval.minDaysPerRequest) {
        ineligibilityReasons.push(
          `Minimum leave duration is ${ruleEval.minDaysPerRequest} day(s) (Requested ${chargeableUnits} days).`
        );
      }
      if (ruleEval.maxConsecutiveDays > 0 && chargeableUnits > ruleEval.maxConsecutiveDays) {
        ineligibilityReasons.push(
          `Maximum consecutive leave duration is ${ruleEval.maxConsecutiveDays} day(s) (Requested ${chargeableUnits} days).`
        );
      }
    }

    const eligible = ineligibilityReasons.length === 0;

    return {
      fromDate: dto.fromDate,
      toDate: dto.toDate,
      totalDaysInRange: dates.length,
      workingDays,
      holidaysCount,
      weeklyOffsCount,
      sandwichDaysCount,
      chargeableUnits,
      unit,
      halfDayPeriod: unit === 'HALF_DAY' ? halfDayPeriod : undefined,
      dateBreakdown,
      policyRuleSnapshot: ruleEval ? { ...ruleEval } : undefined,
      eligible,
      ineligibilityReasons,
    };
  }

  private static generateDateRange(startStr: string, endStr: string): string[] {
    const dates: string[] = [];
    const cur = new Date(startStr);
    const end = new Date(endStr);

    while (cur <= end) {
      dates.push(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return dates;
  }

  private static isDayWeeklyOff(dateStr: string, rule?: any): boolean {
    const d = new Date(dateStr);
    const dayIndex = d.getUTCDay(); // 0 = Sunday, 1 = Mon, ..., 6 = Sat
    const dayNames: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const currentDayName = dayNames[dayIndex];

    if (!rule || !rule.daysOfWeek || rule.daysOfWeek.length === 0) {
      return currentDayName === 'SUNDAY' || currentDayName === 'SATURDAY';
    }

    if (rule.daysOfWeek.includes(currentDayName)) {
      return true;
    }

    if (rule.alternateSaturday && currentDayName === 'SATURDAY') {
      const dayOfMonth = d.getUTCDate();
      const saturdayOccurrence = Math.ceil(dayOfMonth / 7);
      if (saturdayOccurrence === 2 || saturdayOccurrence === 4) {
        return true;
      }
    }

    return false;
  }
}
