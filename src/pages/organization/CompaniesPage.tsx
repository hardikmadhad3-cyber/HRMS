import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/shell/PageHeader.js';
import { apiClient } from '../../services/apiClient.js';
import { Company } from '../../types/organization.js';
import { LoadingSkeleton, ErrorBanner } from '../../components/common/LoadingSkeleton.js';
import { useNotification } from '../../context/NotificationContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { PermissionKey, UserRole } from '../../types/auth.js';
import { Building2, Plus, Search, Edit2, ShieldAlert, X, CheckCircle2, XCircle } from 'lucide-react';

export function CompaniesPage() {
  const { hasPermission, hasRole } = useAuth();
  const canManage = hasPermission(PermissionKey.ORGANIZATION_MANAGE) || hasRole(UserRole.SUPER_ADMIN);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { showToast } = useNotification();

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    legalName: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    currency: 'USD',
    locale: 'en-US',
    timezone: 'America/New_York',
    taxIdentifier: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
  });

  const fetchCompanies = async () => {
    setLoading(true);
    setError(null);
    const res = await apiClient.get<Company[]>('/api/v1/organization/companies');
    if (res.success && res.data) {
      setCompanies(res.data);
    } else {
      setError(res.error || 'Failed to load company records.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const openCreateDrawer = () => {
    setSelectedCompany(null);
    setFormData({
      code: '',
      name: '',
      legalName: '',
      status: 'ACTIVE',
      currency: 'USD',
      locale: 'en-US',
      timezone: 'America/New_York',
      taxIdentifier: '',
      contactEmail: '',
      contactPhone: '',
      address: '',
    });
    setFormError(null);
    setShowDrawer(true);
  };

  const openEditDrawer = (comp: Company) => {
    setSelectedCompany(comp);
    setFormData({
      code: comp.code,
      name: comp.name,
      legalName: comp.legalName,
      status: comp.status,
      currency: comp.currency,
      locale: comp.locale,
      timezone: comp.timezone,
      taxIdentifier: comp.taxIdentifier || '',
      contactEmail: comp.contactEmail,
      contactPhone: comp.contactPhone || '',
      address: comp.address,
    });
    setFormError(null);
    setShowDrawer(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim() || !formData.contactEmail.trim() || !formData.address.trim()) {
      setFormError('Please fill in all mandatory fields (Code, Name, Contact Email, Address).');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    if (selectedCompany) {
      // Update
      const res = await apiClient.put<Company>(`/api/v1/organization/companies/${selectedCompany.id}`, formData);
      if (res.success && res.data) {
        showToast('success', 'Company Updated', `Company [${res.data.code}] updated successfully.`);
        setShowDrawer(false);
        fetchCompanies();
      } else {
        setFormError(res.error || 'Failed to update company.');
      }
    } else {
      // Create
      const res = await apiClient.post<Company>('/api/v1/organization/companies', formData);
      if (res.success && res.data) {
        showToast('success', 'Company Created', `New company [${res.data.code}] created successfully.`);
        setShowDrawer(false);
        fetchCompanies();
      } else {
        setFormError(res.error || 'Failed to create company.');
      }
    }
    setSubmitting(false);
  };

  const handleToggleStatus = async (comp: Company) => {
    if (!canManage) return;
    const targetStatus = comp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const res = await apiClient.patch<Company>(`/api/v1/organization/companies/${comp.id}/status`, { status: targetStatus });
    if (res.success && res.data) {
      showToast('success', 'Status Updated', `Company [${comp.code}] is now ${targetStatus}.`);
      fetchCompanies();
    } else {
      showToast('error', 'Action Restricted', res.error || 'Failed to toggle company status.');
    }
  };

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div id="companies-master-page">
      <PageHeader
        title="Companies Master"
        subtitle="Multi-company legal entity configuration"
        breadcrumbs={[
          { label: 'HRMS Portal', path: '/dashboard' },
          { label: 'Organization' },
          { label: 'Companies' },
        ]}
        primaryAction={
          canManage
            ? {
                label: 'Add Company',
                icon: <Plus className="w-3.5 h-3.5" />,
                onClick: openCreateDrawer,
              }
            : undefined
        }
      />

      <div className="p-6 max-w-7xl mx-auto space-y-4">
        {/* Filter & Toolbar */}
        <div className="bg-white p-3.5 border border-slate-200 rounded-lg shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search code or company name..."
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2F75B5]"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Total Entities: <strong className="text-slate-800">{filtered.length}</strong>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton rows={4} />
        ) : error ? (
          <ErrorBanner message={error} onRetry={fetchCompanies} />
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No Companies Found</h3>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your search criteria or add a new entity.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                  <th className="py-2.5 px-4">Code</th>
                  <th className="py-2.5 px-4">Company / Legal Name</th>
                  <th className="py-2.5 px-4">Currency & Timezone</th>
                  <th className="py-2.5 px-4">Tax ID</th>
                  <th className="py-2.5 px-4">Contact</th>
                  <th className="py-2.5 px-4">Status</th>
                  {canManage && <th className="py-2.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((company) => (
                  <tr key={company.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#17365D]">
                      {company.code}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{company.name}</p>
                      <p className="text-[11px] text-slate-500">{company.legalName}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span>{company.currency}</span> • <span className="text-[11px] text-slate-500">{company.timezone}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {company.taxIdentifier || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-[11px]">
                      <p>{company.contactEmail}</p>
                      {company.contactPhone && <p className="text-slate-400">{company.contactPhone}</p>}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStatus(company)}
                        disabled={!canManage}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition-opacity ${
                          company.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 hover:opacity-80'
                            : 'bg-slate-100 text-slate-600 hover:opacity-80'
                        } ${!canManage ? 'cursor-default' : 'cursor-pointer'}`}
                        title={canManage ? 'Click to toggle status' : 'Status'}
                      >
                        {company.status === 'ACTIVE' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {company.status}
                      </button>
                    </td>
                    {canManage && (
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEditDrawer(company)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-[#2F75B5]"
                          title="Edit Company"
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

      {/* Company Form Drawer */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowDrawer(false)} />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-[#17365D] text-sm">
                {selectedCompany ? `Edit Company [${selectedCompany.code}]` : 'Create Legal Entity'}
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
                  <label className="block font-semibold text-slate-700 mb-1">Company Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none uppercase font-mono"
                    placeholder="ACME"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Display Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                    placeholder="Acme Enterprise Solutions"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Legal Entity Name</label>
                  <input
                    type="text"
                    value={formData.legalName}
                    onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                    placeholder="Acme Enterprise Holdings Inc."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Currency</label>
                    <input
                      type="text"
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none uppercase font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Timezone</label>
                    <input
                      type="text"
                      value={formData.timezone}
                      onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Contact Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                      placeholder="hr@company.com"
                    />
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
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tax Identifier</label>
                  <input
                    type="text"
                    value={formData.taxIdentifier}
                    onChange={(e) => setFormData({ ...formData, taxIdentifier: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none font-mono"
                    placeholder="TAX-9982310"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Registered Address *</label>
                  <textarea
                    rows={2}
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                    placeholder="100 Tech Plaza, Suite 400, New York, NY 10001"
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
                  {submitting ? 'Saving...' : selectedCompany ? 'Update Company' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
