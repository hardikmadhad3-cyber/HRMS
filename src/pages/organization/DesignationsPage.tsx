import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/shell/PageHeader.js';
import { apiClient } from '../../services/apiClient.js';
import { Designation } from '../../types/organization.js';
import { useAuth } from '../../context/AuthContext.js';
import { useNotification } from '../../context/NotificationContext.js';
import { PermissionKey, UserRole } from '../../types/auth.js';
import { LoadingSkeleton, ErrorBanner } from '../../components/common/LoadingSkeleton.js';
import { Award, Plus, Search, Edit2, X, CheckCircle2, XCircle } from 'lucide-react';

export function DesignationsPage() {
  const { activeCompanyId, hasPermission, hasRole } = useAuth();
  const canManage = hasPermission(PermissionKey.ORGANIZATION_MANAGE) || hasRole(UserRole.SUPER_ADMIN);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [selectedDesig, setSelectedDesig] = useState<Designation | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { showToast } = useNotification();

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    gradeLevel: 'L1',
    description: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const fetchDesignations = async () => {
    setLoading(true);
    setError(null);
    const query = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
    const res = await apiClient.get<Designation[]>(`/api/v1/organization/designations${query}`, activeCompanyId);
    if (res.success && res.data) {
      setDesignations(res.data);
    } else {
      setError(res.error || 'Failed to load designations.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDesignations();
  }, [activeCompanyId, statusFilter]);

  const openCreateDrawer = () => {
    setSelectedDesig(null);
    setFormData({
      code: '',
      name: '',
      gradeLevel: 'L1',
      description: '',
      status: 'ACTIVE',
    });
    setFormError(null);
    setShowDrawer(true);
  };

  const openEditDrawer = (desig: Designation) => {
    setSelectedDesig(desig);
    setFormData({
      code: desig.code,
      name: desig.name,
      gradeLevel: desig.gradeLevel || 'L1',
      description: desig.description || '',
      status: desig.status,
    });
    setFormError(null);
    setShowDrawer(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      setFormError('Please fill in required fields (Code, Name).');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    if (selectedDesig) {
      const res = await apiClient.put<Designation>(
        `/api/v1/organization/designations/${selectedDesig.id}`,
        formData,
        activeCompanyId
      );
      if (res.success && res.data) {
        showToast('success', 'Designation Updated', `Designation [${res.data.code}] updated successfully.`);
        setShowDrawer(false);
        fetchDesignations();
      } else {
        setFormError(res.error || 'Failed to update designation.');
      }
    } else {
      const res = await apiClient.post<Designation>(
        '/api/v1/organization/designations',
        formData,
        activeCompanyId
      );
      if (res.success && res.data) {
        showToast('success', 'Designation Created', `New designation [${res.data.code}] created successfully.`);
        setShowDrawer(false);
        fetchDesignations();
      } else {
        setFormError(res.error || 'Failed to create designation.');
      }
    }
    setSubmitting(false);
  };

  const handleToggleStatus = async (desig: Designation) => {
    if (!canManage) return;
    const targetStatus = desig.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const res = await apiClient.patch<Designation>(
      `/api/v1/organization/designations/${desig.id}/status`,
      { status: targetStatus },
      activeCompanyId
    );
    if (res.success && res.data) {
      showToast('success', 'Status Updated', `Designation [${desig.code}] is now ${targetStatus}.`);
      fetchDesignations();
    } else {
      showToast('error', 'Action Restricted', res.error || 'Failed to toggle status.');
    }
  };

  const filtered = designations.filter((d) =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.gradeLevel && d.gradeLevel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div id="designations-master-page">
      <PageHeader
        title="Designations & Job Titles"
        subtitle="Job positions, career architecture, and grade hierarchy"
        breadcrumbs={[
          { label: 'HRMS Portal', path: '/dashboard' },
          { label: 'Organization' },
          { label: 'Designations' },
        ]}
        primaryAction={
          canManage
            ? {
                label: 'Add Designation',
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
                placeholder="Search code, title, or grade..."
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
            Total Designations: <strong className="text-slate-800">{filtered.length}</strong>
          </span>
        </div>

        {loading ? (
          <LoadingSkeleton rows={3} />
        ) : error ? (
          <ErrorBanner message={error} onRetry={fetchDesignations} />
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
            <Award className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No Designations Found</h3>
            <p className="text-xs text-slate-500 mt-1">No designations created for this entity or matching your filter.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                  <th className="py-2.5 px-4">Code</th>
                  <th className="py-2.5 px-4">Designation Title</th>
                  <th className="py-2.5 px-4">Grade / Level</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4">Active Staff</th>
                  <th className="py-2.5 px-4">Status</th>
                  {canManage && <th className="py-2.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((desig) => (
                  <tr key={desig.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#17365D]">{desig.code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{desig.name}</td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                        {desig.gradeLevel || 'L1'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                      {desig.description || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-semibold">
                      {desig.employeeCount || 0} Staff
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStatus(desig)}
                        disabled={!canManage}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition-opacity ${
                          desig.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 hover:opacity-80'
                            : 'bg-slate-100 text-slate-600 hover:opacity-80'
                        } ${!canManage ? 'cursor-default' : 'cursor-pointer'}`}
                        title={canManage ? 'Click to toggle status' : 'Status'}
                      >
                        {desig.status === 'ACTIVE' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {desig.status}
                      </button>
                    </td>
                    {canManage && (
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEditDrawer(desig)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-[#2F75B5]"
                          title="Edit Designation"
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

      {/* Designation Drawer Form */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowDrawer(false)} />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-[#17365D] text-sm">
                {selectedDesig ? `Edit Designation [${selectedDesig.code}]` : 'Create New Designation'}
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
                  <label className="block font-semibold text-slate-700 mb-1">Designation Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none uppercase font-mono"
                    placeholder="SWE-SR"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                    placeholder="Senior Software Engineer"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Grade / Level</label>
                  <input
                    type="text"
                    value={formData.gradeLevel}
                    onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none uppercase font-mono"
                    placeholder="L5 / M2 / Exec"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Job Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                    placeholder="Key responsibilities and technical expectations..."
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
                  {submitting ? 'Saving...' : selectedDesig ? 'Update Designation' : 'Save Designation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
