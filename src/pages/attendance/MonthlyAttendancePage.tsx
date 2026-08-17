import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Building,
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useNotification } from '../../context/NotificationContext.js';
import { apiClient } from '../../services/apiClient.js';
import { attendanceApi } from '../../services/attendanceApi.js';
import { MonthlyAttendanceMatrixItem } from '../../types/attendance.js';
import { Department, Branch } from '../../types/organization.js';

export function MonthlyAttendancePage() {
  const { activeCompanyId } = useAuth();
  const { showToast } = useNotification();

  const [selectedMonth, setSelectedMonth] = useState<number>(8); // August
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [matrixData, setMatrixData] = useState<MonthlyAttendanceMatrixItem[]>([]);
  const [daysInMonth, setDaysInMonth] = useState<number>(31);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');

  // Selected cell detail modal
  const [cellModal, setCellModal] = useState<{
    employeeName: string;
    employeeCode: string;
    date: string;
    dayData: any;
  } | null>(null);

  // Load dropdown data
  useEffect(() => {
    if (!activeCompanyId) return;
    const loadOrg = async () => {
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
    loadOrg();
  }, [activeCompanyId]);

  // Fetch monthly matrix
  const fetchMonthlyMatrix = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const res = await attendanceApi.getMonthlyMatrix(
        {
          month: selectedMonth,
          year: selectedYear,
          departmentId: selectedDept || undefined,
          branchId: selectedBranch || undefined,
          search: searchQuery || undefined,
        },
        activeCompanyId
      );

      if (res.success && res.data) {
        setMatrixData(res.data.matrix);
        setDaysInMonth(res.data.daysInMonth);
      } else {
        showToast('error', 'Error', res.error || 'Failed to load monthly attendance matrix');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Error loading monthly matrix');
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId, selectedMonth, selectedYear, selectedDept, selectedBranch, searchQuery, showToast]);

  useEffect(() => {
    fetchMonthlyMatrix();
  }, [fetchMonthlyMatrix]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

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

  const getAbbrBadge = (abbr: string, isLate?: boolean, isEarly?: boolean) => {
    switch (abbr) {
      case 'P':
        return (
          <span
            className={`w-6 h-6 flex items-center justify-center rounded-sm font-semibold text-[10.5px] cursor-pointer transition-transform hover:scale-110 ${
              isLate || isEarly
                ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            P
          </span>
        );
      case 'HD':
        return (
          <span className="w-6 h-6 flex items-center justify-center rounded-sm font-semibold text-[10.5px] bg-amber-100 text-amber-800 cursor-pointer transition-transform hover:scale-110">
            HD
          </span>
        );
      case 'A':
        return (
          <span className="w-6 h-6 flex items-center justify-center rounded-sm font-semibold text-[10.5px] bg-rose-100 text-rose-800 cursor-pointer transition-transform hover:scale-110">
            A
          </span>
        );
      case 'WO':
        return (
          <span className="w-6 h-6 flex items-center justify-center rounded-sm font-medium text-[10px] bg-slate-100 text-slate-500 cursor-pointer">
            WO
          </span>
        );
      case 'H':
        return (
          <span className="w-6 h-6 flex items-center justify-center rounded-sm font-semibold text-[10px] bg-indigo-100 text-indigo-800 cursor-pointer transition-transform hover:scale-110">
            H
          </span>
        );
      case 'L':
        return (
          <span className="w-6 h-6 flex items-center justify-center rounded-sm font-semibold text-[10px] bg-blue-100 text-blue-800 cursor-pointer transition-transform hover:scale-110">
            L
          </span>
        );
      case 'MP':
      case 'INC':
        return (
          <span className="w-6 h-6 flex items-center justify-center rounded-sm font-semibold text-[10px] bg-purple-100 text-purple-800 cursor-pointer transition-transform hover:scale-110">
            !
          </span>
        );
      default:
        return (
          <span className="w-6 h-6 flex items-center justify-center rounded-sm text-[10px] bg-slate-50 text-slate-400">
            —
          </span>
        );
    }
  };

  const getDayOfWeekLetter = (dayNumber: number) => {
    const d = new Date(selectedYear, selectedMonth - 1, dayNumber);
    const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    return letters[d.getDay()];
  };

  const isWeekendDay = (dayNumber: number) => {
    const d = new Date(selectedYear, selectedMonth - 1, dayNumber);
    return d.getDay() === 0; // Sunday
  };

  return (
    <div className="space-y-6" id="monthly-attendance-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Monthly Attendance Matrix</h1>
          <p className="text-sm text-slate-500 mt-1">
            Comprehensive day-by-day attendance grid and payroll-ready monthly totals.
          </p>
        </div>

        {/* Month Selector Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-slate-300 rounded-lg shadow-xs overflow-hidden">
            <button
              onClick={() => shiftMonth(-1)}
              className="p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors border-r border-slate-200"
              title="Previous Month"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-4 py-1.5 font-bold text-xs text-slate-800 tracking-wide min-w-[140px] text-center">
              {monthNames[selectedMonth - 1]} {selectedYear}
            </div>
            <button
              onClick={() => shiftMonth(1)}
              className="p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors border-l border-slate-200"
              title="Next Month"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => fetchMonthlyMatrix()}
            className="p-2 text-slate-700 bg-white border border-slate-300 rounded-lg shadow-xs hover:bg-slate-50 transition-colors"
            title="Refresh Grid"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Legend & Filter Ribbon */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <span className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider">Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-xs bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center">P</span>
            <span>Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-xs bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center justify-center">HD</span>
            <span>Half Day</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-xs bg-rose-100 text-rose-800 font-bold text-[10px] flex items-center justify-center">A</span>
            <span>Absent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-xs bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center">WO</span>
            <span>Weekly Off</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-xs bg-indigo-100 text-indigo-800 font-bold text-[10px] flex items-center justify-center">H</span>
            <span>Holiday</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-xs bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center">L</span>
            <span>Leave</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-xs bg-purple-100 text-purple-800 font-bold text-[10px] flex items-center justify-center">!</span>
            <span>Incomplete / Anomaly</span>
          </div>
        </div>
      </div>

      {/* Grid Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[650px] relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 sticky top-0 z-20 shadow-xs text-slate-700">
              <tr>
                {/* Fixed Employee Column */}
                <th className="sticky left-0 bg-slate-100 z-30 py-3 px-3.5 font-bold uppercase text-[11px] tracking-wider border-b border-r border-slate-200 min-w-[200px]">
                  Employee
                </th>

                {/* Days 1..N */}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const isWeekend = isWeekendDay(day);
                  return (
                    <th
                      key={day}
                      className={`py-2 px-1 text-center font-bold text-[11px] border-b border-r border-slate-200 min-w-[32px] ${
                        isWeekend ? 'bg-slate-200/70 text-slate-800' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div>{day}</div>
                      <div className="text-[9.5px] font-normal text-slate-500">{getDayOfWeekLetter(day)}</div>
                    </th>
                  );
                })}

                {/* Summary Totals Columns */}
                <th className="py-2 px-2.5 text-center font-bold text-emerald-800 bg-emerald-50 border-b border-r border-slate-200 min-w-[40px]">
                  P
                </th>
                <th className="py-2 px-2.5 text-center font-bold text-rose-800 bg-rose-50 border-b border-r border-slate-200 min-w-[40px]">
                  A
                </th>
                <th className="py-2 px-2.5 text-center font-bold text-amber-800 bg-amber-50 border-b border-r border-slate-200 min-w-[40px]">
                  HD
                </th>
                <th className="py-2 px-2.5 text-center font-bold text-slate-700 bg-slate-100 border-b border-r border-slate-200 min-w-[40px]">
                  WO
                </th>
                <th className="py-2 px-2.5 text-center font-bold text-indigo-800 bg-indigo-50 border-b border-r border-slate-200 min-w-[40px]">
                  H
                </th>
                <th className="py-2 px-3 text-center font-bold text-slate-900 bg-slate-200 border-b border-slate-200 min-w-[65px]">
                  Total Hrs
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={daysInMonth + 7} className="py-16 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading attendance matrix for {monthNames[selectedMonth - 1]} {selectedYear}...
                  </td>
                </tr>
              ) : matrixData.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 7} className="py-16 text-center text-slate-500">
                    No employee records found.
                  </td>
                </tr>
              ) : (
                matrixData.map((row) => (
                  <tr key={row.employeeId} className="hover:bg-slate-50/70 transition-colors">
                    {/* Fixed Employee Column */}
                    <td className="sticky left-0 bg-white hover:bg-slate-50 z-10 py-2.5 px-3.5 border-r border-slate-200 shadow-xs">
                      <div className="font-semibold text-slate-900 truncate max-w-[180px]">
                        {row.displayName}
                      </div>
                      <div className="text-[10.5px] text-slate-500 font-mono">
                        {row.employeeCode} • {row.departmentName || 'General'}
                      </div>
                    </td>

                    {/* Day Cells */}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const dayData = row.days[dateStr];
                      const isWeekend = isWeekendDay(day);

                      return (
                        <td
                          key={day}
                          onClick={() => {
                            if (dayData) {
                              setCellModal({
                                employeeName: row.displayName,
                                employeeCode: row.employeeCode,
                                date: dateStr,
                                dayData,
                              });
                            }
                          }}
                          className={`py-1.5 px-1 text-center border-r border-slate-100 ${
                            isWeekend ? 'bg-slate-50/60' : ''
                          }`}
                        >
                          <div className="flex justify-center">
                            {dayData ? (
                              getAbbrBadge(dayData.abbreviation, dayData.isLate, dayData.isEarlyExit)
                            ) : (
                              <span className="text-slate-300 text-[10px]">—</span>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* Total Counts */}
                    <td className="py-1.5 px-2 text-center font-bold text-emerald-700 bg-emerald-50/30 border-r border-slate-200 font-mono">
                      {row.totals.presentDays}
                    </td>
                    <td className="py-1.5 px-2 text-center font-bold text-rose-700 bg-rose-50/30 border-r border-slate-200 font-mono">
                      {row.totals.absentDays}
                    </td>
                    <td className="py-1.5 px-2 text-center font-bold text-amber-700 bg-amber-50/30 border-r border-slate-200 font-mono">
                      {row.totals.halfDays}
                    </td>
                    <td className="py-1.5 px-2 text-center font-medium text-slate-600 bg-slate-50/50 border-r border-slate-200 font-mono">
                      {row.totals.weeklyOffDays}
                    </td>
                    <td className="py-1.5 px-2 text-center font-bold text-indigo-700 bg-indigo-50/30 border-r border-slate-200 font-mono">
                      {row.totals.holidays}
                    </td>
                    <td className="py-1.5 px-2.5 text-center font-bold text-slate-900 bg-slate-100/60 font-mono">
                      {Math.round(row.totals.totalWorkMinutes / 60)}h
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3.5 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>{matrixData.length} employees loaded for {monthNames[selectedMonth - 1]} {selectedYear}</span>
          <span className="text-slate-400">Click any day cell to inspect punch and schedule timestamps</span>
        </div>
      </div>

      {/* Cell Detail Modal */}
      {cellModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Attendance Snapshot</h3>
                <p className="text-xs text-slate-500">
                  {cellModal.employeeName} ({cellModal.employeeCode})
                </p>
              </div>
              <button
                onClick={() => setCellModal(null)}
                className="text-slate-400 hover:text-slate-700 text-sm p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Date</span>
                <span className="font-semibold text-slate-800">{cellModal.date}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Status</span>
                <span className="font-semibold text-slate-800">{cellModal.dayData.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">First In</span>
                <span className="font-mono text-slate-800">
                  {cellModal.dayData.firstCheckIn ? new Date(cellModal.dayData.firstCheckIn).toLocaleTimeString() : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Last Out</span>
                <span className="font-mono text-slate-800">
                  {cellModal.dayData.lastCheckOut ? new Date(cellModal.dayData.lastCheckOut).toLocaleTimeString() : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Net Work Hours</span>
                <span className="font-semibold text-slate-900">
                  {Math.floor(cellModal.dayData.netWorkMinutes / 60)}h {cellModal.dayData.netWorkMinutes % 60}m
                </span>
              </div>
              {cellModal.dayData.isLate && (
                <div className="p-2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  Late arrival recorded
                </div>
              )}
              {cellModal.dayData.isEarlyExit && (
                <div className="p-2 rounded bg-yellow-50 text-yellow-800 border border-yellow-200">
                  Early exit recorded
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setCellModal(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
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
