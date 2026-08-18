import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/shell/PageHeader.js';
import { apiClient } from '../../services/apiClient.js';
import { Holiday, WorkLocation } from '../../types/organization.js';
import { useAuth } from '../../context/AuthContext.js';
import { useNotification } from '../../context/NotificationContext.js';
import { PermissionKey, UserRole } from '../../types/auth.js';
import { LoadingSkeleton, ErrorBanner } from '../../components/common/LoadingSkeleton.js';
import { Calendar, Plus, Search, Edit2, Trash2, X, MapPin, CheckCircle2, XCircle } from 'lucide-react';

export function HolidaysPage() {
  const { activeCompanyId, hasPermission, hasRole } = useAuth();
  const canManage = hasPermission(PermissionKey.ORGANIZATION_MANAGE) || hasRole(UserRole.SUPER_ADMIN);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [locations, setLocations] = useState<WorkLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<Holiday | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { showToast } = useNotification();

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    date: '2026-01-01',
    type: 'PUBLIC' as 'PUBLIC' | 'OPTIONAL' | 'RESTRICTED' | 'COMPANY',
    workLocationId: '',
    description: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const queryParams = new URLSearchParams();
    if (selectedYear) queryParams.append('year', selectedYear.toString());
    if (locationFilter !== 'ALL') queryParams.append('workLocationId', locationFilter);
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

    const [holRes, locRes] = await Promise.all([
      apiClient.get<Holiday[]>(`/api/v1/organization/holidays${queryString}`, activeCompanyId),
      apiClient.get<WorkLocation[]>('/api/v1/organization/work-locations', activeCompanyId),
    ]);

    if (holRes.success && holRes.data) {
      setHolidays(holRes.data);
    } else {
      setError(holRes.error || 'Failed to load holiday calendar.');
    }

    if (locRes.success && locRes.data) {
      setLocations(locRes.data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [activeCompanyId, selectedYear, locationFilter]);

  const openCreateDrawer = () => {
    setSelectedHoliday(null);
    setFormData({
      name: '',
      date: `${selectedYear}-01-01`,
      type: 'PUBLIC',
      workLocationId: '',
      description: '',
      status: 'ACTIVE',
    });
    setFormError(null);
    setShowDrawer(true);
  };

  const openEditDrawer = (hol: Holiday) => {
    setSelectedHoliday(hol);
    setFormData({
      name: hol.name,
      date: hol.date,
      type: hol.type,
      workLocationId: hol.workLocationId || '',
      description: hol.description || '',
      status: hol.status,
    });
    setFormError(null);
    setShowDrawer(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.date.trim() || !formData.type) {
      setFormError('Please fill in required fields (Holiday Name, Date, Category).');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const payload = {
      ...formData,
      workLocationId: formData.workLocationId || undefined,
    };

    if (selectedHoliday) {
      const res = await apiClient.put<Holiday>(
        `/api/v1/organization/holidays/${selectedHoliday.id}`,
        payload,
        activeCompanyId
      );
      if (res.success && res.data) {
        showToast('success', 'Holiday Updated', `Holiday '${res.data.name}' updated.`);
        setShowDrawer(false);
        fetchData();
      } else {
        setFormError(res.error || 'Failed to update holiday.');
      }
    } else {
      const res = await apiClient.post<Holiday>(
        '/api/v1/organization/holidays',
        payload,
        activeCompanyId
      );
      if (res.success && res.data) {
        showToast('success', 'Holiday Created', `Added holiday '${res.data.name}' on ${res.data.date}.`);
        setShowDrawer(false);
        fetchData();
      } else {
        setFormError(res.error || 'Failed to create holiday.');
      }
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!showDeleteModal || !canManage) return;
    setSubmitting(true);
    const res = await apiClient.delete(
      `/api/v1/organization/holidays/${showDeleteModal.id}`,
      activeCompanyId
    );
    if (res.success) {
      showToast('success', 'Holiday Removed', `Holiday '${showDeleteModal.name}' deleted.`);
      setShowDeleteModal(null);
      fetchData();
    } else {
      showToast('error', 'Action Restricted', res.error || 'Failed to delete holiday.');
    }
    setSubmitting(false);
  };

  const filtered = holidays.filter((h) =>
    h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (h.description && h.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div id="holiday-calendar-page">
      <PageHeader
        title="Annual Holiday Calendar"
        subtitle="Official statutory, public, and enterprise optional holidays"
        breadcrumbs={[
          { label: 'HRMS Portal', path: '/dashboard' },
          { label: 'Organization' },
          { label: 'Holiday Calendar' },
        ]}
        primaryAction={
          canManage
            ? {
                label: 'Add Holiday',
                icon: <Plus className="w-3.5 h-3.5" />,
                onClick: openCreateDrawer,
              }
            : undefined
        }
      />

      <div className="p-6 max-w-7xl mx-auto space-y-4">
        {/* Filter Toolbar */}
        <div className="bg-white p-3.5 border border-slate-200 rounded-lg shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative max-w-xs w-full">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search holiday name or category..."
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2F75B5]"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200 text-xs">
              {[2025, 2026, 2027].map((yr) => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                    selectedYear === yr
                      ? 'bg-white text-[#17365D] shadow-xs'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>

            {locations.length > 0 && (
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2F75B5]"
              >
                <option value="ALL">All Work Locations</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <span className="text-xs text-slate-500 font-medium">
            Total Holidays in {selectedYear}: <strong className="text-slate-800">{filtered.length}</strong>
          </span>
        </div>

        {loading ? (
          <LoadingSkeleton rows={3} />
        ) : error ? (
          <ErrorBanner message={error} onRetry={fetchData} />
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No Holidays Scheduled</h3>
            <p className="text-xs text-slate-500 mt-1">No holidays configured for year {selectedYear} or matching your criteria.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Holiday Name</th>
                  <th className="py-2.5 px-4">Category / Type</th>
                  <th className="py-2.5 px-4">Applicable Location</th>
                  <th className="py-2.5 px-4">Description</th>
                  {canManage && <th className="py-2.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((hol) => (
                  <tr key={hol.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#17365D]">
                      {hol.date}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {hol.name}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                          hol.type === 'PUBLIC'
                            ? 'bg-blue-50 text-[#2F75B5] border-blue-200'
                            : hol.type === 'COMPANY'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : hol.type === 'OPTIONAL'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {hol.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {hol.workLocationName ? (
                        <span className="flex items-center gap-1 text-[11px] text-slate-700">
                          <MapPin className="w-3 h-3 text-[#2F75B5]" />
                          {hol.workLocationName}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">All Locations (Company-Wide)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                      {hol.description || '—'}
                    </td>
                    {canManage && (
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEditDrawer(hol)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-[#2F75B5]"
                            title="Edit Holiday"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setShowDeleteModal(hol)}
                            className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                            title="Delete Holiday"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Holiday Drawer Form */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowDrawer(false)} />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-[#17365D] text-sm">
                {selectedHoliday ? `Edit Holiday '${selectedHoliday.name}'` : 'Add Holiday to Calendar'}
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
                  <label className="block font-semibold text-slate-700 mb-1">Holiday Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                    placeholder="e.g. Independence Day"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Category / Type *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                    >
                      <option value="PUBLIC">PUBLIC (Statutory)</option>
                      <option value="COMPANY">COMPANY (Annual/Special)</option>
                      <option value="OPTIONAL">OPTIONAL (Floating)</option>
                      <option value="RESTRICTED">RESTRICTED</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Applicable Work Location</label>
                  <select
                    value={formData.workLocationId}
                    onChange={(e) => setFormData({ ...formData, workLocationId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                  >
                    <option value="">— All Locations (Company-Wide Holiday) —</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Description / Notes</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                    placeholder="Official public declaration or observance guidelines..."
                  />
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
                  {submitting ? 'Saving...' : selectedHoliday ? 'Update Holiday' : 'Save Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-lg max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Confirm Holiday Deletion</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to remove <strong className="text-slate-800">'{showDeleteModal.name}'</strong> scheduled on <strong className="text-slate-800">{showDeleteModal.date}</strong> from the annual calendar?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(null)}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDelete}
                className="px-3 py-1.5 bg-rose-600 text-white rounded text-xs font-semibold hover:bg-rose-700 disabled:opacity-50"
              >
                {submitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
