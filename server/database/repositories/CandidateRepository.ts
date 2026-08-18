import { Candidate } from '../../../src/types/recruitment.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export interface CandidateFilter {
  status?: string;
  source?: string;
  skills?: string[];
  search?: string;
}

export class CandidateRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findById(id: string, companyId: string): Promise<Candidate | null> {
    const candidate = this.db.candidates.get(id);
    if (!candidate || candidate.companyId !== companyId) return null;
    return { ...candidate };
  }

  public static async findByEmail(companyId: string, email: string): Promise<Candidate | null> {
    const normEmail = email.trim().toLowerCase();
    for (const c of this.db.candidates.values()) {
      if (c.companyId === companyId && c.email.toLowerCase() === normEmail) {
        return { ...c };
      }
    }
    return null;
  }

  public static async findByPhone(companyId: string, phone: string): Promise<Candidate | null> {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    for (const c of this.db.candidates.values()) {
      if (c.companyId === companyId && c.phone.replace(/[^0-9+]/g, '') === cleanPhone) {
        return { ...c };
      }
    }
    return null;
  }

  public static async findAll(companyId: string, filter?: CandidateFilter): Promise<Candidate[]> {
    const results: Candidate[] = [];
    const search = filter?.search?.toLowerCase();

    for (const c of this.db.candidates.values()) {
      if (c.companyId !== companyId) continue;
      if (filter?.status && c.status !== filter.status) continue;
      if (filter?.source && c.source !== filter.source) continue;
      if (search) {
        const matches =
          c.fullName.toLowerCase().includes(search) ||
          c.email.toLowerCase().includes(search) ||
          c.phone.includes(search) ||
          (c.currentCompany && c.currentCompany.toLowerCase().includes(search)) ||
          c.skills.some((s) => s.toLowerCase().includes(search));
        if (!matches) continue;
      }
      results.push({ ...c });
    }

    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public static async create(candidate: Candidate): Promise<Candidate> {
    this.db.candidates.set(candidate.id, { ...candidate });
    return { ...candidate };
  }

  public static async update(id: string, companyId: string, updates: Partial<Candidate>): Promise<Candidate | null> {
    const existing = await this.findById(id, companyId);
    if (!existing) return null;
    const updated: Candidate = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.db.candidates.set(id, updated);
    return { ...updated };
  }

  public static async linkEmployee(candidateId: string, companyId: string, employeeId: string): Promise<Candidate | null> {
    return this.update(candidateId, companyId, {
      employeeId,
      status: 'HIRED',
    });
  }
}
