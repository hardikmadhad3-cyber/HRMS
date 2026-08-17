import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Users,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Moon,
  Shield,
  Coffee,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit2,
  ChevronRight,
  Layers,
  ChevronLeft,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useNotification } from '../../context/NotificationContext.js';
import { apiClient } from '../../services/apiClient.js';
import {
  Shift,
  ShiftSummary,
  EmployeeShiftAssignment,
  ShiftStatus,
} from '../../types/shift.js';
import { Department, Branch } from '../../types/organization.js';
import { PermissionKey } from '../../types/auth.js';
import { AddEditShiftDrawer } from '../../components/shifts/AddEditShiftDrawer.js';
import { AssignShiftDrawer } from '../../components/shifts/AssignShiftDrawer.js';
import { BulkAssignShiftDrawer } from '../../components/shifts/BulkAssignShiftDrawer.js';
import { ShiftDetailModal } from '../../components/shifts/ShiftDetailModal.js';
import { ShiftHistoryModal } from '../../components/shifts/ShiftHistoryModal.js';

export function ShiftManagementPage() {
  const { activeCompanyId, hasPermission } = useAuth();
  const { addNotification } = useNotification();

  const canManage = hasPermission(PermissionKey.ATTENDANCE_MANAGE);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'master' | 'assignments' | 'roster'>('master');

  // Master Data State
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [loadingShifts, setLoadingShifts] = useState<boolean>(false);
  const [shiftSearch, setShiftSearch] = useState('');
  const [shiftStatusFilter, setShiftStatusFilter] = useState<string>('ALL');

  // Assignments State
  const [assignments, setAssignments] = useState<EmployeeShiftAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState<boolean>(false);
  const [asgSearch, setAsgSearch] = useState('');
  const [asgDeptFilter, setAsgDeptFilter] = useState('');
  const [asgBranchFilter, setAsgBranchFilter] = useState('');
  const [asgShiftFilter, setAsgShiftFilter] = useState('');

  // Roster State
  const [rosterData, setRosterData] = useState<{
    startDate: string;
    endDate: string;
    dates: string[];
    employees: Array<{
      employeeId: string;
      employeeCode: string;
      displayName: string;
      departmentName?: string;
      designationName?: string;
      roster: Record<string, any>;
    }>;
  } | null>(null);
  const [loadingRoster, setLoadingRoster] = useState<boolean>(false);
  const [rosterStartDate, setRosterStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  // Org Filters Reference
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Modals & Drawers
  const [isAddEditDrawerOpen, setIsAddEditDrawerOpen] = useState(false);
  const [shiftToEdit, setShiftToEdit] = useState<Shift | null>(null);

  const [isAssignDrawerOpen, setIsAssignDrawerOpen] = useState(false);
  const [preSelectedEmployeeId, setPreSelectedEmployeeId] = useState<string | undefined>(undefined);

  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);

  const [detailShift, setDetailShift] = useState<Shift | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [historyEmployee, setHistoryEmployee] = useState<{ id: string; name: string; code: string } | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    if (activeCompanyId) {
      loadShifts();
      loadSummary();
      loadOrgMasters();
    }
  }, [activeCompanyId]);

  useEffect(() => {
    if (activeTab === 'assignments' && activeCompanyId) {
      loadAssignments();
    } else if (activeTab === 'roster' && activeCompanyId) {
      loadRoster();
    }
  }, [activeTab, activeCompanyId, rosterStartDate]);

  const loadOrgMasters = async () => {
    const [deptRes, branchRes] = await Promise.all([
      apiClient.get<Department[]>('/api/v1/departments', { status: 'ACTIVE' }, activeCompanyId!),
      apiClient.get<Branch[]>('/api/v1/branches', { status: 'ACTIVE' }, activeCompanyId!),
    ]);
    if (deptRes.success && deptRes.data) setDepartments(deptRes.data);
    if (branchRes.success && branchRes.data) setBranches(branchRes.data);
  };

  const loadShifts = async () => {
    setLoadingShifts(true);
    const filter: any = {};
    if (shiftStatusFilter !== 'ALL') filter.status = shiftStatusFilter;
    if (shiftSearch) filter.search = shiftSearch;

    const res = await apiClient.get<Shift[]>('/api/v1/attendance/shifts', filter, activeCompanyId!);
    if (res.success && res.data) {
      setShifts(res.data);
    }
    setLoadingShifts(false);
  };

  const loadSummary = async () => {
    const res = await apiClient.get<ShiftSummary>('/api/v1/attendance/shifts/summary', undefined, activeCompanyId!);
    if (res.success && res.data) {
      setSummary(res.data);
    }
  };

  const loadAssignments = async () => {
    setLoadingAssignments(true);
    const query: any = {};
    if (asgSearch) query.search = asgSearch;
    if (asgDeptFilter) query.departmentId = asgDeptFilter;
    if (asgBranchFilter) query.branchId = asgBranchFilter;
    if (asgShiftFilter) query.shiftId = asgShiftFilter;

    const res = await apiClient.get<EmployeeShiftAssignment[]>(
      '/api/v1/attendance/shift-assignments',
      query,
      activeCompanyId!
    );
    if (res.success && res.data) {
      setAssignments(res.data);
    }
    setLoadingAssignments(false);
  };

  const loadRoster = async () => {
    setLoadingRoster(true);
    // Calculate 7-day end date
    const d = new Date(rosterStartDate);
    d.setDate(d.getDate() + 6);
    const endDate = d.toISOString().slice(0, 10);

    const query: any = {
      startDate: rosterStartDate,
      endDate,
    };
    if (asgDeptFilter) query.departmentId = asgDeptFilter;
    if (asgBranchFilter) query.branchId = asgBranchFilter;

    const res = await apiClient.get<any>('/api/v1/attendance/shift-roster', query, activeCompanyId!);
    if (res.success && res.data) {
      setRosterData(res.data);
    }
    setLoadingRoster(false);
  };

  const handleToggleStatus = async (shift: Shift) => {
    if (!canManage) return;
    const newStatus: ShiftStatus = shift.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const res = await apiClient.patch<Shift>(
      `/api/v1/attendance/shifts/${shift.id}/status`,
      { status: newStatus },
      activeCompanyId!
    );
    if (res.success) {
      addNotification({
        type: 'success',
        title: 'Status Updated',
        message: `Shift '${shift.code}' status changed to ${newStatus}.`,
      });
      loadShifts();
      loadSummary();
    } else {
      addNotification({
        type: 'error',
        title: 'Status Change Failed',
        message: res.error || 'Could not update status.',
      });
    }
  };

  const shiftRosterDateNext = (days: number) => {
    const cur = new Date(rosterStartDate);
    cur.setDate(cur.getDate() + days);
    setRosterStartDate(cur.toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Shift Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure shift timing rules, grace windows, breaks, weekly offs, and employee shift rosters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <button
                type="button"
                onClick={() => setIsBulkAssignOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-2xs transition"
              >
                <Users className="w-4 h-4 text-slate-500" />
                Bulk Assign
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreSelectedEmployeeId(undefined);
                  setIsAssignDrawerOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-2xs transition"
              >
                <Calendar className="w-4 h-4 text-slate-500" />
                Assign Shift
              </button>
              <button
                type="button"
                onClick={() => {
                  setShiftToEdit(null);
                  setIsAddEditDrawerOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                Add Shift
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Total Shifts
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{summary.totalShifts}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Active Shifts
              </span>
              <p className="text-2xl font-bold text-green-600 mt-1">{summary.activeShifts}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-green-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Overnight Shifts
              </span>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{summary.overnightShifts}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Moon className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Assigned Headcount
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{summary.assignedEmployeesCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 gap-2 shadow-2xs">
        <button
          onClick={() => setActiveTab('master')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === 'master'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          Shift Master
          <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-600">
            {shifts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === 'assignments'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          Employee Shift Assignments
        </button>

        <button
          onClick={() => setActiveTab('roster')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === 'roster'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Weekly Shift Roster Grid
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: SHIFT MASTER */}
      {/* ===================================================================== */}
      {activeTab === 'master' && (
        <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 p-6 space-y-4 shadow-2xs">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search shift code, name, timings..."
                  value={shiftSearch}
                  onChange={(e) => setShiftSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadShifts()}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={loadShifts}
                className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 rounded-md hover:bg-slate-200"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={shiftStatusFilter}
                onChange={(e) => {
                  setShiftStatusFilter(e.target.value);
                  setTimeout(loadShifts, 0);
                }}
                className="px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          {/* Shifts Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Shift Code & Name</th>
                  <th className="py-3 px-4">Work Timings (24h)</th>
                  <th className="py-3 px-4">Grace Window</th>
                  <th className="py-3 px-4">Breaks</th>
                  <th className="py-3 px-4">Weekly Off</th>
                  <th className="py-3 px-4 text-center">Assigned</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingShifts ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Loading shifts...
                    </td>
                  </tr>
                ) : shifts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No shifts found matching criteria.
                    </td>
                  </tr>
                ) : (
                  shifts.map((shift) => (
                    <tr key={shift.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: shift.color || '#3B82F6' }}
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{shift.code}</span>
                              {shift.isOvernight && (
                                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-indigo-100 text-indigo-700 rounded flex items-center gap-0.5">
                                  <Moon className="w-2.5 h-2.5" /> OVERNIGHT
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500">{shift.name}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono text-slate-900 font-semibold">
                          {shift.startTime} - {shift.endTime}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {shift.fullDayHours}h Full / {shift.halfDayHours}h Half
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-700">
                          {shift.lateEntryGraceMinutes}m in / {shift.earlyExitGraceMinutes}m out
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Late: {shift.lateAllowed ? 'Yes' : 'No'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-slate-700">
                          <Coffee className="w-3.5 h-3.5 text-amber-600" />
                          <span>{shift.breaks?.length || 0} scheduled</span>
                        </div>
                        {shift.breaks && shift.breaks.length > 0 && (
                          <span className="text-[10px] text-slate-400">
                            {shift.breaks.map((b) => b.breakName).join(', ')}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-700 truncate max-w-[130px]">
                          {shift.weeklyOffRule?.daysOfWeek?.join(', ') || 'SUNDAY'}
                        </div>
                        {shift.weeklyOffRule?.alternateSaturday && (
                          <span className="text-[10px] text-blue-600 font-medium">+ Alt Sat</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
                          {shift.assignedEmployeesCount || 0}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          disabled={!canManage}
                          onClick={() => handleToggleStatus(shift)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition ${
                            shift.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          } ${!canManage ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          {shift.status}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title="View Policy Details"
                            onClick={() => {
                              setDetailShift(shift);
                              setIsDetailOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canManage && (
                            <button
                              type="button"
                              title="Edit Shift"
                              onClick={() => {
                                setShiftToEdit(shift);
                                setIsAddEditDrawerOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: EMPLOYEE SHIFT ASSIGNMENTS */}
      {/* ===================================================================== */}
      {activeTab === 'assignments' && (
        <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 p-6 space-y-4 shadow-2xs">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search employee code / name..."
                value={asgSearch}
                onChange={(e) => setAsgSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadAssignments()}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={asgDeptFilter}
              onChange={(e) => {
                setAsgDeptFilter(e.target.value);
                setTimeout(loadAssignments, 0);
              }}
              className="px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <select
              value={asgBranchFilter}
              onChange={(e) => {
                setAsgBranchFilter(e.target.value);
                setTimeout(loadAssignments, 0);
              }}
              className="px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <select
              value={asgShiftFilter}
              onChange={(e) => {
                setAsgShiftFilter(e.target.value);
                setTimeout(loadAssignments, 0);
              }}
              className="px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">All Shifts</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} ({s.name})
                </option>
              ))}
            </select>
          </div>

          {/* Assignments Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department & Branch</th>
                  <th className="py-3 px-4">Assigned Shift</th>
                  <th className="py-3 px-4">Shift Timings</th>
                  <th className="py-3 px-4">Effective Period</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">History & Reassign</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingAssignments ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Loading employee shift assignments...
                    </td>
                  </tr>
                ) : assignments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No shift assignments found for criteria.
                    </td>
                  </tr>
                ) : (
                  assignments.map((asg) => (
                    <tr key={asg.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{asg.employeeName}</div>
                        <span className="text-[10px] font-mono text-slate-500">{asg.employeeCode}</span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium">
                          {asg.departmentName || 'No Department'}
                        </div>
                        <span className="text-[10px] text-slate-500">{asg.branchName || 'No Branch'}</span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: asg.shiftColor || '#3B82F6' }}
                          />
                          <span className="font-bold text-slate-900">{asg.shiftCode}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <div className="text-slate-800">
                          {asg.shiftStartTime} - {asg.shiftEndTime}
                        </div>
                        {asg.isOvernight && (
                          <span className="text-[9px] font-semibold text-indigo-600">OVERNIGHT</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium">
                          From: {asg.effectiveFrom}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {asg.effectiveTo ? `To: ${asg.effectiveTo}` : 'Open-ended (Present)'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700">
                          {asg.assignmentType}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setHistoryEmployee({
                                id: asg.employeeId,
                                name: asg.employeeName || '',
                                code: asg.employeeCode || '',
                              });
                              setIsHistoryOpen(true);
                            }}
                            className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
                          >
                            Timeline
                          </button>
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => {
                                setPreSelectedEmployeeId(asg.employeeId);
                                setIsAssignDrawerOpen(true);
                              }}
                              className="px-2.5 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                            >
                              Reassign
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: SHIFT ROSTER GRID */}
      {/* ===================================================================== */}
      {activeTab === 'roster' && (
        <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 p-6 space-y-4 shadow-2xs">
          {/* Roster Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => shiftRosterDateNext(-7)}
                className="p-1.5 border border-slate-300 rounded-md hover:bg-slate-100"
                title="Previous Week"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>

              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 text-xs font-semibold">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  Week: {rosterData?.startDate} to {rosterData?.endDate}
                </span>
              </div>

              <button
                type="button"
                onClick={() => shiftRosterDateNext(7)}
                className="p-1.5 border border-slate-300 rounded-md hover:bg-slate-100"
                title="Next Week"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>

              <button
                type="button"
                onClick={() => setRosterStartDate(new Date().toISOString().slice(0, 10))}
                className="text-xs font-medium text-blue-600 hover:underline ml-2"
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={asgDeptFilter}
                onChange={(e) => {
                  setAsgDeptFilter(e.target.value);
                  setTimeout(loadRoster, 0);
                }}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Roster Matrix Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 sticky left-0 bg-slate-50 min-w-[200px] border-r border-slate-200 z-10">
                    Employee
                  </th>
                  {rosterData?.dates.map((d) => {
                    const dateObj = new Date(d);
                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                    const isToday = d === new Date().toISOString().slice(0, 10);
                    return (
                      <th
                        key={d}
                        className={`py-2 px-3 text-center border-r border-slate-200 min-w-[120px] ${
                          isToday ? 'bg-blue-50/80 text-blue-800' : ''
                        }`}
                      >
                        <div className="font-bold">{dayName}</div>
                        <div className="text-[10px] font-normal text-slate-500">{d.slice(5)}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingRoster ? (
                  <tr>
                    <td
                      colSpan={(rosterData?.dates.length || 7) + 1}
                      className="py-12 text-center text-slate-400"
                    >
                      Loading roster schedule...
                    </td>
                  </tr>
                ) : !rosterData || rosterData.employees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-12 text-center text-slate-400"
                    >
                      No employee roster entries available.
                    </td>
                  </tr>
                ) : (
                  rosterData.employees.map((emp) => (
                    <tr key={emp.employeeId} className="hover:bg-slate-50/60 transition">
                      <td className="py-2.5 px-4 sticky left-0 bg-white border-r border-slate-200 z-10">
                        <div className="font-semibold text-slate-900">{emp.displayName}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                          {emp.employeeCode} • {emp.departmentName || 'No Dept'}
                        </div>
                      </td>

                      {rosterData.dates.map((d) => {
                        const cell = emp.roster[d];
                        if (!cell) {
                          return (
                            <td key={d} className="py-2.5 px-2 text-center border-r border-slate-200 text-slate-300">
                              —
                            </td>
                          );
                        }

                        if (cell.isWeeklyOff) {
                          return (
                            <td key={d} className="py-2.5 px-2 text-center border-r border-slate-200 bg-slate-50/80">
                              <span className="px-2 py-1 text-[10px] font-bold rounded-md bg-slate-200 text-slate-600 inline-block">
                                WEEKLY OFF
                              </span>
                            </td>
                          );
                        }

                        return (
                          <td key={d} className="py-2.5 px-2 text-center border-r border-slate-200">
                            <div
                              className="px-2 py-1 rounded-md text-[11px] font-bold text-white inline-block shadow-2xs"
                              style={{ backgroundColor: cell.color || '#3B82F6' }}
                              title={`${cell.shiftName} (${cell.startTime} - ${cell.endTime})`}
                            >
                              {cell.shiftCode}
                              <div className="text-[9px] font-normal opacity-90 font-mono">
                                {cell.startTime}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drawers & Modals */}
      <AddEditShiftDrawer
        isOpen={isAddEditDrawerOpen}
        onClose={() => setIsAddEditDrawerOpen(false)}
        shiftToEdit={shiftToEdit}
        onSuccess={() => {
          loadShifts();
          loadSummary();
        }}
      />

      <AssignShiftDrawer
        isOpen={isAssignDrawerOpen}
        onClose={() => setIsAssignDrawerOpen(false)}
        shifts={shifts}
        preSelectedEmployeeId={preSelectedEmployeeId}
        onSuccess={() => {
          loadAssignments();
          loadSummary();
          if (activeTab === 'roster') loadRoster();
        }}
      />

      <BulkAssignShiftDrawer
        isOpen={isBulkAssignOpen}
        onClose={() => setIsBulkAssignOpen(false)}
        shifts={shifts}
        departments={departments}
        branches={branches}
        onSuccess={() => {
          loadAssignments();
          loadSummary();
          if (activeTab === 'roster') loadRoster();
        }}
      />

      <ShiftDetailModal
        shift={detailShift}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onEdit={(s) => {
          setShiftToEdit(s);
          setIsAddEditDrawerOpen(true);
        }}
      />

      {historyEmployee && (
        <ShiftHistoryModal
          employeeId={historyEmployee.id}
          employeeName={historyEmployee.name}
          employeeCode={historyEmployee.code}
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          onAssignNew={() => {
            setPreSelectedEmployeeId(historyEmployee.id);
            setIsAssignDrawerOpen(true);
          }}
        />
      )}
    </div>
  );
}
