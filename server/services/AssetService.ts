import {
  AssetCategory,
  AssetMaster,
  AssetAssignment,
  AssetAssignmentHistory,
  AssetStatus,
  AssetCondition,
  CreateAssetMasterDTO,
  UpdateAssetMasterDTO,
  AssignAssetDTO,
  ReturnAssetDTO,
  CreateAssetCategoryDTO,
  UpdateAssetCategoryDTO,
  AssetDashboardMetrics,
} from '../../src/types/assets.js';
import { AuthUser, UserRole, PermissionKey } from '../../src/types/auth.js';
import { AssetRepository } from '../database/repositories/AssetRepository.js';
import { EmployeeAssignmentRepository } from '../database/repositories/EmployeeAssignmentRepository.js';
import { RelationalDatabase } from '../database/RelationalDatabase.js';

export class AssetService {
  private static db = RelationalDatabase.getInstance();

  /**
   * Resolve authorized employee scope
   */
  public static async getAuthorizedEmployeeIds(actor: AuthUser, companyId: string): Promise<string[] | null> {
    const isSuperAdmin = actor.role === UserRole.SUPER_ADMIN;
    const isHrOrAssetAdmin =
      actor.role === UserRole.HR_ADMIN ||
      actor.permissions?.includes(PermissionKey.ASSET_MANAGE);

    if (isSuperAdmin || isHrOrAssetAdmin) {
      return null; // Full company scope
    }

    if (!actor.employeeId) return [];

    if (actor.role === UserRole.MANAGER) {
      const subordinateIds = await EmployeeAssignmentRepository.getAllSubordinateIds(actor.employeeId);
      return [actor.employeeId, ...subordinateIds];
    }

    return [actor.employeeId]; // Self only
  }

  // =========================================================================
  // 1. ASSET CATEGORIES
  // =========================================================================
  public static async getCategories(companyId: string): Promise<AssetCategory[]> {
    return AssetRepository.findCategories(companyId);
  }

  public static async createCategory(
    dto: CreateAssetCategoryDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<AssetCategory> {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.HR_ADMIN) {
      throw new Error('Access denied: Only HR or System administrators can create asset categories.');
    }

    const existing = await AssetRepository.findCategoryByCode(dto.code, companyId);
    if (existing) {
      throw new Error(`Asset category with code '${dto.code}' already exists.`);
    }

    const category: AssetCategory = {
      id: `ast-cat-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      companyId,
      code: dto.code.toUpperCase().trim(),
      name: dto.name.trim(),
      description: dto.description?.trim(),
      depreciationYears: dto.depreciationYears,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return AssetRepository.createCategory(category);
  }

  public static async updateCategory(
    id: string,
    updates: UpdateAssetCategoryDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<AssetCategory> {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.HR_ADMIN) {
      throw new Error('Access denied: Only HR or System administrators can modify asset categories.');
    }

    const updated = await AssetRepository.updateCategory(id, companyId, updates);
    if (!updated) throw new Error(`Asset category '${id}' not found.`);
    return updated;
  }

  // =========================================================================
  // 2. ASSET MASTER MANAGEMENT
  // =========================================================================
  public static async getAssets(
    companyId: string,
    actor: AuthUser,
    filter: {
      categoryId?: string;
      status?: AssetStatus;
      condition?: AssetCondition;
      currentEmployeeId?: string;
      search?: string;
      scope?: 'my' | 'all';
    } = {}
  ): Promise<AssetMaster[]> {
    const authScope = await this.getAuthorizedEmployeeIds(actor, companyId);

    if (filter.scope === 'my') {
      if (!actor.employeeId) return [];
      return AssetRepository.findAssets(companyId, { currentEmployeeId: actor.employeeId });
    }

    if (authScope === null) {
      return AssetRepository.findAssets(companyId, filter);
    }

    if (filter.currentEmployeeId) {
      if (!authScope.includes(filter.currentEmployeeId)) {
        throw new Error('Access denied: You are not authorized to view assets for this employee.');
      }
      return AssetRepository.findAssets(companyId, { ...filter, currentEmployeeId: filter.currentEmployeeId });
    }

    return AssetRepository.findAssets(companyId, { ...filter, employeeIds: authScope });
  }

  public static async getAssetById(id: string, companyId: string, actor: AuthUser): Promise<AssetMaster> {
    const asset = await AssetRepository.findAssetById(id, companyId);
    if (!asset) throw new Error(`Asset '${id}' not found.`);

    const authScope = await this.getAuthorizedEmployeeIds(actor, companyId);
    if (authScope !== null && asset.currentEmployeeId && !authScope.includes(asset.currentEmployeeId)) {
      throw new Error('Access denied: You do not have permission to view this asset.');
    }

    return asset;
  }

  public static async createAsset(
    dto: CreateAssetMasterDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<AssetMaster> {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.HR_ADMIN) {
      throw new Error('Access denied: Only HR or Asset Administrators can register new assets.');
    }

    const existing = await AssetRepository.findAssetByCode(dto.assetCode, companyId);
    if (existing) {
      throw new Error(`Asset with code '${dto.assetCode}' already exists.`);
    }

    const category = await AssetRepository.findCategoryById(dto.categoryId, companyId);
    if (!category) throw new Error(`Asset category '${dto.categoryId}' not found.`);

    const asset: AssetMaster = {
      id: `ast-mst-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      companyId,
      assetCode: dto.assetCode.toUpperCase().trim(),
      name: dto.name.trim(),
      categoryId: dto.categoryId,
      categoryName: category.name,
      serialNumber: dto.serialNumber?.trim(),
      modelNumber: dto.modelNumber?.trim(),
      manufacturer: dto.manufacturer?.trim(),
      purchaseDate: dto.purchaseDate,
      purchaseCost: dto.purchaseCost ? Number(dto.purchaseCost) : undefined,
      currency: dto.currency || 'USD',
      warrantyExpiryDate: dto.warrantyExpiryDate,
      status: AssetStatus.AVAILABLE,
      condition: dto.condition || AssetCondition.NEW,
      location: dto.location?.trim(),
      notes: dto.notes?.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const created = await AssetRepository.createAsset(asset);

    await AssetRepository.logHistory({
      id: `ast-hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      assetId: created.id,
      companyId,
      action: 'ASSET_CREATED',
      actorId: actor.employeeId || actor.id,
      actorName: actor.fullName,
      details: `Asset registered with code ${created.assetCode}`,
      condition: created.condition,
      timestamp: new Date().toISOString(),
    });

    return created;
  }

  public static async updateAsset(
    id: string,
    dto: UpdateAssetMasterDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<AssetMaster> {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.HR_ADMIN) {
      throw new Error('Access denied: Only HR or Asset Administrators can update assets.');
    }

    const asset = await AssetRepository.findAssetById(id, companyId);
    if (!asset) throw new Error(`Asset '${id}' not found.`);

    let categoryName = asset.categoryName;
    if (dto.categoryId && dto.categoryId !== asset.categoryId) {
      const cat = await AssetRepository.findCategoryById(dto.categoryId, companyId);
      if (!cat) throw new Error(`Asset category '${dto.categoryId}' not found.`);
      categoryName = cat.name;
    }

    const updated = await AssetRepository.updateAsset(id, companyId, {
      name: dto.name?.trim() || asset.name,
      categoryId: dto.categoryId || asset.categoryId,
      categoryName,
      serialNumber: dto.serialNumber !== undefined ? dto.serialNumber.trim() : asset.serialNumber,
      modelNumber: dto.modelNumber !== undefined ? dto.modelNumber.trim() : asset.modelNumber,
      manufacturer: dto.manufacturer !== undefined ? dto.manufacturer.trim() : asset.manufacturer,
      purchaseDate: dto.purchaseDate || asset.purchaseDate,
      purchaseCost: dto.purchaseCost !== undefined ? Number(dto.purchaseCost) : asset.purchaseCost,
      currency: dto.currency || asset.currency,
      warrantyExpiryDate: dto.warrantyExpiryDate !== undefined ? dto.warrantyExpiryDate : asset.warrantyExpiryDate,
      condition: dto.condition || asset.condition,
      status: dto.status || asset.status,
      location: dto.location !== undefined ? dto.location.trim() : asset.location,
      notes: dto.notes !== undefined ? dto.notes.trim() : asset.notes,
    });

    if (dto.condition && dto.condition !== asset.condition) {
      await AssetRepository.logHistory({
        id: `ast-hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        assetId: id,
        companyId,
        action: 'CONDITION_UPDATED',
        actorId: actor.employeeId || actor.id,
        actorName: actor.fullName,
        details: `Asset condition changed from ${asset.condition} to ${dto.condition}`,
        condition: dto.condition,
        timestamp: new Date().toISOString(),
      });
    }

    return updated!;
  }

  // =========================================================================
  // 3. ASSET ASSIGNMENT & RETURN LIFECYCLE
  // =========================================================================
  public static async assignAsset(
    assetId: string,
    dto: AssignAssetDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<AssetAssignment> {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.HR_ADMIN) {
      throw new Error('Access denied: Only HR or Asset Administrators can assign assets.');
    }

    const asset = await AssetRepository.findAssetById(assetId, companyId);
    if (!asset) throw new Error(`Asset '${assetId}' not found.`);

    if (asset.status === AssetStatus.ASSIGNED) {
      throw new Error(`Asset '${asset.assetCode}' is already assigned to employee ID '${asset.currentEmployeeId}'.`);
    }

    if (asset.status === AssetStatus.RETIRED || asset.status === AssetStatus.LOST_DAMAGED) {
      throw new Error(`Cannot assign asset in status '${asset.status}'.`);
    }

    const employee = this.db.employees.get(dto.employeeId);
    if (!employee || employee.companyId !== companyId) {
      throw new Error(`Employee '${dto.employeeId}' not found in this organization.`);
    }

    const assignedDate = dto.assignedDate || new Date().toISOString().slice(0, 10);
    const assignedCondition = dto.condition || asset.condition;

    const assignment: AssetAssignment = {
      id: `ast-asg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      companyId,
      assetId,
      employeeId: dto.employeeId,
      assignedDate,
      assignedCondition,
      assignedBy: actor.employeeId || actor.id,
      assignmentNotes: dto.notes?.trim(),
      isReturned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const createdAssignment = await AssetRepository.createAssignment(assignment);

    // Update master asset
    await AssetRepository.updateAsset(assetId, companyId, {
      status: AssetStatus.ASSIGNED,
      condition: assignedCondition,
      currentEmployeeId: dto.employeeId,
      assignedDate,
    });

    await AssetRepository.logHistory({
      id: `ast-hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      assetId,
      companyId,
      action: 'ASSET_ASSIGNED',
      actorId: actor.employeeId || actor.id,
      actorName: actor.fullName,
      employeeId: dto.employeeId,
      details: `Assigned to ${employee.firstName} ${employee.lastName} (${employee.employeeCode})`,
      condition: assignedCondition,
      timestamp: new Date().toISOString(),
    });

    return createdAssignment;
  }

  public static async returnAsset(
    assetId: string,
    dto: ReturnAssetDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<AssetAssignment> {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.HR_ADMIN) {
      throw new Error('Access denied: Only HR or Asset Administrators can process asset returns.');
    }

    const asset = await AssetRepository.findAssetById(assetId, companyId);
    if (!asset) throw new Error(`Asset '${assetId}' not found.`);

    const activeAssignment = await AssetRepository.findActiveAssignmentByAssetId(assetId, companyId);
    if (!activeAssignment) {
      throw new Error(`No active assignment record found for asset '${asset.assetCode}'.`);
    }

    const returnDate = dto.returnDate || new Date().toISOString().slice(0, 10);
    const returnCondition = dto.returnCondition;
    const targetStatus = dto.targetStatus || (returnCondition === AssetCondition.DAMAGED || returnCondition === AssetCondition.UNUSABLE ? AssetStatus.UNDER_MAINTENANCE : AssetStatus.AVAILABLE);

    const updatedAssignment = await AssetRepository.updateAssignment(activeAssignment.id, companyId, {
      returnDate,
      returnCondition,
      returnedTo: actor.employeeId || actor.id,
      returnNotes: dto.notes?.trim(),
      isReturned: true,
    });

    // Update master asset
    await AssetRepository.updateAsset(assetId, companyId, {
      status: targetStatus,
      condition: returnCondition,
      currentEmployeeId: undefined,
      assignedDate: undefined,
    });

    const emp = this.db.employees.get(activeAssignment.employeeId);
    const empName = emp ? `${emp.firstName} ${emp.lastName}` : activeAssignment.employeeId;

    await AssetRepository.logHistory({
      id: `ast-hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      assetId,
      companyId,
      action: 'ASSET_RETURNED',
      actorId: actor.employeeId || actor.id,
      actorName: actor.fullName,
      employeeId: activeAssignment.employeeId,
      details: `Returned from ${empName} with condition ${returnCondition}. Target Status: ${targetStatus}`,
      condition: returnCondition,
      timestamp: new Date().toISOString(),
    });

    return updatedAssignment!;
  }

  public static async getAssetAssignments(
    companyId: string,
    actor: AuthUser,
    filter: { assetId?: string; employeeId?: string; isReturned?: boolean } = {}
  ): Promise<AssetAssignment[]> {
    const authScope = await this.getAuthorizedEmployeeIds(actor, companyId);
    if (authScope !== null && filter.employeeId && !authScope.includes(filter.employeeId)) {
      throw new Error('Access denied: You are not authorized to view assignments for this employee.');
    }

    return AssetRepository.findAssignments(companyId, filter);
  }

  public static async getEmployeeActiveAssets(employeeId: string, companyId: string): Promise<AssetMaster[]> {
    return AssetRepository.findAssets(companyId, { currentEmployeeId: employeeId, status: AssetStatus.ASSIGNED });
  }

  public static async getAssetHistory(assetId: string, companyId: string, actor: AuthUser): Promise<AssetAssignmentHistory[]> {
    await this.getAssetById(assetId, companyId, actor);
    return AssetRepository.findHistoryByAssetId(assetId, companyId);
  }

  // =========================================================================
  // 4. ASSET DASHBOARD ANALYTICS
  // =========================================================================
  public static async getDashboardMetrics(companyId: string, actor: AuthUser): Promise<AssetDashboardMetrics> {
    const assets = await AssetRepository.findAssets(companyId, {});
    const categories = await AssetRepository.findCategories(companyId);

    const assignedCount = assets.filter((a) => a.status === AssetStatus.ASSIGNED).length;
    const availableCount = assets.filter((a) => a.status === AssetStatus.AVAILABLE).length;
    const maintenanceCount = assets.filter((a) => a.status === AssetStatus.UNDER_MAINTENANCE).length;
    const retiredCount = assets.filter((a) => a.status === AssetStatus.RETIRED || a.status === AssetStatus.LOST_DAMAGED).length;

    const totalAssetValue = assets.reduce((sum, a) => sum + Number(a.purchaseCost || 0), 0);

    const categoryBreakdown = categories.map((cat) => {
      const catAssets = assets.filter((a) => a.categoryId === cat.id);
      const totalValue = catAssets.reduce((sum, a) => sum + Number(a.purchaseCost || 0), 0);
      return {
        categoryName: cat.name,
        count: catAssets.length,
        totalValue: Math.round(totalValue * 100) / 100,
      };
    });

    return {
      totalAssetsCount: assets.length,
      assignedCount,
      availableCount,
      maintenanceCount,
      retiredCount,
      totalAssetValue: Math.round(totalAssetValue * 100) / 100,
      categoryBreakdown,
    };
  }
}
