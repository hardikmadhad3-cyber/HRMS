import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  FileText,
  Paperclip,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Eye,
  X,
  Send,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { PermissionKey } from '../../types/auth.js';
import { leaveApi } from '../../services/leaveApi.js';
import { LeaveRequest, LeaveRequestStatus, LeaveType } from '../../types/leave.js';
import { PageHeader } from '../../components/shell/PageHeader.js';
import { useNotification } from '../../context/NotificationContext.js';

export function LeaveRequestsPage() {
  const { user, activeCompanyId, hasPermission } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [scope, setScope] = useState<'me' | 'team' | 'company'>('me');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // Selected Request Modal / Detail Drawer
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);

  // Action modals
  const [actionModal, setActionModal] = useState<{
    show: boolean;
    type: 'APPROVE' | 'REJECT' | 'RETURN' | 'CANCEL';
    request: LeaveRequest | null;
    remarks: string;
  }>({
    show: false,
    type: 'APPROVE',
    request: null,
    remarks: '',
  });

  const canManageLeaves = hasPermission(PermissionKey.LEAVE_MANAGE) || hasPermission(PermissionKey.LEAVE_APPROVE);

  const fetchRequests = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const [reqsRes, typesRes] = await Promise.all([
        leaveApi.getRequests(
          {
            scope,
            status: statusFilter || undefined,
            leaveTypeId: typeFilter || undefined,
            search: search || undefined,
          },
          activeCompanyId
        ),
        leaveApi.getTypes(undefined, activeCompanyId),
      ]);

      if (reqsRes.success && reqsRes.data) {
        setRequests(reqsRes.data);
      }
      if (typesRes.success && typesRes.data) {
        setLeaveTypes(typesRes.data);
      }
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Fetch Error',
        message: err?.message || 'Could not load leave requests.',
      });
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId, scope, statusFilter, typeFilter, search, addNotification]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAction = async () => {
    if (!actionModal.request) return;
    const req = actionModal.request;

    try {
      if (actionModal.type === 'CANCEL') {
        const res = await leaveApi.cancelRequest(
          req.id,
          { cancellationReason: actionModal.remarks || 'User cancelled leave request.' },
          activeCompanyId
        );
        if (res.success) {
          addNotification({
            type: 'success',
            title: 'Request Cancelled',
            message: 'Leave request cancelled and reservations released.',
          });
          setActionModal({ show: false, type: 'APPROVE', request: null, remarks: '' });
          setSelectedRequest(null);
          fetchRequests();
        } else {
          addNotification({ type: 'error', title: 'Action Failed', message: res.error });
        }
      } else {
        const res = await leaveApi.actionRequest(
          req.id,
          { action: actionModal.type, remarks: actionModal.remarks },
          activeCompanyId
        );
        if (res.success) {
          addNotification({
            type: 'success',
            title: `Request ${actionModal.type === 'APPROVE' ? 'Approved' : actionModal.type === 'REJECT' ? 'Rejected' : 'Returned'}`,
            message: `Leave request for ${req.employeeName || 'Employee'} actioned successfully.`,
          });
          setActionModal({ show: false, type: 'APPROVE', request: null, remarks: '' });
          setSelectedRequest(null);
          fetchRequests();
        } else {
          addNotification({ type: 'error', title: 'Action Failed', message: res.error });
        }
      }
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error', message: err?.message });
    }
  };

  const getStatusBadge = (st: LeaveRequestStatus) => {
    switch (st) {
      case 'APPROVED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">APPROVED</span>;
      case 'PENDING':
      case 'SUBMITTED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">PENDING APPROVAL</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">REJECTED</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">CANCELLED</span>;
      case 'RETURNED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">RETURNED FOR INFO</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">{st}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Leave Requests & Approval Queue"
        subtitle="Manage leave submissions, evaluate sandwich rules, inspect calculation audit breakdowns, and process approval decisions."
        actions={
          <button
            onClick={() => navigate('/me/leave/new')}
            className="px-3.5 py-2 rounded-lg bg-[#17365D] hover:bg-[#122b4a] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Apply Leave</span>
          </button>
        }
      />

      {/* Scope selector tabs & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScope('me')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                scope === 'me'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              My Requests
            </button>
            {canManageLeaves && (
              <>
                <button
                  onClick={() => setScope('team')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    scope === 'team'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Direct Reports
                </button>
                <button
                  onClick={() => setScope('company')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    scope === 'company'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Company All
                </button>
              </>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-900">{requests.length}</span> requests
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="flex-1 w-full md:w-auto relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by employee, reason, or leave type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-blue-600"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700"
            >
              <option value="">All Leave Types</option>
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code})
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="RETURNED">Returned</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Leave Type</th>
                <th className="py-3 px-4">Dates</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Reason / Attachment</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading leave requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No leave requests found matching filters.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{r.employeeName || 'Employee'}</div>
                      <div className="text-[11px] text-slate-500">
                        {r.employeeCode} {r.departmentName && `• ${r.departmentName}`}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: r.color || '#3B82F6' }}
                        />
                        <div>
                          <div className="font-bold text-slate-800">{r.leaveTypeName || r.leaveTypeCode}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{r.leaveTypeCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-semibold text-slate-900">
                        {r.fromDate} → {r.toDate}
                      </div>
                      <div className="text-[10px] text-slate-500">{r.unit.replace('_', ' ')}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">
                        {r.chargeableDays} {r.chargeableDays === 1 ? 'day' : 'days'}
                      </div>
                      {r.sandwichDays > 0 && (
                        <div className="text-[10px] text-amber-600 font-medium">
                          +{r.sandwichDays} sandwich
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="text-slate-700 line-clamp-1">{r.reason || 'No reason specified'}</div>
                      {r.attachments && r.attachments.length > 0 && (
                        <div className="flex items-center gap-1 text-[11px] text-blue-600 font-medium mt-0.5">
                          <Paperclip className="w-3 h-3" />
                          <span>{r.attachments[0].fileName}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(r.status)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedRequest(r)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {(r.status === 'PENDING' || r.status === 'SUBMITTED') && canManageLeaves && (
                          <>
                            <button
                              onClick={() =>
                                setActionModal({ show: true, type: 'APPROVE', request: r, remarks: '' })
                              }
                              className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                setActionModal({ show: true, type: 'REJECT', request: r, remarks: '' })
                              }
                              className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {(r.status === 'PENDING' || r.status === 'APPROVED') && (
                          <button
                            onClick={() =>
                              setActionModal({ show: true, type: 'CANCEL', request: r, remarks: '' })
                            }
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Cancel Leave"
                          >
                            <X className="w-3.5 h-3.5" />
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

      {/* Details Drawer / Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-blue-600" />
                  <span>Leave Request Details</span>
                </h3>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">ID: {selectedRequest.id}</div>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="text-slate-400 hover:text-slate-600 text-lg">
                ×
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Employee</div>
                  <div className="font-bold text-slate-900 mt-0.5">{selectedRequest.employeeName}</div>
                  <div className="text-[11px] text-slate-500">{selectedRequest.employeeCode}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Leave Type</div>
                  <div className="font-bold text-slate-900 mt-0.5">{selectedRequest.leaveTypeName}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{selectedRequest.leaveTypeCode}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-2.5 rounded-lg border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">From Date</div>
                  <div className="font-bold text-slate-800 font-mono mt-0.5">{selectedRequest.fromDate}</div>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">To Date</div>
                  <div className="font-bold text-slate-800 font-mono mt-0.5">{selectedRequest.toDate}</div>
                </div>
                <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/50">
                  <div className="text-[10px] font-bold text-blue-600 uppercase">Chargeable Units</div>
                  <div className="font-bold text-blue-900 mt-0.5">{selectedRequest.chargeableDays} days</div>
                </div>
              </div>

              <div>
                <div className="font-semibold text-slate-700 mb-1">Reason:</div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-slate-800">
                  {selectedRequest.reason || 'No reason provided.'}
                </div>
              </div>

              {selectedRequest.approverRemarks && (
                <div>
                  <div className="font-semibold text-slate-700 mb-1">Approver Remarks:</div>
                  <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200 text-amber-900">
                    {selectedRequest.approverRemarks}
                  </div>
                </div>
              )}

              {/* Breakdown if present */}
              {selectedRequest.calculationBreakdown && selectedRequest.calculationBreakdown.length > 0 && (
                <div>
                  <div className="font-semibold text-slate-700 mb-1.5">Calculation & Sandwich Breakdown:</div>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border border-slate-200 rounded-lg p-2 bg-slate-50">
                    {selectedRequest.calculationBreakdown.map((d, i) => (
                      <div key={i} className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-700">
                          {d.date} ({d.dayOfWeek.slice(0, 3)}) — {d.reason}
                        </span>
                        <span className="font-bold text-slate-900">{d.chargeableUnits}u</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve / Reject / Cancel Remarks Modal */}
      {actionModal.show && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                {actionModal.type === 'APPROVE' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                {actionModal.type === 'REJECT' && <XCircle className="w-4 h-4 text-rose-600" />}
                {actionModal.type === 'RETURN' && <RotateCcw className="w-4 h-4 text-purple-600" />}
                {actionModal.type === 'CANCEL' && <X className="w-4 h-4 text-slate-600" />}
                <span>
                  {actionModal.type === 'APPROVE' && 'Approve Leave Request'}
                  {actionModal.type === 'REJECT' && 'Reject Leave Request'}
                  {actionModal.type === 'RETURN' && 'Return for Information'}
                  {actionModal.type === 'CANCEL' && 'Cancel Leave Request'}
                </span>
              </h3>
              <button
                onClick={() => setActionModal({ show: false, type: 'APPROVE', request: null, remarks: '' })}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                {actionModal.type === 'APPROVE' &&
                  `Are you sure you want to approve ${actionModal.request?.chargeableDays} days leave for ${actionModal.request?.employeeName}? This will deduct from their available balance and record a ledger entry.`}
                {actionModal.type === 'REJECT' &&
                  `Are you sure you want to reject this leave application? This will release reserved balance units back to the employee.`}
                {actionModal.type === 'CANCEL' &&
                  `Are you sure you want to cancel this leave application? Any active balance reservations will be immediately released.`}
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks / Note</label>
                <textarea
                  rows={3}
                  placeholder="Enter remarks for the applicant..."
                  value={actionModal.remarks}
                  onChange={(e) => setActionModal({ ...actionModal, remarks: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-blue-600 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActionModal({ show: false, type: 'APPROVE', request: null, remarks: '' })}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleAction}
                  className={`px-4 py-2 rounded-lg font-bold text-white cursor-pointer ${
                    actionModal.type === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : actionModal.type === 'REJECT' || actionModal.type === 'CANCEL'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  Confirm {actionModal.type}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
