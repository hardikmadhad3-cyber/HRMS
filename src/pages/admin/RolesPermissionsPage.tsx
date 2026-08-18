<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/shell/PageHeader.js';
import {
  ShieldCheck,
  Plus,
  Check,
  Shield,
  Lock,
  Edit2,
  Save,
  X,
  Layers,
  Search,
  CheckSquare,
  Square,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient.js';
import { useAuth } from '../../context/AuthContext.js';
import { useNotification } from '../../context/NotificationContext.js';
import { CustomRole, GranularPermission } from '../../types/platform.js';
import { PermissionKey } from '../../types/auth.js';

export function RolesPermissionsPage() {
  const { activeCompanyId } = useAuth();
  const { showToast } = useNotification();

  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [permissionsCatalog, setPermissionsCatalog] = useState<GranularPermission[]>([]);
  const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState('');

  // Modal states for creating new role
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleCode, setNewRoleCode] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRolePerms, setNewRolePerms] = useState<PermissionKey[]>([]);

  useEffect(() => {
    loadData();
  }, [activeCompanyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        apiClient.get<CustomRole[]>('/api/v1/administration/roles'),
        apiClient.get<GranularPermission[]>('/api/v1/administration/permissions'),
      ]);

      if (rolesRes.success && rolesRes.data) {
        setRoles(rolesRes.data);
        if (!selectedRole && rolesRes.data.length > 0) {
          setSelectedRole(rolesRes.data[0]);
        } else if (selectedRole) {
          const updated = rolesRes.data.find((r) => r.id === selectedRole.id);
          if (updated) setSelectedRole(updated);
        }
      }

      if (permsRes.success && permsRes.data) {
        setPermissionsCatalog(permsRes.data);
      }
    } catch (err: any) {
      showToast('error', 'Error', err?.message || 'Failed to load roles and permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (permKey: PermissionKey) => {
    if (!selectedRole || selectedRole.isSystem) return;
    const current = selectedRole.permissions || [];
    const updated = current.includes(permKey)
      ? current.filter((k) => k !== permKey)
      : [...current, permKey];

    setSelectedRole({
      ...selectedRole,
      permissions: updated,
    });
  };

  const handleSaveRolePermissions = async () => {
    if (!selectedRole || selectedRole.isSystem) return;
    setSaving(true);
    try {
      const res = await apiClient.put(`/api/v1/administration/roles/${selectedRole.id}`, {
        name: selectedRole.name,
        description: selectedRole.description,
        permissions: selectedRole.permissions,
      });

      if (res.success) {
        showToast('success', 'Permissions Saved', `Role ${selectedRole.name} updated successfully.`);
        loadData();
      } else {
        showToast('error', 'Save Failed', res.error || 'Failed to update role permissions');
      }
    } catch (err: any) {
      showToast('error', 'Error', err?.message || 'Server error updating role');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName || !newRoleCode) {
      showToast('error', 'Validation Error', 'Role Name and Role Code are required.');
      return;
    }

    try {
      const res = await apiClient.post('/api/v1/administration/roles', {
        name: newRoleName,
        code: newRoleCode.toUpperCase().replace(/\s+/g, '_'),
        description: newRoleDesc,
        permissions: newRolePerms,
      });

      if (res.success && res.data) {
        showToast('success', 'Role Created', 'New custom security role created.');
        setIsModalOpen(false);
        setNewRoleName('');
        setNewRoleCode('');
        setNewRoleDesc('');
        setNewRolePerms([]);
        loadData();
      } else {
        showToast('error', 'Creation Failed', res.error || 'Failed to create role');
      }
    } catch (err: any) {
      showToast('error', 'Error', err?.message || 'Server error creating role');
    }
  };

  // Group permissions by module
  const modules = Array.from(new Set(permissionsCatalog.map((p) => p.module)));

  const filteredPermissions = permissionsCatalog.filter((p) => {
    if (permissionSearch) {
      const q = permissionSearch.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.module.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Role-Based Access Control (RBAC) & Permissions"
        subtitle="Configure system and custom security roles, access policies, and granular operational privileges"
        breadcrumbs={[
          { label: 'HRMS Platform', path: '/dashboard' },
          { label: 'Administration' },
          { label: 'Roles & Permissions' },
        ]}
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-1.5 bg-[#17365D] hover:bg-[#122b4a] text-white text-xs font-semibold rounded shadow-2xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Custom Role
          </button>
        }
      />

      <div className="px-6 max-w-7xl mx-auto space-y-6">
        {/* Main 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Roles List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#17365D] uppercase tracking-wider">
                Configured Roles ({roles.length})
              </h3>
            </div>

            <div className="space-y-2">
              {roles.map((role) => {
                const isSelected = selectedRole?.id === role.id;
                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-600 shadow-2xs ring-1 ring-blue-600'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-[#17365D]">{role.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        role.isSystem ? 'bg-slate-100 text-slate-700' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {role.isSystem ? 'SYSTEM' : 'CUSTOM'}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px] line-clamp-2 leading-relaxed">{role.description}</p>
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-mono">{role.code}</span>
                      <span className="font-semibold text-blue-700">
                        {role.permissions?.length || 0} permissions
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Permission Matrix */}
          <div className="lg:col-span-2 space-y-4">
            {selectedRole ? (
              <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
                {/* Role Header */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#17365D]" />
                      <h3 className="font-bold text-sm text-[#17365D]">{selectedRole.name}</h3>
                      {selectedRole.isSystem ? (
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-bold">
                          System Protected
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-bold">
                          Custom Editable
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{selectedRole.description}</p>
                  </div>

                  {!selectedRole.isSystem && (
                    <button
                      onClick={handleSaveRolePermissions}
                      disabled={saving}
                      className="px-3.5 py-1.5 bg-[#17365D] hover:bg-[#122b4a] disabled:opacity-50 text-white text-xs font-semibold rounded shadow-2xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {saving ? 'Saving...' : 'Save Permissions'}
                    </button>
                  )}
                </div>

                {/* Permission Search & Stats */}
                <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search granular permissions..."
                      value={permissionSearch}
                      onChange={(e) => setPermissionSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#17365D]"
                    />
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {selectedRole.permissions?.length || 0} / {permissionsCatalog.length} Granted
                  </span>
                </div>

                {/* Permission Modules List */}
                <div className="p-4 max-h-[600px] overflow-y-auto space-y-6">
                  {modules.map((moduleName) => {
                    const modulePerms = filteredPermissions.filter((p) => p.module === moduleName);
                    if (modulePerms.length === 0) return null;

                    return (
                      <div key={moduleName} className="space-y-2">
                        <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                          <Layers className="w-3.5 h-3.5 text-slate-500" />
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            {moduleName}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({modulePerms.filter((p) => selectedRole.permissions?.includes(p.key)).length}/{modulePerms.length})
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {modulePerms.map((perm) => {
                            const isGranted = selectedRole.permissions?.includes(perm.key);
                            return (
                              <div
                                key={perm.key}
                                onClick={() => handleTogglePermission(perm.key)}
                                className={`p-2.5 rounded border text-xs flex items-start gap-2.5 transition-all ${
                                  selectedRole.isSystem
                                    ? isGranted
                                      ? 'bg-blue-50/50 border-blue-200 text-slate-800'
                                      : 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'
                                    : isGranted
                                    ? 'bg-blue-50 border-blue-400 text-slate-900 cursor-pointer shadow-2xs'
                                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600 cursor-pointer'
                                }`}
                              >
                                {isGranted ? (
                                  <CheckSquare className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                )}
                                <div className="space-y-0.5">
                                  <p className="font-semibold text-[11px] leading-tight">{perm.name}</p>
                                  <p className="text-[10px] text-slate-500 leading-tight">{perm.description}</p>
                                  <span className="text-[9px] font-mono text-slate-400 block">{perm.key}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-12 bg-white border border-slate-200 rounded-lg text-center text-slate-400 text-xs">
                Select a role from the left to view and configure its permission matrix.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Custom Role Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-3.5 bg-[#17365D] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-200" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Create Custom Security Role</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Role Name *</label>
                  <input
                    type="text"
                    required
                    value={newRoleName}
                    onChange={(e) => {
                      setNewRoleName(e.target.value);
                      if (!newRoleCode) {
                        setNewRoleCode(e.target.value.toUpperCase().replace(/\s+/g, '_'));
                      }
                    }}
                    placeholder="e.g. Talent Acquisition Lead"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-[#17365D] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Role Code *</label>
                  <input
                    type="text"
                    required
                    value={newRoleCode}
                    onChange={(e) => setNewRoleCode(e.target.value)}
                    placeholder="e.g. RECRUITMENT_LEAD"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-[#17365D] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Summarize the administrative scope and responsibilities..."
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-[#17365D] focus:outline-none"
                />
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
                  className="px-4 py-1.5 bg-[#17365D] hover:bg-[#122b4a] text-white font-semibold rounded flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
=======
import React from 'react';
import { PageHeader } from '../../components/shell/PageHeader.js';
import { ShieldCheck, Plus, Check } from 'lucide-react';
import { UserRole, PermissionKey } from '../../types/auth.js';

export function RolesPermissionsPage() {
  const roles = [
    { name: UserRole.SUPER_ADMIN, desc: 'Full System & Technical Administration', usersCount: 2 },
    { name: UserRole.HR_ADMIN, desc: 'Employee, Attendance, Leave & Operations Access', usersCount: 4 },
    { name: UserRole.PAYROLL_MANAGER, desc: 'Salary, Components, Structures & Payroll Processing', usersCount: 2 },
    { name: UserRole.MANAGER, desc: 'Direct Team Approvals & Attendance Review', usersCount: 12 },
    { name: UserRole.EMPLOYEE, desc: 'Employee Self-Service (ESS) Personal View', usersCount: 48 },
  ];

  return (
    <div>
      <PageHeader
        title="Roles & Permission Matrix"
        subtitle="Role-Based Access Control (RBAC) Configuration"
        breadcrumbs={[
          { label: 'HRMS Portal', path: '/dashboard' },
          { label: 'Administration' },
          { label: 'Roles & Permissions' },
        ]}
        primaryAction={{
          label: 'Create Custom Role',
          icon: <Plus className="w-3.5 h-3.5" />,
          onClick: () => alert('Create Role modal placeholder'),
        }}
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
          <h3 className="font-bold text-[#17365D] text-sm mb-3">Configured RBAC Roles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {roles.map((r) => (
              <div key={r.name} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#17365D]">{r.name}</span>
                  <span className="px-1.5 py-0.5 bg-blue-100 text-[#17365D] font-bold rounded text-[10px]">
                    {r.usersCount} Users
                  </span>
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
>>>>>>> 4a1448526a9835d6aa52ec14365c16a1afc6f77f
    </div>
  );
}
