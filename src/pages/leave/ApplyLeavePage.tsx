import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Paperclip,
  Calendar,
  Layers,
  ArrowRight,
  Info,
  Sparkles,
  ChevronRight,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { PermissionKey } from '../../types/auth.js';
import { leaveApi } from '../../services/leaveApi.js';
import { apiClient } from '../../services/apiClient.js';
import {
  LeaveType,
  EmployeeLeaveBalance,
  LeaveCalculationResult,
  LeaveUnit,
  HalfDayPeriod,
  CreateLeaveRequestDTO,
  LeaveYear,
} from '../../types/leave.js';
import { PageHeader } from '../../components/shell/PageHeader.js';
import { useNotification } from '../../context/NotificationContext.js';

export function ApplyLeavePage() {
  const { user, activeCompanyId, hasPermission } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  // Master data
  const [loadingMasters, setLoadingMasters] = useState(true);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<EmployeeLeaveBalance[]>([]);
  const [activeYear, setActiveYear] = useState<LeaveYear | null>(null);
  const [employees, setEmployees] = useState<{ id: string; name: string; employeeCode: string }[]>([]);

  // Form State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(user?.employeeId || '');
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [unit, setUnit] = useState<LeaveUnit>('FULL_DAY');
  const [halfDayPeriod, setHalfDayPeriod] = useState<HalfDayPeriod>('FIRST_HALF');
  const [reason, setReason] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  // Calculation State
  const [calculating, setCalculating] = useState<boolean>(false);
  const [calcResult, setCalcResult] = useState<LeaveCalculationResult | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const isManagerOrAdmin = hasPermission(PermissionKey.LEAVE_MANAGE) || hasPermission(PermissionKey.EMPLOYEE_MANAGE);

  // Load master data
  useEffect(() => {
    async function loadData() {
      if (!activeCompanyId) return;
      setLoadingMasters(true);
      try {
        const [typesRes, yearsRes] = await Promise.all([
          leaveApi.getTypes({ status: 'ACTIVE' }, activeCompanyId),
          leaveApi.getYears(activeCompanyId),
        ]);

        if (typesRes.success && typesRes.data) {
          setLeaveTypes(typesRes.data);
          if (typesRes.data.length > 0 && !selectedLeaveTypeId) {
            setSelectedLeaveTypeId(typesRes.data[0].id);
          }
        }

        if (yearsRes.success && yearsRes.data) {
          const current = yearsRes.data.find((y) => y.isDefault && y.status === 'ACTIVE') || yearsRes.data[0];
          setActiveYear(current || null);
        }

        if (isManagerOrAdmin) {
          const empRes = await apiClient.get<any[]>('/api/v1/employees', { limit: 200 }, activeCompanyId);
          if (empRes.success && empRes.data) {
            const list = Array.isArray(empRes.data) ? empRes.data : (empRes.data as any).data || [];
            setEmployees(
              list.map((e: any) => ({
                id: e.id,
                name: `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.user?.fullName || 'Employee',
                employeeCode: e.employeeCode || '',
              }))
            );
          }
        }
      } catch (err: any) {
        addNotification({
          type: 'error',
          title: 'Load Error',
          message: err?.message || 'Could not load leave configuration.',
        });
      } finally {
        setLoadingMasters(false);
      }
    }

    loadData();
  }, [activeCompanyId, isManagerOrAdmin, addNotification]);

  // Load employee balances when employee or year changes
  const targetEmployeeId = isManagerOrAdmin && selectedEmployeeId ? selectedEmployeeId : user?.employeeId;

  const loadBalances = useCallback(async () => {
    if (!targetEmployeeId || !activeCompanyId) return;
    try {
      const res = await leaveApi.getEmployeeBalances(targetEmployeeId, activeYear?.id, activeCompanyId);
      if (res.success && res.data) {
        setBalances(res.data);
      }
    } catch (err) {
      console.error('Failed to load employee balances', err);
    }
  }, [targetEmployeeId, activeYear?.id, activeCompanyId]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  // Run real-time calculation when dates, type, unit, halfDay change
  useEffect(() => {
    async function calculate() {
      if (!selectedLeaveTypeId || !fromDate || !toDate || !activeCompanyId) {
        setCalcResult(null);
        return;
      }

      setCalculating(true);
      try {
        const res = await leaveApi.calculateLeave(
          {
            employeeId: targetEmployeeId || undefined,
            leaveTypeId: selectedLeaveTypeId,
            fromDate,
            toDate,
            unit,
            halfDayPeriod: unit === 'HALF_DAY' ? halfDayPeriod : undefined,
          },
          activeCompanyId
        );

        if (res.success && res.data) {
          setCalcResult(res.data);
        } else {
          setCalcResult(null);
        }
      } catch (err) {
        console.error('Failed to calculate leave duration', err);
        setCalcResult(null);
      } finally {
        setCalculating(false);
      }
    }

    const timer = setTimeout(calculate, 200);
    return () => clearTimeout(timer);
  }, [targetEmployeeId, selectedLeaveTypeId, fromDate, toDate, unit, halfDayPeriod, activeCompanyId]);

  const selectedType = leaveTypes.find((t) => t.id === selectedLeaveTypeId);
  const selectedBalance = balances.find((b) => b.leaveTypeId === selectedLeaveTypeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaveTypeId) {
      addNotification({ type: 'warning', title: 'Validation', message: 'Please select a leave type.' });
      return;
    }
    if (!fromDate || !toDate) {
      addNotification({ type: 'warning', title: 'Validation', message: 'Please specify start and end dates.' });
      return;
    }
    if (new Date(fromDate) > new Date(toDate)) {
      addNotification({ type: 'error', title: 'Validation', message: 'From date cannot be after To date.' });
      return;
    }
    if (selectedType?.requiresReason && !reason.trim()) {
      addNotification({ type: 'warning', title: 'Validation', message: 'A reason is required for this leave type.' });
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateLeaveRequestDTO = {
        employeeId: isManagerOrAdmin && selectedEmployeeId ? selectedEmployeeId : undefined,
        leaveTypeId: selectedLeaveTypeId,
        fromDate,
        toDate,
        unit,
        halfDayPeriod: unit === 'HALF_DAY' ? halfDayPeriod : undefined,
        reason: reason.trim(),
        attachments: fileName
          ? [
              {
                id: 'att-' + Date.now(),
                fileName: fileName,
                fileUrl: '/uploads/' + fileName,
                fileSizeBytes: 102400,
                mimeType: 'application/pdf',
                uploadedAt: new Date().toISOString(),
              },
            ]
          : undefined,
      };

      const res = await leaveApi.createRequest(payload, activeCompanyId);
      if (res.success && res.data) {
        addNotification({
          type: 'success',
          title: 'Leave Request Submitted',
          message: `Request for ${res.data.chargeableDays} days submitted successfully (Status: ${res.data.status}).`,
        });
        navigate('/leave/requests');
      } else {
        addNotification({
          type: 'error',
          title: 'Submission Failed',
          message: res.error || 'Failed to submit leave request.',
        });
      }
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: err?.message || 'An unexpected error occurred.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Apply for Leave"
        subtitle="Submit a new leave application with real-time balance validation, sandwich rule calculation, and audit trail."
        actions={
          <button
            onClick={() => navigate('/leave/requests')}
            className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
            <span>View My Requests</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-5">
            {/* Manager: Employee Selector */}
            {isManagerOrAdmin && employees.length > 0 && (
              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Applying on behalf of Employee (Manager / Admin override)
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-blue-600"
                >
                  <option value={user?.employeeId || ''}>Myself ({user?.fullName})</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Leave Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Select Leave Type *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {leaveTypes.map((lt) => {
                  const isSelected = selectedLeaveTypeId === lt.id;
                  const bal = balances.find((b) => b.leaveTypeId === lt.id);
                  return (
                    <div
                      key={lt.id}
                      onClick={() => setSelectedLeaveTypeId(lt.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: lt.color || '#3B82F6' }}
                        />
                        <span className="font-bold text-xs text-slate-900 line-clamp-1">{lt.name}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span className="font-mono font-semibold text-slate-500">{lt.code}</span>
                        <span
                          className={`font-semibold ${
                            (bal?.availableBalance || 0) > 0 ? 'text-emerald-600' : 'text-slate-500'
                          }`}
                        >
                          {bal ? `${bal.availableBalance} days` : '0 days'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Date Range Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">From Date *</label>
                <input
                  type="date"
                  required
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    if (e.target.value > toDate) {
                      setToDate(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">To Date *</label>
                <input
                  type="date"
                  required
                  min={fromDate}
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono focus:outline-blue-600"
                />
              </div>
            </div>

            {/* Units & Half Day selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Duration Unit</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as LeaveUnit)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="FULL_DAY">Full Day</option>
                  {selectedType?.unit !== 'FULL_DAY' && <option value="HALF_DAY">Half Day (0.5)</option>}
                  {selectedType?.unit === 'HOURS' && <option value="HOURS">Hourly</option>}
                </select>
              </div>

              {unit === 'HALF_DAY' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Half Day Period</label>
                  <select
                    value={halfDayPeriod}
                    onChange={(e) => setHalfDayPeriod(e.target.value as HalfDayPeriod)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="FIRST_HALF">First Half (Morning Session)</option>
                    <option value="SECOND_HALF">Second Half (Afternoon Session)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason / Justification {selectedType?.requiresReason && '*'}
              </label>
              <textarea
                rows={3}
                required={selectedType?.requiresReason}
                placeholder="Provide context or operational handover notes for your approver..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-blue-600"
              />
            </div>

            {/* Attachment */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Supporting Attachment {selectedType?.requiresAttachment ? '(Required for > 2 days)' : '(Optional)'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. medical_certificate_2026.pdf"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setFileName('medical_doc_' + Date.now().toString().slice(-4) + '.pdf')}
                  className="px-3 py-2 text-xs border border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Attach Sample</span>
                </button>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => navigate('/leave')}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || (calcResult && !calcResult.eligible && calcResult.ineligibilityReasons.length > 0)}
                className="px-5 py-2 text-xs font-bold text-white bg-[#17365D] hover:bg-[#122b4a] rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Submitting...' : 'Submit Application'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right 1 Col: Real-Time Calculation & Balance Card */}
        <div className="space-y-5">
          {/* Balance Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Balance Overview</span>
              </h3>
              <span className="font-mono text-[11px] text-slate-500 font-bold">
                {selectedType?.code || 'CL'}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Opening Balance:</span>
                <span className="font-bold text-slate-800">{selectedBalance?.openingBalance || 0}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Accrued / Credited:</span>
                <span className="font-bold text-emerald-600">
                  +{(selectedBalance?.accruedBalance || 0) + (selectedBalance?.adjustmentCredit || 0)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Used / Consumed:</span>
                <span className="font-bold text-rose-600">-{selectedBalance?.consumedBalance || 0}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Pending Reservations:</span>
                <span className="font-bold text-amber-600">{selectedBalance?.reservedBalance || 0}</span>
              </div>
              <div className="flex justify-between py-2 bg-slate-50 px-2.5 rounded-lg border border-slate-100 font-bold">
                <span className="text-slate-900">Available Balance:</span>
                <span className="text-blue-700 text-sm">{selectedBalance?.availableBalance || 0} days</span>
              </div>
            </div>
          </div>

          {/* Dynamic Calculation Engine Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Duration Breakdown</span>
              </h3>
              {calculating && <Clock className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
            </div>

            {calcResult ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-slate-50 rounded-lg text-center border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Total Days</div>
                    <div className="text-base font-bold text-slate-900 mt-0.5">{calcResult.totalDaysInRange}</div>
                  </div>
                  <div className="p-2.5 bg-blue-50 rounded-lg text-center border border-blue-100">
                    <div className="text-[10px] font-bold text-blue-600 uppercase">Chargeable Units</div>
                    <div className="text-base font-bold text-blue-900 mt-0.5">{calcResult.chargeableUnits}</div>
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px] pt-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Working Days:</span>
                    <span className="font-semibold text-slate-800">{calcResult.workingDays}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Weekly Offs Excluded:</span>
                    <span className="font-semibold text-slate-800">{calcResult.weeklyOffsCount}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Holidays Excluded:</span>
                    <span className="font-semibold text-slate-800">{calcResult.holidaysCount}</span>
                  </div>
                  {calcResult.sandwichDaysCount > 0 && (
                    <div className="flex justify-between text-amber-700 font-semibold bg-amber-50 px-2 py-1 rounded">
                      <span>Sandwich Days Chargeable:</span>
                      <span>+{calcResult.sandwichDaysCount}</span>
                    </div>
                  )}
                </div>

                {/* Eligibility Validation warning */}
                {!calcResult.eligible && calcResult.ineligibilityReasons?.length > 0 && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Policy Ineligibility</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                      {calcResult.ineligibilityReasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Day-by-Day Detail Accordion */}
                <div className="pt-2">
                  <div className="font-bold text-slate-800 text-[11px] mb-1.5">Day-by-Day Audit:</div>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {calcResult.dateBreakdown.map((d, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between px-2 py-1 rounded text-[10px] font-mono border ${
                          d.isChargeable
                            ? 'bg-blue-50/60 border-blue-200 text-blue-900'
                            : 'bg-slate-50 border-slate-200 text-slate-500 line-through'
                        }`}
                      >
                        <span>
                          {d.date} ({d.dayOfWeek.slice(0, 3)})
                        </span>
                        <span className="font-semibold">{d.chargeableUnits}u</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 text-center py-6">
                Select dates to see live duration calculation & sandwich analysis.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
