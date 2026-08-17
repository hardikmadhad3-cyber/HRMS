import { AttendancePeriodSummary, AttendancePeriodSnapshot } from '../../../src/types/period.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class AttendancePeriodSummaryRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findById(id: string, companyId: string): Promise<AttendancePeriodSummary | null> {
    const summary = this.db.attendancePeriodSummaries.get(id);
    if (!summary || summary.companyId !== companyId) return null;
    return this.enrichSummary(summary);
  }

  public static async findByPeriodAndEmployee(
    periodId: string,
    employeeId: string,
    companyId: string
  ): Promise<AttendancePeriodSummary | null> {
    for (const summary of this.db.attendancePeriodSummaries.values()) {
      if (
        summary.companyId === companyId &&
        summary.periodId === periodId &&
        summary.employeeId === employeeId
      ) {
        return this.enrichSummary(summary);
      }
    }
    return null;
  }

  public static async findByPeriodId(
    periodId: string,
    companyId: string
  ): Promise<AttendancePeriodSummary[]> {
    const summaries = Array.from(this.db.attendancePeriodSummaries.values())
      .filter((s) => s.companyId === companyId && s.periodId === periodId)
      .map((s) => this.enrichSummary(s));

    return summaries.sort((a, b) => (a.employeeCode || '').localeCompare(b.employeeCode || ''));
  }

  public static async save(summary: AttendancePeriodSummary): Promise<AttendancePeriodSummary> {
    const existing = await this.findByPeriodAndEmployee(
      summary.periodId,
      summary.employeeId,
      summary.companyId
    );

    if (existing) {
      const updated: AttendancePeriodSummary = {
        ...existing,
        ...summary,
        id: existing.id,
        updatedAt: new Date().toISOString(),
      };
      this.db.attendancePeriodSummaries.set(existing.id, updated);
      return this.enrichSummary(updated);
    } else {
      this.db.attendancePeriodSummaries.set(summary.id, { ...summary });
      return this.enrichSummary(summary);
    }
  }

  public static async saveBatch(summaries: AttendancePeriodSummary[]): Promise<AttendancePeriodSummary[]> {
    const saved: AttendancePeriodSummary[] = [];
    for (const s of summaries) {
      const res = await this.save(s);
      saved.push(res);
    }
    return saved;
  }

  public static async saveSnapshotArchive(snapshot: AttendancePeriodSnapshot): Promise<void> {
    this.db.attendancePeriodSnapshots.set(snapshot.id, { ...snapshot });
  }

  public static async findSnapshotVersions(periodId: string, companyId: string): Promise<AttendancePeriodSnapshot[]> {
    return Array.from(this.db.attendancePeriodSnapshots.values())
      .filter((s) => s.periodId === periodId && s.companyId === companyId)
      .sort((a, b) => b.version - a.version);
  }

  public static async findSnapshotByVersion(
    periodId: string,
    version: number,
    companyId: string
  ): Promise<AttendancePeriodSnapshot | null> {
    for (const s of this.db.attendancePeriodSnapshots.values()) {
      if (s.periodId === periodId && s.version === version && s.companyId === companyId) {
        return s;
      }
    }
    return null;
  }

  public static async deleteByPeriodId(periodId: string, companyId: string): Promise<number> {
    let count = 0;
    for (const [id, s] of this.db.attendancePeriodSummaries.entries()) {
      if (s.companyId === companyId && s.periodId === periodId) {
        this.db.attendancePeriodSummaries.delete(id);
        count++;
      }
    }
    return count;
  }

  private static enrichSummary(summary: AttendancePeriodSummary): AttendancePeriodSummary {
    const emp = this.db.employees.get(summary.employeeId);
    const asg = Array.from(this.db.employeeAssignments.values()).find(
      (a) => a.employeeId === summary.employeeId && (!a.effectiveTo || a.effectiveTo >= new Date().toISOString().slice(0, 10))
    );
    const dept = asg?.departmentId ? this.db.departments.get(asg.departmentId) : undefined;
    const desig = asg?.designationId ? this.db.designations.get(asg.designationId) : undefined;
    const branch = asg?.branchId ? this.db.branches.get(asg.branchId) : undefined;

    return {
      ...summary,
      employeeCode: emp?.employeeCode,
      displayName: emp?.displayName || (emp ? `${emp.firstName} ${emp.lastName}` : undefined),
      employeeName: emp?.displayName || (emp ? `${emp.firstName} ${emp.lastName}` : undefined),
      departmentName: dept?.name,
      designationName: desig?.name,
      branchName: branch?.name,
      avatarUrl: emp?.avatarUrl,
    };
  }
}
