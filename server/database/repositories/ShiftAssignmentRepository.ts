import { EmployeeShiftAssignment, ShiftAssignmentFilter } from '../../../src/types/shift.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class ShiftAssignmentRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findAll(
    companyId: string,
    filter?: ShiftAssignmentFilter
  ): Promise<EmployeeShiftAssignment[]> {
    let result = Array.from(this.db.employeeShiftAssignments.values()).filter(
      (a) => a.companyId === companyId
    );

    if (filter?.employeeId) {
      result = result.filter((a) => a.employeeId === filter.employeeId);
    }
    if (filter?.shiftId) {
      result = result.filter((a) => a.shiftId === filter.shiftId);
    }
    if (filter?.status) {
      result = result.filter((a) => a.status === filter.status);
    }

    const asOf = filter?.effectiveDate || new Date().toISOString().slice(0, 10);

    // Filter by employee metadata (branch, department, search)
    if (filter?.departmentId || filter?.branchId || filter?.search) {
      const searchLower = filter.search ? filter.search.toLowerCase() : null;
      result = result.filter((a) => {
        const emp = this.db.employees.get(a.employeeId);
        if (!emp) return false;

        // Check current org assignment for dept/branch matching
        const orgAsg = Array.from(this.db.employeeAssignments.values()).find(
          (o) => o.employeeId === a.employeeId && o.effectiveFrom <= asOf && (!o.effectiveTo || o.effectiveTo >= asOf)
        );

        if (filter.departmentId && orgAsg?.departmentId !== filter.departmentId) return false;
        if (filter.branchId && orgAsg?.branchId !== filter.branchId) return false;

        if (searchLower) {
          const matchCode = emp.employeeCode.toLowerCase().includes(searchLower);
          const matchName = emp.displayName.toLowerCase().includes(searchLower);
          const matchEmail = emp.workEmail.toLowerCase().includes(searchLower);
          if (!matchCode && !matchName && !matchEmail) return false;
        }

        return true;
      });
    }

    // Sort by effectiveFrom descending
    result.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));

    return result.map((asg) => this.hydrateAssignment(asg));
  }

  public static async findById(id: string, companyId?: string): Promise<EmployeeShiftAssignment | null> {
    const asg = this.db.employeeShiftAssignments.get(id);
    if (!asg) return null;
    if (companyId && asg.companyId !== companyId) return null;
    return this.hydrateAssignment(asg);
  }

  public static async findByEmployeeId(
    employeeId: string,
    companyId: string
  ): Promise<EmployeeShiftAssignment[]> {
    const list = Array.from(this.db.employeeShiftAssignments.values())
      .filter((a) => a.employeeId === employeeId && a.companyId === companyId)
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
    return list.map((asg) => this.hydrateAssignment(asg));
  }

  public static async findCurrentByEmployeeId(
    employeeId: string,
    companyId: string,
    asOfDate?: string
  ): Promise<EmployeeShiftAssignment | null> {
    const date = asOfDate || new Date().toISOString().slice(0, 10);
    const matches = Array.from(this.db.employeeShiftAssignments.values()).filter(
      (a) =>
        a.employeeId === employeeId &&
        a.companyId === companyId &&
        a.status === 'ACTIVE' &&
        a.effectiveFrom <= date &&
        (!a.effectiveTo || a.effectiveTo >= date)
    );

    if (matches.length === 0) return null;
    // Pick the latest effectiveFrom
    matches.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
    return this.hydrateAssignment(matches[0]);
  }

  public static async findFutureByEmployeeId(
    employeeId: string,
    companyId: string,
    asOfDate?: string
  ): Promise<EmployeeShiftAssignment | null> {
    const date = asOfDate || new Date().toISOString().slice(0, 10);
    const matches = Array.from(this.db.employeeShiftAssignments.values()).filter(
      (a) =>
        a.employeeId === employeeId &&
        a.companyId === companyId &&
        a.status === 'ACTIVE' &&
        a.effectiveFrom > date
    );

    if (matches.length === 0) return null;
    // Pick earliest future shift
    matches.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
    return this.hydrateAssignment(matches[0]);
  }

  public static async hasOverlap(
    employeeId: string,
    companyId: string,
    effectiveFrom: string,
    effectiveTo?: string,
    excludeId?: string
  ): Promise<boolean> {
    const list = Array.from(this.db.employeeShiftAssignments.values()).filter(
      (a) => a.employeeId === employeeId && a.companyId === companyId && a.status === 'ACTIVE' && a.id !== excludeId
    );

    for (const item of list) {
      const itemTo = item.effectiveTo || '9999-12-31';
      const newTo = effectiveTo || '9999-12-31';

      if (effectiveFrom <= itemTo && newTo >= item.effectiveFrom) {
        return true;
      }
    }
    return false;
  }

  public static async terminateActive(
    employeeId: string,
    companyId: string,
    terminationEffectiveToDate: string
  ): Promise<void> {
    for (const [id, asg] of this.db.employeeShiftAssignments.entries()) {
      if (
        asg.employeeId === employeeId &&
        asg.companyId === companyId &&
        asg.status === 'ACTIVE' &&
        (!asg.effectiveTo || asg.effectiveTo >= terminationEffectiveToDate)
      ) {
        this.db.employeeShiftAssignments.set(id, {
          ...asg,
          effectiveTo: terminationEffectiveToDate,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  public static async create(assignment: EmployeeShiftAssignment): Promise<EmployeeShiftAssignment> {
    this.db.employeeShiftAssignments.set(assignment.id, assignment);
    return this.hydrateAssignment(assignment);
  }

  public static async update(
    id: string,
    companyId: string,
    updates: Partial<EmployeeShiftAssignment>
  ): Promise<EmployeeShiftAssignment | null> {
    const existing = this.db.employeeShiftAssignments.get(id);
    if (!existing || existing.companyId !== companyId) return null;

    const updated: EmployeeShiftAssignment = {
      ...existing,
      ...updates,
      id,
      companyId,
      updatedAt: new Date().toISOString(),
    };
    this.db.employeeShiftAssignments.set(id, updated);
    return this.hydrateAssignment(updated);
  }

  private static hydrateAssignment(asg: EmployeeShiftAssignment): EmployeeShiftAssignment {
    const emp = this.db.employees.get(asg.employeeId);
    const shift = this.db.shifts.get(asg.shiftId);
    const weeklyOff = shift
      ? Array.from(this.db.weeklyOffRules.values()).find((w) => w.shiftId === shift.id && w.status === 'ACTIVE')
      : undefined;

    const asOf = asg.effectiveFrom;
    const orgAsg = Array.from(this.db.employeeAssignments.values()).find(
      (o) => o.employeeId === asg.employeeId && o.effectiveFrom <= asOf && (!o.effectiveTo || o.effectiveTo >= asOf)
    );

    const dept = orgAsg?.departmentId ? this.db.departments.get(orgAsg.departmentId) : undefined;
    const desig = orgAsg?.designationId ? this.db.designations.get(orgAsg.designationId) : undefined;
    const branch = orgAsg?.branchId ? this.db.branches.get(orgAsg.branchId) : undefined;

    return {
      ...asg,
      employeeCode: emp?.employeeCode,
      employeeName: emp?.displayName,
      departmentId: dept?.id,
      departmentName: dept?.name,
      designationName: desig?.name,
      branchName: branch?.name,
      shiftCode: shift?.code,
      shiftName: shift?.name,
      shiftStartTime: shift?.startTime,
      shiftEndTime: shift?.endTime,
      isOvernight: shift?.isOvernight,
      shiftColor: shift?.color,
      fullDayHours: shift?.fullDayHours,
      halfDayHours: shift?.halfDayHours,
      weeklyOffDays: weeklyOff?.daysOfWeek,
      alternateSaturday: weeklyOff?.alternateSaturday,
    };
  }
}
