import {
  Shift,
  ShiftBreak,
  WeeklyOffRule,
  EmployeeShiftAssignment,
  ShiftRosterEntry,
  CreateShiftDTO,
  UpdateShiftDTO,
  CreateShiftAssignmentDTO,
  BulkShiftAssignmentDTO,
  ShiftFilter,
  ShiftAssignmentFilter,
  ShiftRosterQuery,
  ShiftSummary,
  DayOfWeek,
} from '../../src/types/shift.js';
import { ShiftRepository } from '../database/repositories/ShiftRepository.js';
import { ShiftBreakRepository } from '../database/repositories/ShiftBreakRepository.js';
import { WeeklyOffRepository } from '../database/repositories/WeeklyOffRepository.js';
import { ShiftAssignmentRepository } from '../database/repositories/ShiftAssignmentRepository.js';
import { ShiftRosterRepository } from '../database/repositories/ShiftRosterRepository.js';
import { EmployeeRepository } from '../database/repositories/EmployeeRepository.js';
import { RelationalDatabase } from '../database/RelationalDatabase.js';
import { AuditService } from './AuditService.js';
import { ServiceActor } from './OrganizationService.js';

export class ShiftService {
  private static db = RelationalDatabase.getInstance();

  /**
   * 1. GET ALL SHIFTS FOR COMPANY
   */
  public static async getShifts(companyId: string, filter?: ShiftFilter): Promise<Shift[]> {
    return ShiftRepository.findAll(companyId, filter);
  }

  /**
   * 2. GET SHIFT SUMMARY METRICS
   */
  public static async getShiftSummary(companyId: string): Promise<ShiftSummary> {
    const all = await ShiftRepository.findAll(companyId);
    const active = all.filter((s) => s.status === 'ACTIVE');
    const overnight = all.filter((s) => s.isOvernight && s.status === 'ACTIVE');
    
    let totalAssigned = 0;
    for (const s of all) {
      totalAssigned += s.assignedEmployeesCount || 0;
    }

    return {
      totalShifts: all.length,
      activeShifts: active.length,
      overnightShifts: overnight.length,
      assignedEmployeesCount: totalAssigned,
    };
  }

  /**
   * 3. GET SHIFT BY ID
   */
  public static async getShiftById(id: string, companyId: string): Promise<Shift | null> {
    return ShiftRepository.findById(id, companyId);
  }

  /**
   * 4. CREATE SHIFT (Atomic Transaction)
   */
  public static async createShift(
    dto: CreateShiftDTO,
    companyId: string,
    actor: ServiceActor
  ): Promise<Shift> {
    // Validations
    if (!dto.code || !dto.code.trim()) {
      const err = new Error('Shift code is required.') as any;
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 400;
      throw err;
    }

    if (!dto.name || !dto.name.trim()) {
      const err = new Error('Shift name is required.') as any;
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 400;
      throw err;
    }

    if (!dto.startTime || !dto.endTime) {
      const err = new Error('Shift start time and end time are required.') as any;
      err.code = 'INVALID_SHIFT_TIME';
      err.statusCode = 400;
      throw err;
    }

    const normalizedCode = dto.code.trim().toUpperCase();
    const existing = await ShiftRepository.findByCode(companyId, normalizedCode);
    if (existing) {
      const err = new Error(`Shift with code '${normalizedCode}' already exists in this company.`) as any;
      err.code = 'SHIFT_CODE_EXISTS';
      err.statusCode = 409;
      throw err;
    }

    // Overnight validation
    const isOvernight = Boolean(dto.isOvernight);
    if (!isOvernight && dto.endTime <= dto.startTime) {
      const err = new Error(
        `End time (${dto.endTime}) cannot be earlier than or equal to start time (${dto.startTime}) unless designated as an overnight shift.`
      ) as any;
      err.code = 'INVALID_SHIFT_TIME';
      err.statusCode = 400;
      throw err;
    }

    // Grace minutes validation
    const lateGrace = dto.lateEntryGraceMinutes !== undefined ? Number(dto.lateEntryGraceMinutes) : 15;
    const earlyGrace = dto.earlyExitGraceMinutes !== undefined ? Number(dto.earlyExitGraceMinutes) : 15;
    if (lateGrace < 0 || earlyGrace < 0) {
      const err = new Error('Grace periods cannot be negative minutes.') as any;
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 400;
      throw err;
    }

    const shiftId = `shift-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const newShift: Shift = {
      id: shiftId,
      companyId,
      code: normalizedCode,
      name: dto.name.trim(),
      description: dto.description?.trim(),
      startTime: dto.startTime.trim(),
      endTime: dto.endTime.trim(),
      isOvernight,
      lateEntryGraceMinutes: lateGrace,
      earlyExitGraceMinutes: earlyGrace,
      lateAllowed: dto.lateAllowed !== false,
      earlyExitAllowed: dto.earlyExitAllowed !== false,
      halfDayHours: dto.halfDayHours ? Number(dto.halfDayHours) : 4.5,
      fullDayHours: dto.fullDayHours ? Number(dto.fullDayHours) : 8.0,
      color: dto.color || '#3B82F6',
      status: dto.status || 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: actor.id,
      updatedBy: actor.id,
    };

    try {
      // 1. Insert shift
      await ShiftRepository.create(newShift);

      // 2. Insert breaks
      if (dto.breaks && dto.breaks.length > 0) {
        for (let i = 0; i < dto.breaks.length; i++) {
          const brk = dto.breaks[i];
          if (!brk.breakName || !brk.startTime || !brk.endTime) {
            const err = new Error(`Break #${i + 1} must specify name, start time, and end time.`) as any;
            err.code = 'INVALID_BREAK_TIME';
            err.statusCode = 400;
            throw err;
          }

          const duration = brk.durationMinutes
            ? Number(brk.durationMinutes)
            : this.calculateMinutesDiff(brk.startTime, brk.endTime, isOvernight);

          if (duration <= 0) {
            const err = new Error(`Break '${brk.breakName}' duration must be greater than zero.`) as any;
            err.code = 'INVALID_BREAK_TIME';
            err.statusCode = 400;
            throw err;
          }

          const breakRecord: ShiftBreak = {
            id: `brk-${shiftId}-${i + 1}`,
            shiftId,
            companyId,
            breakName: brk.breakName.trim(),
            startTime: brk.startTime.trim(),
            endTime: brk.endTime.trim(),
            durationMinutes: duration,
            isPaid: Boolean(brk.isPaid),
            status: 'ACTIVE',
            createdAt: now,
            updatedAt: now,
          };
          await ShiftBreakRepository.create(breakRecord);
        }
      }

      // 3. Insert weekly off rule
      const daysOfWeek: DayOfWeek[] = dto.weeklyOffDays && dto.weeklyOffDays.length > 0
        ? dto.weeklyOffDays
        : ['SUNDAY'];

      const weeklyOffRecord: WeeklyOffRule = {
        id: `wo-${shiftId}-1`,
        companyId,
        shiftId,
        name: `${newShift.name} Weekly Off`,
        daysOfWeek,
        alternateSaturday: Boolean(dto.alternateSaturday),
        isDefault: false,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      };
      await WeeklyOffRepository.create(weeklyOffRecord);

      // 4. Audit Trail
      await AuditService.log({
        actorId: actor.id,
        actorName: actor.name,
        actorEmail: actor.email,
        action: 'SHIFT_CREATED',
        targetModule: 'Shift Management',
        targetRecordId: shiftId,
        companyId,
        changesSummary: `Created shift ${newShift.code} (${newShift.name}) [${newShift.startTime} - ${newShift.endTime}${newShift.isOvernight ? ' (Overnight)' : ''}] with ${dto.breaks?.length || 0} breaks.`,
      });

      return (await ShiftRepository.findById(shiftId, companyId))!;
    } catch (error) {
      // Atomic rollback on failure
      this.db.rollbackShift(shiftId);
      throw error;
    }
  }

  /**
   * 5. UPDATE SHIFT
   */
  public static async updateShift(
    id: string,
    dto: UpdateShiftDTO,
    companyId: string,
    actor: ServiceActor
  ): Promise<Shift> {
    const existing = await ShiftRepository.findById(id, companyId);
    if (!existing) {
      const err = new Error('Shift not found in this company context.') as any;
      err.code = 'SHIFT_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    if (dto.code && dto.code.trim().toUpperCase() !== existing.code) {
      const codeCheck = await ShiftRepository.findByCode(companyId, dto.code.trim().toUpperCase());
      if (codeCheck && codeCheck.id !== id) {
        const err = new Error(`Shift code '${dto.code.trim().toUpperCase()}' is already in use.`) as any;
        err.code = 'SHIFT_CODE_EXISTS';
        err.statusCode = 409;
        throw err;
      }
    }

    const startTime = dto.startTime ? dto.startTime.trim() : existing.startTime;
    const endTime = dto.endTime ? dto.endTime.trim() : existing.endTime;
    const isOvernight = dto.isOvernight !== undefined ? Boolean(dto.isOvernight) : existing.isOvernight;

    if (!isOvernight && endTime <= startTime) {
      const err = new Error(
        `End time (${endTime}) cannot be earlier than start time (${startTime}) unless overnight shift is enabled.`
      ) as any;
      err.code = 'INVALID_SHIFT_TIME';
      err.statusCode = 400;
      throw err;
    }

    const updates: Partial<Shift> = {
      code: dto.code ? dto.code.trim().toUpperCase() : existing.code,
      name: dto.name ? dto.name.trim() : existing.name,
      description: dto.description !== undefined ? dto.description.trim() : existing.description,
      startTime,
      endTime,
      isOvernight,
      lateEntryGraceMinutes: dto.lateEntryGraceMinutes !== undefined ? Number(dto.lateEntryGraceMinutes) : existing.lateEntryGraceMinutes,
      earlyExitGraceMinutes: dto.earlyExitGraceMinutes !== undefined ? Number(dto.earlyExitGraceMinutes) : existing.earlyExitGraceMinutes,
      lateAllowed: dto.lateAllowed !== undefined ? Boolean(dto.lateAllowed) : existing.lateAllowed,
      earlyExitAllowed: dto.earlyExitAllowed !== undefined ? Boolean(dto.earlyExitAllowed) : existing.earlyExitAllowed,
      halfDayHours: dto.halfDayHours !== undefined ? Number(dto.halfDayHours) : existing.halfDayHours,
      fullDayHours: dto.fullDayHours !== undefined ? Number(dto.fullDayHours) : existing.fullDayHours,
      color: dto.color || existing.color,
      status: dto.status || existing.status,
      updatedBy: actor.id,
    };

    await ShiftRepository.update(id, companyId, updates);

    // Update breaks if provided
    if (dto.breaks !== undefined) {
      await ShiftBreakRepository.deleteByShiftId(id, companyId);
      const now = new Date().toISOString();
      for (let i = 0; i < dto.breaks.length; i++) {
        const brk = dto.breaks[i];
        const duration = brk.durationMinutes
          ? Number(brk.durationMinutes)
          : this.calculateMinutesDiff(brk.startTime, brk.endTime, isOvernight);

        const breakRecord: ShiftBreak = {
          id: `brk-${id}-${Date.now()}-${i + 1}`,
          shiftId: id,
          companyId,
          breakName: brk.breakName.trim(),
          startTime: brk.startTime.trim(),
          endTime: brk.endTime.trim(),
          durationMinutes: duration,
          isPaid: Boolean(brk.isPaid),
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now,
        };
        await ShiftBreakRepository.create(breakRecord);
      }
    }

    // Update weekly off if provided
    if (dto.weeklyOffDays !== undefined) {
      const existingWo = await WeeklyOffRepository.findByShiftId(id, companyId);
      if (existingWo) {
        await WeeklyOffRepository.updateByShiftId(id, companyId, {
          daysOfWeek: dto.weeklyOffDays,
          alternateSaturday: dto.alternateSaturday !== undefined ? dto.alternateSaturday : existingWo.alternateSaturday,
        });
      } else {
        await WeeklyOffRepository.create({
          id: `wo-${id}-${Date.now()}`,
          companyId,
          shiftId: id,
          name: `${updates.name || existing.name} Weekly Off`,
          daysOfWeek: dto.weeklyOffDays,
          alternateSaturday: Boolean(dto.alternateSaturday),
          isDefault: false,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'SHIFT_UPDATED',
      targetModule: 'Shift Management',
      targetRecordId: id,
      companyId,
      changesSummary: `Updated shift ${existing.code} details and policy rules.`,
    });

    return (await ShiftRepository.findById(id, companyId))!;
  }

  /**
   * 6. TOGGLE SHIFT STATUS (Activate / Deactivate)
   */
  public static async toggleShiftStatus(
    id: string,
    status: 'ACTIVE' | 'INACTIVE',
    companyId: string,
    actor: ServiceActor
  ): Promise<Shift> {
    const existing = await ShiftRepository.findById(id, companyId);
    if (!existing) {
      const err = new Error('Shift not found.') as any;
      err.code = 'SHIFT_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    const updated = await ShiftRepository.update(id, companyId, {
      status,
      updatedBy: actor.id,
    });

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: status === 'ACTIVE' ? 'SHIFT_UPDATED' : 'SHIFT_DEACTIVATED',
      targetModule: 'Shift Management',
      targetRecordId: id,
      companyId,
      changesSummary: `Shift ${existing.code} status changed to ${status}.`,
    });

    return updated!;
  }

  /**
   * 7. GET EMPLOYEE SHIFT ASSIGNMENTS (Filtered list)
   */
  public static async getEmployeeShiftAssignments(
    companyId: string,
    filter?: ShiftAssignmentFilter
  ): Promise<EmployeeShiftAssignment[]> {
    return ShiftAssignmentRepository.findAll(companyId, filter);
  }

  /**
   * 8. GET EMPLOYEE SHIFT HISTORY
   */
  public static async getEmployeeShiftHistory(
    employeeId: string,
    companyId: string
  ): Promise<{
    currentShift: EmployeeShiftAssignment | null;
    futureShift: EmployeeShiftAssignment | null;
    history: EmployeeShiftAssignment[];
  }> {
    const emp = await EmployeeRepository.findById(employeeId, companyId);
    if (!emp) {
      const err = new Error('Employee not found in this company.') as any;
      err.code = 'INVALID_EMPLOYEE';
      err.statusCode = 404;
      throw err;
    }

    const current = await ShiftAssignmentRepository.findCurrentByEmployeeId(employeeId, companyId);
    const future = await ShiftAssignmentRepository.findFutureByEmployeeId(employeeId, companyId);
    const history = await ShiftAssignmentRepository.findByEmployeeId(employeeId, companyId);

    return {
      currentShift: current,
      futureShift: future,
      history,
    };
  }

  /**
   * 9. ASSIGN SHIFT TO EMPLOYEE (Effective-Dated)
   */
  public static async assignShift(
    dto: CreateShiftAssignmentDTO,
    companyId: string,
    actor: ServiceActor
  ): Promise<EmployeeShiftAssignment> {
    // 1. Verify Employee belongs to active company
    const emp = await EmployeeRepository.findById(dto.employeeId, companyId);
    if (!emp) {
      const err = new Error(`Employee ID '${dto.employeeId}' does not belong to active company context.`) as any;
      err.code = 'INVALID_EMPLOYEE';
      err.statusCode = 400;
      throw err;
    }

    // 2. Verify Shift belongs to active company
    const shift = await ShiftRepository.findById(dto.shiftId, companyId);
    if (!shift) {
      const err = new Error(`Shift ID '${dto.shiftId}' does not belong to active company context.`) as any;
      err.code = 'SHIFT_NOT_FOUND';
      err.statusCode = 400;
      throw err;
    }

    if (shift.status !== 'ACTIVE') {
      const err = new Error(`Cannot assign inactive shift '${shift.code}'.`) as any;
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 400;
      throw err;
    }

    // 3. Validate effective date
    if (!dto.effectiveFrom) {
      const err = new Error('Effective From date is required.') as any;
      err.code = 'INVALID_EFFECTIVE_DATE';
      err.statusCode = 400;
      throw err;
    }

    if (dto.effectiveTo && dto.effectiveTo < dto.effectiveFrom) {
      const err = new Error(
        `Effective To date (${dto.effectiveTo}) cannot be earlier than Effective From (${dto.effectiveFrom}).`
      ) as any;
      err.code = 'INVALID_EFFECTIVE_DATE';
      err.statusCode = 400;
      throw err;
    }

    // 4. Overlap & Termination Logic:
    // If open-ended assignment is created, close active open-ended assignment on previous day
    const previousDate = this.getPreviousDate(dto.effectiveFrom);
    await ShiftAssignmentRepository.terminateActive(dto.employeeId, companyId, previousDate);

    // 5. Insert new assignment
    const asgId = `esa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const assignment: EmployeeShiftAssignment = {
      id: asgId,
      employeeId: dto.employeeId,
      companyId,
      shiftId: dto.shiftId,
      effectiveFrom: dto.effectiveFrom,
      effectiveTo: dto.effectiveTo,
      assignmentType: dto.assignmentType || 'PERMANENT',
      reason: dto.reason?.trim() || 'Shift assignment change',
      notes: dto.notes?.trim(),
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: actor.id,
      updatedBy: actor.id,
    };

    const created = await ShiftAssignmentRepository.create(assignment);

    // 6. Audit Trail
    await AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'SHIFT_ASSIGNMENT_CREATED',
      targetModule: 'Shift Management',
      targetRecordId: asgId,
      companyId,
      changesSummary: `Assigned employee ${emp.displayName} (${emp.employeeCode}) to shift ${shift.code} effective from ${dto.effectiveFrom}${dto.effectiveTo ? ` to ${dto.effectiveTo}` : ''} [Reason: ${dto.reason || 'N/A'}].`,
    });

    return created;
  }

  /**
   * 10. BULK SHIFT ASSIGNMENT (Atomic Transaction)
   */
  public static async bulkAssignShift(
    dto: BulkShiftAssignmentDTO,
    companyId: string,
    actor: ServiceActor
  ): Promise<{ assignedCount: number; assignments: EmployeeShiftAssignment[] }> {
    if (!dto.employeeIds || dto.employeeIds.length === 0) {
      const err = new Error('No employees selected for bulk shift assignment.') as any;
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 400;
      throw err;
    }

    const shift = await ShiftRepository.findById(dto.shiftId, companyId);
    if (!shift) {
      const err = new Error(`Shift '${dto.shiftId}' not found in active company.`) as any;
      err.code = 'SHIFT_NOT_FOUND';
      err.statusCode = 400;
      throw err;
    }

    if (shift.status !== 'ACTIVE') {
      const err = new Error(`Shift '${shift.code}' is inactive.`) as any;
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 400;
      throw err;
    }

    // Atomic validation: verify all employees belong to company first
    for (const empId of dto.employeeIds) {
      const emp = await EmployeeRepository.findById(empId, companyId);
      if (!emp) {
        const err = new Error(`Employee '${empId}' does not belong to company context. Entire batch aborted.`) as any;
        err.code = 'INVALID_EMPLOYEE';
        err.statusCode = 400;
        throw err;
      }
    }

    const results: EmployeeShiftAssignment[] = [];
    const previousDate = this.getPreviousDate(dto.effectiveFrom);
    const now = new Date().toISOString();

    for (const empId of dto.employeeIds) {
      await ShiftAssignmentRepository.terminateActive(empId, companyId, previousDate);

      const asgId = `esa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const asg: EmployeeShiftAssignment = {
        id: asgId,
        employeeId: empId,
        companyId,
        shiftId: dto.shiftId,
        effectiveFrom: dto.effectiveFrom,
        effectiveTo: dto.effectiveTo,
        assignmentType: dto.assignmentType || 'PERMANENT',
        reason: dto.reason?.trim() || 'Bulk shift assignment',
        notes: dto.notes?.trim(),
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
        createdBy: actor.id,
        updatedBy: actor.id,
      };
      const created = await ShiftAssignmentRepository.create(asg);
      results.push(created);
    }

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'SHIFT_ASSIGNMENT_CHANGED',
      targetModule: 'Shift Management',
      companyId,
      changesSummary: `Bulk assigned ${dto.employeeIds.length} employees to shift ${shift.code} effective ${dto.effectiveFrom}.`,
    });

    return {
      assignedCount: results.length,
      assignments: results,
    };
  }

  /**
   * 11. GET SHIFT ROSTER (Date range grid query)
   */
  public static async getShiftRoster(
    companyId: string,
    query: ShiftRosterQuery
  ): Promise<{
    startDate: string;
    endDate: string;
    dates: string[];
    employees: Array<{
      employeeId: string;
      employeeCode: string;
      displayName: string;
      departmentName?: string;
      designationName?: string;
      roster: Record<string, {
        shiftId: string;
        shiftCode: string;
        shiftName: string;
        startTime: string;
        endTime: string;
        isOvernight: boolean;
        isWeeklyOff: boolean;
        color?: string;
      }>;
    }>;
  }> {
    // Generate array of ISO date strings between startDate and endDate
    const dates = this.generateDateRange(query.startDate, query.endDate);

    // Fetch all relevant employees
    let employees = await EmployeeRepository.findAllByCompany(companyId);
    if (query.departmentId || query.branchId || query.employeeId || query.search) {
      if (query.employeeId) {
        employees = employees.filter((e) => e.id === query.employeeId);
      }
      if (query.search) {
        const q = query.search.toLowerCase();
        employees = employees.filter(
          (e) => e.displayName.toLowerCase().includes(q) || e.employeeCode.toLowerCase().includes(q)
        );
      }
    }

    // Fetch shifts master map for fast lookup
    const shiftsMap = new Map<string, Shift>();
    const allShifts = await ShiftRepository.findAll(companyId);
    for (const s of allShifts) shiftsMap.set(s.id, s);

    const defaultShift: Shift = allShifts[0] || {
      id: 'shift-default',
      companyId,
      code: 'GEN',
      name: 'General Shift',
      startTime: '09:30',
      endTime: '18:30',
      isOvernight: false,
      lateEntryGraceMinutes: 15,
      earlyExitGraceMinutes: 15,
      lateAllowed: true,
      earlyExitAllowed: true,
      halfDayHours: 4.5,
      fullDayHours: 8.0,
      color: '#3B82F6',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const rosterResults = [];

    for (const emp of employees) {
      // Find org details
      const orgAsg = Array.from(this.db.employeeAssignments.values()).find(
        (o) => o.employeeId === emp.id && o.effectiveFrom <= query.endDate && (!o.effectiveTo || o.effectiveTo >= query.startDate)
      );

      if (query.departmentId && orgAsg?.departmentId !== query.departmentId) continue;
      if (query.branchId && orgAsg?.branchId !== query.branchId) continue;

      const dept = orgAsg?.departmentId ? this.db.departments.get(orgAsg.departmentId) : undefined;
      const desig = orgAsg?.designationId ? this.db.designations.get(orgAsg.designationId) : undefined;

      const empRoster: Record<string, any> = {};

      for (const d of dates) {
        // Find effective shift on date `d`
        const asg = Array.from(this.db.employeeShiftAssignments.values()).find(
          (a) =>
            a.employeeId === emp.id &&
            a.companyId === companyId &&
            a.status === 'ACTIVE' &&
            a.effectiveFrom <= d &&
            (!a.effectiveTo || a.effectiveTo >= d)
        );

        const assignedShift = asg ? shiftsMap.get(asg.shiftId) : defaultShift;
        const shiftObj: Shift = assignedShift || defaultShift;

        // Check if date `d` is weekly off according to shift's weekly off rule
        const isWeeklyOff = this.isDayWeeklyOff(d, shiftObj.weeklyOffRule);

        empRoster[d] = {
          shiftId: shiftObj.id,
          shiftCode: shiftObj.code,
          shiftName: shiftObj.name,
          startTime: shiftObj.startTime,
          endTime: shiftObj.endTime,
          isOvernight: shiftObj.isOvernight,
          isWeeklyOff,
          color: isWeeklyOff ? '#94A3B8' : (shiftObj.color || '#3B82F6'),
        };
      }

      rosterResults.push({
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        displayName: emp.displayName,
        departmentName: dept?.name,
        designationName: desig?.name,
        roster: empRoster,
      });
    }

    return {
      startDate: query.startDate,
      endDate: query.endDate,
      dates,
      employees: rosterResults,
    };
  }

  // =========================================================================
  // HELPER CALCULATIONS
  // =========================================================================

  private static calculateMinutesDiff(start: string, end: string, isOvernight: boolean): number {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    let startTotal = startH * 60 + startM;
    let endTotal = endH * 60 + endM;

    if (isOvernight && endTotal < startTotal) {
      endTotal += 24 * 60;
    }

    return Math.max(0, endTotal - startTotal);
  }

  private static getPreviousDate(dateStr: string): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  private static generateDateRange(startStr: string, endStr: string): string[] {
    const dates: string[] = [];
    const cur = new Date(startStr);
    const end = new Date(endStr);

    while (cur <= end) {
      dates.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }

  private static isDayWeeklyOff(dateStr: string, rule?: WeeklyOffRule): boolean {
    if (!rule || !rule.daysOfWeek || rule.daysOfWeek.length === 0) {
      // Default: Sunday is weekly off
      const d = new Date(dateStr);
      return d.getUTCDay() === 0;
    }

    const d = new Date(dateStr);
    const dayIndex = d.getUTCDay(); // 0 = Sunday, 1 = Mon, ..., 6 = Sat
    const dayNames: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const currentDayName = dayNames[dayIndex];

    if (rule.daysOfWeek.includes(currentDayName)) {
      return true;
    }

    // Alternate Saturday check (2nd and 4th Saturday off)
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
