import { LeavePolicy, LeavePolicyStatus } from '../../../src/types/leave.js';
import { RelationalDatabase } from '../RelationalDatabase.js';
import { LeavePolicyRuleRepository } from './LeavePolicyRuleRepository.js';
import { LeavePolicyEligibilityRepository } from './LeavePolicyEligibilityRepository.js';

export class LeavePolicyRepository {
  private static get db() {
    return RelationalDatabase.getInstance();
  }

  public static async findAll(
    companyId: string,
    filters?: { status?: LeavePolicyStatus; search?: string }
  ): Promise<LeavePolicy[]> {
    let items = Array.from(this.db.leavePolicies.values()).filter((p) => p.companyId === companyId);

    if (filters?.status) {
      items = items.filter((p) => p.status === filters.status);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    // Sort by priority ascending, then code
    const sorted = items.sort((a, b) => a.priority - b.priority || a.code.localeCompare(b.code));

    // Enrich with rule counts and employee count
    const enriched: LeavePolicy[] = [];
    for (const p of sorted) {
      const rules = await LeavePolicyRuleRepository.findByPolicyId(p.id, companyId);
      const eligibility = await LeavePolicyEligibilityRepository.findByPolicyId(p.id, companyId);
      const assignedCount = Array.from(this.db.employeeLeavePolicyAssignments.values()).filter(
        (a) => a.leavePolicyId === p.id && a.companyId === companyId && a.status === 'ACTIVE'
      ).length;

      enriched.push({
        ...p,
        rules,
        eligibility: eligibility || undefined,
        assignedEmployeesCount: assignedCount,
      });
    }

    return enriched;
  }

  public static async findById(id: string, companyId: string): Promise<LeavePolicy | null> {
    const policy = this.db.leavePolicies.get(id);
    if (!policy || policy.companyId !== companyId) return null;

    const rules = await LeavePolicyRuleRepository.findByPolicyId(id, companyId);
    const eligibility = await LeavePolicyEligibilityRepository.findByPolicyId(id, companyId);
    const assignedCount = Array.from(this.db.employeeLeavePolicyAssignments.values()).filter(
      (a) => a.leavePolicyId === id && a.companyId === companyId && a.status === 'ACTIVE'
    ).length;

    return {
      ...policy,
      rules,
      eligibility: eligibility || undefined,
      assignedEmployeesCount: assignedCount,
    };
  }

  public static async findByCode(code: string, companyId: string): Promise<LeavePolicy | null> {
    for (const p of this.db.leavePolicies.values()) {
      if (p.companyId === companyId && p.code.toLowerCase() === code.trim().toLowerCase()) {
        return this.findById(p.id, companyId);
      }
    }
    return null;
  }

  public static async findDefault(companyId: string): Promise<LeavePolicy | null> {
    for (const p of this.db.leavePolicies.values()) {
      if (p.companyId === companyId && p.isDefault && p.status === 'ACTIVE') {
        return this.findById(p.id, companyId);
      }
    }
    return null;
  }

  public static async create(data: Partial<LeavePolicy> & { id: string; companyId: string; code: string; name: string }): Promise<LeavePolicy> {
    if (data.isDefault) {
      for (const p of this.db.leavePolicies.values()) {
        if (p.companyId === data.companyId && p.id !== data.id) {
          p.isDefault = false;
        }
      }
    }

    const { rules, eligibility, ...policyFields } = data;

    const newPolicy: LeavePolicy = {
      description: '',
      isDefault: false,
      priority: 0,
      status: 'ACTIVE',
      ...policyFields,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.db.leavePolicies.set(newPolicy.id, newPolicy);

    if (rules && Array.isArray(rules)) {
      for (const r of rules) {
        this.db.leavePolicyRules.set(r.id, {
          ...r,
          companyId: data.companyId,
          leavePolicyId: newPolicy.id,
        });
      }
    }

    if (eligibility) {
      this.db.leavePolicyEligibilities.set(eligibility.id || `elig-${newPolicy.id}`, {
        ...eligibility,
        id: eligibility.id || `elig-${newPolicy.id}`,
        companyId: data.companyId,
        leavePolicyId: newPolicy.id,
      });
    }

    const enriched = await this.findById(newPolicy.id, newPolicy.companyId);
    return enriched || newPolicy;
  }

  public static async update(
    id: string,
    companyId: string,
    data: Partial<Omit<LeavePolicy, 'id' | 'companyId' | 'createdAt' | 'rules' | 'eligibility' | 'assignedEmployeesCount'>>
  ): Promise<LeavePolicy | null> {
    const existing = this.db.leavePolicies.get(id);
    if (!existing || existing.companyId !== companyId) return null;

    if (data.isDefault) {
      for (const p of this.db.leavePolicies.values()) {
        if (p.companyId === companyId && p.id !== id) {
          p.isDefault = false;
        }
      }
    }

    const updated: LeavePolicy = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.db.leavePolicies.set(id, updated);
    return this.findById(id, companyId);
  }
}
