import { PerformanceReviewTemplate, GoalCategory } from '../../../src/types/performance.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class PerformanceTemplateRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findById(id: string, companyId?: string): Promise<PerformanceReviewTemplate | null> {
    const template = this.db.performanceReviewTemplates.get(id);
    if (!template) return null;
    if (companyId && template.companyId !== companyId) return null;
    return template;
  }

  public static async findByCode(companyId: string, code: string): Promise<PerformanceReviewTemplate | null> {
    const template = Array.from(this.db.performanceReviewTemplates.values()).find(
      (t) => t.companyId === companyId && t.code.toLowerCase() === code.toLowerCase()
    );
    return template || null;
  }

  public static async findAll(companyId: string, activeOnly: boolean = false): Promise<PerformanceReviewTemplate[]> {
    const list = Array.from(this.db.performanceReviewTemplates.values()).filter((t) => {
      if (t.companyId !== companyId) return false;
      if (activeOnly && !t.isActive) return false;
      return true;
    });

    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }

  public static async create(template: PerformanceReviewTemplate): Promise<PerformanceReviewTemplate> {
    this.db.performanceReviewTemplates.set(template.id, template);
    return template;
  }

  public static async update(id: string, updates: Partial<PerformanceReviewTemplate>): Promise<PerformanceReviewTemplate | null> {
    const existing = this.db.performanceReviewTemplates.get(id);
    if (!existing) return null;

    const updated: PerformanceReviewTemplate = {
      ...existing,
      ...updates,
      id,
      companyId: existing.companyId,
      updatedAt: new Date().toISOString(),
    };

    this.db.performanceReviewTemplates.set(id, updated);
    return updated;
  }

  public static async delete(id: string): Promise<boolean> {
    return this.db.performanceReviewTemplates.delete(id);
  }

  // Goal Categories
  public static async findGoalCategories(companyId: string): Promise<GoalCategory[]> {
    return Array.from(this.db.performanceGoalCategories.values()).filter(
      (c) => c.companyId === companyId && c.isActive
    );
  }

  public static async createGoalCategory(cat: GoalCategory): Promise<GoalCategory> {
    this.db.performanceGoalCategories.set(cat.id, cat);
    return cat;
  }
}
