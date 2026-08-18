import { CandidateStatusHistory } from '../../../src/types/recruitment.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class CandidateStatusHistoryRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findByApplicationId(applicationId: string, companyId: string): Promise<CandidateStatusHistory[]> {
    const results: CandidateStatusHistory[] = [];
    for (const h of this.db.candidateStatusHistory.values()) {
      if (h.companyId === companyId && h.applicationId === applicationId) {
        results.push({ ...h });
      }
    }
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public static async findByCandidateId(candidateId: string, companyId: string): Promise<CandidateStatusHistory[]> {
    const results: CandidateStatusHistory[] = [];
    for (const h of this.db.candidateStatusHistory.values()) {
      if (h.companyId === companyId && h.candidateId === candidateId) {
        results.push({ ...h });
      }
    }
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public static async create(history: CandidateStatusHistory): Promise<CandidateStatusHistory> {
    this.db.candidateStatusHistory.set(history.id, { ...history });
    return { ...history };
  }
}
