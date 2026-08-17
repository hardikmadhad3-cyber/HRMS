import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Sparkles,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  History,
  Play,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  X,
  Sliders,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { PermissionKey } from '../../types/auth.js';
import { leaveApi } from '../../services/leaveApi.js';
import { apiClient } from '../../services/apiClient.js';
import {
  EmployeeLeaveBalance,
  LeaveLedgerEntry,
  LeaveAccrualLog,
  LeaveType,
  LeaveYear,
  PostOpeningBalanceDTO,
  PostManualAdjustmentDTO,
  PostAccrualRunDTO,
} from '../../types/leave.js';
import { PageHeader } from '../../components/shell/PageHeader.js';
import { useNotification } from '../../context/NotificationContext.js';

export function LeaveBalancesPage() {
  const { activeCompanyId, hasPermission } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'balances' | 'ledger' | 'accruals'>('balances');
  const [loading, setLoading] = useState(true);

  // Masters
  const [years, setYears] = useState<LeaveYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Balances Tab State
  const [balances, setBalances] = useState<EmployeeLeaveBalance[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // Ledger Tab State
  const [ledgerEntries, setLedgerEntries] = useState<LeaveLedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState<boolean>(false);
  const [ledgerFilterType, setLedgerFilterType] = useState<string>('');

  // Accrual Tab State
  const [accrualLogs, setAccrualLogs] = useState<LeaveAccrualLog[]>([]);
  const [accrualPeriod, setAccrualPeriod] = useState<string>(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );
  const [runningAccrual, setRunningAccrual] = useState<boolean>(false);
  const [accrualDryRun, setAccrualDryRun] = useState<boolean>(false);

  // Modals State
  const [showOpeningModal, setShowOpeningModal] = useState(false);
  const [openingForm, setOpeningForm] = useState<PostOpeningBalanceDTO>({
    employeeId: '',
    leaveTypeId: '',
    quantity: 0,
    effectiveDate: new Date().toISOString().split('T')[0],
    remarks: 'Initial opening leave balance',
  });

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustForm, setAdjustForm] = useState<PostManualAdjustmentDTO>({
    employeeId: '',
    leaveTypeId: '',
    adjustmentType: 'CREDIT',
    quantity: 1,
    effectiveDate: new Date().toISOString().split('T')[0],
    remarks: '',
  });

  const canManageLeaves = hasPermission(PermissionKey.LEAVE_MANAGE);

  // Initial Data Load
  useEffect(() => {
    async function loadMasters() {
      if (!activeCompanyId) return;
      try {
        const [yearsRes, typesRes, empRes] = await Promise.all([
          leaveApi.getYears(activeCompanyId),
          leaveApi.getTypes(undefined, activeCompanyId),
          apiClient.get<any[]>('/api/v1/employees', { limit: 200 }, activeCompanyId),
        ]);

        if (yearsRes.success && yearsRes.data) {
          setYears(yearsRes.data);
          const active = yearsRes.data.find((y) => y.isDefault && y.status === 'ACTIVE') || yearsRes.data[0];
          if (active && !selectedYearId) {
            setSelectedYearId(active.id);
          }
        }
        if (typesRes.success && typesRes.data) {
          setTypes(typesRes.data);
        }
        if (empRes.success && empRes.data) {
          const list = Array.isArray(empRes.data) ? empRes.data : (empRes.data as any).data || [];
          setEmployees(
            list.map((e: any) => ({
              id: e.id,
              name: `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.user?.fullName || 'Employee',
              employeeCode: e.employeeCode || '',
              departmentName: e.department?.name || '',
            }))
          );
        }
      } catch (err: any) {
        console.error('Failed to load masters', err);
      }
    }
    loadMasters();
  }, [activeCompanyId]);

  // Fetch Balances
  const fetchBalances = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      if (selectedEmployeeId) {
        const res = await leaveApi.getEmployeeBalances(selectedEmployeeId, selectedYearId || undefined, activeCompanyId);
        if (res.success && res.data) {
          setBalances(res.data);
        }
      } else {
        // If no single employee selected, fetch for current user or all available
        const res = await leaveApi.getMyBalances(selectedYearId || undefined, activeCompanyId);
        if (res.success && res.data) {
          setBalances(res.data);
        }
      }
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: err?.message || 'Could not load leave balances.',
      });
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId, selectedEmployeeId, selectedYearId, addNotification]);

  // Fetch Ledger
  const fetchLedger = useCallback(async () => {
    if (!activeCompanyId) return;
    setLedgerLoading(true);
    try {
      const res = await leaveApi.getLedger(
        {
          employeeId: selectedEmployeeId || undefined,
          leaveTypeId: selectedTypeId || undefined,
          leaveYearId: selectedYearId || undefined,
          transactionType: ledgerFilterType || undefined,
        },
        activeCompanyId
      );
      if (res.success && res.data) {
        setLedgerEntries(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load ledger', err);
    } finally {
      setLedgerLoading(false);
    }
  }, [activeCompanyId, selectedEmployeeId, selectedTypeId, selectedYearId, ledgerFilterType]);

  // Fetch Accruals
  const fetchAccruals = useCallback(async () => {
    if (!activeCompanyId) return;
    try {
      const res = await leaveApi.getAccrualLogs(undefined, activeCompanyId);
      if (res.success && res.data) {
        setAccrualLogs(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load accrual logs', err);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    if (activeTab === 'balances') {
      fetchBalances();
    } else if (activeTab === 'ledger') {
      fetchLedger();
    } else if (activeTab === 'accruals') {
      fetchAccruals();
    }
  }, [activeTab, fetchBalances, fetchLedger, fetchAccruals]);

  // Handle Post Opening
  const handlePostOpening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openingForm.employeeId || !openingForm.leaveTypeId) {
      addNotification({ type: 'warning', title: 'Validation', message: 'Employee and Leave Type are required.' });
      return;
    }

    try {
      const res = await leaveApi.postOpeningBalance(
        {
          ...openingForm,
          leaveYearId: selectedYearId || undefined,
        },
        activeCompanyId
      );
      if (res.success) {
        addNotification({
          type: 'success',
          title: 'Opening Balance Posted',
          message: `Posted ${openingForm.quantity} days opening balance.`,
        });
        setShowOpeningModal(false);
        fetchBalances();
      } else {
        addNotification({ type: 'error', title: 'Failed', message: res.error });
      }
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error', message: err?.message });
    }
  };

  // Handle Post Manual Adjustment
  const handlePostAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustForm.employeeId || !adjustForm.leaveTypeId || !adjustForm.remarks.trim()) {
      addNotification({
        type: 'warning',
        title: 'Validation',
        message: 'Employee, Leave Type, and Mandatory Reason are required.',
      });
      return;
    }

    try {
      const res = await leaveApi.postManualAdjustment(
        {
          ...adjustForm,
          leaveYearId: selectedYearId || undefined,
        },
        activeCompanyId
      );
      if (res.success) {
        addNotification({
          type: 'success',
          title: 'Adjustment Recorded',
          message: `Recorded ${adjustForm.adjustmentType} of ${adjustForm.quantity} days with ledger audit trail.`,
        });
        setShowAdjustModal(false);
        setAdjustForm({
          employeeId: '',
          leaveTypeId: '',
          adjustmentType: 'CREDIT',
          quantity: 1,
          effectiveDate: new Date().toISOString().split('T')[0],
          remarks: '',
        });
        fetchBalances();
      } else {
        addNotification({ type: 'error', title: 'Adjustment Failed', message: res.error });
      }
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error', message: err?.message });
    }
  };

  // Handle Rebuild Single Balance
  const handleRebuildBalance = async (b: EmployeeLeaveBalance) => {
    try {
      const res = await leaveApi.rebuildBalance(
        {
          employeeId: b.employeeId,
          leaveTypeId: b.leaveTypeId,
          leaveYearId: b.leaveYearId,
        },
        activeCompanyId
      );
      if (res.success) {
        addNotification({
          type: 'success',
          title: 'Balance Rebuilt',
          message: `Rebuilt ${b.leaveTypeCode} balance from immutable ledger.`,
        });
        fetchBalances();
      } else {
        addNotification({ type: 'error', title: 'Rebuild Failed', message: res.error });
      }
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error', message: err?.message });
    }
  };

  // Handle Run Accrual
  const handleRunAccrual = async () => {
    if (!accrualPeriod) return;
    setRunningAccrual(true);
    try {
      const payload: PostAccrualRunDTO = {
        accrualPeriod,
        leaveYearId: selectedYearId || undefined,
        dryRun: accrualDryRun,
      };

      const res = await leaveApi.runAccrual(payload, activeCompanyId);
      if (res.success) {
        addNotification({
          type: 'success',
          title: accrualDryRun ? 'Accrual Simulation Complete' : 'Accrual Run Completed',
          message: `Processed ${res.data?.totalProcessed || 0} entitlements (${res.data?.totalUnits || 0} units).`,
        });
        fetchAccruals();
      } else {
        addNotification({ type: 'error', title: 'Accrual Run Failed', message: res.error });
      }
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error', message: err?.message });
    } finally {
      setRunningAccrual(false);
    }
  };

  // Filtered Balances
  const filteredBalances = balances.filter((b) => {
    if (selectedTypeId && b.leaveTypeId !== selectedTypeId) return false;
    if (search) {
      const s = search.toLowerCase();
      const matchType = b.leaveTypeName?.toLowerCase().includes(s) || b.leaveTypeCode?.toLowerCase().includes(s);
      const matchEmp = b.employeeName?.toLowerCase().includes(s) || b.employeeCode?.toLowerCase().includes(s);
      if (!matchType && !matchEmp) return false;
    }
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Leave Balances & Immutable Ledger"
        subtitle="Auditable leave balance movements, ledger postings, accrual execution runs, and manual balance adjustments."
        actions={
          <div className="flex items-center gap-2">
            {canManageLeaves && (
              <>
                <button
                  onClick={() => {
                    if (selectedEmployeeId) setOpeningForm((f) => ({ ...f, employeeId: selectedEmployeeId }));
                    setShowOpeningModal(true);
                  }}
                  className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-500" />
                  <span>Post Opening</span>
                </button>
                <button
                  onClick={() => {
                    if (selectedEmployeeId) setAdjustForm((f) => ({ ...f, employeeId: selectedEmployeeId }));
                    setShowAdjustModal(true);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-[#17365D] hover:bg-[#122b4a] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Manual Adjustment</span>
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Tabs Bar */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('balances')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'balances'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Balance Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'ledger'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Transaction Ledger</span>
          </button>
          {canManageLeaves && (
            <button
              onClick={() => setActiveTab('accruals')}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'accruals'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Accrual Runner</span>
            </button>
          )}
        </div>

        {/* Global Leave Year Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500">Leave Year:</span>
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono font-semibold"
          >
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.code} ({y.name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TAB 1: BALANCES OVERVIEW */}
      {activeTab === 'balances' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3 justify-between">
            <div className="flex-1 w-full md:w-auto relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search leave types or employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-blue-600"
              />
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              {canManageLeaves && (
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 max-w-xs"
                >
                  <option value="">My Self-Service Balances</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              )}

              <select
                value={selectedTypeId}
                onChange={(e) => setSelectedTypeId(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700"
              >
                <option value="">All Leave Types</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code})
                  </option>
                ))}
              </select>

              <button
                onClick={fetchBalances}
                className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 cursor-pointer"
                title="Refresh Balances"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Balances Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Leave Type</th>
                    <th className="py-3 px-4 text-right">Opening</th>
                    <th className="py-3 px-4 text-right">Accrued</th>
                    <th className="py-3 px-4 text-right">Carry Fwd</th>
                    <th className="py-3 px-4 text-right">Adjustments</th>
                    <th className="py-3 px-4 text-right">Consumed</th>
                    <th className="py-3 px-4 text-right">Reserved</th>
                    <th className="py-3 px-4 text-right bg-blue-50/50 text-blue-900">Available</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 font-sans">
                        Loading leave balances...
                      </td>
                    </tr>
                  ) : filteredBalances.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 font-sans">
                        No balance records found. Post opening balances or run monthly accrual.
                      </td>
                    </tr>
                  ) : (
                    filteredBalances.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-sans">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: b.color || '#3B82F6' }}
                            />
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{b.leaveTypeName || b.leaveTypeCode}</span>
                                <span className="font-mono text-[10px] px-1.5 py-0.2 bg-slate-100 rounded text-slate-700">
                                  {b.leaveTypeCode}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 font-sans">
                                {b.employeeName && `${b.employeeName} • `}
                                {b.paidType}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-600 font-semibold">{b.openingBalance}</td>
                        <td className="py-3.5 px-4 text-right text-emerald-600 font-semibold">+{b.accruedBalance}</td>
                        <td className="py-3.5 px-4 text-right text-slate-600">{b.carryForwardBalance}</td>
                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={
                              b.adjustmentCredit >= b.adjustmentDebit ? 'text-emerald-600' : 'text-rose-600'
                            }
                          >
                            {b.adjustmentCredit - b.adjustmentDebit > 0 ? '+' : ''}
                            {b.adjustmentCredit - b.adjustmentDebit}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-rose-600 font-semibold">-{b.consumedBalance}</td>
                        <td className="py-3.5 px-4 text-right text-amber-600 font-semibold">{b.reservedBalance}</td>
                        <td className="py-3.5 px-4 text-right bg-blue-50/50 font-bold text-blue-900 text-sm font-sans">
                          {b.availableBalance} days
                        </td>
                        <td className="py-3.5 px-4 text-right font-sans">
                          <button
                            onClick={() => handleRebuildBalance(b)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                            title="Rebuild Balance from Ledger"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TRANSACTION LEDGER */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-800">
                Immutable Transaction Log ({ledgerEntries.length} entries)
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={ledgerFilterType}
                onChange={(e) => setLedgerFilterType(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700"
              >
                <option value="">All Transaction Types</option>
                <option value="OPENING">OPENING</option>
                <option value="ACCRUAL">ACCRUAL</option>
                <option value="LEAVE_CONSUMPTION">LEAVE_CONSUMPTION</option>
                <option value="LEAVE_REVERSAL">LEAVE_REVERSAL</option>
                <option value="ADJUSTMENT_CREDIT">ADJUSTMENT_CREDIT</option>
                <option value="ADJUSTMENT_DEBIT">ADJUSTMENT_DEBIT</option>
                <option value="CARRY_FORWARD">CARRY_FORWARD</option>
              </select>

              <button
                onClick={fetchLedger}
                className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 cursor-pointer"
                title="Refresh Ledger"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Leave Type</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Quantity</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledgerLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Loading transaction ledger...
                      </td>
                    </tr>
                  ) : ledgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No transactions recorded yet in this leave year.
                      </td>
                    </tr>
                  ) : (
                    ledgerEntries.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-600">{l.effectiveDate}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{l.employeeName || 'Employee'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{l.employeeCode}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-slate-800">{l.leaveTypeCode}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {l.transactionType}
                          </span>
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono font-bold ${
                            l.quantity >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {l.quantity >= 0 ? `+${l.quantity}` : l.quantity}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{l.referenceType}</td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{l.remarks || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ACCRUAL ENGINE */}
      {activeTab === 'accruals' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Play className="w-4 h-4 text-blue-600" />
                  <span>Execute Leave Accrual Engine</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Runs entitlement calculations per employee policy rules for monthly or annual frequencies.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Accrual Period (YYYY-MM) *</label>
                <input
                  type="month"
                  value={accrualPeriod}
                  onChange={(e) => setAccrualPeriod(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="chk-dry-run"
                  checked={accrualDryRun}
                  onChange={(e) => setAccrualDryRun(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                <label htmlFor="chk-dry-run" className="text-slate-700 font-medium cursor-pointer">
                  Dry Run Simulation (Preview only, no ledger mutations)
                </label>
              </div>

              <div className="flex items-end justify-end">
                <button
                  type="button"
                  disabled={runningAccrual}
                  onClick={handleRunAccrual}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#17365D] hover:bg-[#122b4a] rounded-lg shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{runningAccrual ? 'Processing...' : accrualDryRun ? 'Simulate Accrual' : 'Run Accrual Batch'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Accrual Execution History */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-bold text-xs text-slate-900">Accrual Run Execution Trail</h4>
              <button onClick={fetchAccruals} className="text-xs text-blue-600 hover:underline">
                Refresh Log
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Run Key</th>
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-4">Leave Type</th>
                    <th className="py-3 px-4 text-right">Processed Count</th>
                    <th className="py-3 px-4 text-right">Total Units Accrued</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accrualLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No accrual batches executed yet.
                      </td>
                    </tr>
                  ) : (
                    accrualLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors font-mono">
                        <td className="py-3 px-4 font-semibold text-slate-800">{log.accrualRunKey}</td>
                        <td className="py-3 px-4 text-slate-600">{log.accrualPeriod}</td>
                        <td className="py-3 px-4 text-slate-800">{log.leaveTypeCode || 'All Types'}</td>
                        <td className="py-3 px-4 text-right">{log.totalEmployeesProcessed}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">
                          +{log.totalUnitsAccrued}
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">{log.createdAt}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Post Opening Balance */}
      {showOpeningModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Post Opening Leave Balance</span>
              </h3>
              <button onClick={() => setShowOpeningModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">
                ×
              </button>
            </div>

            <form onSubmit={handlePostOpening} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Employee *</label>
                <select
                  required
                  value={openingForm.employeeId}
                  onChange={(e) => setOpeningForm({ ...openingForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">Select Employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Leave Type *</label>
                <select
                  required
                  value={openingForm.leaveTypeId}
                  onChange={(e) => setOpeningForm({ ...openingForm, leaveTypeId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">Select Leave Type...</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Opening Quantity (Days) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={openingForm.quantity}
                    onChange={(e) => setOpeningForm({ ...openingForm, quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Effective Date</label>
                  <input
                    type="date"
                    required
                    value={openingForm.effectiveDate}
                    onChange={(e) => setOpeningForm({ ...openingForm, effectiveDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Migration opening balance"
                  value={openingForm.remarks}
                  onChange={(e) => setOpeningForm({ ...openingForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOpeningModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#17365D] text-white font-bold hover:bg-[#122b4a] cursor-pointer"
                >
                  Save & Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Manual Adjustment */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-600" />
                <span>Record Manual Balance Adjustment</span>
              </h3>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">
                ×
              </button>
            </div>

            <form onSubmit={handlePostAdjustment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Employee *</label>
                <select
                  required
                  value={adjustForm.employeeId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">Select Employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Leave Type *</label>
                <select
                  required
                  value={adjustForm.leaveTypeId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, leaveTypeId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">Select Leave Type...</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Adjustment Action *</label>
                  <select
                    value={adjustForm.adjustmentType}
                    onChange={(e) =>
                      setAdjustForm({ ...adjustForm, adjustmentType: e.target.value as 'CREDIT' | 'DEBIT' })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    <option value="CREDIT">+ Credit (Add Days)</option>
                    <option value="DEBIT">- Debit (Deduct Days)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity (Days) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    value={adjustForm.quantity}
                    onChange={(e) => setAdjustForm({ ...adjustForm, quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Audit Reason / Justification *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Explain why this balance adjustment is being made..."
                  value={adjustForm.remarks}
                  onChange={(e) => setAdjustForm({ ...adjustForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#17365D] text-white font-bold hover:bg-[#122b4a] cursor-pointer"
                >
                  Record Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
