import { LeavePolicyEligibility } from '../../../src/types/leave.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class LeavePolicyEligibilityRepository {
  private static get db() {
    return RelationalDatabase.getInstance();
  }

  public static async findByPolicyId(policyId: string, companyId: string): Promise<LeavePolicyEligibility | null> {
    for (const e of this.db.leavePolicyEligibilities.values()) {
      if (e.leavePolicyId === policyId && e.companyId === companyId) {
        return { ...e };
      }
    }
    return null;
  }

  public static async save(eligibility: LeavePolicyEligibility): Promise<LeavePolicyEligibility> {
    const item: LeavePolicyEligibility = {
      ...eligibility,
      updatedAt: new Date().toISOString(),
    };
    this.db.leavePolicyEligibilities.set(item.id, item);
    return { ...item };
  }

  public static async deleteByPolicyId(policyId: string, companyId: string): Promise<void> {
    for (const [id, e] of this.db.leavePolicyEligibilities.entries()) {
      if (e.leavePolicyId === policyId && e.companyId === companyId) {
        this.db.leavePolicyEligibilities.delete(id);
      }
    }
  }
}
