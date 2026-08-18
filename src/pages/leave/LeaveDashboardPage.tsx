import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  ShieldCheck,
  Plus,
  ArrowRight,
  Sparkles,
  Layers,
  Users,
  Settings2,
  Calendar,
  AlertCircle,
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sliders,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { PermissionKey } from '../../types/auth.js';
import { leaveApi } from '../../services/leaveApi.js';
import {
  LeaveType,
  LeavePolicy,
  LeaveYear,
  LeaveRequest,
  LeaveCalendarEvent,
} from '../../types/leave.js';
import { PageHeader } from '../../components/shell/PageHeader.js';
import { useNotification } from '../../context/NotificationContext.js';

export function LeaveDashboardPage() {
  const { user, activeCompanyId, hasPermission } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState<LeaveYear[]>([]);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [recentRequests, setRecentRequests] = useState<LeaveRequest[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<LeaveCalendarEvent[]>([]);

  // Calendar month state
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());

  // New Year modal
  const [showYearModal, setShowYearModal] = useState(false);
  const [yearForm, setYearForm] = useState({
    code: '',
    name: '',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    isDefault: false,
  });

  const fetchData = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const [yearsRes, typesRes, policiesRes, reqsRes, calRes] = await Promise.all([
        leaveApi.getYears(activeCompanyId),
        leaveApi.getTypes(undefined, activeCompanyId),
        leaveApi.getPolicies(undefined, activeCompanyId),
        leaveApi.getRequests({ limit: 6 } as any, activeCompanyId),
        leaveApi.getTeamCalendar(undefined, activeCompanyId),
      ]);

      if (yearsRes.success && yearsRes.data) setYears(yearsRes.data);
      if (typesRes.success && typesRes.data) setTypes(typesRes.data);
      if (policiesRes.success && policiesRes.data) setPolicies(policiesRes.data);
      if (reqsRes.success && reqsRes.data) setRecentRequests(reqsRes.data);
      if (calRes.success && calRes.data) setCalendarEvents(calRes.data);
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Fetch Error',
        message: err?.message || 'Failed to load leave overview data.',
      });
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId, addNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeYear = years.find((y) => y.isDefault && y.status === 'ACTIVE') || years[0];

  const pendingRequests = recentRequests.filter((r) => r.status === 'PENDING' || r.status === 'SUBMITTED');
  const approvedRequests = recentRequests.filter((r) => r.status === 'APPROVED');

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!yearForm.code || !yearForm.name || !yearForm.startDate || !yearForm.endDate) {
      addNotification({ type: 'warning', title: 'Validation', message: 'All fields are required.' });
      return;
    }
    const res = await leaveApi.createYear(yearForm, activeCompanyId);
    if (res.success) {
      addNotification({ type: 'success', title: 'Leave Year Created', message: `Leave Year ${yearForm.code} added.` });
      setShowYearModal(false);
      setYearForm({ code: '', name: '', startDate: '2027-01-01', endDate: '2027-12-31', isDefault: false });
      fetchData();
    } else {
      addNotification({ type: 'error', title: 'Error', message: res.error || 'Failed to create leave year.' });
    }
  };

  // Calendar Helpers
  const yearNum = currentCalendarDate.getFullYear();
  const monthNum = currentCalendarDate.getMonth();
  const monthName = currentCalendarDate.toLocaleString('default', { month: 'long' });

  const firstDayOfMonth = new Date(yearNum, monthNum, 1).getDay();
  const daysInMonth = new Date(yearNum, monthNum + 1, 0).getDate();

  const prevMonth = () => setCurrentCalendarDate(new Date(yearNum, monthNum - 1, 1));
  const nextMonth = () => setCurrentCalendarDate(new Date(yearNum, monthNum + 1, 1));

  const getEventsForDay = (day: number) => {
    const formattedDate = `${yearNum}-${String(monthNum + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calendarEvents.filter((ev) => ev.fromDate <= formattedDate && ev.toDate >= formattedDate);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Leave Management Operations & Calendar"
        subtitle="Operational leave dashboard, real-time team absences, leave ledger balances, policy rules, and approvals workflow."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/me/leave/new')}
              className="px-3.5 py-2 rounded-lg bg-[#17365D] hover:bg-[#122b4a] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Apply Leave</span>
            </button>
            {hasPermission(PermissionKey.LEAVE_MANAGE) && (
              <button
                onClick={() => setShowYearModal(true)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>New Leave Year</span>
              </button>
            )}
          </div>
        }
      />

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Leave Year</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">{activeYear?.code || 'LY-2026'}</div>
            <div className="text-[11px] text-slate-500 font-mono">{activeYear?.startDate} → {activeYear?.endDate}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Approvals</div>
            <div className="text-2xl font-bold text-amber-700 mt-0.5">{pendingRequests.length}</div>
            <div className="text-[11px] text-amber-600 font-medium">Awaiting manager action</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Configured Leave Types</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{types.length}</div>
            <div className="text-[11px] text-emerald-600 font-medium">{types.filter((t) => t.status === 'ACTIVE').length} active</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Deterministic Policies</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{policies.length}</div>
            <div className="text-[11px] text-purple-600 font-medium">Accrual & Sandwich rules</div>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => navigate('/me/leave/new')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-xs group-hover:text-blue-600 transition-colors">
                Apply for Leave
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Submit leaves with live duration breakdown, half-day period & sandwich calculations.
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
            <span>Apply Now</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => navigate('/leave/requests')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-xs group-hover:text-amber-600 transition-colors">
                Leave Requests & Queue
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Review, approve, return or reject requests with automatic ledger and reservation sync.
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-600">
            <span>Review Requests</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => navigate('/leave/balances')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-xs group-hover:text-emerald-600 transition-colors">
                Balances & Ledger Explorer
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Inspect immutable ledger transactions, adjustments, accrual runs, and balance reconstructions.
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-600">
            <span>Explore Ledger</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => navigate('/leave/policies')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-xs group-hover:text-purple-600 transition-colors">
                Policies & Rules Engine
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Configure annual entitlements, accrual schedules, carry forwards, encashment, and sandwich policies.
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-600">
            <span>Configure Policies</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Main Grid: Team Absence Calendar & Recent Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Team Absence Calendar */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h2 className="font-bold text-sm text-slate-900">
                Team Absence Calendar — {monthName} {yearNum}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentCalendarDate(new Date())}
                className="px-2 py-1 text-[11px] font-semibold border border-slate-200 rounded hover:bg-slate-50 text-slate-700 cursor-pointer"
              >
                Today
              </button>
              <button
                onClick={nextMonth}
                className="p-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-1 text-[10px] font-bold text-slate-400 uppercase">
                {d}
              </div>
            ))}

            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="h-20 bg-slate-50/50 rounded border border-slate-100" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const evs = getEventsForDay(day);
              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === monthNum &&
                new Date().getFullYear() === yearNum;

              return (
                <div
                  key={`day-${day}`}
                  className={`h-20 p-1 rounded border text-left flex flex-col justify-between overflow-hidden transition-colors ${
                    isToday
                      ? 'bg-blue-50/50 border-blue-300 ring-1 ring-blue-400'
                      : 'bg-white border-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-bold ${
                        isToday ? 'w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center' : 'text-slate-700'
                      }`}
                    >
                      {day}
                    </span>
                    {evs.length > 0 && (
                      <span className="text-[9px] font-bold px-1 rounded bg-slate-100 text-slate-600">
                        {evs.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5 overflow-hidden">
                    {evs.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        className="text-[9px] px-1 py-0.2 rounded truncate font-medium text-white shadow-2xs"
                        style={{ backgroundColor: ev.color || '#3B82F6' }}
                        title={`${ev.employeeName} (${ev.leaveTypeCode}): ${ev.fromDate} to ${ev.toDate}`}
                      >
                        {ev.employeeName.split(' ')[0]} ({ev.leaveTypeCode})
                      </div>
                    ))}
                    {evs.length > 2 && (
                      <div className="text-[8px] text-slate-400 font-semibold pl-0.5">
                        +{evs.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Recent Leave Requests */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <h2 className="font-bold text-sm text-slate-900">Recent Applications</h2>
              </div>
              <button
                onClick={() => navigate('/leave/requests')}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                View All
              </button>
            </div>

            <div className="space-y-2.5">
              {recentRequests.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-8">No leave requests submitted yet.</div>
              ) : (
                recentRequests.slice(0, 5).map((req) => (
                  <div
                    key={req.id}
                    className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <span>{req.employeeName || 'Employee'}</span>
                        <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-slate-200 text-slate-700">
                          {req.leaveTypeCode}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : req.status === 'PENDING' || req.status === 'SUBMITTED'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        {req.fromDate} → {req.toDate}
                      </span>
                      <span className="font-bold text-slate-700">
                        {req.chargeableDays} {req.chargeableDays === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => navigate('/leave/requests')}
            className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-4"
          >
            <span>Open Leave Approval Inbox</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Modal: New Leave Year */}
      {showYearModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Configure New Leave Year</span>
              </h3>
              <button onClick={() => setShowYearModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">
                ×
              </button>
            </div>

            <form onSubmit={handleCreateYear} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Year Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LY-2027 or FY-2027-28"
                  value={yearForm.code}
                  onChange={(e) => setYearForm({ ...yearForm, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Calendar Year 2027"
                  value={yearForm.name}
                  onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={yearForm.startDate}
                    onChange={(e) => setYearForm({ ...yearForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={yearForm.endDate}
                    onChange={(e) => setYearForm({ ...yearForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="chk-default-year-db"
                  checked={yearForm.isDefault}
                  onChange={(e) => setYearForm({ ...yearForm, isDefault: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-0"
                />
                <label htmlFor="chk-default-year-db" className="text-slate-700 font-medium">
                  Set as Default Active Leave Year
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowYearModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#17365D] text-white font-bold hover:bg-[#122b4a] cursor-pointer"
                >
                  Save Leave Year
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
