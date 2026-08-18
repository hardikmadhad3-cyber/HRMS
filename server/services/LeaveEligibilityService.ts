import {
  LeavePolicyEvaluationResult,
  LeavePolicyRuleEvaluation,
} from '../../src/types/leave.js';
import { EmployeeRepository } from '../database/repositories/EmployeeRepository.js';
import { EmployeeAssignmentRepository } from '../database/repositories/EmployeeAssignmentRepository.js';
import { EmployeeLeavePolicyAssignmentRepository } from '../database/repositories/EmployeeLeavePolicyAssignmentRepository.js';
import { LeavePolicyRepository } from '../database/repositories/LeavePolicyRepository.js';
import { LeaveTypeRepository } from '../database/repositories/LeaveTypeRepository.js';

export class LeaveEligibilityService {
  /**
   * Deterministic Policy and Eligibility Evaluator
   * Answers: Given employee X, as-of date Y, and optional leave type Z,
   * what policy governs them, what rules apply, and are they eligible with exact reasons?
   * 
   * INVARIANT: Zero fake balances or transaction ledgers.
   */
  public static async evaluateEligibility(
    employeeId: string,
    companyId: string,
    asOfDate?: string,
    leaveTypeId?: string
  ): Promise<LeavePolicyEvaluationResult> {
    const targetDate = asOfDate || new Date().toISOString().slice(0, 10);

    // 1. Fetch employee
    const employee = await EmployeeRepository.findById(employeeId, companyId);
    if (!employee) {
      throw new Error(`EMPLOYEE_NOT_FOUND: Employee "${employeeId}" does not exist.`);
    }

    // 2. Fetch employee assignment effective as of targetDate
    const empAssignment = await EmployeeAssignmentRepository.findAssignmentAsOf(employeeId, targetDate);

    // 3. Calculate service days tenure
    const joiningTime = new Date(employee.joiningDate).getTime();
    const asOfTime = new Date(targetDate).getTime();
    const serviceDays = Math.max(0, Math.floor((asOfTime - joiningTime) / (1000 * 60 * 60 * 24)));
    const isProbation = employee.status === 'PROBATION';

    // 4. Resolve effective policy assignment as of targetDate
    let policyAssignment = await EmployeeLeavePolicyAssignmentRepository.findCurrentAssignment(
      employeeId,
      companyId,
      targetDate
    );

    let activePolicy = null;
    if (policyAssignment) {
      activePolicy = await LeavePolicyRepository.findById(policyAssignment.leavePolicyId, companyId);
    }

    // Fallback: If no explicit assignment, resolve default company policy
    if (!activePolicy) {
      activePolicy = await LeavePolicyRepository.findDefault(companyId);
    }

    if (!activePolicy) {
      return {
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        employeeName: employee.displayName,
        companyId,
        asOfDate: targetDate,
        serviceDays,
        isProbation,
        gender: employee.gender,
        policy: null,
        assignment: null,
        rules: [],
      };
    }

    // 5. Check policy-level eligibility criteria
    const policyIneligibilityReasons: string[] = [];
    if (activePolicy.status !== 'ACTIVE') {
      policyIneligibilityReasons.push('Leave policy is currently inactive.');
    }

    if (activePolicy.eligibility) {
      const elig = activePolicy.eligibility;
      if (elig.minServiceDays && serviceDays < elig.minServiceDays) {
        policyIneligibilityReasons.push(
          `Policy requires minimum ${elig.minServiceDays} days of service (Current tenure: ${serviceDays} days).`
        );
      }
      if (elig.employmentTypes && elig.employmentTypes.length > 0) {
        if (!elig.employmentTypes.includes(employee.employmentType)) {
          policyIneligibilityReasons.push(
            `Employment type "${employee.employmentType}" is not eligible for this policy.`
          );
        }
      }
      if (elig.departmentIds && elig.departmentIds.length > 0) {
        if (!empAssignment?.departmentId || !elig.departmentIds.includes(empAssignment.departmentId)) {
          policyIneligibilityReasons.push(
            `Department "${empAssignment?.departmentName || 'Unassigned'}" is not eligible for this policy as of ${targetDate}.`
          );
        }
      }
      if (elig.designationIds && elig.designationIds.length > 0) {
        if (!empAssignment?.designationId || !elig.designationIds.includes(empAssignment.designationId)) {
          policyIneligibilityReasons.push(
            `Designation "${empAssignment?.designationName || 'Unassigned'}" is not eligible for this policy as of ${targetDate}.`
          );
        }
      }
      if (elig.branchIds && elig.branchIds.length > 0) {
        if (!empAssignment?.branchId || !elig.branchIds.includes(empAssignment.branchId)) {
          policyIneligibilityReasons.push(
            `Branch "${empAssignment?.branchName || 'Unassigned'}" is not eligible for this policy as of ${targetDate}.`
          );
        }
      }
    }

    // 6. Evaluate all rules or single requested rule
    const rulesToEvaluate = leaveTypeId
      ? (activePolicy.rules || []).filter((r) => r.leaveTypeId === leaveTypeId)
      : activePolicy.rules || [];

    const evaluatedRules: LeavePolicyRuleEvaluation[] = [];

    for (const rule of rulesToEvaluate) {
      const lt = await LeaveTypeRepository.findById(rule.leaveTypeId, companyId);
      if (!lt) continue;

      const ineligibilityReasons: string[] = [...policyIneligibilityReasons];

      // Check active statuses
      if (rule.status !== 'ACTIVE') {
        ineligibilityReasons.push('This leave rule is currently inactive in the policy.');
      }
      if (lt.status !== 'ACTIVE') {
        ineligibilityReasons.push('Leave type is currently deactivated at the organization level.');
      }

      // Check service days tenure
      if (rule.minServiceDaysRequired > 0 && serviceDays < rule.minServiceDaysRequired) {
        ineligibilityReasons.push(
          `Requires at least ${rule.minServiceDaysRequired} days of completed service (Current tenure: ${serviceDays} days).`
        );
      }

      // Check probation restriction
      if (isProbation && !rule.allowDuringProbation) {
        ineligibilityReasons.push('This leave type is not permitted during employee probation period.');
      }

      // Check gender restriction
      if (rule.applicableGender && rule.applicableGender !== 'ALL') {
        const empGender = (employee.gender || '').toUpperCase();
        if (empGender !== rule.applicableGender) {
          ineligibilityReasons.push(
            `Restricted to ${rule.applicableGender.toLowerCase()} employees only.`
          );
        }
      }

      // Check marital status restriction
      if (rule.applicableMaritalStatus && rule.applicableMaritalStatus !== 'ALL') {
        const empMarital = (employee.maritalStatus || '').toUpperCase();
        if (empMarital !== rule.applicableMaritalStatus) {
          ineligibilityReasons.push(
            `Restricted to ${rule.applicableMaritalStatus.toLowerCase()} employees only.`
          );
        }
      }

      evaluatedRules.push({
        leaveTypeId: lt.id,
        leaveTypeCode: lt.code,
        leaveTypeName: lt.name,
        category: lt.category,
        paidType: lt.paidType,
        unit: lt.unit,
        color: lt.color,
        eligible: ineligibilityReasons.length === 0,
        ineligibilityReasons,
        annualEntitlement: rule.annualEntitlement,
        accrualFrequency: rule.accrualFrequency,
        accrualTiming: rule.accrualTiming,
        prorationRule: rule.prorationRule,
        allowCarryForward: rule.allowCarryForward,
        maxCarryForwardDays: rule.maxCarryForwardDays,
        carryForwardExpiryMonths: rule.carryForwardExpiryMonths,
        allowEncashment: rule.allowEncashment,
        minBalanceForEncashment: rule.minBalanceForEncashment,
        maxEncashmentDaysPerYear: rule.maxEncashmentDaysPerYear,
        sandwichRuleEnabled: rule.sandwichRuleEnabled ?? !!((rule as any).sandwichHoliday || (rule as any).sandwichWeeklyOff),
        includeHolidays: rule.includeHolidays ?? !!(rule as any).sandwichHoliday,
        includeWeeklyOffs: rule.includeWeeklyOffs ?? !!(rule as any).sandwichWeeklyOff,
        minDaysPerRequest: rule.minDaysPerRequest,
        maxConsecutiveDays: rule.maxConsecutiveDays,
        allowBackdated: rule.allowBackdated,
        maxBackdatedDays: rule.maxBackdatedDays,
        allowNegativeBalance: rule.allowNegativeBalance,
        negativeBalanceLimit: rule.negativeBalanceLimit,
        requiresAttachment: rule.requiresAttachment || lt.requiresAttachment,
        attachmentThresholdDays: rule.attachmentThresholdDays || lt.attachmentThresholdDays,
        minServiceDaysRequired: rule.minServiceDaysRequired,
        allowDuringProbation: rule.allowDuringProbation,
      });
    }

    return {
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      employeeName: employee.displayName,
      companyId,
      asOfDate: targetDate,
      serviceDays,
      isProbation,
      gender: employee.gender,
      policy: {
        id: activePolicy.id,
        code: activePolicy.code,
        name: activePolicy.name,
        priority: activePolicy.priority,
        isDefault: activePolicy.isDefault,
      },
      assignment: policyAssignment
        ? {
            id: policyAssignment.id,
            effectiveFrom: policyAssignment.effectiveFrom,
            effectiveTo: policyAssignment.effectiveTo || null,
            status: policyAssignment.status,
          }
        : null,
      rules: evaluatedRules,
    };
  }
}
