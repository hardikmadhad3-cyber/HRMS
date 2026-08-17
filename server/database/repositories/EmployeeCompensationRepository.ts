import {
  EmployeeCompensationAssignment,
  EmployeeComponentOverride,
  CompensationStatus,
} from '../../../src/types/payroll.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class EmployeeCompensationRepository {
  private static get db() {
    return RelationalDatabase.getInstance();
  }

  private static enrichAssignment(a: EmployeeCompensationAssignment): EmployeeCompensationAssignment {
    const emp = this.db.employees.get(a.employeeId);
    let deptName: string | undefined;
    let desigName: string | undefined;

    if (emp) {
      // Find current assignment for dept/desig
      const assigns = Array.from(this.db.employeeAssignments.values()).filter(
        (asg) => asg.employeeId === a.employeeId
      );
      if (assigns.length > 0) {
        const activeAsg = assigns.find((asg) => !asg.effectiveTo) || assigns[0];
        const dept = activeAsg.departmentId ? this.db.departments.get(activeAsg.departmentId) : undefined;
        const desig = activeAsg.designationId ? this.db.designations.get(activeAsg.designationId) : undefined;
        deptName = dept?.name;
        desigName = desig?.name;
      }
    }

    const structure = this.db.salaryStructures.get(a.salaryStructureId);
    const overrides = Array.from(this.db.employeeCompensationOverrides.values())
      .filter((o) => o.compensationAssignmentId === a.id && o.companyId === a.companyId)
      .map((o) => {
        const comp = this.db.salaryComponents.get(o.salaryComponentId);
        return {
          ...o,
          component: comp ? { ...comp } : undefined,
        };
      });

    return {
      ...a,
      employeeName: emp ? `${emp.firstName} ${emp.lastName}` : undefined,
      employeeCode: emp?.employeeCode,
      departmentName: deptName,
      designationName: desigName,
      salaryStructure: structure ? { ...structure } : undefined,
      overrides,
    };
  }

  public static async findByEmployeeId(
    employeeId: string,
    companyId: string
  ): Promise<EmployeeCompensationAssignment[]> {
    const list = Array.from(this.db.employeeCompensationAssignments.values()).filter(
      (a) => a.employeeId === employeeId && a.companyId === companyId
    );

    return list
      .map((a) => this.enrichAssignment(a))
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  }

  public static async findAll(
    companyId: string,
    filters?: { status?: CompensationStatus; salaryStructureId?: string; search?: string }
  ): Promise<EmployeeCompensationAssignment[]> {
    let list = Array.from(this.db.employeeCompensationAssignments.values()).filter(
      (a) => a.companyId === companyId
    );

    if (filters?.status) {
      list = list.filter((a) => a.status === filters.status);
    }

    if (filters?.salaryStructureId) {
      list = list.filter((a) => a.salaryStructureId === filters.salaryStructureId);
    }

    const enriched = list.map((a) => this.enrichAssignment(a));

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      return enriched.filter(
        (a) =>
          a.employeeName?.toLowerCase().includes(q) ||
          a.employeeCode?.toLowerCase().includes(q) ||
          a.salaryStructure?.name.toLowerCase().includes(q)
      );
    }

    return enriched.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  }

  public static async findCurrentAssignment(
    employeeId: string,
    companyId: string,
    asOfDate?: string
  ): Promise<EmployeeCompensationAssignment | null> {
    const targetDate = asOfDate || new Date().toISOString().slice(0, 10);
    const list = await this.findByEmployeeId(employeeId, companyId);

    for (const a of list) {
      if (a.status === CompensationStatus.ACTIVE && a.effectiveFrom <= targetDate) {
        if (!a.effectiveTo || a.effectiveTo >= targetDate) {
          return a;
        }
      }
    }
    return null;
  }

  public static async findById(id: string, companyId: string): Promise<EmployeeCompensationAssignment | null> {
    const a = this.db.employeeCompensationAssignments.get(id);
    if (!a || a.companyId !== companyId) return null;
    return this.enrichAssignment(a);
  }

  /**
   * Check for date overlaps with existing active assignments for the same employee
   */
  public static async hasOverlap(
    employeeId: string,
    companyId: string,
    effectiveFrom: string,
    effectiveTo?: string | null,
    excludeAssignmentId?: string
  ): Promise<boolean> {
    const list = Array.from(this.db.employeeCompensationAssignments.values()).filter(
      (a) =>
        a.employeeId === employeeId &&
        a.companyId === companyId &&
        a.status === CompensationStatus.ACTIVE &&
        a.id !== excludeAssignmentId
    );

    const newStart = effectiveFrom;
    const newEnd = effectiveTo || '9999-12-31';

    for (const existing of list) {
      const existStart = existing.effectiveFrom;
      const existEnd = existing.effectiveTo || '9999-12-31';

      // Check date interval intersection: (StartA <= EndB) and (EndA >= StartB)
      if (newStart <= existEnd && newEnd >= existStart) {
        return true;
      }
    }
    return false;
  }

  /**
   * Atomic creation of Employee Compensation Assignment & Overrides,
   * with automatic historical chaining (closing out previous open assignment)
   */
  public static async create(
    data: Omit<EmployeeCompensationAssignment, 'createdAt' | 'updatedAt'>,
    overridesData: Array<Omit<EmployeeComponentOverride, 'id' | 'compensationAssignmentId' | 'companyId' | 'createdAt' | 'updatedAt'>> = []
  ): Promise<EmployeeCompensationAssignment> {
    // 1. Verify structure existence and company boundary
    const structure = this.db.salaryStructures.get(data.salaryStructureId);
    if (!structure || structure.companyId !== data.companyId) {
      throw new Error(`Salary structure ${data.salaryStructureId} not found in company.`);
    }

    // 2. Verify employee existence and company boundary
    const employee = this.db.employees.get(data.employeeId);
    if (!employee || employee.companyId !== data.companyId) {
      throw new Error(`Employee ${data.employeeId} not found in company.`);
    }

    // 3. Historical chaining: find previous active open-ended or overlapping assignment
    const existingList = Array.from(this.db.employeeCompensationAssignments.values()).filter(
      (a) => a.employeeId === data.employeeId && a.companyId === data.companyId && a.status === CompensationStatus.ACTIVE
    );

    // If new assignment is active, close out prior active assignment whose effectiveFrom is earlier
    if (data.status === CompensationStatus.ACTIVE) {
      for (const prior of existingList) {
        if (prior.effectiveFrom < data.effectiveFrom) {
          if (!prior.effectiveTo || prior.effectiveTo >= data.effectiveFrom) {
            // Set prior effectiveTo to one day before new effectiveFrom
            const prevDate = new Date(data.effectiveFrom);
            prevDate.setDate(prevDate.getDate() - 1);
            const prevDateStr = prevDate.toISOString().slice(0, 10);

            prior.effectiveTo = prevDateStr >= prior.effectiveFrom ? prevDateStr : prior.effectiveFrom;
            prior.updatedAt = new Date().toISOString();
            this.db.employeeCompensationAssignments.set(prior.id, prior);
          }
        }
      }
    }

    // 4. Create new assignment
    const newAssignment: EmployeeCompensationAssignment = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.db.employeeCompensationAssignments.set(newAssignment.id, newAssignment);

    // 5. Store overrides
    try {
      for (let i = 0; i < overridesData.length; i++) {
        const oDto = overridesData[i];
        const comp = this.db.salaryComponents.get(oDto.salaryComponentId);
        if (!comp || comp.companyId !== data.companyId) {
          throw new Error(`Salary component ${oDto.salaryComponentId} not found for override.`);
        }

        const overrideId = `eco-${newAssignment.id}-${i + 1}`;
        const overrideItem: EmployeeComponentOverride = {
          id: overrideId,
          companyId: data.companyId,
          compensationAssignmentId: newAssignment.id,
          salaryComponentId: oDto.salaryComponentId,
          calculationType: oDto.calculationType,
          overrideValue: oDto.overrideValue,
          reason: oDto.reason,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.db.employeeCompensationOverrides.set(overrideItem.id, overrideItem);
      }

      return this.enrichAssignment(newAssignment);
    } catch (err) {
      // Rollback
      this.db.employeeCompensationAssignments.delete(newAssignment.id);
      for (const [id, o] of this.db.employeeCompensationOverrides.entries()) {
        if (o.compensationAssignmentId === newAssignment.id) {
          this.db.employeeCompensationOverrides.delete(id);
        }
      }
      throw err;
    }
  }

  public static async update(
    id: string,
    companyId: string,
    data: Partial<Omit<EmployeeCompensationAssignment, 'id' | 'companyId' | 'createdAt'>>,
    overridesData?: Array<Omit<EmployeeComponentOverride, 'id' | 'compensationAssignmentId' | 'companyId' | 'createdAt' | 'updatedAt'>>
  ): Promise<EmployeeCompensationAssignment | null> {
    const existing = this.db.employeeCompensationAssignments.get(id);
    if (!existing || existing.companyId !== companyId) return null;

    const updated: EmployeeCompensationAssignment = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.db.employeeCompensationAssignments.set(id, updated);

    if (overridesData !== undefined) {
      // Remove existing overrides
      for (const [oId, o] of this.db.employeeCompensationOverrides.entries()) {
        if (o.compensationAssignmentId === id) {
          this.db.employeeCompensationOverrides.delete(oId);
        }
      }

      // Add new overrides
      for (let i = 0; i < overridesData.length; i++) {
        const oDto = overridesData[i];
        const overrideId = `eco-${id}-${i + 1}`;
        const overrideItem: EmployeeComponentOverride = {
          id: overrideId,
          companyId,
          compensationAssignmentId: id,
          salaryComponentId: oDto.salaryComponentId,
          calculationType: oDto.calculationType,
          overrideValue: oDto.overrideValue,
          reason: oDto.reason,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.db.employeeCompensationOverrides.set(overrideItem.id, overrideItem);
      }
    }

    return this.enrichAssignment(updated);
  }

  public static async delete(id: string, companyId: string): Promise<boolean> {
    const existing = this.db.employeeCompensationAssignments.get(id);
    if (!existing || existing.companyId !== companyId) return false;

    // Delete overrides
    for (const [oId, o] of this.db.employeeCompensationOverrides.entries()) {
      if (o.compensationAssignmentId === id) {
        this.db.employeeCompensationOverrides.delete(oId);
      }
    }

    return this.db.employeeCompensationAssignments.delete(id);
  }
}
