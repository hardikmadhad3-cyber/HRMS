import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
  Eye,
  FileSpreadsheet,
  Layers,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  ShieldAlert,
  ArrowRight,
  Info,
  Clock,
  Sparkles,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useNotification } from '../../context/NotificationContext.js';
import { apiClient } from '../../services/apiClient.js';
import {
  AttendancePeriod,
  AttendancePeriodSummary,
  AttendancePeriodReviewReport,
  FinalizationBlocker,
} from '../../types/period.js';
import {
  DateReconciliationExplanation,
  TimeLeavePeriodSnapshot,
} from '../../types/reconciliation.js';

export function PeriodManagementPage() {
  const { activeCompanyId, user, hasPermission } = useAuth();
  const { showToast } = useNotification();

  const [selectedMonth, setSelectedMonth] = useState<number>(8); // August
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [loading, setLoading] = useState<boolean>(true);
  const [reconciling, setReconciling] = useState<boolean>(false);
  const [finalizing, setFinalizing] = useState<boolean>(false);
  const [reopening, setReopening] = useState<boolean>(false);

  const [report, setReport] = useState<AttendancePeriodReviewReport | null>(null);
  const [snapshots, setSnapshots] = useState<TimeLeavePeriodSnapshot[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'CONFLICTS' | 'LOP' | 'OVERTIME'>('ALL');

  // Employee detail trace modal
  const [selectedEmployeeTrace, setSelectedEmployeeTrace] = useState<{
    employeeId: string;
    employeeName: string;
    employeeCode: string;
    traces: DateReconciliationExplanation[];
  } | null>(null);
  const [traceLoading, setTraceLoading] = useState<boolean>(false);

  // Reopen modal
  const [showReopenModal, setShowReopenModal] = useState<boolean>(false);
  const [reopenReason, setReopenReason] = useState<string>('');

  // Snapshot modal
  const [showSnapshotModal, setShowSnapshotModal] = useState<boolean>(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<TimeLeavePeriodSnapshot | null>(null);

  const fetchPeriodData = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      // 1. Get or create period for year/month
      const periodRes = await apiClient.post<AttendancePeriod>(
        '/api/v1/attendance/periods/get-or-create',
        { year: selectedYear, month: selectedMonth },
        activeCompanyId
      );

      if (periodRes.success && periodRes.data) {
        const period = periodRes.data;

        // 2. Fetch Review Report
        const reportRes = await apiClient.get<AttendancePeriodReviewReport>(
          `/api/v1/attendance/periods/${period.id}/review`,
          {},
          activeCompanyId
        );

        if (reportRes.success && reportRes.data) {
          setReport(reportRes.data);
        }

        // 3. Fetch Snapshots
        const snapRes = await apiClient.get<TimeLeavePeriodSnapshot[]>(
          `/api/reconciliation/snapshots/${period.id}`,
          {},
          activeCompanyId
        );
        if (snapRes.success && snapRes.data) {
          setSnapshots(snapRes.data);
        }
      } else {
        showToast('error', 'Error', periodRes.error || 'Failed to fetch attendance period');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Error loading period data');
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId, selectedMonth, selectedYear, showToast]);

  useEffect(() => {
    fetchPeriodData();
  }, [fetchPeriodData]);

  const shiftMonth = (delta: number) => {
    let newMonth = selectedMonth + delta;
    let newYear = selectedYear;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  // Trigger Leave ↔ Attendance Reconciliation
  const handleReconcile = async () => {
    if (!report?.period || !activeCompanyId) return;
    setReconciling(true);
    try {
      const res = await apiClient.post<{ conflictCount: number; reconciledCount: number }>(
        '/api/reconciliation/reconcile-period',
        { periodId: report.period.id },
        activeCompanyId
      );

      if (res.success) {
        showToast(
          'success',
          'Reconciliation Completed',
          `Reconciled ${res.data?.reconciledCount || 0} employee records. Found ${res.data?.conflictCount || 0} conflicts.`
        );
        await fetchPeriodData();
      } else {
        showToast('error', 'Reconciliation Failed', res.error || 'Unknown error');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Reconciliation failed');
    } finally {
      setReconciling(false);
    }
  };

  // Finalize Period
  const handleFinalize = async (force: boolean = false) => {
    if (!report?.period || !activeCompanyId) return;
    setFinalizing(true);
    try {
      const res = await apiClient.post<AttendancePeriod>(
        `/api/v1/attendance/periods/${report.period.id}/finalize`,
        { forceFinalize: force },
        activeCompanyId
      );

      if (res.success) {
        showToast(
          'success',
          'Period Finalized & Locked',
          `Period ${res.data?.name} successfully finalized. Immutable snapshot archived.`
        );
        await fetchPeriodData();
      } else {
        showToast('error', 'Finalization Failed', res.error || 'Blockers must be resolved before finalization.');
      }
    } catch (err: any) {
      showToast('error', 'Finalization Error', err.message || 'Failed to finalize period');
    } finally {
      setFinalizing(false);
    }
  };

  // Reopen Period
  const handleReopen = async () => {
    if (!report?.period || !activeCompanyId) return;
    if (!reopenReason.trim() || reopenReason.trim().length < 10) {
      showToast('error', 'Validation Error', 'A detailed reason (at least 10 characters) is required to reopen.');
      return;
    }

    setReopening(true);
    try {
      const res = await apiClient.post<AttendancePeriod>(
        `/api/v1/attendance/periods/${report.period.id}/reopen`,
        { reason: reopenReason },
        activeCompanyId
      );

      if (res.success) {
        showToast(
          'success',
          'Period Reopened',
          `Period unlocked to Version ${res.data?.lockVersion}. Direct edits now permitted.`
        );
        setShowReopenModal(false);
        setReopenReason('');
        await fetchPeriodData();
      } else {
        showToast('error', 'Reopen Failed', res.error || 'Could not reopen period');
      }
    } catch (err: any) {
      showToast('error', 'Reopen Error', err.message || 'Failed to reopen period');
    } finally {
      setReopening(false);
    }
  };

  // View Employee Date Trace
  const handleViewTrace = async (summary: AttendancePeriodSummary) => {
    if (!report?.period || !activeCompanyId) return;
    setTraceLoading(true);
    try {
      const res = await apiClient.get<DateReconciliationExplanation[]>(
        '/api/reconciliation/employee-trace',
        {
          employeeId: summary.employeeId,
          startDate: report.period.startDate,
          endDate: report.period.endDate,
        },
        activeCompanyId
      );

      if (res.success && res.data) {
        setSelectedEmployeeTrace({
          employeeId: summary.employeeId,
          employeeName: summary.displayName || summary.employeeName || 'Employee',
          employeeCode: summary.employeeCode || '',
          traces: res.data,
        });
      } else {
        showToast('error', 'Error', res.error || 'Failed to load employee trace');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Trace load failed');
    } finally {
      setTraceLoading(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!report || !report.summaries || report.summaries.length === 0) return;
    const headers = [
      'Employee Code',
      'Employee Name',
      'Calendar Days',
      'Scheduled Work Days',
      'Present Days',
      'Half Days',
      'Weekly Offs',
      'Holidays',
      'Paid Leave Days',
      'Unpaid Leave Days',
      'Loss Of Pay (LOP) Days',
      'Authoritative Payable Days',
      'Overtime (Mins)',
      'Late Arrivals',
      'Status',
    ];

    const rows = report.summaries.map((s) => [
      `"${s.employeeCode || ''}"`,
      `"${s.displayName || s.employeeName || ''}"`,
      s.calendarDays,
      s.scheduledWorkDays,
      s.presentDays,
      s.halfDays,
      s.weeklyOffDays,
      s.holidayDays,
      s.paidLeaveDays ?? 0,
      s.unpaidLeaveDays ?? 0,
      s.lossOfPayDays ?? 0,
      s.payableDays ?? 0,
      s.approvedOvertimeMinutes || s.calculatedOvertimeMinutes || 0,
      s.lateArrivalsCount || 0,
      `"${s.status}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Payroll_Attendance_Summary_${report.period.code}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const filteredSummaries = (report?.summaries || []).filter((s) => {
    const matchesSearch =
      !searchQuery ||
      (s.employeeName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.employeeCode || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedFilter === 'CONFLICTS') return (s.conflictDaysCount || 0) > 0;
    if (selectedFilter === 'LOP') return (s.lossOfPayDays || 0) > 0;
    if (selectedFilter === 'OVERTIME') return (s.approvedOvertimeMinutes || 0) > 0;
    return true;
  });

  const isFinalized = report?.period?.status === 'FINALIZED' || report?.period?.status === 'LOCKED';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Time & Leave Period Reconciliation</h1>
            {report?.period && (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  isFinalized
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}
              >
                {isFinalized ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                {isFinalized ? `FINALIZED (Version ${report.period.lockVersion})` : `OPEN (Draft Version ${report.period.lockVersion})`}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Authoritatively reconciles daily attendance with approved leave to compute exact LOP and payroll payable days.
          </p>
        </div>

        {/* Month Picker Controls */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
          <button
            onClick={() => shiftMonth(-1)}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 px-3 py-1 font-semibold text-gray-800 text-sm">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>
              {monthNames[selectedMonth - 1]} {selectedYear}
            </span>
          </div>
          <button
            onClick={() => shiftMonth(1)}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          {!isFinalized ? (
            <button
              onClick={handleReconcile}
              disabled={reconciling || loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium shadow-sm transition"
            >
              <RefreshCw className={`w-4 h-4 ${reconciling ? 'animate-spin' : ''}`} />
              {reconciling ? 'Reconciling Records...' : 'Reconcile Time & Leave'}
            </button>
          ) : (
            <div className="flex items-center gap-2 text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 text-xs font-medium">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>Period is finalized and immutable. Reopen to re-run reconciliation.</span>
            </div>
          )}

          {snapshots.length > 0 && (
            <button
              onClick={() => {
                setSelectedSnapshot(snapshots[0]);
                setShowSnapshotModal(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition"
            >
              <Layers className="w-4 h-4 text-gray-500" />
              <span>Snapshot Archive ({snapshots.length})</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={!report?.summaries?.length}
            className="inline-flex items-center gap-2 px-3.5 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition"
          >
            <Download className="w-4 h-4 text-gray-500" />
            <span>Export Payroll CSV</span>
          </button>

          {!isFinalized ? (
            <button
              onClick={() => handleFinalize(false)}
              disabled={finalizing || loading || (report?.blockers?.length || 0) > 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium shadow-sm transition"
            >
              <FileCheck className="w-4 h-4" />
              {finalizing ? 'Finalizing...' : 'Finalize Period'}
            </button>
          ) : (
            <button
              onClick={() => setShowReopenModal(true)}
              disabled={reopening || loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium shadow-sm transition"
            >
              <Unlock className="w-4 h-4" />
              <span>Reopen Period</span>
            </button>
          )}
        </div>
      </div>

      {/* Blockers & Alerts Banner */}
      {report?.blockers && report.blockers.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-800 font-semibold">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <span>
                {report.blockers.length} Finalization {report.blockers.length === 1 ? 'Blocker' : 'Blockers'} Found
              </span>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-rose-200 text-rose-900 rounded-full">
              Must be resolved before locking
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {report.blockers.map((b, idx) => (
              <div key={idx} className="bg-white p-3.5 rounded-lg border border-rose-200 text-sm space-y-1">
                <div className="flex items-center justify-between font-medium text-rose-900">
                  <span>{b.type.replace(/_/g, ' ')}</span>
                  <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-bold">
                    {b.count} item{b.count > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{b.message}</p>
                {b.details && b.details.length > 0 && (
                  <div className="text-[11px] text-gray-500 bg-gray-50 p-2 rounded border border-gray-100 font-mono mt-1">
                    {b.details[0].description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Cards */}
      {report?.metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs font-medium text-gray-500 block">Total Employees</span>
            <span className="text-2xl font-bold text-gray-900 mt-1 block">{report.metrics.totalEmployees}</span>
            <span className="text-[11px] text-gray-400 mt-0.5 block">{report.metrics.calendarDays} Calendar Days</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs font-medium text-gray-500 block">Present Days</span>
            <span className="text-2xl font-bold text-emerald-600 mt-1 block">{report.metrics.presentDays}</span>
            <span className="text-[11px] text-gray-400 mt-0.5 block">+{report.metrics.halfDays} Half Days</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs font-medium text-gray-500 block">Paid Leave Days</span>
            <span className="text-2xl font-bold text-indigo-600 mt-1 block">
              {report.metrics.paidLeaveDays ?? 0}
            </span>
            <span className="text-[11px] text-indigo-500 mt-0.5 block">Approved & Covered</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs font-medium text-gray-500 block">Loss of Pay (LOP)</span>
            <span className="text-2xl font-bold text-rose-600 mt-1 block">
              {report.metrics.lossOfPayDays ?? 0}
            </span>
            <span className="text-[11px] text-rose-500 mt-0.5 block">Unpaid Leave + Absent</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs font-medium text-gray-500 block">Payable Days</span>
            <span className="text-2xl font-bold text-blue-700 mt-1 block">
              {report.metrics.payableDays ?? 0}
            </span>
            <span className="text-[11px] text-blue-600 mt-0.5 block">Authoritative Payroll Fact</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs font-medium text-gray-500 block">Approved Overtime</span>
            <span className="text-2xl font-bold text-amber-600 mt-1 block">
              {report.metrics.totalApprovedOvertimeHours}h
            </span>
            <span className="text-[11px] text-gray-400 mt-0.5 block">
              {report.metrics.totalApprovedOvertimeMinutes} mins total
            </span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search employee by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setSelectedFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedFilter === 'ALL'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({report?.summaries?.length || 0})
          </button>
          <button
            onClick={() => setSelectedFilter('CONFLICTS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedFilter === 'CONFLICTS'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            Conflicts ({report?.summaries?.filter((s) => (s.conflictDaysCount || 0) > 0).length || 0})
          </button>
          <button
            onClick={() => setSelectedFilter('LOP')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedFilter === 'LOP'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            LOP Days ({report?.summaries?.filter((s) => (s.lossOfPayDays || 0) > 0).length || 0})
          </button>
          <button
            onClick={() => setSelectedFilter('OVERTIME')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedFilter === 'OVERTIME'
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            Overtime ({report?.summaries?.filter((s) => (s.approvedOvertimeMinutes || 0) > 0).length || 0})
          </button>
        </div>
      </div>

      {/* Reconciled Employee Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-gray-900 text-sm">Employee Reconciliation Ledger</h2>
          </div>
          <span className="text-xs text-gray-500 font-medium">
            Showing {filteredSummaries.length} of {report?.summaries?.length || 0} employees
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="text-sm">Loading attendance period summaries...</span>
          </div>
        ) : filteredSummaries.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            No employee records match the active criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs font-semibold border-b border-gray-200 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-3 py-3 text-center">Calendar</th>
                  <th className="px-3 py-3 text-center">Work Scheduled</th>
                  <th className="px-3 py-3 text-center">Present</th>
                  <th className="px-3 py-3 text-center">Paid Leave</th>
                  <th className="px-3 py-3 text-center">Unpaid Leave</th>
                  <th className="px-3 py-3 text-center text-rose-600">Loss of Pay</th>
                  <th className="px-3 py-3 text-center text-blue-700 font-bold">Payable Days</th>
                  <th className="px-3 py-3 text-center">Overtime</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSummaries.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{s.displayName || s.employeeName}</div>
                      <div className="text-xs text-gray-400 font-mono">{s.employeeCode}</div>
                    </td>
                    <td className="px-3 py-3 text-center font-medium text-gray-600">{s.calendarDays}</td>
                    <td className="px-3 py-3 text-center font-medium text-gray-600">{s.scheduledWorkDays}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-xs">
                        {s.presentDays} {s.halfDays > 0 ? `(+${s.halfDays * 0.5})` : ''}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold text-xs">
                        {s.paidLeaveDays ?? 0}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold text-xs">
                        {s.unpaidLeaveDays ?? 0}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded font-bold text-xs ${
                        (s.lossOfPayDays || 0) > 0 ? 'bg-rose-100 text-rose-700' : 'text-gray-400'
                      }`}>
                        {s.lossOfPayDays ?? 0}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-blue-700 text-sm">
                      {s.payableDays ?? '-'}
                    </td>
                    <td className="px-3 py-3 text-center text-xs">
                      {s.approvedOvertimeMinutes ? (
                        <span className="text-amber-700 font-semibold">{s.approvedOvertimeMinutes}m</span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {(s.conflictDaysCount || 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" />
                          {s.conflictDaysCount} Conflict
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Reconciled
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleViewTrace(s)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 text-gray-700 rounded-lg text-xs font-medium transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Trace</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Employee Trace Explanation Modal */}
      {selectedEmployeeTrace && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                  {selectedEmployeeTrace.employeeName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{selectedEmployeeTrace.employeeName}</h3>
                  <p className="text-xs text-gray-500 font-mono">
                    {selectedEmployeeTrace.employeeCode} • Date-by-Date Leave & Attendance Audit Trace
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmployeeTrace(null)}
                className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500 transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              <div className="text-xs text-gray-500 mb-2">
                Every calendar date cross-references shift rules, raw punches, approved leaves, and ledger consistency:
              </div>

              <div className="space-y-2">
                {selectedEmployeeTrace.traces.map((t, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border text-xs transition ${
                      t.hasConflict
                        ? 'bg-rose-50/70 border-rose-200'
                        : t.hasApprovedLeave
                        ? 'bg-indigo-50/50 border-indigo-200'
                        : t.lossOfPayUnits > 0
                        ? 'bg-amber-50/40 border-amber-200'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 font-mono">{t.date}</span>
                        <span className="text-gray-400 font-medium">({t.dayOfWeek})</span>
                        <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-mono">
                          Shift: {t.shiftCode || 'Standard'}
                        </span>
                        {t.isWeeklyOff && (
                          <span className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                            WEEKLY OFF
                          </span>
                        )}
                        {t.isHoliday && (
                          <span className="bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                            HOLIDAY ({t.holidayName})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 font-mono">
                        <span>Paid: <strong className="text-indigo-600">{t.paidLeaveUnits}</strong></span>
                        <span>LOP: <strong className="text-rose-600">{t.lossOfPayUnits}</strong></span>
                        <span>Payable: <strong className="text-blue-700">{t.payableUnits}</strong></span>
                      </div>
                    </div>

                    <div className="mt-2.5 grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-600 text-[11.5px]">
                      <div>
                        <strong>Attendance Facts:</strong> {t.rawAttendanceStatus} • In:{' '}
                        {t.firstCheckIn ? t.firstCheckIn.slice(11, 16) : 'None'} • Out:{' '}
                        {t.lastCheckOut ? t.lastCheckOut.slice(11, 16) : 'None'} • Net:{' '}
                        {Math.round(t.netWorkMinutes / 60)}h {t.netWorkMinutes % 60}m
                      </div>
                      <div>
                        <strong>Leave Status:</strong>{' '}
                        {t.hasApprovedLeave ? (
                          <span className="text-indigo-700 font-medium">
                            Approved {t.leaveTypeCode} ({t.leavePaidType}) [{t.leaveUnit}]
                          </span>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 text-gray-700 bg-white/80 p-2 rounded border border-gray-200/60 font-sans flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <span>{t.reconciliationNote}</span>
                    </div>

                    {t.hasConflict && (
                      <div className="mt-2 text-rose-700 bg-rose-100/80 p-2 rounded border border-rose-300 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong>{t.conflictType}:</strong> {t.conflictDetails}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedEmployeeTrace(null)}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition"
              >
                Close Audit Trace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snapshot Version Archive Modal */}
      {showSnapshotModal && selectedSnapshot && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <Layers className="w-6 h-6 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-gray-900">
                    Snapshot Archive (Version {selectedSnapshot.version})
                  </h3>
                  <p className="text-xs text-gray-500">
                    Finalized on {selectedSnapshot.finalizedAt?.slice(0, 10)} by {selectedSnapshot.finalizedByName || 'Admin'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSnapshotModal(false)}
                className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500 transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4 text-sm">
              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl text-indigo-900 text-xs">
                This snapshot represents the permanent, audit-compliant materialization used for payroll disbursements.
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-gray-800">Snapshot Versions Available:</h4>
                <div className="flex flex-wrap gap-2">
                  {snapshots.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSnapshot(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        selectedSnapshot.id === s.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Version {s.version} ({s.summariesCount} records)
                    </button>
                  ))}
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="p-3 bg-gray-50 font-semibold text-xs border-b">
                  Archived Summaries in Snapshot v{selectedSnapshot.version}
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 text-xs">
                  {selectedSnapshot.summaries.map((sum) => (
                    <div key={sum.id} className="p-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-gray-900">{sum.displayName || sum.employeeName}</span>
                        <span className="text-gray-400 font-mono ml-2">({sum.employeeCode})</span>
                      </div>
                      <div className="font-mono">
                        Present: {sum.presentDays} • Paid Leave: {sum.paidLeaveDays} • LOP: {sum.lossOfPayDays} • Payable: <strong>{sum.payableDays}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
              <button
                onClick={() => setShowSnapshotModal(false)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Confirmation Modal */}
      {showReopenModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="font-bold text-gray-900 text-lg">Reopen Finalized Period</h3>
            </div>

            <p className="text-sm text-gray-600">
              Reopening this period will bump the version to <strong>v{(report?.period?.lockVersion || 1) + 1}</strong> and unlock daily attendance and leave records for editing.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700">
                Reason for Reopening <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="e.g. Retroactive medical leave regularization approved for employee EMP-003."
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
              <span className="text-[11px] text-gray-400">Must be at least 10 characters for audit compliance.</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowReopenModal(false)}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-50 rounded-lg text-sm font-medium text-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReopen}
                disabled={reopening || reopenReason.trim().length < 10}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
              >
                {reopening ? 'Reopening...' : 'Confirm Reopen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
