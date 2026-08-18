import { apiClient, ApiResponse } from './apiClient.js';
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
} from '../types/assets.js';

export const assetApi = {
  // Dashboard Metrics
  getDashboard: (companyId?: string): Promise<ApiResponse<AssetDashboardMetrics>> =>
    apiClient.get<AssetDashboardMetrics>('/api/assets/dashboard', null, companyId),

  // Categories
  getCategories: (companyId?: string): Promise<ApiResponse<AssetCategory[]>> =>
    apiClient.get<AssetCategory[]>('/api/assets/categories', null, companyId),

  createCategory: (dto: CreateAssetCategoryDTO, companyId?: string): Promise<ApiResponse<AssetCategory>> =>
    apiClient.post<AssetCategory>('/api/assets/categories', dto, companyId),

  updateCategory: (id: string, dto: UpdateAssetCategoryDTO, companyId?: string): Promise<ApiResponse<AssetCategory>> =>
    apiClient.put<AssetCategory>(`/api/assets/categories/${id}`, dto, companyId),

  // Asset Master
  getAssets: (
    filter: {
      categoryId?: string;
      status?: AssetStatus;
      condition?: AssetCondition;
      currentEmployeeId?: string;
      search?: string;
      scope?: 'my' | 'all';
    } = {},
    companyId?: string
  ): Promise<ApiResponse<AssetMaster[]>> =>
    apiClient.get<AssetMaster[]>('/api/assets/master', filter, companyId),

  getAssetById: (id: string, companyId?: string): Promise<ApiResponse<AssetMaster>> =>
    apiClient.get<AssetMaster>(`/api/assets/master/${id}`, null, companyId),

  createAsset: (dto: CreateAssetMasterDTO, companyId?: string): Promise<ApiResponse<AssetMaster>> =>
    apiClient.post<AssetMaster>('/api/assets/master', dto, companyId),

  updateAsset: (id: string, dto: UpdateAssetMasterDTO, companyId?: string): Promise<ApiResponse<AssetMaster>> =>
    apiClient.put<AssetMaster>(`/api/assets/master/${id}`, dto, companyId),

  // Assignments & Returns
  getAssignments: (
    filter: { assetId?: string; employeeId?: string; isReturned?: boolean } = {},
    companyId?: string
  ): Promise<ApiResponse<AssetAssignment[]>> =>
    apiClient.get<AssetAssignment[]>('/api/assets/assignments', filter, companyId),

  assignAsset: (assetId: string, dto: AssignAssetDTO, companyId?: string): Promise<ApiResponse<AssetAssignment>> =>
    apiClient.post<AssetAssignment>(`/api/assets/master/${assetId}/assign`, dto, companyId),

  returnAsset: (assetId: string, dto: ReturnAssetDTO, companyId?: string): Promise<ApiResponse<AssetAssignment>> =>
    apiClient.post<AssetAssignment>(`/api/assets/master/${assetId}/return`, dto, companyId),

  getAssetHistory: (assetId: string, companyId?: string): Promise<ApiResponse<AssetAssignmentHistory[]>> =>
    apiClient.get<AssetAssignmentHistory[]>(`/api/assets/master/${assetId}/history`, null, companyId),
};
