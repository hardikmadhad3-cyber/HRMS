import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Percent,
  DollarSign,
  Lock,
  Unlock,
} from 'lucide-react';
import {
  SalaryStructure,
  SalaryStructureComponent,
  SalaryComponent,
  PayFrequency,
  CalculationBase,
  ComponentType,
} from '../../types/payroll.js';
import { useAuth } from '../../context/AuthContext.js';
import { PermissionKey } from '../../types/auth.js';

export function SalaryStructuresTab() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PermissionKey.PAYROLL_MANAGE);

  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [availableComponents, setAvailableComponents] = useState<SalaryComponent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingStructure, setEditingStructure] = useState<SalaryStructure | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    payFrequency: PayFrequency.MONTHLY,
    currency: 'USD',
    isActive: true,
  });
  const [structureComponents, setStructureComponents] = useState<
    Array<{
      salaryComponentId: string;
      calculationType: CalculationBase;
      factorValue: number;
      baseComponentId?: string;
      isMandatory: boolean;
      allowOverride: boolean;
      displayOrder: number;
    }>
  >([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resStructs, resComps] = await Promise.all([
        fetch('/api/v1/payroll/structures'),
        fetch('/api/v1/payroll/components'),
      ]);
      const jsonStructs = await resStructs.json();
      const jsonComps = await resComps.json();

      if (jsonStructs.success) setStructures(jsonStructs.data);
      if (jsonComps.success) setAvailableComponents(jsonComps.data);
    } catch (err) {
      console.error('Error loading structures:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleOpenCreate = () => {
    setEditingStructure(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      payFrequency: PayFrequency.MONTHLY,
      currency: 'USD',
      isActive: true,
    });
    setStructureComponents([
      {
        salaryComponentId: availableComponents[0]?.id || '',
        calculationType: CalculationBase.PERCENTAGE_OF_CTC,
        factorValue: 0.4,
        isMandatory: true,
        allowOverride: false,
        displayOrder: 1,
      },
    ]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (struct: SalaryStructure) => {
    setEditingStructure(struct);
    setFormData({
      code: struct.code,
      name: struct.name,
      description: struct.description || '',
      payFrequency: struct.payFrequency,
      currency: struct.currency,
      isActive: struct.isActive,
    });
    setStructureComponents(
      (struct.components || []).map((c, idx) => ({
        salaryComponentId: c.salaryComponentId,
        calculationType: c.calculationType,
        factorValue: c.factorValue,
        baseComponentId: c.baseComponentId,
        isMandatory: c.isMandatory,
        allowOverride: c.allowOverride,
        displayOrder: c.displayOrder || idx + 1,
      }))
    );
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleAddComponentRow = () => {
    const unselected = availableComponents.find(
      (c) => !structureComponents.some((sc) => sc.salaryComponentId === c.id)
    );
    setStructureComponents([
      ...structureComponents,
      {
        salaryComponentId: unselected?.id || availableComponents[0]?.id || '',
        calculationType: CalculationBase.FLAT_AMOUNT,
        factorValue: 0,
        isMandatory: false,
        allowOverride: true,
        displayOrder: structureComponents.length + 1,
      },
    ]);
  };

  const handleRemoveComponentRow = (index: number) => {
    setStructureComponents(structureComponents.filter((_, i) => i !== index));
  };

  const handleComponentChange = (index: number, field: string, value: any) => {
    const updated = [...structureComponents];
    updated[index] = { ...updated[index], [field]: value };
    setStructureComponents(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      if (structureComponents.length === 0) {
        throw new Error('At least one salary component must be configured in the structure.');
      }

      // Check unique components
      const seenCompIds = new Set<string>();
      for (const sc of structureComponents) {
        if (seenCompIds.has(sc.salaryComponentId)) {
          throw new Error('Duplicate salary components are not allowed in the same structure.');
        }
        seenCompIds.add(sc.salaryComponentId);
      }

      const url = editingStructure
        ? `/api/v1/payroll/structures/${editingStructure.id}`
        : '/api/v1/payroll/structures';
      const method = editingStructure ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        components: structureComponents,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save salary structure.');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Error processing request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this salary structure?')) return;
    try {
      const res = await fetch(`/api/v1/payroll/structures/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || 'Cannot delete structure.');
        return;
      }
      fetchData();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const filteredStructures = structures.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4" id="salary-structures-tab">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            id="structure-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search structures by code or name..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {canManage && (
          <button
            id="add-structure-button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Structure
          </button>
        )}
      </div>

      {/* Structures List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white p-12 text-center text-slate-500 rounded-xl border border-slate-200">
            Loading salary structures...
          </div>
        ) : filteredStructures.length === 0 ? (
          <div className="bg-white p-12 text-center text-slate-500 rounded-xl border border-slate-200">
            No salary structures found.
          </div>
        ) : (
          filteredStructures.map((struct) => {
            const isExpanded = expandedId === struct.id;
            return (
              <div
                key={struct.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all"
              >
                {/* Header Row */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{struct.name}</h3>
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {struct.code}
                        </span>
                        {struct.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{struct.description || 'No description provided.'}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-600 mt-2">
                        <span>
                          Frequency: <strong className="text-slate-800">{struct.payFrequency}</strong>
                        </span>
                        <span>
                          Currency: <strong className="text-slate-800">{struct.currency}</strong>
                        </span>
                        <span>
                          Components: <strong className="text-slate-800">{struct.components?.length || 0}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => toggleExpand(struct.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" /> Hide Breakdown
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" /> View Breakdown
                        </>
                      )}
                    </button>
                    {canManage && (
                      <>
                        <button
                          onClick={() => handleOpenEdit(struct)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(struct.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded Component Breakdown Table */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                      Relational Component Composition & Factor Rules
                    </h4>
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Order</th>
                            <th className="py-2.5 px-3">Salary Component</th>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3">Calculation Rule</th>
                            <th className="py-2.5 px-3">Factor Value</th>
                            <th className="py-2.5 px-3">Mandatory</th>
                            <th className="py-2.5 px-3">Override Allowed</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {struct.components?.map((c, idx) => (
                            <tr key={c.id || idx} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-mono text-slate-500">{c.displayOrder || idx + 1}</td>
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900">{c.component?.name || c.salaryComponentId}</div>
                                <div className="text-[10px] text-indigo-600 font-mono font-medium">
                                  {c.component?.code}
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                    c.component?.type === ComponentType.EARNING
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-rose-50 text-rose-700'
                                  }`}
                                >
                                  {c.component?.type || 'EARNING'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-medium text-slate-700">
                                {c.calculationType.replace(/_/g, ' ')}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                {c.calculationType === CalculationBase.PERCENTAGE_OF_CTC ||
                                c.calculationType === CalculationBase.PERCENTAGE_OF_BASIC
                                  ? `${(c.factorValue * 100).toFixed(0)}%`
                                  : `$${c.factorValue.toLocaleString()}`}
                              </td>
                              <td className="py-2.5 px-3">
                                {c.isMandatory ? (
                                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Yes
                                  </span>
                                ) : (
                                  <span className="text-slate-400">Optional</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                {c.allowOverride ? (
                                  <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium flex items-center gap-1 w-fit">
                                    <Unlock className="w-3 h-3" /> Permitted
                                  </span>
                                ) : (
                                  <span className="text-slate-500 flex items-center gap-1">
                                    <Lock className="w-3 h-3 text-slate-400" /> Locked
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Modal with Component Matrix */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full p-6 space-y-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingStructure ? 'Edit Salary Structure' : 'Create New Salary Structure'}
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

            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Structure Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. ENG-STANDARD, SALES-BASE"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 font-mono uppercase focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Structure Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Standard Corporate Engineering Structure"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Overview of salary bands, target departments or grades..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pay Frequency</label>
                  <select
                    value={formData.payFrequency}
                    onChange={(e) => setFormData({ ...formData, payFrequency: e.target.value as PayFrequency })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={PayFrequency.MONTHLY}>Monthly</option>
                    <option value={PayFrequency.SEMI_MONTHLY}>Semi-Monthly</option>
                    <option value={PayFrequency.BI_WEEKLY}>Bi-Weekly</option>
                    <option value={PayFrequency.WEEKLY}>Weekly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
                  <input
                    type="text"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 font-mono uppercase focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    Structure Active
                  </label>
                </div>
              </div>

              {/* Dynamic Components Matrix */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Configured Salary Components
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddComponentRow}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Component
                  </button>
                </div>

                <div className="space-y-2">
                  {structureComponents.map((sc, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs"
                    >
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Component</label>
                        <select
                          value={sc.salaryComponentId}
                          onChange={(e) => handleComponentChange(idx, 'salaryComponentId', e.target.value)}
                          className="w-full p-1.5 text-xs rounded border border-slate-200 bg-white"
                        >
                          {availableComponents.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Rule</label>
                        <select
                          value={sc.calculationType}
                          onChange={(e) => handleComponentChange(idx, 'calculationType', e.target.value as CalculationBase)}
                          className="w-full p-1.5 text-xs rounded border border-slate-200 bg-white"
                        >
                          <option value={CalculationBase.PERCENTAGE_OF_CTC}>% of CTC</option>
                          <option value={CalculationBase.PERCENTAGE_OF_BASIC}>% of Basic</option>
                          <option value={CalculationBase.FLAT_AMOUNT}>Flat Amount</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Factor / Amount
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={sc.factorValue}
                          onChange={(e) => handleComponentChange(idx, 'factorValue', parseFloat(e.target.value) || 0)}
                          placeholder="e.g. 0.40 or 1500"
                          className="w-full p-1.5 text-xs rounded border border-slate-200 font-mono"
                        />
                      </div>

                      <div className="sm:col-span-3 flex items-center gap-3 pt-3 sm:pt-0">
                        <label className="flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sc.isMandatory}
                            onChange={(e) => handleComponentChange(idx, 'isMandatory', e.target.checked)}
                            className="rounded text-indigo-600"
                          />
                          Mandatory
                        </label>
                        <label className="flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sc.allowOverride}
                            onChange={(e) => handleComponentChange(idx, 'allowOverride', e.target.checked)}
                            className="rounded text-indigo-600"
                          />
                          Override
                        </label>
                      </div>

                      <div className="sm:col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveComponentRow(idx)}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                          title="Remove Component"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
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
                  {submitting ? 'Saving...' : editingStructure ? 'Update Structure' : 'Create Structure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
