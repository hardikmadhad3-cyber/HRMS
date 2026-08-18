import {
  LeavePolicy,
  LeavePolicyRule,
  LeavePolicyEligibility,
  LeavePolicyStatus,
} from '../../src/types/leave.js';
import { AuthUser } from '../../src/types/auth.js';
import { LeavePolicyRepository } from '../database/repositories/LeavePolicyRepository.js';
import { LeavePolicyRuleRepository } from '../database/repositories/LeavePolicyRuleRepository.js';
import { LeavePolicyEligibilityRepository } from '../database/repositories/LeavePolicyEligibilityRepository.js';
import { LeaveTypeRepository } from '../database/repositories/LeaveTypeRepository.js';
import { RelationalDatabase } from '../database/RelationalDatabase.js';
import { AuditService } from './AuditService.js';

export interface CreateLeavePolicyRuleDTO {
  leaveTypeId: string;
  annualEntitlement: number;
  accrualFrequency: LeavePolicyRule['accrualFrequency'];
  accrualTiming?: LeavePolicyRule['accrualTiming'];
  prorationRule?: LeavePolicyRule['prorationRule'];
  allowCarryForward?: boolean;
  maxCarryForwardDays?: number;
  carryForwardExpiryMonths?: number;
  allowEncashment?: boolean;
  minBalanceForEncashment?: number;
  maxEncashmentDaysPerYear?: number;
  sandwichRuleEnabled?: boolean;
  includeHolidays?: boolean;
  includeWeeklyOffs?: boolean;
  minDaysPerRequest?: number;
  maxConsecutiveDays?: number;
  maxRequestsPerMonth?: number;
  maxAdvanceDays?: number;
  allowBackdated?: boolean;
  maxBackdatedDays?: number;
  allowNegativeBalance?: boolean;
  negativeBalanceLimit?: number;
  requiresAttachment?: boolean;
  attachmentThresholdDays?: number;
  minServiceDaysRequired?: number;
  allowDuringProbation?: boolean;
  applicableGender?: LeavePolicyRule['applicableGender'];
  applicableMaritalStatus?: LeavePolicyRule['applicableMaritalStatus'];
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface CreateLeavePolicyEligibilityDTO {
  employmentTypes?: string[];
  departmentIds?: string[];
  designationIds?: string[];
  branchIds?: string[];
  workLocationIds?: string[];
  minServiceDays?: number;
}

export interface CreateLeavePolicyDTO {
  code: string;
  name: string;
  description?: string;
  priority?: number;
  isDefault?: boolean;
  status?: LeavePolicyStatus;
  rules: CreateLeavePolicyRuleDTO[];
  eligibility?: CreateLeavePolicyEligibilityDTO;
}

export interface UpdateLeavePolicyDTO {
  code?: string;
  name?: string;
  description?: string;
  priority?: number;
  isDefault?: boolean;
  status?: LeavePolicyStatus;
  rules?: CreateLeavePolicyRuleDTO[];
  eligibility?: CreateLeavePolicyEligibilityDTO;
}

export class LeavePolicyService {
  private static get db() {
    return RelationalDatabase.getInstance();
  }

  public static async getPolicies(
    companyId: string,
    filters?: { status?: LeavePolicyStatus; search?: string }
  ): Promise<LeavePolicy[]> {
    return LeavePolicyRepository.findAll(companyId, filters);
  }

  public static async getPolicyById(id: string, companyId: string): Promise<LeavePolicy | null> {
    return LeavePolicyRepository.findById(id, companyId);
  }

  /**
   * Transactional Leave Policy Creation
   */
  public static async createPolicy(
    companyId: string,
    actor: AuthUser,
    dto: CreateLeavePolicyDTO
  ): Promise<LeavePolicy> {
    if (!dto.code || !dto.name) {
      throw new Error('VALIDATION_ERROR: Policy code and name are mandatory.');
    }

    const cleanCode = dto.code.trim().toUpperCase();
    const existing = await LeavePolicyRepository.findByCode(cleanCode, companyId);
    if (existing) {
      throw new Error(`LEAVE_POLICY_CODE_EXISTS: A leave policy with code "${cleanCode}" already exists.`);
    }

    // Validate rules
    if (!dto.rules || dto.rules.length === 0) {
      throw new Error('INVALID_LEAVE_POLICY: Policy must define at least one leave type rule.');
    }

    const seenLeaveTypes = new Set<string>();
    for (const r of dto.rules) {
      if (seenLeaveTypes.has(r.leaveTypeId)) {
        throw new Error(`DUPLICATE_RULE: Duplicate rule for leave type "${r.leaveTypeId}" in policy.`);
      }
      seenLeaveTypes.add(r.leaveTypeId);

      // Verify leave type exists and belongs to this company
      const lt = await LeaveTypeRepository.findById(r.leaveTypeId, companyId);
      if (!lt) {
        throw new Error(`LEAVE_TYPE_NOT_FOUND: Referenced leave type "${r.leaveTypeId}" does not exist in this company.`);
      }

      if (r.annualEntitlement < 0) {
        throw new Error('INVALID_ACCRUAL_RULE: Annual entitlement cannot be negative.');
      }
      if (r.allowCarryForward && (r.maxCarryForwardDays || 0) < 0) {
        throw new Error('INVALID_CARRY_FORWARD_RULE: Max carry forward days cannot be negative.');
      }
    }

    const policyId = `pol-${companyId.replace('comp-', '')}-${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now() % 10000}`;

    try {
      // 1. Create policy master
      await LeavePolicyRepository.create({
        id: policyId,
        companyId,
        code: cleanCode,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        priority: dto.priority ?? 1,
        isDefault: Boolean(dto.isDefault),
        status: dto.status || 'ACTIVE',
        createdBy: actor.id,
      });

      // 2. Create rules
      const rulesToSave: LeavePolicyRule[] = dto.rules.map((r, idx) => ({
        id: `rule-${policyId}-${idx + 1}`,
        companyId,
        leavePolicyId: policyId,
        leaveTypeId: r.leaveTypeId,
        annualEntitlement: r.annualEntitlement,
        accrualFrequency: r.accrualFrequency || 'ANNUAL_UPFRONT',
        accrualTiming: r.accrualTiming || 'START_OF_PERIOD',
        prorationRule: r.prorationRule || 'PRORATE_BY_DAYS',
        allowCarryForward: Boolean(r.allowCarryForward),
        maxCarryForwardDays: r.maxCarryForwardDays || 0,
        carryForwardExpiryMonths: r.carryForwardExpiryMonths ?? 12,
        allowEncashment: Boolean(r.allowEncashment),
        minBalanceForEncashment: r.minBalanceForEncashment || 0,
        maxEncashmentDaysPerYear: r.maxEncashmentDaysPerYear || 0,
        sandwichRuleEnabled: Boolean(r.sandwichRuleEnabled),
        includeHolidays: Boolean(r.includeHolidays),
        includeWeeklyOffs: Boolean(r.includeWeeklyOffs),
        minDaysPerRequest: r.minDaysPerRequest ?? 0.5,
        maxConsecutiveDays: r.maxConsecutiveDays ?? 30,
        maxRequestsPerMonth: r.maxRequestsPerMonth,
        maxAdvanceDays: r.maxAdvanceDays ?? 90,
        allowBackdated: r.allowBackdated !== false,
        maxBackdatedDays: r.maxBackdatedDays ?? 7,
        allowNegativeBalance: Boolean(r.allowNegativeBalance),
        negativeBalanceLimit: r.negativeBalanceLimit || 0,
        requiresAttachment: Boolean(r.requiresAttachment),
        attachmentThresholdDays: r.attachmentThresholdDays,
        minServiceDaysRequired: r.minServiceDaysRequired || 0,
        allowDuringProbation: r.allowDuringProbation !== false,
        applicableGender: r.applicableGender || 'ALL',
        applicableMaritalStatus: r.applicableMaritalStatus || 'ALL',
        status: r.status || 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      await LeavePolicyRuleRepository.saveBatch(rulesToSave);

      // 3. Create eligibility criteria
      const eligibility: LeavePolicyEligibility = {
        id: `elig-${policyId}`,
        companyId,
        leavePolicyId: policyId,
        employmentTypes: dto.eligibility?.employmentTypes || [],
        departmentIds: dto.eligibility?.departmentIds || [],
        designationIds: dto.eligibility?.designationIds || [],
        branchIds: dto.eligibility?.branchIds || [],
        workLocationIds: dto.eligibility?.workLocationIds || [],
        minServiceDays: dto.eligibility?.minServiceDays || 0,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await LeavePolicyEligibilityRepository.save(eligibility);

      // 4. Log audit trail
      await AuditService.log({
        actorId: actor.id,
        actorName: actor.fullName,
        actorEmail: actor.email,
        action: 'LEAVE_POLICY_CREATED',
        targetModule: 'LEAVE',
        targetRecordId: policyId,
        companyId,
        changesSummary: `Created Leave Policy ${cleanCode} (${dto.name}) with ${rulesToSave.length} leave rules.`,
      });

      const result = await LeavePolicyRepository.findById(policyId, companyId);
      if (!result) throw new Error('LEAVE_POLICY_CREATION_FAILED');
      return result;
    } catch (err) {
      // Atomic rollback
      this.db.rollbackLeavePolicy(policyId);
      throw err;
    }
  }

  /**
   * Transactional Leave Policy Update
   */
  public static async updatePolicy(
    id: string,
    companyId: string,
    actor: AuthUser,
    dto: UpdateLeavePolicyDTO
  ): Promise<LeavePolicy> {
    const existing = await LeavePolicyRepository.findById(id, companyId);
    if (!existing) {
      throw new Error(`LEAVE_POLICY_NOT_FOUND: Policy "${id}" does not exist.`);
    }

    if (dto.code && dto.code.trim().toUpperCase() !== existing.code) {
      const cleanCode = dto.code.trim().toUpperCase();
      const codeCheck = await LeavePolicyRepository.findByCode(cleanCode, companyId);
      if (codeCheck && codeCheck.id !== id) {
        throw new Error(`LEAVE_POLICY_CODE_EXISTS: Code "${cleanCode}" is already in use.`);
      }
    }

    // 1. Update master fields
    await LeavePolicyRepository.update(id, companyId, {
      ...(dto.code ? { code: dto.code.trim().toUpperCase() } : {}),
      ...(dto.name ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined ? { description: dto.description?.trim() } : {}),
      ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
      ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
      ...(dto.status ? { status: dto.status } : {}),
    });

    // 2. If rules are provided, sync rules
    if (dto.rules && dto.rules.length > 0) {
      // Delete existing and replace
      await LeavePolicyRuleRepository.deleteByPolicyId(id, companyId);

      const rulesToSave: LeavePolicyRule[] = dto.rules.map((r, idx) => ({
        id: `rule-${id}-${idx + 1}-${Date.now() % 1000}`,
        companyId,
        leavePolicyId: id,
        leaveTypeId: r.leaveTypeId,
        annualEntitlement: r.annualEntitlement,
        accrualFrequency: r.accrualFrequency || 'ANNUAL_UPFRONT',
        accrualTiming: r.accrualTiming || 'START_OF_PERIOD',
        prorationRule: r.prorationRule || 'PRORATE_BY_DAYS',
        allowCarryForward: Boolean(r.allowCarryForward),
        maxCarryForwardDays: r.maxCarryForwardDays || 0,
        carryForwardExpiryMonths: r.carryForwardExpiryMonths ?? 12,
        allowEncashment: Boolean(r.allowEncashment),
        minBalanceForEncashment: r.minBalanceForEncashment || 0,
        maxEncashmentDaysPerYear: r.maxEncashmentDaysPerYear || 0,
        sandwichRuleEnabled: Boolean(r.sandwichRuleEnabled),
        includeHolidays: Boolean(r.includeHolidays),
        includeWeeklyOffs: Boolean(r.includeWeeklyOffs),
        minDaysPerRequest: r.minDaysPerRequest ?? 0.5,
        maxConsecutiveDays: r.maxConsecutiveDays ?? 30,
        maxRequestsPerMonth: r.maxRequestsPerMonth,
        maxAdvanceDays: r.maxAdvanceDays ?? 90,
        allowBackdated: r.allowBackdated !== false,
        maxBackdatedDays: r.maxBackdatedDays ?? 7,
        allowNegativeBalance: Boolean(r.allowNegativeBalance),
        negativeBalanceLimit: r.negativeBalanceLimit || 0,
        requiresAttachment: Boolean(r.requiresAttachment),
        attachmentThresholdDays: r.attachmentThresholdDays,
        minServiceDaysRequired: r.minServiceDaysRequired || 0,
        allowDuringProbation: r.allowDuringProbation !== false,
        applicableGender: r.applicableGender || 'ALL',
        applicableMaritalStatus: r.applicableMaritalStatus || 'ALL',
        status: r.status || 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      await LeavePolicyRuleRepository.saveBatch(rulesToSave);
    }

    // 3. If eligibility provided, update eligibility
    if (dto.eligibility) {
      await LeavePolicyEligibilityRepository.save({
        id: `elig-${id}`,
        companyId,
        leavePolicyId: id,
        employmentTypes: dto.eligibility.employmentTypes || [],
        departmentIds: dto.eligibility.departmentIds || [],
        designationIds: dto.eligibility.designationIds || [],
        branchIds: dto.eligibility.branchIds || [],
        workLocationIds: dto.eligibility.workLocationIds || [],
        minServiceDays: dto.eligibility.minServiceDays || 0,
        status: 'ACTIVE',
        createdAt: existing.eligibility?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // 4. Log audit trail
    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: 'LEAVE_POLICY_UPDATED',
      targetModule: 'LEAVE',
      targetRecordId: id,
      companyId,
      changesSummary: `Updated Leave Policy ${existing.code} (${dto.name || existing.name})`,
    });

    const updated = await LeavePolicyRepository.findById(id, companyId);
    if (!updated) throw new Error('LEAVE_POLICY_UPDATE_FAILED');
    return updated;
  }

  public static async setPolicyStatus(
    id: string,
    companyId: string,
    actor: AuthUser,
    status: LeavePolicyStatus
  ): Promise<LeavePolicy> {
    const existing = await LeavePolicyRepository.findById(id, companyId);
    if (!existing) {
      throw new Error(`LEAVE_POLICY_NOT_FOUND: Policy "${id}" was not found.`);
    }

    const updated = await LeavePolicyRepository.update(id, companyId, { status });
    if (!updated) {
      throw new Error(`LEAVE_POLICY_STATUS_UPDATE_FAILED: Could not update policy status.`);
    }

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: status === 'ACTIVE' ? 'LEAVE_POLICY_ACTIVATED' : 'LEAVE_POLICY_DEACTIVATED',
      targetModule: 'LEAVE',
      targetRecordId: id,
      companyId,
      changesSummary: `Changed Leave Policy ${existing.code} status to ${status}`,
    });

    return updated;
  }
}
