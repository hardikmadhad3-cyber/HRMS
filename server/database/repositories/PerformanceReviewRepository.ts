import { PerformanceReview, PerformanceReviewStatus } from '../../../src/types/performance.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export interface PerformanceReviewFilter {
  companyId: string;
  cycleId?: string;
  employeeId?: string;
  employeeIds?: string[];
  reviewerId?: string;
  status?: PerformanceReviewStatus;
  isFinalized?: boolean;
}

export class PerformanceReviewRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findById(id: string, companyId?: string): Promise<PerformanceReview | null> {
    const review = this.db.performanceReviews.get(id);
    if (!review) return null;
    if (companyId && review.companyId !== companyId) return null;
    return this.enrichReview(review);
  }

  public static async findByCycleAndEmployee(
    cycleId: string,
    employeeId: string,
    companyId?: string
  ): Promise<PerformanceReview | null> {
    const review = Array.from(this.db.performanceReviews.values()).find(
      (r) => r.cycleId === cycleId && r.employeeId === employeeId && (!companyId || r.companyId === companyId)
    );
    return review ? this.enrichReview(review) : null;
  }

  public static async findAll(filter: PerformanceReviewFilter): Promise<PerformanceReview[]> {
    const list = Array.from(this.db.performanceReviews.values()).filter((r) => {
      if (r.companyId !== filter.companyId) return false;
      if (filter.cycleId && r.cycleId !== filter.cycleId) return false;
      if (filter.employeeId && r.employeeId !== filter.employeeId) return false;
      if (filter.employeeIds && !filter.employeeIds.includes(r.employeeId)) return false;
      if (filter.reviewerId && r.reviewerId !== filter.reviewerId) return false;
      if (filter.status && r.status !== filter.status) return false;
      if (filter.isFinalized !== undefined && r.isFinalized !== filter.isFinalized) return false;
      return true;
    });

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list.map((r) => this.enrichReview(r));
  }

  public static async create(review: PerformanceReview): Promise<PerformanceReview> {
    this.db.performanceReviews.set(review.id, review);
    return this.enrichReview(review);
  }

  public static async update(id: string, updates: Partial<PerformanceReview>): Promise<PerformanceReview | null> {
    const existing = this.db.performanceReviews.get(id);
    if (!existing) return null;

    const updated: PerformanceReview = {
      ...existing,
      ...updates,
      id,
      companyId: existing.companyId,
      updatedAt: new Date().toISOString(),
    };

    this.db.performanceReviews.set(id, updated);
    return this.enrichReview(updated);
  }

  public static async delete(id: string): Promise<boolean> {
    return this.db.performanceReviews.delete(id);
  }

  private static enrichReview(review: PerformanceReview): PerformanceReview {
    const cycle = this.db.performanceCycles.get(review.cycleId);
    const emp = this.db.employees.get(review.employeeId);
    const reviewer = this.db.employees.get(review.reviewerId);
    const template = this.db.performanceReviewTemplates.get(review.templateId);
    const finalizer = review.finalizedBy ? this.db.employees.get(review.finalizedBy) : undefined;

    // Get current assignment for department/designation
    const asg = Array.from(this.db.employeeAssignments.values()).find(
      (a) => a.employeeId === review.employeeId && !a.effectiveTo
    );
    const dept = asg?.departmentId ? this.db.departments.get(asg.departmentId) : undefined;
    const desig = asg?.designationId ? this.db.designations.get(asg.designationId) : undefined;

    // Associated employee goals for this cycle
    const goals = Array.from(this.db.performanceGoals.values()).filter(
      (g) => g.cycleId === review.cycleId && g.employeeId === review.employeeId && g.companyId === review.companyId
    );

    return {
      ...review,
      cycleName: cycle?.name,
      cycleStatus: cycle?.status,
      employeeName: emp?.displayName,
      employeeCode: emp?.employeeCode,
      employeeDepartment: dept?.name,
      employeeDesignation: desig?.name,
      reviewerName: reviewer?.displayName,
      reviewerCode: reviewer?.employeeCode,
      templateName: template?.name,
      finalizedByName: finalizer?.displayName || review.finalizedBy,
      goals,
    };
  }
}
