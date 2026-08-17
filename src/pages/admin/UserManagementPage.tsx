import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/shell/PageHeader.js';
import { apiClient } from '../../services/apiClient.js';
import { AuthUser } from '../../types/auth.js';
import { LoadingSkeleton, ErrorBanner } from '../../components/common/LoadingSkeleton.js';
import { ShieldCheck, Plus, Search, UserCheck } from 'lucide-react';

export function UserManagementPage() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    const res = await apiClient.get<AuthUser[]>('/api/v1/administration/users');
    if (res.success && res.data) {
      setUsers(res.data);
    } else {
      setError(res.error || 'Failed to load user accounts.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Manage login accounts and access status"
        breadcrumbs={[
          { label: 'HRMS Portal', path: '/dashboard' },
          { label: 'Administration' },
          { label: 'User Management' },
        ]}
        primaryAction={{
          label: 'Create User Account',
          icon: <Plus className="w-3.5 h-3.5" />,
          onClick: () => alert('Create User drawer form placeholder'),
        }}
      />

      <div className="p-6 max-w-7xl mx-auto space-y-4">
        {loading ? (
          <LoadingSkeleton rows={4} />
        ) : error ? (
          <ErrorBanner message={error} onRetry={fetchUsers} />
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                  <th className="py-2.5 px-4">User</th>
                  <th className="py-2.5 px-4">Employee Code</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((usr) => (
                  <tr key={usr.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={usr.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'}
                          alt={usr.fullName}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <p className="font-semibold text-slate-800">{usr.fullName}</p>
                          <p className="text-[11px] text-slate-500">{usr.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#17365D]">
                      {usr.employeeCode || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#17365D] border border-blue-200">
                        {usr.role}
                      </span>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
