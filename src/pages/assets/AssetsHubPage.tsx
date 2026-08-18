import React, { useState, useEffect } from 'react';
import {
  Laptop,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  RotateCcw,
  ShieldCheck,
  DollarSign,
  Layers,
  FileText,
  X,
  Smartphone,
  Server,
  ArrowRightLeft,
  Calendar,
  Eye,
} from 'lucide-react';
import {
  AssetMaster,
  AssetCategory,
  AssetCondition,
  AssetDashboardMetrics,
  AssetAssignmentHistory,
  AssetStatus,
  AssignAssetDTO,
  CreateAssetMasterDTO,
  ReturnAssetDTO,
} from '../../types/assets.js';
import { assetApi } from '../../services/assetApi.js';
import { useAuth } from '../../context/AuthContext.js';
import { PermissionKey, UserRole } from '../../types/auth.js';

export function AssetsHubPage() {
  const { user, hasPermission } = useAuth();
  const activeCompanyId = user?.activeCompanyId || 'comp-101';

  const canManage =
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.HR_ADMIN ||
    hasPermission(PermissionKey.ASSET_MANAGE);

  const [activeTab, setActiveTab] = useState<'all' | 'assigned' | 'available' | 'categories'>('all');
  const [assets, setAssets] = useState<AssetMaster[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [metrics, setMetrics] = useState<AssetDashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Modals
  const [isCreateAssetModalOpen, setIsCreateAssetModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [assignModalAsset, setAssignModalAsset] = useState<AssetMaster | null>(null);
  const [returnModalAsset, setReturnModalAsset] = useState<AssetMaster | null>(null);
  const [historyModalAsset, setHistoryModalAsset] = useState<AssetMaster | null>(null);
  const [assetHistory, setAssetHistory] = useState<AssetAssignmentHistory[]>([]);

  // Create Asset Form
  const [newAssetCode, setNewAssetCode] = useState('');
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetCategoryId, setNewAssetCategoryId] = useState('');
  const [newAssetSerial, setNewAssetSerial] = useState('');
  const [newAssetModel, setNewAssetModel] = useState('');
  const [newAssetManufacturer, setNewAssetManufacturer] = useState('');
  const [newAssetCost, setNewAssetCost] = useState('');
  const [newAssetPurchaseDate, setNewAssetPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [newAssetWarranty, setNewAssetWarranty] = useState('');
  const [newAssetLocation, setNewAssetLocation] = useState('Headquarters (San Francisco)');

  // Assign Form
  const [assignEmployeeId, setAssignEmployeeId] = useState('emp-101');
  const [assignCondition, setAssignCondition] = useState<AssetCondition>(AssetCondition.NEW);
  const [assignNotes, setAssignNotes] = useState('');

  // Return Form
  const [returnCondition, setReturnCondition] = useState<AssetCondition>(AssetCondition.GOOD);
  const [returnNotes, setReturnNotes] = useState('');

  // Category Form
  const [newCatCode, setNewCatCode] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatDepreciationYears, setNewCatDepreciationYears] = useState('3');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [metricsRes, catRes, assetsRes] = await Promise.all([
        assetApi.getDashboard(activeCompanyId),
        assetApi.getCategories(activeCompanyId),
        assetApi.getAssets(
          {
            categoryId: selectedCategoryFilter !== 'ALL' ? selectedCategoryFilter : undefined,
            status:
              activeTab === 'available'
                ? AssetStatus.AVAILABLE
                : activeTab === 'assigned'
                ? AssetStatus.ASSIGNED
                : undefined,
          },
          activeCompanyId
        ),
      ]);

      if (metricsRes.success && metricsRes.data) setMetrics(metricsRes.data);
      if (catRes.success && catRes.data) {
        setCategories(catRes.data);
        if (catRes.data.length > 0 && !newAssetCategoryId) {
          setNewAssetCategoryId(catRes.data[0].id);
        }
      }
      if (assetsRes.success && assetsRes.data) setAssets(assetsRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load asset inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, selectedCategoryFilter, activeCompanyId]);

  const handleCreateAsset = async () => {
    if (!newAssetCode || !newAssetName || !newAssetCategoryId) {
      alert('Asset Code, Name, and Category are required.');
      return;
    }

    try {
      const payload: CreateAssetMasterDTO = {
        assetCode: newAssetCode,
        name: newAssetName,
        categoryId: newAssetCategoryId,
        serialNumber: newAssetSerial || undefined,
        modelNumber: newAssetModel || undefined,
        manufacturer: newAssetManufacturer || undefined,
        purchaseCost: newAssetCost ? Number(newAssetCost) : undefined,
        purchaseDate: newAssetPurchaseDate || undefined,
        warrantyExpiryDate: newAssetWarranty || undefined,
        location: newAssetLocation || undefined,
        condition: AssetCondition.NEW,
      };

      await assetApi.createAsset(payload, activeCompanyId);
      setIsCreateAssetModalOpen(false);
      setNewAssetCode('');
      setNewAssetName('');
      setNewAssetSerial('');
      setNewAssetModel('');
      setNewAssetManufacturer('');
      setNewAssetCost('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create asset');
    }
  };

  const handleAssign = async () => {
    if (!assignModalAsset || !assignEmployeeId) {
      alert('Please enter an employee ID for assignment.');
      return;
    }

    try {
      const payload: AssignAssetDTO = {
        employeeId: assignEmployeeId,
        assignedDate: new Date().toISOString().slice(0, 10),
        condition: assignCondition,
        notes: assignNotes || undefined,
      };

      await assetApi.assignAsset(assignModalAsset.id, payload, activeCompanyId);
      setAssignModalAsset(null);
      setAssignNotes('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to assign asset');
    }
  };

  const handleReturn = async () => {
    if (!returnModalAsset) return;

    try {
      const payload: ReturnAssetDTO = {
        returnDate: new Date().toISOString().slice(0, 10),
        returnCondition: returnCondition,
        notes: returnNotes || undefined,
        targetStatus:
          returnCondition === AssetCondition.DAMAGED || returnCondition === AssetCondition.UNUSABLE
            ? AssetStatus.UNDER_MAINTENANCE
            : AssetStatus.AVAILABLE,
      };

      await assetApi.returnAsset(returnModalAsset.id, payload, activeCompanyId);
      setReturnModalAsset(null);
      setReturnNotes('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to process asset return');
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatCode || !newCatName) {
      alert('Category Code and Name are required.');
      return;
    }

    try {
      await assetApi.createCategory(
        {
          code: newCatCode,
          name: newCatName,
          description: newCatDesc,
          depreciationYears: newCatDepreciationYears ? Number(newCatDepreciationYears) : undefined,
        },
        activeCompanyId
      );

      setIsCategoryModalOpen(false);
      setNewCatCode('');
      setNewCatName('');
      setNewCatDesc('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create asset category');
    }
  };

  const handleViewHistory = async (asset: AssetMaster) => {
    try {
      const res = await assetApi.getAssetHistory(asset.id, activeCompanyId);
      if (res.success && res.data) {
        setAssetHistory(res.data);
        setHistoryModalAsset(asset);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to load history');
    }
  };

  const filteredAssets = assets.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.assetCode.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      (a.serialNumber && a.serialNumber.toLowerCase().includes(q)) ||
      (a.currentEmployeeName && a.currentEmployeeName.toLowerCase().includes(q)) ||
      (a.manufacturer && a.manufacturer.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (status: AssetStatus) => {
    switch (status) {
      case AssetStatus.AVAILABLE:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Available</span>;
      case AssetStatus.ASSIGNED:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Assigned</span>;
      case AssetStatus.UNDER_MAINTENANCE:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Under Maintenance</span>;
      case AssetStatus.RETIRED:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">Retired</span>;
      case AssetStatus.LOST_DAMAGED:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">Lost / Damaged</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Laptop className="w-7 h-7 text-[#2F75B5]" />
            Enterprise Asset Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Hardware, devices, licenses, and custody lifecycle tracking with audit integrity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canManage && (
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Layers className="w-4 h-4 text-slate-500" />
              Categories
            </button>
          )}
          {canManage && (
            <button
              onClick={() => setIsCreateAssetModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-[#2F75B5] text-white text-sm font-medium hover:bg-[#1f5588] transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Register Asset
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-xs font-medium text-slate-500">Total Assets</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{metrics.totalAssetsCount}</div>
            <div className="text-xs text-slate-400 mt-1">${metrics.totalAssetValue.toLocaleString()} book value</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-xs font-medium text-blue-600">Assigned / In Use</div>
            <div className="text-2xl font-bold text-blue-700 mt-1">{metrics.assignedCount}</div>
            <div className="text-xs text-blue-600/80 mt-1">With employees</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-xs font-medium text-emerald-600">Available in Pool</div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">{metrics.availableCount}</div>
            <div className="text-xs text-emerald-600/80 mt-1">Ready for issue</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-xs font-medium text-amber-600">Under Maintenance</div>
            <div className="text-2xl font-bold text-amber-700 mt-1">{metrics.maintenanceCount}</div>
            <div className="text-xs text-amber-600/80 mt-1">Repair / check</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-xs font-medium text-slate-600">Retired Assets</div>
            <div className="text-2xl font-bold text-slate-700 mt-1">{metrics.retiredCount}</div>
            <div className="text-xs text-slate-500 mt-1">End of life</div>
          </div>
        </div>
      )}

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Inventory
          </button>
          <button
            onClick={() => setActiveTab('assigned')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'assigned' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Assigned Devices
          </button>
          <button
            onClick={() => setActiveTab('available')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'available' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Available in Pool
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'categories' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Asset Categories
          </button>
        </div>

        {activeTab !== 'categories' && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search code, model, serial, employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2F75B5] w-64"
              />
            </div>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab === 'categories' ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-semibold text-sm text-slate-800">Hardware & Equipment Classifications</h3>
            <span className="text-xs text-slate-500">{categories.length} Categories</span>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Code</th>
                <th className="p-3.5">Category Name</th>
                <th className="p-3.5">Description</th>
                <th className="p-3.5">Depreciation Lifecycle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50/80">
                  <td className="p-3.5 font-semibold text-slate-900 font-mono">{cat.code}</td>
                  <td className="p-3.5 font-medium text-slate-800">{cat.name}</td>
                  <td className="p-3.5 text-slate-500 max-w-xs truncate">{cat.description || '—'}</td>
                  <td className="p-3.5 font-medium text-slate-700">
                    {cat.depreciationYears ? `${cat.depreciationYears} Years` : 'Standard'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading asset records...</div>
          ) : filteredAssets.length === 0 ? (
            <div className="p-12 text-center">
              <Laptop className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800">No assets found</h3>
              <p className="text-xs text-slate-500 mt-1">Register devices and equipment into the company master.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Asset Code</th>
                  <th className="p-3.5">Asset Name & Model</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Serial Number</th>
                  <th className="p-3.5">Condition</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Assigned To</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-semibold text-slate-900 font-mono">{asset.assetCode}</td>
                    <td className="p-3.5">
                      <div className="font-medium text-slate-900">{asset.name}</div>
                      <div className="text-2xs text-slate-400">
                        {asset.manufacturer} {asset.modelNumber ? `• ${asset.modelNumber}` : ''}
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-600">{asset.categoryName}</td>
                    <td className="p-3.5 text-slate-500 font-mono text-2xs">{asset.serialNumber || '—'}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-slate-100 text-slate-700">
                        {asset.condition}
                      </span>
                    </td>
                    <td className="p-3.5">{getStatusBadge(asset.status)}</td>
                    <td className="p-3.5">
                      {asset.currentEmployeeName ? (
                        <div>
                          <div className="font-medium text-slate-900">{asset.currentEmployeeName}</div>
                          <div className="text-2xs text-slate-400">Since {asset.assignedDate}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => handleViewHistory(asset)}
                        className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium cursor-pointer"
                      >
                        History
                      </button>
                      {canManage && asset.status === AssetStatus.AVAILABLE && (
                        <button
                          onClick={() => setAssignModalAsset(asset)}
                          className="px-2.5 py-1 rounded bg-[#2F75B5] text-white hover:bg-[#1f5588] font-medium cursor-pointer"
                        >
                          Issue / Assign
                        </button>
                      )}
                      {canManage && asset.status === AssetStatus.ASSIGNED && (
                        <button
                          onClick={() => setReturnModalAsset(asset)}
                          className="px-2.5 py-1 rounded bg-amber-600 text-white hover:bg-amber-700 font-medium cursor-pointer"
                        >
                          Return Custody
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Assign Modal */}
      {assignModalAsset && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Assign Asset to Employee</h3>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs">
              <span className="font-bold text-blue-900">{assignModalAsset.assetCode}</span>: {assignModalAsset.name}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Employee ID *</label>
                <input
                  type="text"
                  placeholder="e.g. emp-101"
                  value={assignEmployeeId}
                  onChange={(e) => setAssignEmployeeId(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Condition at Handover</label>
                <select
                  value={assignCondition}
                  onChange={(e) => setAssignCondition(e.target.value as AssetCondition)}
                  className="w-full border border-slate-300 rounded p-2 text-xs"
                >
                  <option value={AssetCondition.NEW}>Brand New</option>
                  <option value={AssetCondition.EXCELLENT}>Excellent</option>
                  <option value={AssetCondition.GOOD}>Good</option>
                  <option value={AssetCondition.FAIR}>Fair</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Handover Notes / Checklist</label>
                <textarea
                  rows={2}
                  placeholder="Include charger, case, adapter..."
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setAssignModalAsset(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                className="px-4 py-2 bg-[#2F75B5] text-white rounded-lg text-xs font-medium hover:bg-[#1f5588]"
              >
                Confirm Handover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {returnModalAsset && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Return Asset Custody</h3>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <div>
                Asset: <span className="font-bold">{returnModalAsset.assetCode}</span> ({returnModalAsset.name})
              </div>
              <div className="text-slate-500 mt-1">Returned by: {returnModalAsset.currentEmployeeName}</div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Physical Condition on Return *</label>
                <select
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value as AssetCondition)}
                  className="w-full border border-slate-300 rounded p-2 text-xs font-semibold"
                >
                  <option value={AssetCondition.EXCELLENT}>Excellent</option>
                  <option value={AssetCondition.GOOD}>Good (Normal wear & tear)</option>
                  <option value={AssetCondition.FAIR}>Fair</option>
                  <option value={AssetCondition.DAMAGED}>Damaged (Requires repair)</option>
                  <option value={AssetCondition.UNUSABLE}>Unusable / Scrapped</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Inspection Notes / Remarks</label>
                <textarea
                  rows={3}
                  placeholder="State device health, scratches, or missing accessories..."
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setReturnModalAsset(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleReturn}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700"
              >
                Receive & Stock Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModalAsset && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                Custody History: {historyModalAsset.assetCode}
              </h3>
              <button onClick={() => setHistoryModalAsset(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {assetHistory.length === 0 ? (
                <div className="text-xs text-slate-500 py-4 text-center">No assignment logs recorded.</div>
              ) : (
                assetHistory.map((hist) => (
                  <div key={hist.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between font-semibold text-slate-800">
                      <span>{hist.action}</span>
                      <span className="text-slate-400 text-2xs">{new Date(hist.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="text-slate-600">
                      Actor: <span className="font-medium text-slate-900">{hist.actorName}</span>
                    </div>
                    {hist.details && <div className="text-slate-600">{hist.details}</div>}
                    {hist.condition && (
                      <div className="text-2xs text-slate-500">
                        Condition: <span className="font-semibold">{hist.condition}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Register Asset Modal */}
      {isCreateAssetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Register Asset into Master</h3>
              <button onClick={() => setIsCreateAssetModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Asset Code *</label>
                <input
                  type="text"
                  placeholder="e.g. AST-LAP-2026-009"
                  value={newAssetCode}
                  onChange={(e) => setNewAssetCode(e.target.value.toUpperCase())}
                  className="w-full border border-slate-300 rounded p-2 font-mono uppercase"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Asset Name / Title *</label>
                <input
                  type="text"
                  placeholder="e.g. MacBook Pro 16 M3 Max"
                  value={newAssetName}
                  onChange={(e) => setNewAssetName(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Category *</label>
                <select
                  value={newAssetCategoryId}
                  onChange={(e) => setNewAssetCategoryId(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 bg-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Serial Number</label>
                <input
                  type="text"
                  placeholder="e.g. C02G9012MD6R"
                  value={newAssetSerial}
                  onChange={(e) => setNewAssetSerial(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Manufacturer / Brand</label>
                <input
                  type="text"
                  placeholder="e.g. Apple, Dell, Lenovo"
                  value={newAssetManufacturer}
                  onChange={(e) => setNewAssetManufacturer(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Model Specification</label>
                <input
                  type="text"
                  placeholder="e.g. A2991 36GB / 1TB SSD"
                  value={newAssetModel}
                  onChange={(e) => setNewAssetModel(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Purchase Cost ($)</label>
                <input
                  type="number"
                  placeholder="3499.00"
                  value={newAssetCost}
                  onChange={(e) => setNewAssetCost(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Purchase Date</label>
                <input
                  type="date"
                  value={newAssetPurchaseDate}
                  onChange={(e) => setNewAssetPurchaseDate(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Warranty Expiry</label>
                <input
                  type="date"
                  value={newAssetWarranty}
                  onChange={(e) => setNewAssetWarranty(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Location / Office</label>
                <input
                  type="text"
                  value={newAssetLocation}
                  onChange={(e) => setNewAssetLocation(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsCreateAssetModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAsset}
                className="px-4 py-2 bg-[#2F75B5] text-white rounded-lg text-xs font-medium hover:bg-[#1f5588]"
              >
                Save to Inventory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add Asset Category</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Code (Uppercase) *</label>
                <input
                  type="text"
                  placeholder="e.g. LAPTOP, MONITOR"
                  value={newCatCode}
                  onChange={(e) => setNewCatCode(e.target.value.toUpperCase())}
                  className="w-full border border-slate-300 rounded p-2 font-mono uppercase"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Laptops & MacBooks"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Policy rules..."
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Depreciation Lifespan (Years)</label>
                <input
                  type="number"
                  placeholder="3"
                  value={newCatDepreciationYears}
                  onChange={(e) => setNewCatDepreciationYears(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCategory}
                className="px-4 py-2 bg-[#2F75B5] text-white rounded-lg text-xs font-medium hover:bg-[#1f5588]"
              >
                Save Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
