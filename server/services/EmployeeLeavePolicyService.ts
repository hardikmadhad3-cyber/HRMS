import { EmployeeLeavePolicyAssignment } from '../../src/types/leave.js';
import { AuthUser } from '../../src/types/auth.js';
import { EmployeeLeavePolicyAssignmentRepository } from '../database/repositories/EmployeeLeavePolicyAssignmentRepository.js';
import { LeavePolicyRepository } from '../database/repositories/LeavePolicyRepository.js';
import { EmployeeRepository } from '../database/repositories/EmployeeRepository.js';
import { AuditService } from './AuditService.js';

export interface AssignLeavePolicyDTO {
  employeeId: string;
  leavePolicyId: string;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo?: string | null;
  assignmentReason?: string;
}

export class EmployeeLeavePolicyService {
  public static async getEmployeePolicyHistory(
    employeeId: string,
    companyId: string
  ): Promise<{
    currentPolicy: EmployeeLeavePolicyAssignment | null;
    futurePolicy: EmployeeLeavePolicyAssignment | null;
    history: EmployeeLeavePolicyAssignment[];
  }> {
    const today = new Date().toISOString().slice(0, 10);
    const history = await EmployeeLeavePolicyAssignmentRepository.findByEmployeeId(employeeId, companyId);
    const currentPolicy = await EmployeeLeavePolicyAssignmentRepository.findCurrentAssignment(employeeId, companyId, today);
    const futurePolicy = await EmployeeLeavePolicyAssignmentRepository.findFutureAssignment(employeeId, companyId, today);

    return {
      currentPolicy,
      futurePolicy,
      history,
    };
  }

  public static async assignPolicy(
    companyId: string,
    actor: AuthUser,
    dto: AssignLeavePolicyDTO
  ): Promise<EmployeeLeavePolicyAssignment> {
    if (!dto.employeeId || !dto.leavePolicyId || !dto.effectiveFrom) {
      throw new Error('VALIDATION_ERROR: employeeId, leavePolicyId, and effectiveFrom date are required.');
    }

    // 1. Verify employee exists and belongs to companyId
    const employee = await EmployeeRepository.findById(dto.employeeId, companyId);
    if (!employee) {
      throw new Error(`EMPLOYEE_NOT_FOUND: Employee "${dto.employeeId}" does not exist in this company.`);
    }

    // 2. Verify leave policy exists and belongs to companyId
    const policy = await LeavePolicyRepository.findById(dto.leavePolicyId, companyId);
    if (!policy) {
      throw new Error(`LEAVE_POLICY_NOT_FOUND: Leave policy "${dto.leavePolicyId}" does not exist in this company.`);
    }

    if (policy.status !== 'ACTIVE') {
      throw new Error(`INACTIVE_POLICY: Cannot assign inactive leave policy "${policy.code}".`);
    }

    // 3. Check existing assignments and adjust historical effectiveTo dates
    const existingHistory = await EmployeeLeavePolicyAssignmentRepository.findByEmployeeId(dto.employeeId, companyId);

    // Find any assignment that currently overlaps or precedes
    const newStartDate = dto.effectiveFrom;
    for (const a of existingHistory) {
      if (a.status === 'ACTIVE') {
        // If an existing assignment starts before newStartDate and has no effectiveTo (or effectiveTo >= newStartDate)
        if (a.effectiveFrom < newStartDate && (!a.effectiveTo || a.effectiveTo >= newStartDate)) {
          // Adjust previous assignment's effectiveTo to the day before newStartDate
          const prevDate = new Date(new Date(newStartDate).getTime() - 86400000).toISOString().slice(0, 10);
          await EmployeeLeavePolicyAssignmentRepository.update(a.id, companyId, {
            effectiveTo: prevDate,
          });
        } else if (a.effectiveFrom === newStartDate) {
          // If there is an exact same effectiveFrom, supersede it
          await EmployeeLeavePolicyAssignmentRepository.update(a.id, companyId, {
            status: 'SUPERSEDED',
            effectiveTo: newStartDate,
          });
        }
      }
    }

    const assignmentId = `lpa-${employee.id}-${Date.now() % 100000}`;
    const newAssignment = await EmployeeLeavePolicyAssignmentRepository.create({
      id: assignmentId,
      companyId,
      employeeId: dto.employeeId,
      leavePolicyId: dto.leavePolicyId,
      effectiveFrom: dto.effectiveFrom,
      effectiveTo: dto.effectiveTo || null,
      assignmentReason: dto.assignmentReason?.trim() || 'HR_ADMIN_POLICY_ALLOCATION',
      status: 'ACTIVE',
      createdBy: actor.id,
    });

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: 'EMPLOYEE_LEAVE_POLICY_ASSIGNED',
      targetModule: 'LEAVE',
      targetRecordId: newAssignment.id,
      companyId,
      changesSummary: `Assigned Leave Policy "${policy.name}" (${policy.code}) to ${employee.displayName} (${employee.employeeCode}) effective from ${dto.effectiveFrom}`,
    });

    return newAssignment;
  }

  public static async cancelAssignment(
    assignmentId: string,
    companyId: string,
    actor: AuthUser
  ): Promise<EmployeeLeavePolicyAssignment> {
    const existing = await EmployeeLeavePolicyAssignmentRepository.findById(assignmentId, companyId);
    if (!existing) {
      throw new Error(`ASSIGNMENT_NOT_FOUND: Policy assignment "${assignmentId}" does not exist.`);
    }

    const cancelled = await EmployeeLeavePolicyAssignmentRepository.cancelAssignment(assignmentId, companyId);
    if (!cancelled) {
      throw new Error('ASSIGNMENT_CANCEL_FAILED');
    }

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: 'EMPLOYEE_LEAVE_POLICY_CANCELLED',
      targetModule: 'LEAVE',
      targetRecordId: assignmentId,
      companyId,
      changesSummary: `Cancelled Leave Policy assignment ${assignmentId} for employee ${existing.employeeCode}`,
    });

    return cancelled;
  }
}
