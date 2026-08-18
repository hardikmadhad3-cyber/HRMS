/**
 * Phase 6B: Company Asset Master & Assignment Types
 * Multi-Company Isolation & Condition Audit Trail
 */

export enum AssetStatus {
  AVAILABLE = 'AVAILABLE',
  ASSIGNED = 'ASSIGNED',
  UNDER_MAINTENANCE = 'UNDER_MAINTENANCE',
  RETURNED = 'RETURNED',
  RETIRED = 'RETIRED',
  LOST_DAMAGED = 'LOST_DAMAGED',
}

export enum AssetCondition {
  NEW = 'NEW',
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  DAMAGED = 'DAMAGED',
  UNUSABLE = 'UNUSABLE',
}

export interface AssetCategory {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  depreciationYears?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssetMaster {
  id: string;
  companyId: string;
  assetCode: string;
  name: string;
  categoryId: string;
  categoryName?: string;
  serialNumber?: string;
  modelNumber?: string;
  manufacturer?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  currency: string;
  warrantyExpiryDate?: string;
  status: AssetStatus;
  condition: AssetCondition;
  location?: string;
  currentEmployeeId?: string;
  currentEmployeeName?: string;
  currentEmployeeCode?: string;
  assignedDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetAssignment {
  id: string;
  companyId: string;
  assetId: string;
  assetCode?: string;
  assetName?: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  assignedDate: string;
  assignedCondition: AssetCondition;
  assignedBy: string;
  assignedByName?: string;
  assignmentNotes?: string;
  returnDate?: string;
  returnCondition?: AssetCondition;
  returnedTo?: string;
  returnedToName?: string;
  returnNotes?: string;
  isReturned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssetAssignmentHistory {
  id: string;
  assetId: string;
  companyId: string;
  action: string;
  actorId: string;
  actorName: string;
  employeeId?: string;
  details: string;
  condition?: AssetCondition;
  timestamp: string;
}

export interface CreateAssetMasterDTO {
  assetCode: string;
  name: string;
  categoryId: string;
  serialNumber?: string;
  modelNumber?: string;
  manufacturer?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  currency?: string;
  warrantyExpiryDate?: string;
  condition?: AssetCondition;
  location?: string;
  notes?: string;
}

export interface UpdateAssetMasterDTO {
  name?: string;
  categoryId?: string;
  serialNumber?: string;
  modelNumber?: string;
  manufacturer?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  currency?: string;
  warrantyExpiryDate?: string;
  condition?: AssetCondition;
  status?: AssetStatus;
  location?: string;
  notes?: string;
}

export interface AssignAssetDTO {
  employeeId: string;
  assignedDate?: string;
  condition?: AssetCondition;
  notes?: string;
}

export interface ReturnAssetDTO {
  returnDate?: string;
  returnCondition: AssetCondition;
  notes?: string;
  targetStatus?: AssetStatus;
}

export interface CreateAssetCategoryDTO {
  code: string;
  name: string;
  description?: string;
  depreciationYears?: number;
}

export interface UpdateAssetCategoryDTO {
  name?: string;
  description?: string;
  depreciationYears?: number;
}

export interface AssetDashboardMetrics {
  totalAssetsCount: number;
  assignedCount: number;
  availableCount: number;
  maintenanceCount: number;
  retiredCount: number;
  totalAssetValue: number;
  categoryBreakdown: { categoryName: string; count: number; totalValue: number }[];
}
