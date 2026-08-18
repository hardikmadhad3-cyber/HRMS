import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/shell/PageHeader.js';
import { apiClient } from '../../services/apiClient.js';
import { Department } from '../../types/organization.js';
import { useAuth } from '../../context/AuthContext.js';
import { useNotification } from '../../context/NotificationContext.js';
import { PermissionKey, UserRole } from '../../types/auth.js';
import { LoadingSkeleton, ErrorBanner } from '../../components/common/LoadingSkeleton.js';
import { Users, Plus, Search, Edit2, X, CheckCircle2, XCircle, GitBranch } from 'lucide-react';

export function DepartmentsPage() {
  const { activeCompanyId, hasPermission, hasRole } = useAuth();
  const canManage = hasPermission(PermissionKey.ORGANIZATION_MANAGE) || hasRole(UserRole.SUPER_ADMIN);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { showToast } = useNotification();

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    parentDepartmentId: '',
    departmentHeadName: '',
    description: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const fetchDepartments = async () => {
    setLoading(true);
    setError(null);
    const query = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
    const res = await apiClient.get<Department[]>(`/api/v1/organization/departments${query}`, activeCompanyId);
    if (res.success && res.data) {
      setDepartments(res.data);
    } else {
      setError(res.error || 'Failed to load departments.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDepartments();
  }, [activeCompanyId, statusFilter]);

  const openCreateDrawer = () => {
    setSelectedDept(null);
    setFormData({
      code: '',
      name: '',
      parentDepartmentId: '',
      departmentHeadName: '',
      description: '',
      status: 'ACTIVE',
    });
    setFormError(null);
    setShowDrawer(true);
  };

  const openEditDrawer = (dept: Department) => {
    setSelectedDept(dept);
    setFormData({
      code: dept.code,
      name: dept.name,
      parentDepartmentId: dept.parentDepartmentId || '',
      departmentHeadName: dept.departmentHeadName || '',
      description: dept.description || '',
      status: dept.status,
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

    const payload = {
      ...formData,
      parentDepartmentId: formData.parentDepartmentId || undefined,
    };

    if (selectedDept) {
      const res = await apiClient.put<Department>(
        `/api/v1/organization/departments/${selectedDept.id}`,
        payload,
        activeCompanyId
      );
      if (res.success && res.data) {
        showToast('success', 'Department Updated', `Department [${res.data.code}] updated successfully.`);
        setShowDrawer(false);
        fetchDepartments();
      } else {
        setFormError(res.error || 'Failed to update department.');
      }
    } else {
      const res = await apiClient.post<Department>(
        '/api/v1/organization/departments',
        payload,
        activeCompanyId
      );
      if (res.success && res.data) {
        showToast('success', 'Department Created', `New department [${res.data.code}] created successfully.`);
        setShowDrawer(false);
        fetchDepartments();
      } else {
        setFormError(res.error || 'Failed to create department.');
      }
    }
    setSubmitting(false);
  };

  const handleToggleStatus = async (dept: Department) => {
    if (!canManage) return;
    const targetStatus = dept.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const res = await apiClient.patch<Department>(
      `/api/v1/organization/departments/${dept.id}/status`,
      { status: targetStatus },
      activeCompanyId
    );
    if (res.success && res.data) {
      showToast('success', 'Status Updated', `Department [${dept.code}] is now ${targetStatus}.`);
      fetchDepartments();
    } else {
      showToast('error', 'Action Restricted', res.error || 'Failed to toggle department status.');
    }
  };

  const filtered = departments.filter((d) =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.departmentHeadName && d.departmentHeadName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div id="departments-master-page">
      <PageHeader
        title="Departments Structure"
        subtitle="Organizational department classification and reporting hierarchy"
        breadcrumbs={[
          { label: 'HRMS Portal', path: '/dashboard' },
          { label: 'Organization' },
          { label: 'Departments' },
        ]}
        primaryAction={
          canManage
            ? {
                label: 'Add Department',
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
                placeholder="Search code, name, or head..."
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
            Total Departments: <strong className="text-slate-800">{filtered.length}</strong>
          </span>
        </div>

        {loading ? (
          <LoadingSkeleton rows={3} />
        ) : error ? (
          <ErrorBanner message={error} onRetry={fetchDepartments} />
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No Departments Found</h3>
            <p className="text-xs text-slate-500 mt-1">No departments configured for this entity or matching your filter.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                  <th className="py-2.5 px-4">Code</th>
                  <th className="py-2.5 px-4">Department Name</th>
                  <th className="py-2.5 px-4">Parent Dept / Description</th>
                  <th className="py-2.5 px-4">Department Head</th>
                  <th className="py-2.5 px-4">Assigned Strength</th>
                  <th className="py-2.5 px-4">Status</th>
                  {canManage && <th className="py-2.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((dept) => (
                  <tr key={dept.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#17365D]">{dept.code}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{dept.name}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {dept.parentDepartmentName ? (
                        <span className="flex items-center gap-1 text-[11px] text-[#2F75B5] font-medium">
                          <GitBranch className="w-3 h-3" />
                          {dept.parentDepartmentName}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">— Root Unit —</span>
                      )}
                      {dept.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{dept.description}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {dept.departmentHeadName || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-semibold">
                      {dept.employeeCount || 0} Members
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStatus(dept)}
                        disabled={!canManage}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition-opacity ${
                          dept.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 hover:opacity-80'
                            : 'bg-slate-100 text-slate-600 hover:opacity-80'
                        } ${!canManage ? 'cursor-default' : 'cursor-pointer'}`}
                        title={canManage ? 'Click to toggle status' : 'Status'}
                      >
                        {dept.status === 'ACTIVE' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {dept.status}
                      </button>
                    </td>
                    {canManage && (
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEditDrawer(dept)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-[#2F75B5]"
                          title="Edit Department"
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

      {/* Department Drawer Form */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowDrawer(false)} />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-[#17365D] text-sm">
                {selectedDept ? `Edit Department [${selectedDept.code}]` : 'Create New Department'}
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
                  <label className="block font-semibold text-slate-700 mb-1">Department Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none uppercase font-mono"
                    placeholder="ENG"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                    placeholder="Software Engineering"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Parent Department (Hierarchy)</label>
                  <select
                    value={formData.parentDepartmentId}
                    onChange={(e) => setFormData({ ...formData, parentDepartmentId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                  >
                    <option value="">— None (Top-level Root Unit) —</option>
                    {departments
                      .filter((d) => !selectedDept || d.id !== selectedDept.id)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department Head / Manager</label>
                  <input
                    type="text"
                    value={formData.departmentHeadName}
                    onChange={(e) => setFormData({ ...formData, departmentHeadName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                    placeholder="Robert Vance"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                    placeholder="Brief description of department scope and responsibilities..."
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
                  {submitting ? 'Saving...' : selectedDept ? 'Update Department' : 'Save Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
