import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/shell/PageHeader.js';
import { apiClient } from '../../services/apiClient.js';
import { AuthUser, UserRole } from '../../types/auth.js';
import { LoadingSkeleton, ErrorBanner } from '../../components/common/LoadingSkeleton.js';
import {
  Users,
  Plus,
  Search,
  UserCheck,
  Building2,
  Shield,
  Edit2,
  CheckCircle2,
  XCircle,
  X,
  Save,
  Lock,
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext.js';
import { useAuth } from '../../context/AuthContext.js';

interface UserFormData {
  fullName: string;
  email: string;
  username: string;
  role: UserRole;
  employeeCode: string;
  companyIds: string[];
  departmentId?: string;
  designationId?: string;
  isActive: boolean;
}

export function UserManagementPage() {
  const { activeCompanyId } = useAuth();
  const { showToast } = useNotification();

  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    fullName: '',
    email: '',
    username: '',
    role: UserRole.EMPLOYEE,
    employeeCode: '',
    companyIds: [activeCompanyId || 'comp-101'],
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<AuthUser[]>(`/api/v1/administration/users${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`);
      if (res.success && res.data) {
        setUsers(res.data);
      } else {
        setError(res.error || 'Failed to load user accounts.');
      }
    } catch (err: any) {
      setError(err?.message || 'Server error loading users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [activeCompanyId]);

  const handleOpenCreateModal = () => {
    setEditingUserId(null);
    setFormData({
      fullName: '',
      email: '',
      username: '',
      role: UserRole.EMPLOYEE,
      employeeCode: `EMP-${Math.floor(100 + Math.random() * 900)}`,
      companyIds: [activeCompanyId || 'comp-101'],
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: AuthUser) => {
    setEditingUserId(user.id);
    setFormData({
      fullName: user.fullName,
      email: user.email,
      username: user.username,
      role: user.role,
      employeeCode: user.employeeCode || '',
      companyIds: user.companyIds && user.companyIds.length > 0 ? user.companyIds : [activeCompanyId || 'comp-101'],
      isActive: user.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.fullName) {
      showToast('error', 'Validation Error', 'Full Name and Email are required.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingUserId) {
        const res = await apiClient.put(`/api/v1/administration/users/${editingUserId}`, formData);
        if (res.success) {
          showToast('success', 'User Updated', 'User account updated successfully.');
          setIsModalOpen(false);
          fetchUsers();
        } else {
          showToast('error', 'Update Failed', res.error || 'Failed to update user');
        }
      } else {
        const res = await apiClient.post('/api/v1/administration/users', formData);
        if (res.success) {
          showToast('success', 'User Created', 'New user account created successfully.');
          setIsModalOpen(false);
          fetchUsers();
        } else {
          showToast('error', 'Creation Failed', res.error || 'Failed to create user');
        }
      }
    } catch (err: any) {
      showToast('error', 'Submission Error', err?.message || 'Server error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: AuthUser) => {
    try {
      const res = await apiClient.patch(`/api/v1/administration/users/${user.id}/status`, {
        isActive: !user.isActive,
      });
      if (res.success) {
        showToast('success', 'Status Updated', `User ${user.fullName} is now ${!user.isActive ? 'Active' : 'Inactive'}.`);
        fetchUsers();
      } else {
        showToast('error', 'Update Failed', res.error || 'Could not update status');
      }
    } catch (err: any) {
      showToast('error', 'Error', err?.message || 'Failed to toggle status');
    }
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.employeeCode && u.employeeCode.toLowerCase().includes(q)) ||
        u.role.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="User Management & System Access"
        subtitle="Manage authentication credentials, company memberships, and administrative security roles"
        breadcrumbs={[
          { label: 'HRMS Platform', path: '/dashboard' },
          { label: 'Administration' },
          { label: 'User Management' },
        ]}
        actions={
          <button
            onClick={handleOpenCreateModal}
            className="px-3.5 py-1.5 bg-[#17365D] hover:bg-[#122b4a] text-white text-xs font-semibold rounded shadow-2xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create User Account
          </button>
        }
      />

      <div className="px-6 max-w-7xl mx-auto space-y-4">
        {/* KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500">Total System Users</span>
            <p className="text-xl font-bold text-[#17365D] mt-1">{users.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500">Active Accounts</span>
            <p className="text-xl font-bold text-emerald-700 mt-1">{users.filter((u) => u.isActive).length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500">Admin & Managers</span>
            <p className="text-xl font-bold text-blue-700 mt-1">
              {users.filter((u) => u.role === UserRole.SUPER_ADMIN || u.role === UserRole.HR_ADMIN || u.role === UserRole.MANAGER).length}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500">Inactive Accounts</span>
            <p className="text-xl font-bold text-slate-500 mt-1">{users.filter((u) => !u.isActive).length}</p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#17365D]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">Filter Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#17365D]"
            >
              <option value="ALL">All Roles</option>
              <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
              <option value={UserRole.HR_ADMIN}>HR Admin</option>
              <option value={UserRole.MANAGER}>Manager</option>
              <option value={UserRole.EMPLOYEE}>Employee</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : error ? (
          <ErrorBanner message={error} onRetry={fetchUsers} />
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 font-bold text-slate-700">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Employee Code</th>
                    <th className="py-3 px-4">Role & Access</th>
                    <th className="py-3 px-4">Company Memberships</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Last Login</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                        No user accounts match the search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((usr) => (
                      <tr key={usr.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={usr.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'}
                              alt={usr.fullName}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200"
                            />
                            <div>
                              <p className="font-bold text-slate-800 text-xs">{usr.fullName}</p>
                              <p className="text-[11px] text-slate-500">{usr.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#17365D]">
                          {usr.employeeCode || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#17365D] border border-blue-200">
                              {usr.role}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ({usr.permissions?.length || 0} perms)
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {usr.companyIds?.map((cid) => (
                              <span key={cid} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                                {cid === 'comp-101' ? 'ACME' : cid === 'comp-102' ? 'NEXUS' : cid}
                              </span>
                            )) || <span className="text-slate-400 text-[10px]">—</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              usr.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {usr.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {usr.lastLoginAt ? new Date(usr.lastLoginAt).toLocaleString() : 'Never'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(usr)}
                              className="p-1 rounded text-slate-600 hover:bg-slate-100 hover:text-blue-700"
                              title="Edit user details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(usr)}
                              className={`p-1 rounded ${
                                usr.isActive ? 'text-emerald-700 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                              }`}
                              title={usr.isActive ? 'Deactivate user' : 'Activate user'}
                            >
                              {usr.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-3.5 bg-[#17365D] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-200" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  {editingUserId ? 'Edit User Credentials & Access' : 'Create New User Account'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-[#17365D] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="s.jenkins@enterprise.com"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-[#17365D] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="e.g. sjenkins"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-[#17365D] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Employee Code</label>
                  <input
                    type="text"
                    value={formData.employeeCode}
                    onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                    placeholder="e.g. EMP-109"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-[#17365D] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">System Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-[#17365D] focus:outline-none font-semibold text-slate-800"
                  >
                    <option value={UserRole.EMPLOYEE}>Employee (Self-Service)</option>
                    <option value={UserRole.MANAGER}>Manager</option>
                    <option value={UserRole.HR_ADMIN}>HR Administrator</option>
                    <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={formData.isActive ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'ACTIVE' })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-[#17365D] focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Assigned Legal Entities (Multi-Tenant Access)
                </label>
                <div className="flex items-center gap-4 p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.companyIds.includes('comp-101')}
                      onChange={(e) => {
                        const newIds = e.target.checked
                          ? [...formData.companyIds, 'comp-101']
                          : formData.companyIds.filter((id) => id !== 'comp-101');
                        setFormData({ ...formData, companyIds: newIds });
                      }}
                      className="rounded text-[#17365D]"
                    />
                    <span>Acme Enterprise Solutions (ACME)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.companyIds.includes('comp-102')}
                      onChange={(e) => {
                        const newIds = e.target.checked
                          ? [...formData.companyIds, 'comp-102']
                          : formData.companyIds.filter((id) => id !== 'comp-102');
                        setFormData({ ...formData, companyIds: newIds });
                      }}
                      className="rounded text-[#17365D]"
                    />
                    <span>Nexus Tech Global (NEXUS)</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-[#17365D] hover:bg-[#122b4a] disabled:opacity-50 text-white font-semibold rounded flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {submitting ? 'Saving...' : editingUserId ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
