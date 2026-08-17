import React, { useState, useEffect } from 'react';
import {
  Coins,
  Plus,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertCircle,
  Clock,
  Edit2,
  Trash2,
  Tag,
  Shield,
} from 'lucide-react';
import {
  SalaryComponent,
  ComponentType,
  ComponentNature,
  CalculationBase,
  RoundingRule,
} from '../../types/payroll.js';
import { useAuth } from '../../context/AuthContext.js';
import { PermissionKey } from '../../types/auth.js';

export function SalaryComponentsTab() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PermissionKey.PAYROLL_MANAGE);

  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingComponent, setEditingComponent] = useState<SalaryComponent | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    type: ComponentType.EARNING,
    nature: ComponentNature.FIXED,
    calculationBase: CalculationBase.PERCENTAGE_OF_CTC,
    roundingRule: RoundingRule.ROUND_NEAREST,
    isTaxable: true,
    isPfEligible: false,
    isEsiEligible: false,
    isPtEligible: false,
    isTdsApplicable: true,
    isLopAffected: true,
    displayOrder: 1,
    isActive: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchComponents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/payroll/components');
      const json = await res.json();
      if (json.success) {
        setComponents(json.data);
      }
    } catch (err) {
      console.error('Error fetching salary components:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComponents();
  }, []);

  const handleOpenCreate = () => {
    setEditingComponent(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      type: ComponentType.EARNING,
      nature: ComponentNature.FIXED,
      calculationBase: CalculationBase.PERCENTAGE_OF_CTC,
      roundingRule: RoundingRule.ROUND_NEAREST,
      isTaxable: true,
      isPfEligible: false,
      isEsiEligible: false,
      isPtEligible: false,
      isTdsApplicable: true,
      isLopAffected: true,
      displayOrder: components.length + 1,
      isActive: true,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (comp: SalaryComponent) => {
    setEditingComponent(comp);
    setFormData({
      code: comp.code,
      name: comp.name,
      description: comp.description || '',
      type: comp.type,
      nature: comp.nature,
      calculationBase: comp.calculationBase,
      roundingRule: comp.roundingRule,
      isTaxable: comp.isTaxable,
      isPfEligible: comp.isPfEligible,
      isEsiEligible: comp.isEsiEligible,
      isPtEligible: comp.isPtEligible,
      isTdsApplicable: comp.isTdsApplicable,
      isLopAffected: comp.isLopAffected,
      displayOrder: comp.displayOrder,
      isActive: comp.isActive,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const url = editingComponent
        ? `/api/v1/payroll/components/${editingComponent.id}`
        : '/api/v1/payroll/components';
      const method = editingComponent ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save salary component.');
      }

      setIsModalOpen(false);
      fetchComponents();
    } catch (err: any) {
      setFormError(err.message || 'Error processing request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this salary component?')) return;
    try {
      const res = await fetch(`/api/v1/payroll/components/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || 'Cannot delete component.');
        return;
      }
      fetchComponents();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const filteredComponents = components.filter((comp) => {
    const matchesSearch =
      comp.name.toLowerCase().includes(search.toLowerCase()) ||
      comp.code.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'ALL' || comp.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4" id="salary-components-tab">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              id="component-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search components by code or name..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              id="component-type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="py-2 pl-3 pr-8 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Types</option>
              <option value={ComponentType.EARNING}>Earnings</option>
              <option value={ComponentType.DEDUCTION}>Deductions</option>
            </select>
          </div>
        </div>

        {canManage && (
          <button
            id="add-component-button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Component
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading salary components...</div>
        ) : filteredComponents.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No salary components found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Code & Name</th>
                  <th className="py-3.5 px-4">Type / Nature</th>
                  <th className="py-3.5 px-4">Calculation Base</th>
                  <th className="py-3.5 px-4">Compliance Flags</th>
                  <th className="py-3.5 px-4">Status</th>
                  {canManage && <th className="py-3.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredComponents.map((comp) => (
                  <tr key={comp.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{comp.name}</div>
                      <div className="text-xs text-indigo-600 font-mono font-medium">{comp.code}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium w-fit ${
                            comp.type === ComponentType.EARNING
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {comp.type}
                        </span>
                        <span className="text-xs text-slate-500">{comp.nature}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs font-medium text-slate-800 bg-slate-100 px-2 py-1 rounded">
                        {comp.calculationBase.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {comp.isTaxable && (
                          <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
                            Taxable
                          </span>
                        )}
                        {comp.isPfEligible && (
                          <span className="text-[10px] bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded font-medium">
                            PF
                          </span>
                        )}
                        {comp.isEsiEligible && (
                          <span className="text-[10px] bg-purple-50 text-purple-800 border border-purple-200 px-1.5 py-0.5 rounded font-medium">
                            ESI
                          </span>
                        )}
                        {comp.isPtEligible && (
                          <span className="text-[10px] bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.5 rounded font-medium">
                            PT
                          </span>
                        )}
                        {comp.isLopAffected && (
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                            LOP Deductible
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {comp.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                          Inactive
                        </span>
                      )}
                    </td>
                    {canManage && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            id={`edit-component-${comp.id}`}
                            onClick={() => handleOpenEdit(comp)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            id={`delete-component-${comp.id}`}
                            onClick={() => handleDelete(comp.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingComponent ? 'Edit Salary Component' : 'Create New Salary Component'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Component Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. BASIC, HRA, SPECIAL_ALLOW"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 font-mono uppercase focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Component Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. House Rent Allowance"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Details on calculation and policy rules..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Classification Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as ComponentType })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={ComponentType.EARNING}>Earning</option>
                    <option value={ComponentType.DEDUCTION}>Deduction</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Component Nature *
                  </label>
                  <select
                    value={formData.nature}
                    onChange={(e) => setFormData({ ...formData, nature: e.target.value as ComponentNature })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={ComponentNature.FIXED}>Fixed</option>
                    <option value={ComponentNature.VARIABLE}>Variable</option>
                    <option value={ComponentNature.FORMULA}>Formula</option>
                    <option value={ComponentNature.REIMBURSEMENT}>Reimbursement</option>
                    <option value={ComponentNature.STATUTORY}>Statutory</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Calculation Base *
                  </label>
                  <select
                    value={formData.calculationBase}
                    onChange={(e) => setFormData({ ...formData, calculationBase: e.target.value as CalculationBase })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={CalculationBase.PERCENTAGE_OF_CTC}>% of Annual CTC</option>
                    <option value={CalculationBase.PERCENTAGE_OF_BASIC}>% of Basic Salary</option>
                    <option value={CalculationBase.PERCENTAGE_OF_GROSS}>% of Monthly Gross</option>
                    <option value={CalculationBase.FLAT_AMOUNT}>Flat Monthly Amount</option>
                    <option value={CalculationBase.FORMULA}>Formula Expression</option>
                  </select>
                </div>
              </div>

              {/* Compliance & Calculation Checkboxes */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Statutory & Tax Rules
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isTaxable}
                      onChange={(e) => setFormData({ ...formData, isTaxable: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    Taxable Income
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPfEligible}
                      onChange={(e) => setFormData({ ...formData, isPfEligible: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    PF Eligible Base
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isEsiEligible}
                      onChange={(e) => setFormData({ ...formData, isEsiEligible: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    ESI Eligible
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPtEligible}
                      onChange={(e) => setFormData({ ...formData, isPtEligible: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    PT Deductible
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isLopAffected}
                      onChange={(e) => setFormData({ ...formData, isLopAffected: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    LOP Prorated
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    Active Status
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingComponent ? 'Update Component' : 'Create Component'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
