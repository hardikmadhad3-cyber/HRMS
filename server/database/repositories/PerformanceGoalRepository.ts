import { PerformanceGoal, PerformanceGoalStatus } from '../../../src/types/performance.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export interface PerformanceGoalFilter {
  companyId: string;
  cycleId?: string;
  employeeId?: string;
  employeeIds?: string[];
  status?: PerformanceGoalStatus;
  category?: string;
  isManagerGoal?: boolean;
}

export class PerformanceGoalRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findById(id: string, companyId?: string): Promise<PerformanceGoal | null> {
    const goal = this.db.performanceGoals.get(id);
    if (!goal) return null;
    if (companyId && goal.companyId !== companyId) return null;
    return this.enrichGoal(goal);
  }

  public static async findAll(filter: PerformanceGoalFilter): Promise<PerformanceGoal[]> {
    const list = Array.from(this.db.performanceGoals.values()).filter((g) => {
      if (g.companyId !== filter.companyId) return false;
      if (filter.cycleId && g.cycleId !== filter.cycleId) return false;
      if (filter.employeeId && g.employeeId !== filter.employeeId) return false;
      if (filter.employeeIds && !filter.employeeIds.includes(g.employeeId)) return false;
      if (filter.status && g.status !== filter.status) return false;
      if (filter.category && g.category !== filter.category) return false;
      if (filter.isManagerGoal !== undefined && g.isManagerGoal !== filter.isManagerGoal) return false;
      return true;
    });

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list.map((g) => this.enrichGoal(g));
  }

  public static async findByEmployeeAndCycle(companyId: string, cycleId: string, employeeId: string): Promise<PerformanceGoal[]> {
    return this.findAll({ companyId, cycleId, employeeId });
  }

  public static async create(goal: PerformanceGoal): Promise<PerformanceGoal> {
    this.db.performanceGoals.set(goal.id, goal);
    return this.enrichGoal(goal);
  }

  public static async update(id: string, updates: Partial<PerformanceGoal>): Promise<PerformanceGoal | null> {
    const existing = this.db.performanceGoals.get(id);
    if (!existing) return null;

    const updated: PerformanceGoal = {
      ...existing,
      ...updates,
      id,
      companyId: existing.companyId,
      updatedAt: new Date().toISOString(),
    };

    this.db.performanceGoals.set(id, updated);
    return this.enrichGoal(updated);
  }

  public static async delete(id: string): Promise<boolean> {
    return this.db.performanceGoals.delete(id);
  }

  private static enrichGoal(goal: PerformanceGoal): PerformanceGoal {
    const cycle = this.db.performanceCycles.get(goal.cycleId);
    const emp = this.db.employees.get(goal.employeeId);
    const asg = Array.from(this.db.employeeAssignments.values()).find(
      (a) => a.employeeId === goal.employeeId && !a.effectiveTo
    );
    const dept = asg?.departmentId ? this.db.departments.get(asg.departmentId) : undefined;
    const parent = goal.parentGoalId ? this.db.performanceGoals.get(goal.parentGoalId) : undefined;
    const approver = goal.approvedBy ? this.db.employees.get(goal.approvedBy) : undefined;

    return {
      ...goal,
      cycleName: cycle?.name,
      employeeName: emp?.displayName,
      employeeCode: emp?.employeeCode,
      departmentName: dept?.name,
      parentGoalTitle: parent?.title,
      approvedByName: approver?.displayName,
    };
  }
}
