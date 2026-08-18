import { PerformanceReviewHistory } from '../../../src/types/performance.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class PerformanceReviewHistoryRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findByReviewId(reviewId: string, companyId?: string): Promise<PerformanceReviewHistory[]> {
    const list = Array.from(this.db.performanceReviewHistory.values()).filter((h) => {
      if (h.reviewId !== reviewId) return false;
      if (companyId && h.companyId !== companyId) return false;
      return true;
    });

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }

  public static async findAll(companyId: string, limit: number = 50): Promise<PerformanceReviewHistory[]> {
    const list = Array.from(this.db.performanceReviewHistory.values()).filter(
      (h) => h.companyId === companyId
    );

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list.slice(0, limit);
  }

  public static async create(history: PerformanceReviewHistory): Promise<PerformanceReviewHistory> {
    this.db.performanceReviewHistory.set(history.id, history);
    return history;
  }

  public static async delete(id: string): Promise<boolean> {
    return this.db.performanceReviewHistory.delete(id);
  }
}
