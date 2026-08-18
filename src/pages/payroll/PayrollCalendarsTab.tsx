import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Lock,
  Play,
  Check,
  CalendarDays,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import {
  PayrollCalendar,
  PayrollPeriod,
  PayrollPeriodStatus,
  PayFrequency,
} from '../../types/payroll.js';
import { useAuth } from '../../context/AuthContext.js';
import { PermissionKey } from '../../types/auth.js';

export function PayrollCalendarsTab() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PermissionKey.PAYROLL_MANAGE);

  const [calendars, setCalendars] = useState<PayrollCalendar[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    code: `CAL-${new Date().getFullYear()}-MONTHLY`,
    name: `${new Date().getFullYear()} Standard Payroll Calendar`,
    year: new Date().getFullYear(),
    payFrequency: PayFrequency.MONTHLY,
    startMonth: 1,
    endMonth: 12,
    cycleStartDay: 1,
    cycleEndDay: 31,
    payDay: 1,
    cutoffDay: 25,
    isDefault: true,
    isActive: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchCalendars = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/payroll/calendars');
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        setCalendars(json.data);
        if (!selectedCalendarId) {
          setSelectedCalendarId(json.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching calendars:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendars();
  }, []);

  const selectedCalendar = calendars.find((c) => c.id === selectedCalendarId) || calendars[0];

  const handleUpdatePeriodStatus = async (periodId: string, status: PayrollPeriodStatus) => {
    try {
      const res = await fetch(`/api/v1/payroll/periods/${periodId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        fetchCalendars();
      } else {
        alert(json.error || 'Failed to update period status');
      }
    } catch (err) {
      console.error('Error updating period:', err);
    }
  };

  const handleCreateCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/v1/payroll/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create payroll calendar.');
      }

      setIsModalOpen(false);
      await fetchCalendars();
      setSelectedCalendarId(json.data.id);
    } catch (err: any) {
      setFormError(err.message || 'Error processing request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: PayrollPeriodStatus) => {
    switch (status) {
      case PayrollPeriodStatus.OPEN:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            OPEN FOR PROCESSING
          </span>
        );
      case PayrollPeriodStatus.PROCESSING:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
            <Clock className="w-3.5 h-3.5" />
            PROCESSING RUN
          </span>
        );
      case PayrollPeriodStatus.CLOSED:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
            <Check className="w-3.5 h-3.5 text-slate-500" />
            CLOSED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full">
            UPCOMING
          </span>
        );
    }
  };

  return (
    <div className="space-y-4" id="payroll-calendars-tab">
      {/* Top Header & Calendar Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Active Payroll Calendar
            </label>
            <select
              value={selectedCalendarId || ''}
              onChange={(e) => setSelectedCalendarId(e.target.value)}
              className="text-sm font-bold text-slate-900 border-none bg-transparent p-0 focus:ring-0 cursor-pointer"
            >
              {calendars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.year}) - {c.payFrequency}
                </option>
              ))}
            </select>
          </div>
        </div>

        {canManage && (
          <button
            id="create-calendar-button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Calendar
          </button>
        )}
      </div>

      {/* Selected Calendar Details & Periods Matrix */}
      {selectedCalendar && (
        <div className="space-y-4">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Cycle Period</span>
              <div className="text-base font-bold text-slate-900 mt-1">
                Day {selectedCalendar.cycleStartDay} to {selectedCalendar.cycleEndDay}
              </div>
              <span className="text-xs text-slate-400">Standard monthly span</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Cutoff Date</span>
              <div className="text-base font-bold text-slate-900 mt-1">
                Day {selectedCalendar.cutoffDay}
              </div>
              <span className="text-xs text-slate-400">Attendance lock cut-off</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Disbursement Day</span>
              <div className="text-base font-bold text-indigo-600 mt-1">
                Day {selectedCalendar.payDay}
              </div>
              <span className="text-xs text-slate-400">Next month payout date</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Frequency</span>
              <div className="text-base font-bold text-slate-900 mt-1">
                {selectedCalendar.payFrequency}
              </div>
              <span className="text-xs text-slate-400">{selectedCalendar.year} Annual Schedule</span>
            </div>
          </div>

          {/* Periods Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/75 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-600" />
                Payroll Periods Schedule ({selectedCalendar.periods?.length || 0} Periods)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Period Code</th>
                    <th className="py-3 px-4">Period Name</th>
                    <th className="py-3 px-4">Date Range</th>
                    <th className="py-3 px-4">Cutoff & Pay Dates</th>
                    <th className="py-3 px-4">Status</th>
                    {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedCalendar.periods?.map((period) => (
                    <tr key={period.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 text-xs">
                        {period.periodCode}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">{period.periodName}</td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-600">
                        {period.startDate} → {period.endDate}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        <div>Cutoff: <span className="font-semibold text-slate-800">{period.cutoffDate}</span></div>
                        <div>Pay: <span className="font-semibold text-indigo-600">{period.payDate}</span></div>
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(period.status)}</td>
                      {canManage && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {period.status === PayrollPeriodStatus.UPCOMING && (
                              <button
                                onClick={() => handleUpdatePeriodStatus(period.id, PayrollPeriodStatus.OPEN)}
                                className="px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
                              >
                                Open Period
                              </button>
                            )}
                            {period.status === PayrollPeriodStatus.OPEN && (
                              <button
                                onClick={() => handleUpdatePeriodStatus(period.id, PayrollPeriodStatus.CLOSED)}
                                className="px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors"
                              >
                                Close Period
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create Calendar Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Create Payroll Calendar</h3>
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

            <form onSubmit={handleCreateCalendar} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Calendar Code *</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 font-mono uppercase focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Calendar Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Calendar Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value, 10) || 2026 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Frequency</label>
                  <select
                    value={formData.payFrequency}
                    onChange={(e) => setFormData({ ...formData, payFrequency: e.target.value as PayFrequency })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white"
                  >
                    <option value={PayFrequency.MONTHLY}>Monthly</option>
                    <option value={PayFrequency.BI_WEEKLY}>Bi-Weekly</option>
                    <option value={PayFrequency.SEMI_MONTHLY}>Semi-Monthly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cycle Start Day</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.cycleStartDay}
                    onChange={(e) => setFormData({ ...formData, cycleStartDay: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cutoff Day</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.cutoffDay}
                    onChange={(e) => setFormData({ ...formData, cutoffDay: parseInt(e.target.value, 10) || 25 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pay Day</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.payDay}
                    onChange={(e) => setFormData({ ...formData, payDay: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200"
                  />
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
                  {submitting ? 'Generating 12 Periods...' : 'Create & Generate Periods'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
