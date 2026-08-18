import { PerformanceCycle, PerformanceCycleStatus } from '../../../src/types/performance.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class PerformanceCycleRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findById(id: string, companyId?: string): Promise<PerformanceCycle | null> {
    const cycle = this.db.performanceCycles.get(id);
    if (!cycle) return null;
    if (companyId && cycle.companyId !== companyId) return null;
    return this.enrichCycle(cycle);
  }

  public static async findByCode(companyId: string, code: string): Promise<PerformanceCycle | null> {
    const cycle = Array.from(this.db.performanceCycles.values()).find(
      (c) => c.companyId === companyId && c.code.toLowerCase() === code.toLowerCase()
    );
    return cycle ? this.enrichCycle(cycle) : null;
  }

  public static async findAll(companyId: string, status?: PerformanceCycleStatus): Promise<PerformanceCycle[]> {
    const list = Array.from(this.db.performanceCycles.values()).filter((c) => {
      if (c.companyId !== companyId) return false;
      if (status && c.status !== status) return false;
      return true;
    });

    list.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    return list.map((c) => this.enrichCycle(c));
  }

  public static async create(cycle: PerformanceCycle): Promise<PerformanceCycle> {
    this.db.performanceCycles.set(cycle.id, cycle);
    return this.enrichCycle(cycle);
  }

  public static async update(id: string, updates: Partial<PerformanceCycle>): Promise<PerformanceCycle | null> {
    const existing = this.db.performanceCycles.get(id);
    if (!existing) return null;

    const updated: PerformanceCycle = {
      ...existing,
      ...updates,
      id,
      companyId: existing.companyId,
      updatedAt: new Date().toISOString(),
    };

    this.db.performanceCycles.set(id, updated);
    return this.enrichCycle(updated);
  }

  public static async delete(id: string): Promise<boolean> {
    return this.db.performanceCycles.delete(id);
  }

  private static enrichCycle(cycle: PerformanceCycle): PerformanceCycle {
    const template = cycle.defaultTemplateId
      ? this.db.performanceReviewTemplates.get(cycle.defaultTemplateId)
      : undefined;

    // Aggregate statistics across reviews and goals for this cycle
    const cycleReviews = Array.from(this.db.performanceReviews.values()).filter(
      (r) => r.cycleId === cycle.id && r.companyId === cycle.companyId
    );
    const cycleGoals = Array.from(this.db.performanceGoals.values()).filter(
      (g) => g.cycleId === cycle.id && g.companyId === cycle.companyId
    );

    const totalParticipants = cycleReviews.length;
    const goalsSubmittedCount = cycleGoals.filter((g) => g.status !== 'DRAFT').length;
    const selfReviewsCompletedCount = cycleReviews.filter(
      (r) => r.selfSubmittedAt || ['MANAGER_REVIEW_PENDING', 'IN_REVIEW', 'COMPLETED', 'FINALIZED'].includes(r.status)
    ).length;
    const managerReviewsCompletedCount = cycleReviews.filter(
      (r) => r.managerSubmittedAt || ['COMPLETED', 'FINALIZED'].includes(r.status)
    ).length;
    const finalizedReviewsCount = cycleReviews.filter((r) => r.isFinalized || r.status === 'FINALIZED').length;

    return {
      ...cycle,
      templateName: template?.name,
      totalParticipants,
      goalsSubmittedCount,
      selfReviewsCompletedCount,
      managerReviewsCompletedCount,
      finalizedReviewsCount,
    };
  }
}
