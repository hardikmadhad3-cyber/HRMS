import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Plus,
  RefreshCw,
  User,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useNotification } from '../../context/NotificationContext.js';
import { attendanceApi } from '../../services/attendanceApi.js';
import {
  AttendanceRegularizationRequest,
  RegularizationStatus,
} from '../../types/attendance.js';

export function AttendanceRegularizationPage() {
  const { activeCompanyId, hasPermission } = useAuth();
  const { showToast } = useNotification();

  const [requests, setRequests] = useState<AttendanceRegularizationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');

  // Action Modal State
  const [selectedReq, setSelectedReq] = useState<AttendanceRegularizationRequest | null>(null);
  const [actionType, setActionType] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [actionComments, setActionComments] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  // New Request Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [newDate, setNewDate] = useState('2026-08-14');
  const [newInTime, setNewInTime] = useState('09:30');
  const [newOutTime, setNewOutTime] = useState('18:30');
  const [newReason, setNewReason] = useState('MISSED_PUNCH');
  const [newNotes, setNewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const res = await attendanceApi.getRegularizations(
        {
          status: statusFilter || undefined,
        },
        activeCompanyId
      );

      if (res.success && res.data) {
        setRequests(res.data);
      } else {
        showToast('error', 'Error', res.error || 'Failed to load regularization requests');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Error loading requests');
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId, statusFilter, showToast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAction = async () => {
    if (!selectedReq || !actionType || !activeCompanyId) return;
    setProcessingAction(true);
    try {
      const res = await attendanceApi.actionRegularization(
        selectedReq.id,
        {
          status: actionType,
          approverComments: actionComments || undefined,
        },
        activeCompanyId
      );

      if (res.success) {
        showToast(
          'success',
          'Request Updated',
          `Request successfully ${actionType === 'APPROVED' ? 'approved' : 'rejected'}. Daily attendance updated.`
        );
        setSelectedReq(null);
        setActionType(null);
        setActionComments('');
        fetchRequests();
      } else {
        showToast('error', 'Action Failed', res.error || `Failed to ${actionType.toLowerCase()} request`);
      }
    } catch (e: any) {
      showToast('error', 'Action Failed', e.message || 'Action failed');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompanyId) return;
    setSubmitting(true);
    try {
      const res = await attendanceApi.submitRegularization(
        {
          attendanceDate: newDate,
          requestedCheckIn: newInTime ? `${newDate}T${newInTime}:00Z` : undefined,
          requestedCheckOut: newOutTime ? `${newDate}T${newOutTime}:00Z` : undefined,
          reason: newReason,
          reasonDetails: newNotes,
        },
        activeCompanyId
      );

      if (res.success) {
        showToast('success', 'Submitted', 'Regularization request submitted successfully.');
        setShowNewModal(false);
        setNewNotes('');
        fetchRequests();
      } else {
        showToast('error', 'Failed', res.error || 'Failed to submit request');
      }
    } catch (e: any) {
      showToast('error', 'Error', e.message || 'Error creating request');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.employeeName && r.employeeName.toLowerCase().includes(q)) ||
      (r.employeeCode && r.employeeCode.toLowerCase().includes(q)) ||
      r.reason.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status: RegularizationStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" /> Pending Approval
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3 h-3 text-emerald-600" /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" /> Rejected
          </span>
        );
      default:
        return <span className="text-xs text-slate-500">{status}</span>;
    }
  };

  return (
    <div className="space-y-6" id="regularization-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Attendance Regularization</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review and action attendance correction requests from employees.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Request
          </button>
          <button
            onClick={fetchRequests}
            className="p-2 text-slate-700 bg-white border border-slate-300 rounded-lg shadow-xs hover:bg-slate-50 transition-colors"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              statusFilter === 'PENDING'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              statusFilter === 'APPROVED'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              statusFilter === 'REJECTED'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rejected
          </button>
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              statusFilter === ''
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Requests
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search employee or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Target Date</th>
                <th className="py-3 px-4">Requested Timing</th>
                <th className="py-3 px-4">Reason & Justification</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading regularization requests...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No regularization requests found in this view.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Employee */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{req.employeeName || 'Employee'}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {req.employeeCode} • {req.departmentName || 'General'}
                      </div>
                    </td>

                    {/* Target Date */}
                    <td className="py-3.5 px-4 font-semibold text-slate-800 font-mono">
                      {req.attendanceDate}
                    </td>

                    {/* Timings */}
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      <div>In: {req.requestedCheckIn ? new Date(req.requestedCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                      <div>Out: {req.requestedCheckOut ? new Date(req.requestedCheckOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                    </td>

                    {/* Reason */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <span className="font-semibold text-slate-900 block">{req.reason}</span>
                      <span className="text-slate-500 text-[11px] line-clamp-2">{req.reasonDetails}</span>
                      {req.approverComments && (
                        <div className="mt-1 text-[10.5px] text-indigo-700 bg-indigo-50/70 p-1.5 rounded border border-indigo-100">
                          Approver note: {req.approverComments}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">{getStatusBadge(req.status)}</td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {req.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedReq(req);
                              setActionType('APPROVED');
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedReq(req);
                              setActionType('REJECTED');
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">
                          {req.actionedAt ? new Date(req.actionedAt).toLocaleDateString() : 'Actioned'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action (Approve / Reject) Modal */}
      {selectedReq && actionType && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {actionType === 'APPROVED' ? 'Approve Regularization' : 'Reject Regularization'}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedReq.employeeName} ({selectedReq.employeeCode}) • {selectedReq.attendanceDate}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedReq(null);
                  setActionType(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-2 text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div><span className="font-semibold text-slate-800">Reason:</span> {selectedReq.reason}</div>
              <div><span className="font-semibold text-slate-800">Details:</span> {selectedReq.reasonDetails}</div>
            </div>

            <div className="text-xs space-y-1">
              <label className="font-semibold text-slate-700 block">Approver Remarks / Comments</label>
              <textarea
                rows={3}
                placeholder="Add optional notes for the employee..."
                value={actionComments}
                onChange={(e) => setActionComments(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                onClick={() => {
                  setSelectedReq(null);
                  setActionType(null);
                }}
                className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={processingAction}
                className={`px-4 py-2 font-semibold text-white rounded-lg transition-colors ${
                  actionType === 'APPROVED'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                } disabled:opacity-50`}
              >
                {processingAction ? 'Processing...' : `Confirm ${actionType === 'APPROVED' ? 'Approval' : 'Rejection'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Request Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">New Regularization Request</h3>
                <p className="text-xs text-slate-500">Submit an attendance adjustment request.</p>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Date</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Requested Check-In</label>
                  <input
                    type="time"
                    value={newInTime}
                    onChange={(e) => setNewInTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Requested Check-Out</label>
                  <input
                    type="time"
                    value={newOutTime}
                    onChange={(e) => setNewOutTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason</label>
                <select
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="MISSED_PUNCH">Forgot to punch / Missed punch</option>
                  <option value="ON_DUTY_OUTDOOR">On Outdoor Duty / Client Visit</option>
                  <option value="DEVICE_MALFUNCTION">Biometric / Web Machine Malfunction</option>
                  <option value="POWER_INTERNET_OUTAGE">Power / Internet Outage</option>
                  <option value="TRANSPORT_DELAY">Official Transport Delay</option>
                  <option value="OTHER">Other Justified Reason</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Justification Details</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this adjustment is needed..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
