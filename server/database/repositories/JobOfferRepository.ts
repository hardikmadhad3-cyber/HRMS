import { JobOffer, OfferStatus } from '../../../src/types/recruitment.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export interface JobOfferFilter {
  applicationId?: string;
  candidateId?: string;
  requisitionId?: string;
  status?: OfferStatus;
  search?: string;
}

export class JobOfferRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findById(id: string, companyId: string): Promise<JobOffer | null> {
    const offer = this.db.jobOffers.get(id);
    if (!offer || offer.companyId !== companyId) return null;
    return { ...offer };
  }

  public static async findByApplicationId(applicationId: string, companyId: string): Promise<JobOffer | null> {
    for (const offer of this.db.jobOffers.values()) {
      if (offer.companyId === companyId && offer.applicationId === applicationId) {
        return { ...offer };
      }
    }
    return null;
  }

  public static async findAll(companyId: string, filter?: JobOfferFilter): Promise<JobOffer[]> {
    const results: JobOffer[] = [];
    const search = filter?.search?.toLowerCase();

    for (const offer of this.db.jobOffers.values()) {
      if (offer.companyId !== companyId) continue;
      if (filter?.applicationId && offer.applicationId !== filter.applicationId) continue;
      if (filter?.candidateId && offer.candidateId !== filter.candidateId) continue;
      if (filter?.requisitionId && offer.requisitionId !== filter.requisitionId) continue;
      if (filter?.status && offer.status !== filter.status) continue;

      if (search) {
        const matches =
          (offer.candidateName && offer.candidateName.toLowerCase().includes(search)) ||
          (offer.requisitionTitle && offer.requisitionTitle.toLowerCase().includes(search)) ||
          offer.offerNumber.toLowerCase().includes(search);
        if (!matches) continue;
      }

      results.push({ ...offer });
    }

    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public static async create(offer: JobOffer): Promise<JobOffer> {
    this.db.jobOffers.set(offer.id, { ...offer });
    return { ...offer };
  }

  public static async update(id: string, companyId: string, updates: Partial<JobOffer>): Promise<JobOffer | null> {
    const existing = await this.findById(id, companyId);
    if (!existing) return null;
    const updated: JobOffer = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.db.jobOffers.set(id, updated);
    return { ...updated };
  }

  public static async delete(id: string, companyId: string): Promise<boolean> {
    const existing = await this.findById(id, companyId);
    if (!existing) return false;
    return this.db.jobOffers.delete(id);
  }
}
