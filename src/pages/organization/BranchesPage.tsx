import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/shell/PageHeader.js';
import { apiClient } from '../../services/apiClient.js';
import { Branch } from '../../types/organization.js';
import { useAuth } from '../../context/AuthContext.js';
import { useNotification } from '../../context/NotificationContext.js';
import { PermissionKey, UserRole } from '../../types/auth.js';
import { LoadingSkeleton, ErrorBanner } from '../../components/common/LoadingSkeleton.js';
import { Building, Plus, Search, MapPin, Edit2, X, CheckCircle2, XCircle } from 'lucide-react';

export function BranchesPage() {
  const { activeCompanyId, hasPermission, hasRole } = useAuth();
  const canManage = hasPermission(PermissionKey.ORGANIZATION_MANAGE) || hasRole(UserRole.SUPER_ADMIN);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { showToast } = useNotification();

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    timezoneOverride: '',
    address: '',
    city: '',
    state: '',
    country: 'USA',
    postalCode: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const fetchBranches = async () => {
    setLoading(true);
    setError(null);
    const query = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
    const res = await apiClient.get<Branch[]>(`/api/v1/organization/branches${query}`, activeCompanyId);
    if (res.success && res.data) {
      setBranches(res.data);
    } else {
      setError(res.error || 'Failed to load branches.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBranches();
  }, [activeCompanyId, statusFilter]);

  const openCreateDrawer = () => {
    setSelectedBranch(null);
    setFormData({
      code: '',
      name: '',
      timezoneOverride: '',
      address: '',
      city: '',
      state: '',
      country: 'USA',
      postalCode: '',
      contactPerson: '',
      contactEmail: '',
      contactPhone: '',
      status: 'ACTIVE',
    });
    setFormError(null);
    setShowDrawer(true);
  };

  const openEditDrawer = (b: Branch) => {
    setSelectedBranch(b);
    setFormData({
      code: b.code,
      name: b.name,
      timezoneOverride: b.timezoneOverride || '',
      address: b.address,
      city: b.city || '',
      state: b.state || '',
      country: b.country || 'USA',
      postalCode: b.postalCode || '',
      contactPerson: b.contactPerson || '',
      contactEmail: b.contactEmail || '',
      contactPhone: b.contactPhone || '',
      status: b.status,
    });
    setFormError(null);
    setShowDrawer(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim() || !formData.address.trim()) {
      setFormError('Please fill in required fields (Code, Name, Address).');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    if (selectedBranch) {
      const res = await apiClient.put<Branch>(
        `/api/v1/organization/branches/${selectedBranch.id}`,
        formData,
        activeCompanyId
      );
      if (res.success && res.data) {
        showToast('success', 'Branch Updated', `Branch [${res.data.code}] updated successfully.`);
        setShowDrawer(false);
        fetchBranches();
      } else {
        setFormError(res.error || 'Failed to update branch.');
      }
    } else {
      const res = await apiClient.post<Branch>(
        '/api/v1/organization/branches',
        formData,
        activeCompanyId
      );
      if (res.success && res.data) {
        showToast('success', 'Branch Created', `New branch [${res.data.code}] created successfully.`);
        setShowDrawer(false);
        fetchBranches();
      } else {
        setFormError(res.error || 'Failed to create branch.');
      }
    }
    setSubmitting(false);
  };

  const handleToggleStatus = async (branch: Branch) => {
    if (!canManage) return;
    const targetStatus = branch.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const res = await apiClient.patch<Branch>(
      `/api/v1/organization/branches/${branch.id}/status`,
      { status: targetStatus },
      activeCompanyId
    );
    if (res.success && res.data) {
      showToast('success', 'Status Updated', `Branch [${branch.code}] is now ${targetStatus}.`);
      fetchBranches();
    } else {
      showToast('error', 'Action Restricted', res.error || 'Failed to toggle branch status.');
    }
  };

  const filtered = branches.filter((b) =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.city && b.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div id="branches-master-page">
      <PageHeader
        title="Branches & Operating Locations"
        subtitle="Manage operating branches for the active enterprise entity"
        breadcrumbs={[
          { label: 'HRMS Portal', path: '/dashboard' },
          { label: 'Organization' },
          { label: 'Branches' },
        ]}
        primaryAction={
          canManage
            ? {
                label: 'Add Branch',
                icon: <Plus className="w-3.5 h-3.5" />,
                onClick: openCreateDrawer,
              }
            : undefined
        }
      />

      <div className="p-6 max-w-7xl mx-auto space-y-4">
        {/* Search & Filter Toolbar */}
        <div className="bg-white p-3.5 border border-slate-200 rounded-lg shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative max-w-xs w-full">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search code, branch, or city..."
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2F75B5]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
              className="text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2F75B5]"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Total Branches: <strong className="text-slate-800">{filtered.length}</strong>
          </span>
        </div>

        {loading ? (
          <LoadingSkeleton rows={3} />
        ) : error ? (
          <ErrorBanner message={error} onRetry={fetchBranches} />
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
            <Building className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No Branches Found</h3>
            <p className="text-xs text-slate-500 mt-1">No branches registered for this entity or matching your filter.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                  <th className="py-2.5 px-4">Code</th>
                  <th className="py-2.5 px-4">Branch Name</th>
                  <th className="py-2.5 px-4">Location & Address</th>
                  <th className="py-2.5 px-4">Contact Info</th>
                  <th className="py-2.5 px-4">Status</th>
                  {canManage && <th className="py-2.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((branch) => (
                  <tr key={branch.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#17365D]">{branch.code}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{branch.name}</p>
                      {branch.timezoneOverride && (
                        <p className="text-[11px] text-slate-400">{branch.timezoneOverride}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        {branch.address}
                        {branch.city ? `, ${branch.city}` : ''}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-[11px]">
                      <p className="font-medium text-slate-700">{branch.contactPerson || '—'}</p>
                      {branch.contactEmail && <p className="text-slate-500">{branch.contactEmail}</p>}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStatus(branch)}
                        disabled={!canManage}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition-opacity ${
                          branch.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 hover:opacity-80'
                            : 'bg-slate-100 text-slate-600 hover:opacity-80'
                        } ${!canManage ? 'cursor-default' : 'cursor-pointer'}`}
                        title={canManage ? 'Click to toggle status' : 'Status'}
                      >
                        {branch.status === 'ACTIVE' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {branch.status}
                      </button>
                    </td>
                    {canManage && (
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEditDrawer(branch)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-[#2F75B5]"
                          title="Edit Branch"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Branch Drawer Form */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowDrawer(false)} />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-[#17365D] text-sm">
                {selectedBranch ? `Edit Branch [${selectedBranch.code}]` : 'Create New Branch'}
              </h3>
              <button onClick={() => setShowDrawer(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 flex flex-col justify-between overflow-hidden">
              <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
                {formError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Branch Code *</label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none uppercase font-mono"
                      placeholder="NY-HQ"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Timezone Override</label>
                    <input
                      type="text"
                      value={formData.timezoneOverride}
                      onChange={(e) => setFormData({ ...formData, timezoneOverride: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                      placeholder="America/New_York"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Branch Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                    placeholder="New York Headquarters"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Address *</label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                    placeholder="100 Tech Plaza, Suite 400"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                      placeholder="New York"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">State / Province</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                      placeholder="NY"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Postal Code</label>
                    <input
                      type="text"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                      placeholder="10001"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                      placeholder="David Miller"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                      placeholder="dmiller@acme-corp.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                    placeholder="+1 (555) 019-2831"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDrawer(false)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 bg-[#2F75B5] text-white rounded text-xs font-semibold hover:bg-[#17365D] disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : selectedBranch ? 'Update Branch' : 'Save Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
