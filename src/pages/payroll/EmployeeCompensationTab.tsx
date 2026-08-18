import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  History,
  DollarSign,
  Layers,
  ArrowRight,
  TrendingUp,
  Lock,
  Unlock,
  ShieldAlert,
} from 'lucide-react';
import {
  EmployeeCompensationAssignment,
  EmployeeComponentOverride,
  SalaryStructure,
  SalaryComponent,
  CompensationChangeReason,
  CompensationStatus,
  PayFrequency,
  CalculationBase,
  ComponentType,
} from '../../types/payroll.js';
import { Employee } from '../../types/employee.js';
import { useAuth } from '../../context/AuthContext.js';
import { PermissionKey } from '../../types/auth.js';

export function EmployeeCompensationTab() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PermissionKey.PAYROLL_MANAGE);
  const canView = hasPermission(PermissionKey.PAYROLL_COMPENSATION_VIEW);

  const [compensations, setCompensations] = useState<EmployeeCompensationAssignment[]>([]);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');

  // History Modal State
  const [historyEmployeeId, setHistoryEmployeeId] = useState<string | null>(null);
  const [employeeHistory, setEmployeeHistory] = useState<EmployeeCompensationAssignment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // New Assignment Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    salaryStructureId: '',
    annualCtc: 120000,
    monthlyGross: 10000,
    currency: 'USD',
    payFrequency: PayFrequency.MONTHLY,
    effectiveFrom: new Date().toISOString().split('T')[0],
    changeReason: CompensationChangeReason.ANNUAL_REVISION,
    remarks: '',
  });
  const [overrides, setOverrides] = useState<
    Array<{
      salaryComponentId: string;
      componentName: string;
      componentCode: string;
      originalValue: number;
      overrideValue: number;
      overrideReason: string;
    }>
  >([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resComp, resStruct, resEmp] = await Promise.all([
        fetch('/api/v1/payroll/compensations'),
        fetch('/api/v1/payroll/structures'),
        fetch('/api/v1/employees'),
      ]);

      const jsonComp = await resComp.json();
      const jsonStruct = await resStruct.json();
      const jsonEmp = await resEmp.json();

      if (jsonComp.success) setCompensations(jsonComp.data);
      if (jsonStruct.success) setStructures(jsonStruct.data);
      if (jsonEmp.success) setEmployees(jsonEmp.data);
    } catch (err) {
      console.error('Error loading compensation directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update monthly gross & override options when CTC or Structure changes
  const handleCtcChange = (annual: number) => {
    const monthly = Math.round((annual / 12) * 100) / 100;
    setFormData((prev) => ({ ...prev, annualCtc: annual, monthlyGross: monthly }));
  };

  const handleStructureSelect = (structureId: string) => {
    setFormData((prev) => ({ ...prev, salaryStructureId: structureId }));
    const struct = structures.find((s) => s.id === structureId);
    if (!struct) {
      setOverrides([]);
      return;
    }

    const overridable =
      struct.components?.filter((c) => c.allowOverride).map((c) => ({
        salaryComponentId: c.salaryComponentId,
        componentName: c.component?.name || 'Component',
        componentCode: c.component?.code || 'CODE',
        originalValue: c.factorValue,
        overrideValue: c.factorValue,
        overrideReason: '',
      })) || [];

    setOverrides(overridable);
  };

  const handleOpenAssignModal = () => {
    const firstEmp = employees[0]?.id || '';
    const firstStruct = structures[0]?.id || '';
    setFormData({
      employeeId: firstEmp,
      salaryStructureId: firstStruct,
      annualCtc: 120000,
      monthlyGross: 10000,
      currency: 'USD',
      payFrequency: PayFrequency.MONTHLY,
      effectiveFrom: new Date().toISOString().split('T')[0],
      changeReason: CompensationChangeReason.ANNUAL_REVISION,
      remarks: '',
    });
    handleStructureSelect(firstStruct);
    setFormError(null);
    setIsAssignModalOpen(true);
  };

  const handleOpenHistory = async (empId: string) => {
    try {
      setHistoryEmployeeId(empId);
      setLoadingHistory(true);
      const res = await fetch(`/api/v1/payroll/compensations/employee/${empId}`);
      const json = await res.json();
      if (json.success) {
        setEmployeeHistory(json.data);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        overrides: overrides
          .filter((o) => o.overrideValue !== o.originalValue)
          .map((o) => ({
            salaryComponentId: o.salaryComponentId,
            overrideAmount: o.overrideValue,
            overrideReason: o.overrideReason || 'Adjusted during compensation assignment.',
            effectiveFrom: formData.effectiveFrom,
          })),
      };

      const res = await fetch('/api/v1/payroll/compensations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save compensation assignment.');
      }

      setIsAssignModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Error creating compensation assignment');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canView) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900">Restricted Access</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
          Viewing employee compensation packages requires the <strong>PAYROLL_COMPENSATION_VIEW</strong> authorization key.
        </p>
      </div>
    );
  }

  const filteredCompensations = compensations.filter((c) => {
    const matchesSearch =
      (c.employeeName || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.employeeCode || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.salaryStructure?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4" id="employee-compensation-tab">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              id="compensation-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by employee name, code or structure..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 pl-3 pr-8 text-sm rounded-lg border border-slate-200 bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value={CompensationStatus.ACTIVE}>Active Only</option>
            <option value={CompensationStatus.SUPERSEDED}>Superseded History</option>
            <option value={CompensationStatus.CANCELLED}>Cancelled</option>
          </select>
        </div>

        {canManage && (
          <button
            id="assign-compensation-button"
            onClick={handleOpenAssignModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Assign / Revise Package
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading compensation records...</div>
        ) : filteredCompensations.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No compensation records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Salary Structure</th>
                  <th className="py-3.5 px-4">Annual CTC</th>
                  <th className="py-3.5 px-4">Monthly Gross</th>
                  <th className="py-3.5 px-4">Effective Date Range</th>
                  <th className="py-3.5 px-4">Status & Reason</th>
                  <th className="py-3.5 px-4 text-right">History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCompensations.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">
                        {item.employeeName || item.employeeId}
                      </div>
                      <div className="text-xs text-indigo-600 font-mono">
                        {item.employeeCode || item.departmentName || ''}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{item.salaryStructure?.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{item.salaryStructure?.code}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      ${item.annualCtc.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      ${item.monthlyGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div className="font-medium text-slate-800">
                        From: <span className="font-mono">{item.effectiveFrom}</span>
                      </div>
                      <div className="text-slate-400">
                        To: {item.effectiveTo ? <span className="font-mono">{item.effectiveTo}</span> : 'Current Active'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold w-fit ${
                            item.status === CompensationStatus.ACTIVE
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.status}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {item.changeReason.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenHistory(item.employeeId)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                      >
                        <History className="w-3.5 h-3.5" />
                        Progression
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* History Modal */}
      {historyEmployeeId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  Effective-Dated Compensation History
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Immutable audit trail of compensation assignments and past package revisions.
                </p>
              </div>
              <button
                onClick={() => setHistoryEmployeeId(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {loadingHistory ? (
              <div className="p-8 text-center text-slate-500">Loading history...</div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {employeeHistory.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border ${
                      item.status === CompensationStatus.ACTIVE
                        ? 'bg-emerald-50/30 border-emerald-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold ${
                            item.status === CompensationStatus.ACTIVE
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {item.status}
                        </span>
                        <span className="font-semibold text-slate-900 text-sm">
                          {item.salaryStructure?.name}
                        </span>
                      </div>
                      <div className="text-sm font-mono font-bold text-indigo-600">
                        ${item.annualCtc.toLocaleString()} / year
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-3 text-xs text-slate-600">
                      <div>
                        Effective: <strong className="text-slate-800">{item.effectiveFrom}</strong> →{' '}
                        {item.effectiveTo || 'Present'}
                      </div>
                      <div>
                        Reason: <strong className="text-slate-800">{item.changeReason}</strong>
                      </div>
                      <div>
                        Monthly Gross: <strong className="text-slate-800">${item.monthlyGross.toLocaleString()}</strong>
                      </div>
                    </div>

                    {item.remarks && (
                      <div className="text-xs text-slate-500 italic mt-2">"{item.remarks}"</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setHistoryEmployeeId(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign / Revise Package Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                Assign / Revise Employee Compensation
              </h3>
              <button
                onClick={() => setIsAssignModalOpen(false)}
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

            <form onSubmit={handleSubmitAssignment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employee *</label>
                  <select
                    required
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Salary Structure *
                  </label>
                  <select
                    required
                    value={formData.salaryStructureId}
                    onChange={(e) => handleStructureSelect(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white"
                  >
                    {structures.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Annual CTC ($) *
                  </label>
                  <input
                    type="number"
                    step="100"
                    required
                    value={formData.annualCtc}
                    onChange={(e) => handleCtcChange(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monthly Gross ($)
                  </label>
                  <input
                    type="number"
                    readOnly
                    value={formData.monthlyGross}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Effective From *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.effectiveFrom}
                    onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Change Reason *
                </label>
                <select
                  value={formData.changeReason}
                  onChange={(e) => setFormData({ ...formData, changeReason: e.target.value as CompensationChangeReason })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white"
                >
                  <option value={CompensationChangeReason.NEW_HIRE}>New Hire</option>
                  <option value={CompensationChangeReason.ANNUAL_REVISION}>Annual Revision</option>
                  <option value={CompensationChangeReason.PROMOTION}>Promotion</option>
                  <option value={CompensationChangeReason.MARKET_ADJUSTMENT}>Market Adjustment</option>
                  <option value={CompensationChangeReason.STRUCTURE_MIGRATION}>Structure Migration</option>
                  <option value={CompensationChangeReason.CORRECTION}>Data Correction</option>
                </select>
              </div>

              {/* Component Overrides if Structure Permits */}
              {overrides.length > 0 && (
                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-800">
                    <Unlock className="w-3.5 h-3.5" /> Component-Level Overrides Permitted
                  </div>
                  {overrides.map((ov, idx) => (
                    <div key={ov.salaryComponentId} className="grid grid-cols-3 gap-2 text-xs items-center">
                      <span className="font-medium text-slate-800">{ov.componentName}</span>
                      <input
                        type="number"
                        step="10"
                        value={ov.overrideValue}
                        onChange={(e) => {
                          const updated = [...overrides];
                          updated[idx].overrideValue = parseFloat(e.target.value) || 0;
                          setOverrides(updated);
                        }}
                        className="p-1 text-xs rounded border border-slate-300 font-mono"
                      />
                      <input
                        type="text"
                        placeholder="Reason for custom override..."
                        value={ov.overrideReason}
                        onChange={(e) => {
                          const updated = [...overrides];
                          updated[idx].overrideReason = e.target.value;
                          setOverrides(updated);
                        }}
                        className="p-1 text-xs rounded border border-slate-300"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
                <textarea
                  rows={2}
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Additional notes for payroll documentation..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving Assignment...' : 'Assign Compensation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
