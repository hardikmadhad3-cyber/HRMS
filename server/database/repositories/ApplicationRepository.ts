import { Application, ApplicationStage, ApplicationStatus } from '../../../src/types/recruitment.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export interface ApplicationFilter {
  requisitionId?: string;
  candidateId?: string;
  stage?: ApplicationStage;
  status?: ApplicationStatus;
  search?: string;
}

export class ApplicationRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findById(id: string, companyId: string): Promise<Application | null> {
    const app = this.db.applications.get(id);
    if (!app || app.companyId !== companyId) return null;
    return { ...app };
  }

  public static async findByCandidateAndRequisition(candidateId: string, requisitionId: string): Promise<Application | null> {
    for (const app of this.db.applications.values()) {
      if (app.candidateId === candidateId && app.requisitionId === requisitionId) {
        return { ...app };
      }
    }
    return null;
  }

  public static async findAll(companyId: string, filter?: ApplicationFilter): Promise<Application[]> {
    const results: Application[] = [];
    const search = filter?.search?.toLowerCase();

    for (const app of this.db.applications.values()) {
      if (app.companyId !== companyId) continue;
      if (filter?.requisitionId && app.requisitionId !== filter.requisitionId) continue;
      if (filter?.candidateId && app.candidateId !== filter.candidateId) continue;
      if (filter?.stage && app.stage !== filter.stage) continue;
      if (filter?.status && app.status !== filter.status) continue;

      if (search) {
        const matches =
          (app.candidateName && app.candidateName.toLowerCase().includes(search)) ||
          (app.candidateEmail && app.candidateEmail.toLowerCase().includes(search)) ||
          (app.requisitionTitle && app.requisitionTitle.toLowerCase().includes(search)) ||
          app.applicationNumber.toLowerCase().includes(search);
        if (!matches) continue;
      }

      // Populate count of interviews
      let intCount = 0;
      for (const int of this.db.recruitmentInterviews.values()) {
        if (int.applicationId === app.id) intCount++;
      }

      // Check offer status
      let offer = null;
      for (const off of this.db.jobOffers.values()) {
        if (off.applicationId === app.id) {
          offer = off;
          break;
        }
      }

      results.push({
        ...app,
        interviewsCount: intCount,
        hasOffer: !!offer,
        offerStatus: offer?.status,
        offerId: offer?.id,
      });
    }

    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public static async create(application: Application): Promise<Application> {
    this.db.applications.set(application.id, { ...application });
    return { ...application };
  }

  public static async update(id: string, companyId: string, updates: Partial<Application>): Promise<Application | null> {
    const existing = await this.findById(id, companyId);
    if (!existing) return null;
    const updated: Application = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.db.applications.set(id, updated);
    return { ...updated };
  }

  public static async delete(id: string, companyId: string): Promise<boolean> {
    const existing = await this.findById(id, companyId);
    if (!existing) return false;
    return this.db.applications.delete(id);
  }
}
