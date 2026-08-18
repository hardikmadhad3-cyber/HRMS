import {
  AssetCategory,
  AssetMaster,
  AssetAssignment,
  AssetAssignmentHistory,
  AssetStatus,
  AssetCondition,
} from '../../../src/types/assets.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class AssetRepository {
  private static db = RelationalDatabase.getInstance();

  // ---------------------------------------------------------------------------
  // Asset Categories
  // ---------------------------------------------------------------------------
  public static async findCategories(companyId: string): Promise<AssetCategory[]> {
    return Array.from(this.db.assetCategories.values()).filter((c) => c.companyId === companyId);
  }

  public static async findCategoryById(id: string, companyId: string): Promise<AssetCategory | null> {
    const cat = this.db.assetCategories.get(id);
    if (cat && cat.companyId === companyId) return { ...cat };
    return null;
  }

  public static async findCategoryByCode(code: string, companyId: string): Promise<AssetCategory | null> {
    const cat = Array.from(this.db.assetCategories.values()).find(
      (c) => c.companyId === companyId && c.code.toUpperCase() === code.toUpperCase()
    );
    return cat ? { ...cat } : null;
  }

  public static async createCategory(category: AssetCategory): Promise<AssetCategory> {
    this.db.assetCategories.set(category.id, { ...category });
    return { ...category };
  }

  public static async updateCategory(id: string, companyId: string, updates: Partial<AssetCategory>): Promise<AssetCategory | null> {
    const existing = await this.findCategoryById(id, companyId);
    if (!existing) return null;
    const updated: AssetCategory = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.db.assetCategories.set(id, updated);
    return { ...updated };
  }

  // ---------------------------------------------------------------------------
  // Asset Master
  // ---------------------------------------------------------------------------
  public static async findAssets(
    companyId: string,
    filter: {
      categoryId?: string;
      status?: AssetStatus;
      condition?: AssetCondition;
      currentEmployeeId?: string;
      employeeIds?: string[];
      search?: string;
    } = {}
  ): Promise<AssetMaster[]> {
    let list = Array.from(this.db.assetMaster.values()).filter((a) => a.companyId === companyId);

    if (filter.categoryId) {
      list = list.filter((a) => a.categoryId === filter.categoryId);
    }
    if (filter.status) {
      list = list.filter((a) => a.status === filter.status);
    }
    if (filter.condition) {
      list = list.filter((a) => a.condition === filter.condition);
    }
    if (filter.currentEmployeeId) {
      list = list.filter((a) => a.currentEmployeeId === filter.currentEmployeeId);
    } else if (filter.employeeIds && filter.employeeIds.length > 0) {
      list = list.filter((a) => a.currentEmployeeId && filter.employeeIds!.includes(a.currentEmployeeId));
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.assetCode.toLowerCase().includes(q) ||
          (a.serialNumber && a.serialNumber.toLowerCase().includes(q)) ||
          (a.manufacturer && a.manufacturer.toLowerCase().includes(q))
      );
    }

    return list
      .map((a) => this.enrichAsset(a))
      .sort((a, b) => a.assetCode.localeCompare(b.assetCode));
  }

  public static async findAssetById(id: string, companyId: string): Promise<AssetMaster | null> {
    const asset = this.db.assetMaster.get(id);
    if (asset && asset.companyId === companyId) {
      return this.enrichAsset(asset);
    }
    return null;
  }

  public static async findAssetByCode(assetCode: string, companyId: string): Promise<AssetMaster | null> {
    const asset = Array.from(this.db.assetMaster.values()).find(
      (a) => a.companyId === companyId && a.assetCode.toUpperCase() === assetCode.toUpperCase()
    );
    return asset ? this.enrichAsset(asset) : null;
  }

  public static async createAsset(asset: AssetMaster): Promise<AssetMaster> {
    this.db.assetMaster.set(asset.id, { ...asset });
    return this.enrichAsset(asset);
  }

  public static async updateAsset(id: string, companyId: string, updates: Partial<AssetMaster>): Promise<AssetMaster | null> {
    const existing = this.db.assetMaster.get(id);
    if (!existing || existing.companyId !== companyId) return null;

    const updated: AssetMaster = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.db.assetMaster.set(id, updated);
    return this.enrichAsset(updated);
  }

  public static async deleteAsset(id: string, companyId: string): Promise<boolean> {
    const existing = this.db.assetMaster.get(id);
    if (!existing || existing.companyId !== companyId) return false;
    this.db.assetMaster.delete(id);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Asset Assignments
  // ---------------------------------------------------------------------------
  public static async findAssignments(
    companyId: string,
    filter: { assetId?: string; employeeId?: string; isReturned?: boolean } = {}
  ): Promise<AssetAssignment[]> {
    let list = Array.from(this.db.assetAssignments.values()).filter((a) => a.companyId === companyId);

    if (filter.assetId) {
      list = list.filter((a) => a.assetId === filter.assetId);
    }
    if (filter.employeeId) {
      list = list.filter((a) => a.employeeId === filter.employeeId);
    }
    if (filter.isReturned !== undefined) {
      list = list.filter((a) => a.isReturned === filter.isReturned);
    }

    return list
      .map((a) => this.enrichAssignment(a))
      .sort((a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime());
  }

  public static async findActiveAssignmentByAssetId(assetId: string, companyId: string): Promise<AssetAssignment | null> {
    const assignment = Array.from(this.db.assetAssignments.values()).find(
      (a) => a.companyId === companyId && a.assetId === assetId && !a.isReturned
    );
    return assignment ? this.enrichAssignment(assignment) : null;
  }

  public static async createAssignment(assignment: AssetAssignment): Promise<AssetAssignment> {
    this.db.assetAssignments.set(assignment.id, { ...assignment });
    return this.enrichAssignment(assignment);
  }

  public static async updateAssignment(
    id: string,
    companyId: string,
    updates: Partial<AssetAssignment>
  ): Promise<AssetAssignment | null> {
    const existing = this.db.assetAssignments.get(id);
    if (!existing || existing.companyId !== companyId) return null;

    const updated: AssetAssignment = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.db.assetAssignments.set(id, updated);
    return this.enrichAssignment(updated);
  }

  // ---------------------------------------------------------------------------
  // Asset History / Audit
  // ---------------------------------------------------------------------------
  public static async logHistory(entry: AssetAssignmentHistory): Promise<void> {
    this.db.assetAssignmentHistory.set(entry.id, { ...entry });
  }

  public static async findHistoryByAssetId(assetId: string, companyId: string): Promise<AssetAssignmentHistory[]> {
    return Array.from(this.db.assetAssignmentHistory.values())
      .filter((h) => h.assetId === assetId && h.companyId === companyId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  private static enrichAsset(asset: AssetMaster): AssetMaster {
    const cat = this.db.assetCategories.get(asset.categoryId);
    let currentEmployeeName: string | undefined;
    let currentEmployeeCode: string | undefined;

    if (asset.currentEmployeeId) {
      const emp = this.db.employees.get(asset.currentEmployeeId);
      if (emp) {
        currentEmployeeName = `${emp.firstName} ${emp.lastName}`;
        currentEmployeeCode = emp.employeeCode;
      }
    }

    return {
      ...asset,
      categoryName: cat?.name || asset.categoryName || 'General',
      currentEmployeeName,
      currentEmployeeCode,
    };
  }

  private static enrichAssignment(assignment: AssetAssignment): AssetAssignment {
    const asset = this.db.assetMaster.get(assignment.assetId);
    const emp = this.db.employees.get(assignment.employeeId);
    const assigner = this.db.employees.get(assignment.assignedBy);
    const returner = assignment.returnedTo ? this.db.employees.get(assignment.returnedTo) : undefined;

    return {
      ...assignment,
      assetCode: asset?.assetCode || assignment.assetCode,
      assetName: asset?.name || assignment.assetName,
      employeeName: emp ? `${emp.firstName} ${emp.lastName}` : assignment.employeeName,
      employeeCode: emp?.employeeCode || assignment.employeeCode,
      assignedByName: assigner ? `${assigner.firstName} ${assigner.lastName}` : assignment.assignedByName,
      returnedToName: returner ? `${returner.firstName} ${returner.lastName}` : assignment.returnedToName,
    };
  }
}
