import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FileText,
  Send,
  RefreshCw,
  AlertTriangle,
  History,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useNotification } from '../../context/NotificationContext.js';
import { attendanceApi } from '../../services/attendanceApi.js';
import {
  EmployeeAttendanceStatus,
  DailyAttendance,
} from '../../types/attendance.js';

export function MyAttendancePage() {
  const { user, activeCompanyId } = useAuth();
  const { showToast } = useNotification();

  // Live clock
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // State
  const [statusData, setStatusData] = useState<EmployeeAttendanceStatus | null>(null);
  const [historyRecords, setHistoryRecords] = useState<DailyAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [punchNotes, setPunchNotes] = useState('');

  // Regularization Modal
  const [showRegModal, setShowRegModal] = useState(false);
  const [regDate, setRegDate] = useState<string>('2026-08-14');
  const [regInTime, setRegInTime] = useState('09:30');
  const [regOutTime, setRegOutTime] = useState('18:30');
  const [regReason, setRegReason] = useState('MISSED_PUNCH');
  const [regNotes, setRegNotes] = useState('');
  const [submittingReg, setSubmittingReg] = useState(false);

  // Fetch status & history
  const fetchMyAttendance = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const [statusRes, historyRes] = await Promise.all([
        attendanceApi.getMyStatus(activeCompanyId),
        attendanceApi.getMyHistory({ limit: 10 }, activeCompanyId),
      ]);

      if (statusRes.success && statusRes.data) {
        setStatusData(statusRes.data);
      }
      if (historyRes.success && historyRes.data) {
        setHistoryRecords(historyRes.data.items);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to load attendance profile');
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId, showToast]);

  useEffect(() => {
    fetchMyAttendance();
  }, [fetchMyAttendance]);

  // Handle Check-In / Check-Out
  const handlePunch = async (punchType: 'CHECK_IN' | 'CHECK_OUT') => {
    if (!activeCompanyId) return;
    setPunching(true);
    try {
      const payload = {
        punchTime: new Date().toISOString(),
        source: 'ESS' as const,
        notes: punchNotes || undefined,
        locationAddress: 'Corporate HQ - Main Entrance Gate 1',
      };

      const res = punchType === 'CHECK_IN'
        ? await attendanceApi.checkIn(payload, activeCompanyId)
        : await attendanceApi.checkOut(payload, activeCompanyId);

      if (res.success) {
        showToast(
          'success',
          'Punch Recorded',
          `${punchType === 'CHECK_IN' ? 'Check-in' : 'Check-out'} recorded successfully.`
        );
        setPunchNotes('');
        fetchMyAttendance();
      } else {
        showToast('error', 'Punch Failed', res.error || `Failed to ${punchType.toLowerCase()}`);
      }
    } catch (e: any) {
      showToast('error', 'Punch Error', e.message || 'Punch submission error');
    } finally {
      setPunching(false);
    }
  };

  // Submit Regularization
  const handleSubmitRegularization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompanyId) return;
    setSubmittingReg(true);
    try {
      const res = await attendanceApi.submitRegularization(
        {
          attendanceDate: regDate,
          requestedCheckIn: regInTime ? `${regDate}T${regInTime}:00Z` : undefined,
          requestedCheckOut: regOutTime ? `${regDate}T${regOutTime}:00Z` : undefined,
          reason: regReason,
          reasonDetails: regNotes,
        },
        activeCompanyId
      );

      if (res.success) {
        showToast('success', 'Submitted', 'Regularization request submitted for manager approval.');
        setShowRegModal(false);
        setRegNotes('');
        fetchMyAttendance();
      } else {
        showToast('error', 'Submission Failed', res.error || 'Failed to submit regularization');
      }
    } catch (e: any) {
      showToast('error', 'Error', e.message || 'Submission error');
    } finally {
      setSubmittingReg(false);
    }
  };

  const isCheckedIn = statusData?.isCheckedIn;

  return (
    <div className="space-y-6" id="my-attendance-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Attendance & Punch</h1>
          <p className="text-sm text-slate-500 mt-1">
            Self-service web check-in, active shift schedule, and punch history.
          </p>
        </div>

        <button
          onClick={() => setShowRegModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
        >
          <FileText className="w-4 h-4" />
          Request Regularization
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Punch Station */}
        <div className="lg:col-span-1 space-y-6">
          {/* Live Clock Card */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
                Web Punch Station
              </span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live
              </span>
            </div>

            {/* Time Display */}
            <div className="text-center py-2">
              <div className="text-4xl font-mono font-extrabold tracking-tight text-white">
                {currentTime.toLocaleTimeString('en-US', { hour12: false })}
              </div>
              <div className="text-xs text-slate-400 mt-1 font-medium">
                {currentTime.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>

            {/* Shift Summary */}
            {statusData?.currentShift && (
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs space-y-1">
                <div className="text-slate-400 font-medium">Today's Assigned Shift:</div>
                <div className="font-bold text-slate-100 flex items-center justify-between">
                  <span>{statusData.currentShift.name} ({statusData.currentShift.code})</span>
                  <span className="font-mono text-blue-400">
                    {statusData.currentShift.startTime} - {statusData.currentShift.endTime}
                  </span>
                </div>
                {statusData.currentShift.isOvernight && (
                  <span className="inline-block px-1.5 py-0.5 rounded bg-indigo-900/60 text-indigo-300 text-[10px] font-semibold mt-1">
                    Overnight Shift
                  </span>
                )}
              </div>
            )}

            {/* Punch Note Input */}
            <div>
              <input
                type="text"
                placeholder="Add optional note or location tag..."
                value={punchNotes}
                onChange={(e) => setPunchNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Big Action Button */}
            <div>
              {!isCheckedIn ? (
                <button
                  onClick={() => handlePunch('CHECK_IN')}
                  disabled={punching}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <LogIn className="w-5 h-5" />
                  {punching ? 'Recording Punch...' : 'Web Check-In'}
                </button>
              ) : (
                <button
                  onClick={() => handlePunch('CHECK_OUT')}
                  disabled={punching}
                  className="w-full py-3.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <LogOut className="w-5 h-5" />
                  {punching ? 'Recording Punch...' : 'Web Check-Out'}
                </button>
              )}
            </div>

            {/* Punch Status Badge */}
            <div className="text-center text-xs">
              {isCheckedIn ? (
                <span className="text-emerald-400 font-medium inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Checked In since{' '}
                  {statusData?.lastPunch?.punchTime
                    ? new Date(statusData.lastPunch.punchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Earlier'}
                </span>
              ) : (
                <span className="text-slate-400">Not checked in currently</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Today's Timeline & Recent Records */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Punch Timeline */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Today's Punch Activity ({statusData?.todayDate || '2026-08-14'})
              </h2>
              <button
                onClick={fetchMyAttendance}
                className="text-xs text-slate-500 hover:text-slate-800 p-1 rounded transition-colors"
                title="Refresh Status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Punch Events Log */}
            {statusData?.todayPunches && statusData.todayPunches.length > 0 ? (
              <div className="space-y-3">
                {statusData.todayPunches.map((punch, idx) => (
                  <div
                    key={punch.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                          punch.punchType === 'CHECK_IN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {punch.punchType === 'CHECK_IN' ? 'IN' : 'OUT'}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">
                          {punch.punchType === 'CHECK_IN' ? 'Check-In Punch' : 'Check-Out Punch'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Source: {punch.source} {punch.locationAddress ? `• ${punch.locationAddress}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-slate-900 text-sm">
                      {new Date(punch.punchTime).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                No punches recorded yet today. Click "Web Check-In" to begin your shift.
              </div>
            )}
          </div>

          {/* Recent Attendance History Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-slate-600" />
                Recent Daily Records
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10.5px]">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Shift</th>
                    <th className="py-2.5 px-4">First In</th>
                    <th className="py-2.5 px-4">Last Out</th>
                    <th className="py-2.5 px-4">Net Hours</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No previous records found.
                      </td>
                    </tr>
                  ) : (
                    historyRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-slate-800">{rec.attendanceDate}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">{rec.shiftCode || 'GEN'}</td>
                        <td className="py-2.5 px-4 font-mono">
                          {rec.firstCheckIn ? new Date(rec.firstCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="py-2.5 px-4 font-mono">
                          {rec.lastCheckOut ? new Date(rec.lastCheckOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-medium">
                          {Math.floor(rec.netWorkMinutes / 60)}h {rec.netWorkMinutes % 60}m
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                              rec.status === 'PRESENT'
                                ? 'bg-emerald-50 text-emerald-700'
                                : rec.status === 'ABSENT'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setRegDate(rec.attendanceDate);
                              setShowRegModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 font-semibold text-[11px]"
                          >
                            Regularize
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
      </div>

      {/* Regularization Modal */}
      {showRegModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Request Attendance Regularization</h3>
                <p className="text-xs text-slate-500">
                  Submit a correction for missed or faulty punch records.
                </p>
              </div>
              <button
                onClick={() => setShowRegModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitRegularization} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Attendance Date</label>
                <input
                  type="date"
                  required
                  value={regDate}
                  onChange={(e) => setRegDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Requested Check-In</label>
                  <input
                    type="time"
                    value={regInTime}
                    onChange={(e) => setRegInTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Requested Check-Out</label>
                  <input
                    type="time"
                    value={regOutTime}
                    onChange={(e) => setRegOutTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason Category</label>
                <select
                  value={regReason}
                  onChange={(e) => setRegReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="MISSED_PUNCH">Forgot to punch / Missed punch</option>
                  <option value="ON_DUTY_OUTDOOR">On Outdoor Duty / Client Visit</option>
                  <option value="DEVICE_MALFUNCTION">Biometric / Web Machine Malfunction</option>
                  <option value="POWER_INTERNET_OUTAGE">Power / Internet Connectivity Outage</option>
                  <option value="TRANSPORT_DELAY">Official Transport Delay</option>
                  <option value="OTHER">Other Justified Reason</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Justification Details</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide context for manager approval..."
                  value={regNotes}
                  onChange={(e) => setRegNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReg}
                  className="px-4 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  {submittingReg ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
