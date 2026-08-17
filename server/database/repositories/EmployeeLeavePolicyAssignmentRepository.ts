import { EmployeeLeavePolicyAssignment } from '../../../src/types/leave.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class EmployeeLeavePolicyAssignmentRepository {
  private static get db() {
    return RelationalDatabase.getInstance();
  }

  public static async findByEmployeeId(
    employeeId: string,
    companyId: string
  ): Promise<EmployeeLeavePolicyAssignment[]> {
    const list = Array.from(this.db.employeeLeavePolicyAssignments.values()).filter(
      (a) => a.employeeId === employeeId && a.companyId === companyId
    );

    return list
      .map((a) => this.enrichAssignment(a))
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  }

  public static async findCurrentAssignment(
    employeeId: string,
    companyId: string,
    asOfDate?: string
  ): Promise<EmployeeLeavePolicyAssignment | null> {
    const targetDate = asOfDate || new Date().toISOString().slice(0, 10);
    const list = await this.findByEmployeeId(employeeId, companyId);

    for (const a of list) {
      if (a.status === 'ACTIVE' && a.effectiveFrom <= targetDate) {
        if (!a.effectiveTo || a.effectiveTo >= targetDate) {
          return a;
        }
      }
    }
    return null;
  }

  public static async findFutureAssignment(
    employeeId: string,
    companyId: string,
    asOfDate?: string
  ): Promise<EmployeeLeavePolicyAssignment | null> {
    const targetDate = asOfDate || new Date().toISOString().slice(0, 10);
    const list = await this.findByEmployeeId(employeeId, companyId);

    // Look for active assignments starting strictly after targetDate
    for (const a of list) {
      if (a.status === 'ACTIVE' && a.effectiveFrom > targetDate) {
        return a;
      }
    }
    return null;
  }

  public static async findById(id: string, companyId: string): Promise<EmployeeLeavePolicyAssignment | null> {
    const a = this.db.employeeLeavePolicyAssignments.get(id);
    if (!a || a.companyId !== companyId) return null;
    return this.enrichAssignment(a);
  }

  public static async create(
    data: Omit<EmployeeLeavePolicyAssignment, 'createdAt' | 'updatedAt'>
  ): Promise<EmployeeLeavePolicyAssignment> {
    const newAssignment: EmployeeLeavePolicyAssignment = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.db.employeeLeavePolicyAssignments.set(newAssignment.id, newAssignment);
    return this.enrichAssignment(newAssignment);
  }

  public static async update(
    id: string,
    companyId: string,
    data: Partial<Omit<EmployeeLeavePolicyAssignment, 'id' | 'companyId' | 'createdAt'>>
  ): Promise<EmployeeLeavePolicyAssignment | null> {
    const existing = this.db.employeeLeavePolicyAssignments.get(id);
    if (!existing || existing.companyId !== companyId) return null;

    const updated: EmployeeLeavePolicyAssignment = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.db.employeeLeavePolicyAssignments.set(id, updated);
    return this.enrichAssignment(updated);
  }

  public static async cancelAssignment(id: string, companyId: string): Promise<EmployeeLeavePolicyAssignment | null> {
    return this.update(id, companyId, { status: 'CANCELLED' });
  }

  private static enrichAssignment(a: EmployeeLeavePolicyAssignment): EmployeeLeavePolicyAssignment {
    const policy = this.db.leavePolicies.get(a.leavePolicyId);
    const emp = this.db.employees.get(a.employeeId);

    // Get assignment effective as of policy assignment date for department/designation names
    let deptName: string | undefined;
    let desigName: string | undefined;
    const assignments = Array.from(this.db.employeeAssignments.values()).filter(
      (ea) => ea.employeeId === a.employeeId
    );
    const valid = assignments.filter(
      (ea) => ea.effectiveFrom <= a.effectiveFrom && (!ea.effectiveTo || ea.effectiveTo >= a.effectiveFrom)
    );
    let targetAssign = valid.length > 0
      ? valid.sort((x, y) => new Date(y.effectiveFrom).getTime() - new Date(x.effectiveFrom).getTime())[0]
      : assignments.find((ea) => !ea.effectiveTo) || assignments[0];

    if (targetAssign) {
      const dept = this.db.departments.get(targetAssign.departmentId);
      const desig = this.db.designations.get(targetAssign.designationId);
      deptName = dept?.name;
      desigName = desig?.name;
    }

    return {
      ...a,
      leavePolicyName: policy?.name,
      leavePolicyCode: policy?.code,
      employeeName: emp?.displayName,
      employeeCode: emp?.employeeCode,
      departmentName: deptName,
      designationName: desigName,
    };
  }
}
