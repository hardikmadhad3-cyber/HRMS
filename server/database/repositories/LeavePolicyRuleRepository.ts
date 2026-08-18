import { LeavePolicyRule } from '../../../src/types/leave.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class LeavePolicyRuleRepository {
  private static get db() {
    return RelationalDatabase.getInstance();
  }

  public static async findByPolicyId(policyId: string, companyId: string): Promise<LeavePolicyRule[]> {
    const rules = Array.from(this.db.leavePolicyRules.values()).filter(
      (r) => r.leavePolicyId === policyId && r.companyId === companyId
    );

    // Enrich with LeaveType details
    return rules.map((r) => {
      const lt = this.db.leaveTypes.get(r.leaveTypeId);
      return {
        ...r,
        leaveTypeCode: lt?.code || r.leaveTypeCode,
        leaveTypeName: lt?.name || r.leaveTypeName,
        leaveCategory: lt?.category || r.leaveCategory,
        leavePaidType: lt?.paidType || r.leavePaidType,
      };
    });
  }

  public static async findById(id: string, companyId: string): Promise<LeavePolicyRule | null> {
    const r = this.db.leavePolicyRules.get(id);
    if (!r || r.companyId !== companyId) return null;
    const lt = this.db.leaveTypes.get(r.leaveTypeId);
    return {
      ...r,
      leaveTypeCode: lt?.code || r.leaveTypeCode,
      leaveTypeName: lt?.name || r.leaveTypeName,
      leaveCategory: lt?.category || r.leaveCategory,
      leavePaidType: lt?.paidType || r.leavePaidType,
    };
  }

  public static async findByPolicyAndType(
    policyId: string,
    leaveTypeId: string,
    companyId: string
  ): Promise<LeavePolicyRule | null> {
    for (const r of this.db.leavePolicyRules.values()) {
      if (r.leavePolicyId === policyId && r.leaveTypeId === leaveTypeId && r.companyId === companyId) {
        const lt = this.db.leaveTypes.get(r.leaveTypeId);
        return {
          ...r,
          leaveTypeCode: lt?.code || r.leaveTypeCode,
          leaveTypeName: lt?.name || r.leaveTypeName,
          leaveCategory: lt?.category || r.leaveCategory,
          leavePaidType: lt?.paidType || r.leavePaidType,
        };
      }
    }
    return null;
  }

  public static async create(rule: LeavePolicyRule): Promise<LeavePolicyRule> {
    this.db.leavePolicyRules.set(rule.id, { ...rule });
    return rule;
  }

  public static async saveBatch(rules: LeavePolicyRule[]): Promise<void> {
    for (const r of rules) {
      this.db.leavePolicyRules.set(r.id, { ...r });
    }
  }

  public static async deleteByPolicyId(policyId: string, companyId: string): Promise<number> {
    let count = 0;
    for (const [id, r] of this.db.leavePolicyRules.entries()) {
      if (r.leavePolicyId === policyId && r.companyId === companyId) {
        this.db.leavePolicyRules.delete(id);
        count++;
      }
    }
    return count;
  }
}
