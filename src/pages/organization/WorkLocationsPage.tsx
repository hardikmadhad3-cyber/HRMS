import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/shell/PageHeader.js';
import { apiClient } from '../../services/apiClient.js';
import { WorkLocation, Branch } from '../../types/organization.js';
import { useAuth } from '../../context/AuthContext.js';
import { useNotification } from '../../context/NotificationContext.js';
import { PermissionKey, UserRole } from '../../types/auth.js';
import { LoadingSkeleton, ErrorBanner } from '../../components/common/LoadingSkeleton.js';
import { MapPin, Plus, Search, Edit2, X, CheckCircle2, XCircle, Building2 } from 'lucide-react';

export function WorkLocationsPage() {
  const { activeCompanyId, hasPermission, hasRole } = useAuth();
  const canManage = hasPermission(PermissionKey.ORGANIZATION_MANAGE) || hasRole(UserRole.SUPER_ADMIN);
  const [locations, setLocations] = useState<WorkLocation[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [selectedLoc, setSelectedLoc] = useState<WorkLocation | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { showToast } = useNotification();

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    branchId: '',
    address: '',
    city: '',
    state: '',
    country: 'USA',
    postalCode: '',
    timezone: 'America/New_York',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const queryParams = new URLSearchParams();
    if (statusFilter !== 'ALL') queryParams.append('status', statusFilter);
    if (branchFilter !== 'ALL') queryParams.append('branchId', branchFilter);
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

    const [locRes, branchRes] = await Promise.all([
      apiClient.get<WorkLocation[]>(`/api/v1/organization/work-locations${queryString}`, activeCompanyId),
      apiClient.get<Branch[]>('/api/v1/organization/branches', activeCompanyId),
    ]);

    if (locRes.success && locRes.data) {
      setLocations(locRes.data);
    } else {
      setError(locRes.error || 'Failed to load work locations.');
    }

    if (branchRes.success && branchRes.data) {
      setBranches(branchRes.data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [activeCompanyId, statusFilter, branchFilter]);

  const openCreateDrawer = () => {
    setSelectedLoc(null);
    setFormData({
      code: '',
      name: '',
      branchId: branches[0]?.id || '',
      address: '',
      city: '',
      state: '',
      country: 'USA',
      postalCode: '',
      timezone: 'America/New_York',
      status: 'ACTIVE',
    });
    setFormError(null);
    setShowDrawer(true);
  };

  const openEditDrawer = (loc: WorkLocation) => {
    setSelectedLoc(loc);
    setFormData({
      code: loc.code,
      name: loc.name,
      branchId: loc.branchId || '',
      address: loc.address,
      city: loc.city,
      state: loc.state || '',
      country: loc.country,
      postalCode: loc.postalCode || '',
      timezone: loc.timezone || 'America/New_York',
      status: loc.status,
    });
    setFormError(null);
    setShowDrawer(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim() || !formData.address.trim() || !formData.city.trim() || !formData.country.trim()) {
      setFormError('Please fill in required fields (Code, Name, Address, City, Country).');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const payload = {
      ...formData,
      branchId: formData.branchId || undefined,
    };

    if (selectedLoc) {
      const res = await apiClient.put<WorkLocation>(
        `/api/v1/organization/work-locations/${selectedLoc.id}`,
        payload,
        activeCompanyId
      );
      if (res.success && res.data) {
        showToast('success', 'Location Updated', `Work location [${res.data.code}] updated successfully.`);
        setShowDrawer(false);
        fetchData();
      } else {
        setFormError(res.error || 'Failed to update work location.');
      }
    } else {
      const res = await apiClient.post<WorkLocation>(
        '/api/v1/organization/work-locations',
        payload,
        activeCompanyId
      );
      if (res.success && res.data) {
        showToast('success', 'Location Created', `New work location [${res.data.code}] created successfully.`);
        setShowDrawer(false);
        fetchData();
      } else {
        setFormError(res.error || 'Failed to create work location.');
      }
    }
    setSubmitting(false);
  };

  const handleToggleStatus = async (loc: WorkLocation) => {
    if (!canManage) return;
    const targetStatus = loc.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const res = await apiClient.patch<WorkLocation>(
      `/api/v1/organization/work-locations/${loc.id}/status`,
      { status: targetStatus },
      activeCompanyId
    );
    if (res.success && res.data) {
      showToast('success', 'Status Updated', `Location [${loc.code}] is now ${targetStatus}.`);
      fetchData();
    } else {
      showToast('error', 'Action Restricted', res.error || 'Failed to toggle location status.');
    }
  };

  const filtered = locations.filter((loc) =>
    loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (loc.branchName && loc.branchName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div id="work-locations-master-page">
      <PageHeader
        title="Worksite Locations"
        subtitle="Physical campuses, buildings, and remote work clusters"
        breadcrumbs={[
          { label: 'HRMS Portal', path: '/dashboard' },
          { label: 'Organization' },
          { label: 'Work Locations' },
        ]}
        primaryAction={
          canManage
            ? {
                label: 'Add Location',
                icon: <Plus className="w-3.5 h-3.5" />,
                onClick: openCreateDrawer,
              }
            : undefined
        }
      />

      <div className="p-6 max-w-7xl mx-auto space-y-4">
        {/* Search & Filter Toolbar */}
        <div className="bg-white p-3.5 border border-slate-200 rounded-lg shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative max-w-xs w-full">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search code, location, city..."
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
            {branches.length > 0 && (
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2F75B5]"
              >
                <option value="ALL">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Total Locations: <strong className="text-slate-800">{filtered.length}</strong>
          </span>
        </div>

        {loading ? (
          <LoadingSkeleton rows={3} />
        ) : error ? (
          <ErrorBanner message={error} onRetry={fetchData} />
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
            <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No Work Locations Found</h3>
            <p className="text-xs text-slate-500 mt-1">No worksite locations configured or matching your filter.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                  <th className="py-2.5 px-4">Location Code</th>
                  <th className="py-2.5 px-4">Location Name</th>
                  <th className="py-2.5 px-4">Operating Branch</th>
                  <th className="py-2.5 px-4">Address / Coordinates</th>
                  <th className="py-2.5 px-4">City / Region</th>
                  <th className="py-2.5 px-4">Status</th>
                  {canManage && <th className="py-2.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((loc) => (
                  <tr key={loc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#17365D]">{loc.code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{loc.name}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {loc.branchName ? (
                        <span className="flex items-center gap-1 text-[11px] text-[#2F75B5]">
                          <Building2 className="w-3 h-3" />
                          {loc.branchName}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">— Unlinked —</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        {loc.address}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {loc.city}, {loc.state ? `${loc.state}, ` : ''}{loc.country}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStatus(loc)}
                        disabled={!canManage}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition-opacity ${
                          loc.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 hover:opacity-80'
                            : 'bg-slate-100 text-slate-600 hover:opacity-80'
                        } ${!canManage ? 'cursor-default' : 'cursor-pointer'}`}
                        title={canManage ? 'Click to toggle status' : 'Status'}
                      >
                        {loc.status === 'ACTIVE' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {loc.status}
                      </button>
                    </td>
                    {canManage && (
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEditDrawer(loc)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-[#2F75B5]"
                          title="Edit Location"
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

      {/* Location Drawer Form */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowDrawer(false)} />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-[#17365D] text-sm">
                {selectedLoc ? `Edit Location [${selectedLoc.code}]` : 'Create New Work Location'}
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

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Work Location Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none uppercase font-mono"
                    placeholder="NYC-TECH-TOWER"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Location Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                    placeholder="NYC Tech Plaza Tower"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Associated Branch</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                  >
                    <option value="">— Unlinked / Standalone Facility —</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
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
                    <label className="block font-semibold text-slate-700 mb-1">City *</label>
                    <input
                      type="text"
                      required
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
                    <label className="block font-semibold text-slate-700 mb-1">Country *</label>
                    <input
                      type="text"
                      required
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                      placeholder="USA"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
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
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Timezone</label>
                    <input
                      type="text"
                      value={formData.timezone}
                      onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                      placeholder="America/New_York"
                    />
                  </div>
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
                  {submitting ? 'Saving...' : selectedLoc ? 'Update Location' : 'Save Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
