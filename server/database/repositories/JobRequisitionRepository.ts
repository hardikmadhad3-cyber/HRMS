import { JobRequisition, RequisitionStatus, RequisitionPriority } from '../../../src/types/recruitment.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export interface JobRequisitionFilter {
  status?: RequisitionStatus;
  departmentId?: string;
  designationId?: string;
  workLocationId?: string;
  search?: string;
}

export class JobRequisitionRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findById(id: string, companyId: string): Promise<JobRequisition | null> {
    const req = this.db.jobRequisitions.get(id);
    if (!req || req.companyId !== companyId) return null;
    return { ...req };
  }

  public static async findByNumber(companyId: string, requisitionNumber: string): Promise<JobRequisition | null> {
    for (const req of this.db.jobRequisitions.values()) {
      if (req.companyId === companyId && req.requisitionNumber.toLowerCase() === requisitionNumber.toLowerCase()) {
        return { ...req };
      }
    }
    return null;
  }

  public static async findAll(companyId: string, filter?: JobRequisitionFilter): Promise<JobRequisition[]> {
    const results: JobRequisition[] = [];
    const search = filter?.search?.toLowerCase();

    for (const req of this.db.jobRequisitions.values()) {
      if (req.companyId !== companyId) continue;
      if (filter?.status && req.status !== filter.status) continue;
      if (filter?.departmentId && req.departmentId !== filter.departmentId) continue;
      if (filter?.designationId && req.designationId !== filter.designationId) continue;
      if (filter?.workLocationId && req.workLocationId !== filter.workLocationId) continue;
      if (search) {
        const matches =
          req.title.toLowerCase().includes(search) ||
          req.requisitionNumber.toLowerCase().includes(search) ||
          (req.departmentName && req.departmentName.toLowerCase().includes(search)) ||
          (req.designationName && req.designationName.toLowerCase().includes(search));
        if (!matches) continue;
      }
      
      // Calculate active applications
      let appCount = 0;
      for (const app of this.db.applications.values()) {
        if (app.requisitionId === req.id && app.companyId === companyId) {
          appCount++;
        }
      }

      results.push({ ...req, activeApplicationsCount: appCount });
    }

    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public static async create(req: JobRequisition): Promise<JobRequisition> {
    this.db.jobRequisitions.set(req.id, { ...req });
    return { ...req };
  }

  public static async update(id: string, companyId: string, updates: Partial<JobRequisition>): Promise<JobRequisition | null> {
    const existing = await this.findById(id, companyId);
    if (!existing) return null;
    const updated: JobRequisition = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.db.jobRequisitions.set(id, updated);
    return { ...updated };
  }

  public static async delete(id: string, companyId: string): Promise<boolean> {
    const existing = await this.findById(id, companyId);
    if (!existing) return false;
    return this.db.jobRequisitions.delete(id);
  }
}
