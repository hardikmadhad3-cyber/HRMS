import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  UserCheck,
  Building,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileEdit,
  ArrowUpDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useNotification } from '../../context/NotificationContext.js';
import { apiClient } from '../../services/apiClient.js';
import { attendanceApi } from '../../services/attendanceApi.js';
import {
  DailyAttendance,
  AttendanceSummaryMetrics,
  AttendanceStatus,
} from '../../types/attendance.js';
import { Department, Branch } from '../../types/organization.js';

export function DailyAttendancePage() {
  const { activeCompanyId, hasPermission } = useAuth();
  const { showToast } = useNotification();

  // State
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return '2026-08-14'; // Default to today's date in demo system
  });
  const [records, setRecords] = useState<DailyAttendance[]>([]);
  const [summary, setSummary] = useState<AttendanceSummaryMetrics | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [exceptionOnly, setExceptionOnly] = useState(false);

  // Modal states
  const [selectedRecord, setSelectedRecord] = useState<DailyAttendance | null>(null);
  const [showPunchesModal, setShowPunchesModal] = useState(false);

  // Load dropdown data
  useEffect(() => {
    if (!activeCompanyId) return;
    const loadOrgData = async () => {
      try {
        const [deptsRes, branchesRes] = await Promise.all([
          apiClient.get<Department[]>('/api/v1/departments', { status: 'ACTIVE' }, activeCompanyId),
          apiClient.get<Branch[]>('/api/v1/branches', { status: 'ACTIVE' }, activeCompanyId),
        ]);
        if (deptsRes.success && deptsRes.data) setDepartments(deptsRes.data);
        if (branchesRes.success && branchesRes.data) setBranches(branchesRes.data);
      } catch (e) {
        console.error('Failed to load org filters', e);
      }
    };
    loadOrgData();
  }, [activeCompanyId]);

  // Fetch daily attendance
  const fetchDailyData = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const res = await attendanceApi.getDailyAttendance(
        {
          date: selectedDate,
          departmentId: selectedDept || undefined,
          branchId: selectedBranch || undefined,
          status: (selectedStatus as AttendanceStatus) || undefined,
          hasException: exceptionOnly ? true : undefined,
          search: searchQuery || undefined,
        },
        activeCompanyId
      );

      if (res.success && res.data) {
        setRecords(res.data.items);
        setSummary(res.data.summary);
      } else {
        showToast('error', 'Error', res.error || 'Failed to fetch daily attendance');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Error loading attendance');
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId, selectedDate, selectedDept, selectedBranch, selectedStatus, exceptionOnly, searchQuery, showToast]);

  useEffect(() => {
    fetchDailyData();
  }, [fetchDailyData]);

  // Recalculate
  const handleRecalculate = async () => {
    if (!activeCompanyId) return;
    setRecalculating(true);
    try {
      const res = await attendanceApi.recalculateAttendance(
        { date: selectedDate },
        activeCompanyId
      );
      if (res.success) {
        showToast('success', 'Recalculation Complete', res.data?.message || 'Attendance recalculated successfully');
        fetchDailyData();
      } else {
        showToast('error', 'Recalculation Failed', res.error || 'Recalculation failed');
      }
    } catch (e: any) {
      showToast('error', 'Error', e.message || 'Error during recalculation');
    } finally {
      setRecalculating(false);
    }
  };

  // Quick date change
  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  const formatMins = (mins: number) => {
    if (!mins) return '0h 00m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${String(m).padStart(2, '0')}m`;
  };

  const formatIsoTime = (iso?: string) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return iso;
    }
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'PRESENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Present
          </span>
        );
      case 'HALF_DAY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" /> Half Day
          </span>
        );
      case 'ABSENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" /> Absent
          </span>
        );
      case 'WEEKLY_OFF':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Weekly Off
          </span>
        );
      case 'HOLIDAY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Holiday
          </span>
        );
      case 'INCOMPLETE':
      case 'MISSING_PUNCH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <AlertTriangle className="w-3 h-3 text-purple-600" /> Incomplete
          </span>
        );
      case 'ON_LEAVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            On Leave
          </span>
        );
      default:
        return <span className="text-xs text-slate-500">{status}</span>;
    }
  };

  return (
    <div className="space-y-6" id="daily-attendance-page">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Daily Attendance</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time daily attendance calculation, shift punctuality, and punch logs.
          </p>
        </div>

        {/* Date Selector & Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-white border border-slate-300 rounded-lg shadow-xs overflow-hidden">
            <button
              onClick={() => shiftDate(-1)}
              className="p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors border-r border-slate-200"
              title="Previous Day"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
              />
            </div>
            <button
              onClick={() => shiftDate(1)}
              className="p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors border-l border-slate-200"
              title="Next Day"
              aria-label="Next day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setSelectedDate('2026-08-14')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
              selectedDate === '2026-08-14'
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            Today
          </button>

          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-xs hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Recalculate attendance for this date"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin text-blue-600' : ''}`} />
            Recalculate
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Scheduled</span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">{summary.totalScheduled}</span>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/20 shadow-xs">
            <span className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider block">Present</span>
            <span className="text-xl font-bold text-emerald-700 mt-1 block">{summary.presentCount}</span>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-rose-100 bg-rose-50/20 shadow-xs">
            <span className="text-[11px] font-medium text-rose-600 uppercase tracking-wider block">Absent</span>
            <span className="text-xl font-bold text-rose-700 mt-1 block">{summary.absentCount}</span>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-amber-100 bg-amber-50/20 shadow-xs">
            <span className="text-[11px] font-medium text-amber-600 uppercase tracking-wider block">Half Day</span>
            <span className="text-xl font-bold text-amber-700 mt-1 block">{summary.halfDayCount}</span>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-orange-100 bg-orange-50/20 shadow-xs">
            <span className="text-[11px] font-medium text-orange-600 uppercase tracking-wider block">Late Arrivals</span>
            <span className="text-xl font-bold text-orange-700 mt-1 block">{summary.lateArrivalCount}</span>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-yellow-100 bg-yellow-50/20 shadow-xs">
            <span className="text-[11px] font-medium text-yellow-600 uppercase tracking-wider block">Early Exits</span>
            <span className="text-xl font-bold text-yellow-700 mt-1 block">{summary.earlyExitCount}</span>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-purple-100 bg-purple-50/20 shadow-xs">
            <span className="text-[11px] font-medium text-purple-600 uppercase tracking-wider block">Exceptions</span>
            <span className="text-xl font-bold text-purple-700 mt-1 block">{summary.exceptionCount}</span>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search code or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Department */}
          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Branch */}
          <div>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="HALF_DAY">Half Day</option>
              <option value="ABSENT">Absent</option>
              <option value="WEEKLY_OFF">Weekly Off</option>
              <option value="HOLIDAY">Holiday</option>
              <option value="INCOMPLETE">Incomplete</option>
              <option value="ON_LEAVE">On Leave</option>
            </select>
          </div>

          {/* Exception Toggle */}
          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={exceptionOnly}
                onChange={(e) => setExceptionOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span>Exceptions Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Shift</th>
                <th className="py-3 px-4">First In</th>
                <th className="py-3 px-4">Last Out</th>
                <th className="py-3 px-4">Gross Hrs</th>
                <th className="py-3 px-4">Net Hrs</th>
                <th className="py-3 px-4">Late / Early</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Exceptions</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading attendance records for {selectedDate}...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No attendance records found matching the criteria for this date.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Employee */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                          {r.displayName ? r.displayName.slice(0, 2).toUpperCase() : 'EM'}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{r.displayName || 'Unknown'}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {r.employeeCode} • {r.departmentName || 'General'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Shift */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10.5px]">
                          {r.shiftCode || 'GEN'}
                        </span>
                        {r.isOvernight && (
                          <span className="px-1 py-0.2 rounded bg-indigo-100 text-indigo-700 text-[9.5px] font-bold">
                            NIGHT
                          </span>
                        )}
                      </div>
                      <div className="text-[10.5px] text-slate-500 mt-0.5">
                        {r.scheduledStart} - {r.scheduledEnd}
                      </div>
                    </td>

                    {/* First In */}
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                      {formatIsoTime(r.firstCheckIn)}
                    </td>

                    {/* Last Out */}
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                      {formatIsoTime(r.lastCheckOut)}
                    </td>

                    {/* Gross */}
                    <td className="py-3 px-4 font-mono text-slate-600">{formatMins(r.grossWorkMinutes)}</td>

                    {/* Net */}
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {formatMins(r.netWorkMinutes)}
                    </td>

                    {/* Late / Early */}
                    <td className="py-3 px-4">
                      {r.isLate ? (
                        <span className="text-orange-600 font-semibold block text-[11px]">
                          Late: {r.lateMinutes}m
                        </span>
                      ) : null}
                      {r.isEarlyExit ? (
                        <span className="text-yellow-600 font-semibold block text-[11px]">
                          Early: {r.earlyExitMinutes}m
                        </span>
                      ) : null}
                      {!r.isLate && !r.isEarlyExit && (
                        <span className="text-slate-400 text-[11px]">On time</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">{getStatusBadge(r.status)}</td>

                    {/* Exceptions */}
                    <td className="py-3 px-4">
                      {r.hasException ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          <AlertTriangle className="w-3 h-3" />
                          {r.exceptionType || 'Anomaly'}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedRecord(r);
                          setShowPunchesModal(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="View Punch Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3.5 bg-slate-50/60 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {records.length} records for date: {selectedDate}</span>
          <span className="font-mono text-[11px]">Calculation Engine: Deterministic v1.0</span>
        </div>
      </div>

      {/* Details & Raw Punch Modal */}
      {showPunchesModal && selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Attendance Detail</h3>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedRecord.displayName} ({selectedRecord.employeeCode}) • {selectedRecord.attendanceDate}
                </p>
              </div>
              <button
                onClick={() => setShowPunchesModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block mb-1">Shift Schedule</span>
                <span className="font-semibold text-slate-800">
                  {selectedRecord.shiftName || 'Standard'} ({selectedRecord.scheduledStart} - {selectedRecord.scheduledEnd})
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block mb-1">Calculation Status</span>
                <span className="font-semibold text-slate-800">{selectedRecord.calculationStatus}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block mb-1">First Check-In</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {selectedRecord.firstCheckIn ? new Date(selectedRecord.firstCheckIn).toLocaleString() : 'No punch recorded'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block mb-1">Last Check-Out</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {selectedRecord.lastCheckOut ? new Date(selectedRecord.lastCheckOut).toLocaleString() : 'No punch recorded'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block mb-1">Total Net Work</span>
                <span className="font-semibold text-slate-800">{formatMins(selectedRecord.netWorkMinutes)}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block mb-1">Unpaid Breaks Deducted</span>
                <span className="font-semibold text-slate-800">{selectedRecord.breakMinutes} mins</span>
              </div>
            </div>

            {selectedRecord.hasException && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Exception Flagged: </span>
                  {selectedRecord.exceptionType || 'Anomalous record'}
                  {selectedRecord.isLate && ` (Late entry by ${selectedRecord.lateMinutes} mins)`}
                  {selectedRecord.isEarlyExit && ` (Early departure by ${selectedRecord.earlyExitMinutes} mins)`}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowPunchesModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
