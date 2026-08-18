import { RecruitmentInterview, InterviewStatus } from '../../../src/types/recruitment.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export interface InterviewFilter {
  applicationId?: string;
  candidateId?: string;
  requisitionId?: string;
  status?: InterviewStatus;
  upcomingOnly?: boolean;
}

export class RecruitmentInterviewRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findById(id: string, companyId: string): Promise<RecruitmentInterview | null> {
    const int = this.db.recruitmentInterviews.get(id);
    if (!int || int.companyId !== companyId) return null;
    return { ...int };
  }

  public static async findByApplicationId(applicationId: string, companyId: string): Promise<RecruitmentInterview[]> {
    const results: RecruitmentInterview[] = [];
    for (const int of this.db.recruitmentInterviews.values()) {
      if (int.companyId === companyId && int.applicationId === applicationId) {
        results.push({ ...int });
      }
    }
    return results.sort((a, b) => a.roundNumber - b.roundNumber);
  }

  public static async findAll(companyId: string, filter?: InterviewFilter): Promise<RecruitmentInterview[]> {
    const results: RecruitmentInterview[] = [];
    const now = new Date().toISOString();

    for (const int of this.db.recruitmentInterviews.values()) {
      if (int.companyId !== companyId) continue;
      if (filter?.applicationId && int.applicationId !== filter.applicationId) continue;
      if (filter?.candidateId && int.candidateId !== filter.candidateId) continue;
      if (filter?.requisitionId && int.requisitionId !== filter.requisitionId) continue;
      if (filter?.status && int.status !== filter.status) continue;
      if (filter?.upcomingOnly && (int.status !== InterviewStatus.SCHEDULED || int.scheduledStartTime < now)) {
        continue;
      }
      results.push({ ...int });
    }

    return results.sort((a, b) => new Date(a.scheduledStartTime).getTime() - new Date(b.scheduledStartTime).getTime());
  }

  public static async create(interview: RecruitmentInterview): Promise<RecruitmentInterview> {
    this.db.recruitmentInterviews.set(interview.id, { ...interview });
    return { ...interview };
  }

  public static async update(id: string, companyId: string, updates: Partial<RecruitmentInterview>): Promise<RecruitmentInterview | null> {
    const existing = await this.findById(id, companyId);
    if (!existing) return null;
    const updated: RecruitmentInterview = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.db.recruitmentInterviews.set(id, updated);
    return { ...updated };
  }

  public static async delete(id: string, companyId: string): Promise<boolean> {
    const existing = await this.findById(id, companyId);
    if (!existing) return false;
    return this.db.recruitmentInterviews.delete(id);
  }
}
