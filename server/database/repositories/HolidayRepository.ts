import { Holiday } from '../../../src/types/organization.js';
import { RelationalDatabase, TenantScopedFilter } from '../RelationalDatabase.js';

export class HolidayRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findAll(filter: TenantScopedFilter): Promise<Holiday[]> {
    let result = Array.from(this.db.holidays.values()).filter((h) => h.companyId === filter.companyId);

    if (filter.status) {
      result = result.filter((h) => h.status === filter.status);
    }
    if (filter.year) {
      result = result.filter((h) => {
        const hYear = new Date(h.date).getFullYear();
        return hYear === filter.year;
      });
    }
    if (filter.workLocationId) {
      result = result.filter(
        (h) => !h.workLocationId || h.workLocationId === filter.workLocationId
      );
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.type.toLowerCase().includes(q) ||
          (h.description && h.description.toLowerCase().includes(q))
      );
    }

    // Sort chronologically by date
    result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Enrich with location name if specified
    return result.map((h) => {
      if (h.workLocationId) {
        const loc = this.db.workLocations.get(h.workLocationId);
        return {
          ...h,
          workLocationName: loc ? `${loc.name} (${loc.code})` : undefined,
        };
      }
      return h;
    });
  }

  public static async findForCompany(
    companyId: string,
    filters?: { startDate?: string; endDate?: string; branchId?: string; workLocationId?: string }
  ): Promise<Holiday[]> {
    let result = Array.from(this.db.holidays.values()).filter(
      (h) => h.companyId === companyId && h.status === 'ACTIVE'
    );

    if (filters?.startDate) {
      result = result.filter((h) => h.date >= filters.startDate!);
    }
    if (filters?.endDate) {
      result = result.filter((h) => h.date <= filters.endDate!);
    }
    if (filters?.workLocationId) {
      result = result.filter(
        (h) =>
          !h.workLocationId ||
          !h.applicableLocationId ||
          h.workLocationId === filters.workLocationId ||
          h.applicableLocationId === filters.workLocationId
      );
    }

    return result;
  }

  public static async findById(id: string, companyId?: string): Promise<Holiday | null> {
    const h = this.db.holidays.get(id);
    if (!h) return null;
    if (companyId && h.companyId !== companyId) return null;

    if (h.workLocationId) {
      const loc = this.db.workLocations.get(h.workLocationId);
      return {
        ...h,
        workLocationName: loc ? `${loc.name} (${loc.code})` : undefined,
      };
    }
    return h;
  }

  public static async findDuplicate(companyId: string, date: string, name: string, excludeId?: string): Promise<Holiday | null> {
    const normalizedName = name.trim().toLowerCase();
    for (const h of this.db.holidays.values()) {
      if (h.companyId === companyId && h.date === date && h.name.trim().toLowerCase() === normalizedName) {
        if (!excludeId || h.id !== excludeId) {
          return h;
        }
      }
    }
    return null;
  }

  public static async create(holiday: Holiday): Promise<Holiday> {
    this.db.holidays.set(holiday.id, holiday);
    return holiday;
  }

  public static async update(id: string, companyId: string, updates: Partial<Holiday>): Promise<Holiday | null> {
    const existing = this.db.holidays.get(id);
    if (!existing || existing.companyId !== companyId) return null;
    const updated: Holiday = {
      ...existing,
      ...updates,
      id,
      companyId,
      updatedAt: new Date().toISOString(),
    };
    this.db.holidays.set(id, updated);
    return updated;
  }

  public static async delete(id: string, companyId: string): Promise<boolean> {
    const existing = this.db.holidays.get(id);
    if (!existing || existing.companyId !== companyId) return false;
    return this.db.holidays.delete(id);
  }
}
