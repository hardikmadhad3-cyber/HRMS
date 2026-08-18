import {
  EmployeeCompensationAssignment,
  EmployeeComponentOverride,
  CompensationStatus,
  PayFrequency,
} from '../../src/types/payroll.js';
import { EmployeeCompensationRepository } from '../database/repositories/EmployeeCompensationRepository.js';
import { SalaryStructureRepository } from '../database/repositories/SalaryStructureRepository.js';
import { EmployeeRepository } from '../database/repositories/EmployeeRepository.js';
import { AuditService } from './AuditService.js';
import { ServiceActor } from './OrganizationService.js';
import { PermissionKey, UserRole } from '../../src/types/auth.js';

export class EmployeeCompensationService {
  /**
   * Check if actor is authorized to view compensation for a specific employee
   */
  public static canViewCompensation(actor: ServiceActor, employeeId?: string): boolean {
    if (actor.role === UserRole.SUPER_ADMIN || actor.role === UserRole.HR_ADMIN || actor.role === UserRole.PAYROLL_MANAGER) {
      return true;
    }
    // Check if actor has PAYROLL_COMPENSATION_VIEW permission
    if ((actor as any).permissions?.includes(PermissionKey.PAYROLL_COMPENSATION_VIEW)) {
      return true;
    }
    // If actor is accessing their own compensation
    if (employeeId && (actor as any).employeeId === employeeId) {
      return true;
    }
    return false;
  }

  /**
   * Check if actor has manage rights
   */
  public static canManageCompensation(actor: ServiceActor): boolean {
    if (actor.role === UserRole.SUPER_ADMIN || actor.role === UserRole.HR_ADMIN || actor.role === UserRole.PAYROLL_MANAGER) {
      return true;
    }
    return Boolean((actor as any).permissions?.includes(PermissionKey.PAYROLL_MANAGE));
  }

  public static async getCompensationsByEmployee(
    employeeId: string,
    companyId: string,
    actor: ServiceActor
  ): Promise<EmployeeCompensationAssignment[]> {
    if (!this.canViewCompensation(actor, employeeId)) {
      throw new Error('FORBIDDEN_COMPENSATION_ACCESS: Sensitive compensation data requires PAYROLL_COMPENSATION_VIEW authorization.');
    }

    return EmployeeCompensationRepository.findByEmployeeId(employeeId, companyId);
  }

  public static async getAllCompensations(
    companyId: string,
    filters: { status?: CompensationStatus; salaryStructureId?: string; search?: string } | undefined,
    actor: ServiceActor
  ): Promise<EmployeeCompensationAssignment[]> {
    if (!this.canViewCompensation(actor)) {
      throw new Error('FORBIDDEN_COMPENSATION_ACCESS: Sensitive compensation directory requires PAYROLL_COMPENSATION_VIEW authorization.');
    }

    return EmployeeCompensationRepository.findAll(companyId, filters);
  }

  public static async getCompensationById(
    id: string,
    companyId: string,
    actor: ServiceActor
  ): Promise<EmployeeCompensationAssignment | null> {
    const item = await EmployeeCompensationRepository.findById(id, companyId);
    if (!item) return null;

    if (!this.canViewCompensation(actor, item.employeeId)) {
      throw new Error('FORBIDDEN_COMPENSATION_ACCESS: Sensitive compensation data requires PAYROLL_COMPENSATION_VIEW authorization.');
    }

    return item;
  }

  public static async getCurrentCompensation(
    employeeId: string,
    companyId: string,
    asOfDate?: string,
    actor?: ServiceActor
  ): Promise<EmployeeCompensationAssignment | null> {
    if (actor && !this.canViewCompensation(actor, employeeId)) {
      throw new Error('FORBIDDEN_COMPENSATION_ACCESS: Sensitive compensation data requires PAYROLL_COMPENSATION_VIEW authorization.');
    }

    return EmployeeCompensationRepository.findCurrentAssignment(employeeId, companyId, asOfDate);
  }

  public static async assignCompensation(
    companyId: string,
    assignmentData: Omit<EmployeeCompensationAssignment, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'overrides'>,
    overridesData: Array<Omit<EmployeeComponentOverride, 'id' | 'compensationAssignmentId' | 'companyId' | 'createdAt' | 'updatedAt'>> = [],
    actor: ServiceActor
  ): Promise<EmployeeCompensationAssignment> {
    if (!this.canManageCompensation(actor)) {
      throw new Error('FORBIDDEN_COMPENSATION_MANAGE: Modifying employee compensation requires PAYROLL_MANAGE authorization.');
    }

    // 1. Verify structure exists
    const structure = await SalaryStructureRepository.findById(assignmentData.salaryStructureId, companyId);
    if (!structure) {
      throw new Error('SALARY_STRUCTURE_NOT_FOUND: Assigned salary structure does not exist.');
    }

    // 2. Verify employee exists in company
    const employee = await EmployeeRepository.findById(assignmentData.employeeId, companyId);
    if (!employee) {
      throw new Error('EMPLOYEE_NOT_FOUND: Employee does not exist in target company.');
    }

    // 3. Verify overrides eligibility against structure rules
    if (overridesData.length > 0) {
      const allowedOverrideCompIds = new Set(
        structure.components?.filter((c) => c.allowOverride).map((c) => c.salaryComponentId) || []
      );

      for (const override of overridesData) {
        if (!allowedOverrideCompIds.has(override.salaryComponentId)) {
          throw new Error(
            `OVERRIDE_NOT_ALLOWED: Component ${override.salaryComponentId} does not permit employee-level overrides in structure '${structure.name}'.`
          );
        }
      }
    }

    // 4. Overlap validation
    const hasOverlap = await EmployeeCompensationRepository.hasOverlap(
      assignmentData.employeeId,
      companyId,
      assignmentData.effectiveFrom,
      assignmentData.effectiveTo
    );

    // If an overlap exists where a prior active assignment starts AFTER or SAME DATE as new assignment, reject
    if (hasOverlap) {
      const existingList = await EmployeeCompensationRepository.findByEmployeeId(assignmentData.employeeId, companyId);
      const exactDuplicate = existingList.find(
        (e) => e.status === CompensationStatus.ACTIVE && e.effectiveFrom === assignmentData.effectiveFrom
      );
      if (exactDuplicate) {
        throw new Error(
          `COMPENSATION_OVERLAP_ERROR: An active compensation assignment already exists with effective date '${assignmentData.effectiveFrom}'.`
        );
      }
    }

    // 5. Atomic persistence & historical chaining
    const id = `eca-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const created = await EmployeeCompensationRepository.create(
      {
        ...assignmentData,
        id,
        companyId,
        createdBy: actor.id,
      },
      overridesData
    );

    await AuditService.log({
      companyId,
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'EMPLOYEE_COMPENSATION_ASSIGNED',
      targetModule: 'PayrollCompensation',
      targetRecordId: created.id,
      changesSummary: `Assigned compensation to employee ${created.employeeId} with Annual CTC ${created.annualCtc}, Effective from ${created.effectiveFrom} (${created.changeReason})`,
      ipAddress: actor.ipAddress,
    });

    return created;
  }

  public static async updateCompensation(
    id: string,
    companyId: string,
    updateData: Partial<Omit<EmployeeCompensationAssignment, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'overrides'>>,
    overridesData?: Array<Omit<EmployeeComponentOverride, 'id' | 'compensationAssignmentId' | 'companyId' | 'createdAt' | 'updatedAt'>>,
    actor?: ServiceActor
  ): Promise<EmployeeCompensationAssignment> {
    if (actor && !this.canManageCompensation(actor)) {
      throw new Error('FORBIDDEN_COMPENSATION_MANAGE: Modifying employee compensation requires PAYROLL_MANAGE authorization.');
    }

    const existing = await EmployeeCompensationRepository.findById(id, companyId);
    if (!existing) {
      throw new Error('COMPENSATION_ASSIGNMENT_NOT_FOUND: Compensation record not found.');
    }

    const updated = await EmployeeCompensationRepository.update(id, companyId, updateData, overridesData);
    if (!updated) {
      throw new Error('Failed to update compensation assignment.');
    }

    if (actor) {
      await AuditService.log({
        companyId,
        actorId: actor.id,
        actorName: actor.name,
        actorEmail: actor.email,
        action: 'EMPLOYEE_COMPENSATION_UPDATED',
        targetModule: 'PayrollCompensation',
        targetRecordId: id,
        changesSummary: `Updated compensation assignment ${id}`,
        ipAddress: actor.ipAddress,
      });
    }

    return updated;
  }

  public static async cancelCompensation(
    id: string,
    companyId: string,
    actor: ServiceActor
  ): Promise<boolean> {
    if (!this.canManageCompensation(actor)) {
      throw new Error('FORBIDDEN_COMPENSATION_MANAGE: Modifying employee compensation requires PAYROLL_MANAGE authorization.');
    }

    const existing = await EmployeeCompensationRepository.findById(id, companyId);
    if (!existing) {
      throw new Error('COMPENSATION_ASSIGNMENT_NOT_FOUND: Compensation record not found.');
    }

    const updated = await EmployeeCompensationRepository.update(id, companyId, {
      status: CompensationStatus.CANCELLED,
    });

    if (updated) {
      await AuditService.log({
        companyId,
        actorId: actor.id,
        actorName: actor.name,
        actorEmail: actor.email,
        action: 'EMPLOYEE_COMPENSATION_CANCELLED',
        targetModule: 'PayrollCompensation',
        targetRecordId: id,
        changesSummary: `Cancelled compensation record ${id} for employee ${existing.employeeId}`,
        ipAddress: actor.ipAddress,
      });
      return true;
    }
    return false;
  }
}
