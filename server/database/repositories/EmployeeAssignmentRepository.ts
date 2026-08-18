import { EmployeeAssignment } from '../../../src/types/employee.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class EmployeeAssignmentRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findById(id: string): Promise<EmployeeAssignment | null> {
    return this.db.employeeAssignments.get(id) || null;
  }

  public static async findCurrentAssignment(employeeId: string): Promise<EmployeeAssignment | null> {
    const today = new Date().toISOString().slice(0, 10);
    return this.findAssignmentAsOf(employeeId, today);
  }

  public static async findAssignmentAsOf(employeeId: string, asOfDate: string): Promise<EmployeeAssignment | null> {
    const list = Array.from(this.db.employeeAssignments.values()).filter(
      (a) => a.employeeId === employeeId
    );
    if (list.length === 0) return null;

    // Filter assignments that are active as of asOfDate: effectiveFrom <= asOfDate and (!effectiveTo || effectiveTo >= asOfDate)
    const valid = list.filter(
      (a) => a.effectiveFrom <= asOfDate && (!a.effectiveTo || a.effectiveTo >= asOfDate)
    );
    if (valid.length > 0) {
      valid.sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
      return this.enrichAssignment(valid[0]);
    }

    // If none directly covering, take the closest preceding assignment
    list.sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
    const past = list.find((a) => a.effectiveFrom <= asOfDate);
    if (past) return this.enrichAssignment(past);

    return this.enrichAssignment(list[list.length - 1]);
  }

  public static async findHistory(employeeId: string): Promise<EmployeeAssignment[]> {
    const list = Array.from(this.db.employeeAssignments.values()).filter(
      (a) => a.employeeId === employeeId
    );
    list.sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
    return list.map((a) => this.enrichAssignment(a));
  }

  public static async create(assignment: EmployeeAssignment): Promise<EmployeeAssignment> {
    this.db.employeeAssignments.set(assignment.id, assignment);
    return this.enrichAssignment(assignment);
  }

  public static async update(id: string, updates: Partial<EmployeeAssignment>): Promise<EmployeeAssignment | null> {
    const existing = this.db.employeeAssignments.get(id);
    if (!existing) return null;

    const updated: EmployeeAssignment = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    this.db.employeeAssignments.set(id, updated);
    return this.enrichAssignment(updated);
  }

  public static async findDirectReports(managerId: string): Promise<string[]> {
    const fromAssignments = Array.from(this.db.employeeAssignments.values())
      .filter((a) => a.managerId === managerId && !a.effectiveTo)
      .map((a) => a.employeeId);

    return Array.from(new Set(fromAssignments));
  }

  public static async getAllSubordinateIds(managerId: string): Promise<string[]> {
    const result = new Set<string>();
    const queue = [managerId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const directs = await this.findDirectReports(current);
      for (const d of directs) {
        if (!result.has(d)) {
          result.add(d);
          queue.push(d);
        }
      }
    }

    return Array.from(result);
  }

  public static async isCircularManager(employeeId: string, proposedManagerId: string): Promise<boolean> {
    if (employeeId === proposedManagerId) return true; // Cannot manage self

    // Check if proposedManager reports to employee (directly or indirectly)
    let currentId: string | undefined = proposedManagerId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === employeeId) {
        return true; // Cycle detected: proposed manager is in employee's downstream hierarchy
      }
      if (visited.has(currentId)) {
        break; // Guard against existing loop
      }
      visited.add(currentId);

      const currentAssign = await this.findCurrentAssignment(currentId);
      currentId = currentAssign?.managerId;
    }

    return false;
  }

  private static enrichAssignment(a: EmployeeAssignment): EmployeeAssignment {
    const company = this.db.companies.get(a.companyId);
    const branch = this.db.branches.get(a.branchId);
    const dept = this.db.departments.get(a.departmentId);
    const desig = this.db.designations.get(a.designationId);
    const workLoc = this.db.workLocations.get(a.workLocationId);
    let managerName: string | undefined;
    let managerCode: string | undefined;

    if (a.managerId) {
      const mgr = this.db.employees.get(a.managerId);
      if (mgr) {
        managerName = mgr.displayName;
        managerCode = mgr.employeeCode;
      }
    }

    return {
      ...a,
      companyName: company?.name,
      branchName: branch?.name,
      departmentName: dept?.name,
      designationName: desig?.name,
      workLocationName: workLoc?.name,
      managerName,
      managerCode,
    };
  }
}
