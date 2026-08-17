import { TimeLeavePeriodSnapshot } from '../../../src/types/reconciliation.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class TimeLeavePeriodSnapshotRepository {
  private static db = RelationalDatabase.getInstance();

  private static enrichSnapshot(s: TimeLeavePeriodSnapshot): TimeLeavePeriodSnapshot {
    const user = this.db.companies.get(s.companyId); // fallback or find user
    return {
      ...s,
    };
  }

  public static async findById(id: string, companyId: string): Promise<TimeLeavePeriodSnapshot | null> {
    const s = this.db.timeLeavePeriodSnapshots.get(id);
    if (!s || s.companyId !== companyId) return null;
    return this.enrichSnapshot(s);
  }

  public static async findByPeriodAndVersion(
    periodId: string,
    version: number,
    companyId: string
  ): Promise<TimeLeavePeriodSnapshot | null> {
    for (const s of this.db.timeLeavePeriodSnapshots.values()) {
      if (s.periodId === periodId && s.version === version && s.companyId === companyId) {
        return this.enrichSnapshot(s);
      }
    }
    return null;
  }

  public static async findVersionsByPeriod(
    periodId: string,
    companyId: string
  ): Promise<TimeLeavePeriodSnapshot[]> {
    const results: TimeLeavePeriodSnapshot[] = [];
    for (const s of this.db.timeLeavePeriodSnapshots.values()) {
      if (s.periodId === periodId && s.companyId === companyId) {
        results.push(this.enrichSnapshot(s));
      }
    }
    return results.sort((a, b) => b.version - a.version);
  }

  public static async findLatestSnapshot(
    periodId: string,
    companyId: string
  ): Promise<TimeLeavePeriodSnapshot | null> {
    const versions = await this.findVersionsByPeriod(periodId, companyId);
    return versions.length > 0 ? versions[0] : null;
  }

  public static async save(snapshot: TimeLeavePeriodSnapshot): Promise<TimeLeavePeriodSnapshot> {
    this.db.timeLeavePeriodSnapshots.set(snapshot.id, { ...snapshot });
    return this.enrichSnapshot(snapshot);
  }
}
