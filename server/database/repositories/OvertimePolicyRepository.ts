import { OvertimePolicy } from '../../../src/types/overtime.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class OvertimePolicyRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findByCompanyId(companyId: string): Promise<OvertimePolicy | null> {
    for (const policy of this.db.overtimePolicies.values()) {
      if (policy.companyId === companyId && policy.status === 'ACTIVE') {
        return { ...policy };
      }
    }
    return null;
  }

  public static async findById(id: string, companyId: string): Promise<OvertimePolicy | null> {
    const policy = this.db.overtimePolicies.get(id);
    if (!policy || policy.companyId !== companyId) return null;
    return { ...policy };
  }

  public static async create(policy: OvertimePolicy): Promise<OvertimePolicy> {
    this.db.overtimePolicies.set(policy.id, { ...policy });
    return { ...policy };
  }

  public static async update(
    id: string,
    companyId: string,
    updates: Partial<OvertimePolicy>
  ): Promise<OvertimePolicy | null> {
    const existing = this.db.overtimePolicies.get(id);
    if (!existing || existing.companyId !== companyId) return null;

    const updated: OvertimePolicy = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.db.overtimePolicies.set(id, updated);
    return { ...updated };
  }

  public static async findAll(companyId: string): Promise<OvertimePolicy[]> {
    return Array.from(this.db.overtimePolicies.values())
      .filter((p) => p.companyId === companyId)
      .map((p) => ({ ...p }));
  }
}
