import React, { useState, useEffect } from 'react';
import {
  UserMinus,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  ShieldCheck,
  Building2,
  FileText,
  X,
  Laptop,
  CheckSquare,
  HelpCircle,
  MessageSquare,
  Send,
  LogOut,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  ClearanceDepartment,
  OffboardingClearanceItem,
  ClearanceItemStatus,
  ExitInterview,
  OffboardingDashboardMetrics,
  OffboardingRequest,
  OffboardingStatus,
  SeparationType,
  UpdateClearanceItemDTO,
  SaveExitInterviewDTO,
  InitiateTerminationDTO,
  InitiateResignationDTO,
  OffboardingHistory,
} from '../../types/offboarding.js';
import { offboardingApi } from '../../services/offboardingApi.js';
import { useAuth } from '../../context/AuthContext.js';
import { PermissionKey, UserRole } from '../../types/auth.js';

export function OffboardingHubPage() {
  const { user, hasPermission } = useAuth();
  const activeCompanyId = user?.activeCompanyId || 'comp-101';

  const canManage =
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.HR_ADMIN ||
    hasPermission(PermissionKey.OFFBOARDING_MANAGE);

  const [activeTab, setActiveTab] = useState<'pipeline' | 'my'>('pipeline');
  const [requests, setRequests] = useState<OffboardingRequest[]>([]);
  const [metrics, setMetrics] = useState<OffboardingDashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [isInitiateModalOpen, setIsInitiateModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<OffboardingRequest | null>(null);
  const [clearanceItems, setClearanceItems] = useState<OffboardingClearanceItem[]>([]);
  const [isClearanceModalOpen, setIsClearanceModalOpen] = useState(false);
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<ExitInterview | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyList, setHistoryList] = useState<OffboardingHistory[]>([]);

  // Initiate Form
  const [initEmployeeId, setInitEmployeeId] = useState('emp-101');
  const [initSeparationType, setInitSeparationType] = useState<SeparationType>(SeparationType.RESIGNATION);
  const [initReason, setInitReason] = useState('Career advancement opportunity');
  const [initNoticePeriod, setInitNoticePeriod] = useState('30');
  const [initLastWorkingDate, setInitLastWorkingDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );
  const [initRemarks, setInitRemarks] = useState('');

  // Clearance Action
  const [actingClearanceItem, setActingClearanceItem] = useState<OffboardingClearanceItem | null>(null);
  const [clearanceActionStatus, setClearanceActionStatus] = useState<ClearanceItemStatus>(ClearanceItemStatus.CLEARED);
  const [clearanceActionRemarks, setClearanceActionRemarks] = useState('');

  // Exit Interview Form
  const [interviewPrimaryReason, setInterviewPrimaryReason] = useState('Better career growth & competitive compensation');
  const [interviewOverallRating, setInterviewOverallRating] = useState(4);
  const [interviewManagerRating, setInterviewManagerRating] = useState(4);
  const [interviewCultureRating, setInterviewCultureRating] = useState(5);
  const [interviewCompFeedback, setInterviewCompFeedback] = useState('Competitive base salary, standard health plan.');
  const [interviewSuggestions, setInterviewSuggestions] = useState('More flexible remote work policies.');
  const [interviewRecommend, setInterviewRecommend] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [metricsRes, requestsRes] = await Promise.all([
        offboardingApi.getDashboard(activeCompanyId),
        offboardingApi.getRequests(
          {
            status: statusFilter !== 'ALL' ? (statusFilter as OffboardingStatus) : undefined,
            scope: activeTab === 'my' ? 'my' : 'all',
          },
          activeCompanyId
        ),
      ]);

      if (metricsRes.success && metricsRes.data) setMetrics(metricsRes.data);
      if (requestsRes.success && requestsRes.data) setRequests(requestsRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load offboarding records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, statusFilter, activeCompanyId]);

  const handleInitiate = async () => {
    if (!initEmployeeId || !initLastWorkingDate || !initReason) {
      alert('Please complete required separation details.');
      return;
    }

    try {
      if (initSeparationType === SeparationType.RESIGNATION) {
        const payload: InitiateResignationDTO = {
          reason: initReason,
          proposedLastWorkingDate: initLastWorkingDate,
          noticePeriodDays: Number(initNoticePeriod) || 30,
          remarks: initRemarks || undefined,
        };
        await offboardingApi.initiateResignation(payload, activeCompanyId);
      } else {
        const payload: InitiateTerminationDTO = {
          employeeId: initEmployeeId,
          separationType: initSeparationType,
          reason: initReason,
          officialLastWorkingDate: initLastWorkingDate,
          noticePeriodDays: Number(initNoticePeriod) || 30,
          remarks: initRemarks || undefined,
        };
        await offboardingApi.initiateTermination(payload, activeCompanyId);
      }

      setIsInitiateModalOpen(false);
      setInitRemarks('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to initiate separation');
    }
  };

  const handleOpenClearance = async (req: OffboardingRequest) => {
    try {
      const res = await offboardingApi.getRequestById(req.id, activeCompanyId);
      if (res.success && res.data) {
        setSelectedRequest(res.data);
        setClearanceItems(res.data.clearanceItems || []);
        setIsClearanceModalOpen(true);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to fetch clearance tasks');
    }
  };

  const handleOpenInterview = async (req: OffboardingRequest) => {
    try {
      const res = await offboardingApi.getRequestById(req.id, activeCompanyId);
      if (res.success && res.data) {
        setSelectedRequest(res.data);
        setSelectedInterview(res.data.exitInterview || null);
        setIsInterviewModalOpen(true);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to fetch exit interview');
    }
  };

  const handleOpenHistory = async (req: OffboardingRequest) => {
    try {
      const res = await offboardingApi.getHistory(req.id, activeCompanyId);
      if (res.success && res.data) {
        setSelectedRequest(req);
        setHistoryList(res.data);
        setIsHistoryModalOpen(true);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to load audit history');
    }
  };

  const handleSubmitClearanceItem = async () => {
    if (!selectedRequest || !actingClearanceItem) return;

    try {
      const payload: UpdateClearanceItemDTO = {
        status: clearanceActionStatus,
        remarks: clearanceActionRemarks || undefined,
      };

      await offboardingApi.updateClearanceItem(actingClearanceItem.id, payload, activeCompanyId);
      setActingClearanceItem(null);
      setClearanceActionRemarks('');

      const res = await offboardingApi.getRequestById(selectedRequest.id, activeCompanyId);
      if (res.success && res.data) {
        setSelectedRequest(res.data);
        setClearanceItems(res.data.clearanceItems || []);
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update clearance task');
    }
  };

  const handleSubmitInterview = async () => {
    if (!selectedRequest) return;

    try {
      const payload: SaveExitInterviewDTO = {
        primaryReasonForLeaving: interviewPrimaryReason,
        overallExperienceRating: interviewOverallRating,
        managerFeedbackRating: interviewManagerRating,
        companyCultureRating: interviewCultureRating,
        compensationFeedback: interviewCompFeedback,
        suggestionsForImprovement: interviewSuggestions,
        wouldRecommendCompany: interviewRecommend,
      };

      await offboardingApi.saveExitInterview(selectedRequest.id, payload, activeCompanyId);
      setIsInterviewModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save exit interview');
    }
  };

  const handleCompleteOffboarding = async (requestId: string) => {
    if (
      !confirm(
        'Are you sure you want to complete this offboarding? The employee status will be transitioned and all clearances sealed.'
      )
    ) {
      return;
    }

    try {
      await offboardingApi.completeOffboarding(requestId, { remarks: 'Formal separation completed.' }, activeCompanyId);
      setIsClearanceModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to complete offboarding');
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.requestNumber.toLowerCase().includes(q) ||
      (r.employeeName && r.employeeName.toLowerCase().includes(q)) ||
      (r.employeeCode && r.employeeCode.toLowerCase().includes(q)) ||
      r.reason.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status: OffboardingStatus) => {
    switch (status) {
      case OffboardingStatus.INITIATED:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Notice Period</span>;
      case OffboardingStatus.APPROVED:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Approved</span>;
      case OffboardingStatus.CLEARANCE_IN_PROGRESS:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">Clearance Active</span>;
      case OffboardingStatus.CLEARANCE_COMPLETED:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">Clearance Done</span>;
      case OffboardingStatus.COMPLETED:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Exited & Closed</span>;
      case OffboardingStatus.REJECTED:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">Rejected</span>;
      case OffboardingStatus.WITHDRAWN:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">Withdrawn</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <UserMinus className="w-7 h-7 text-[#2F75B5]" />
            Offboarding & Separation Hub
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Resignations, notice period tracking, multi-department clearances, asset returns & exit interviews.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsInitiateModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-[#2F75B5] text-white text-sm font-medium hover:bg-[#1f5588] transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Initiate Separation
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3.5">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-xs font-medium text-slate-500">Total Separations</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{metrics.totalOffboardings}</div>
            <div className="text-xs text-slate-400 mt-1">{metrics.activeCount} currently active</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-xs font-medium text-amber-600">Pending Clearances</div>
            <div className="text-2xl font-bold text-amber-700 mt-1">{metrics.pendingClearanceCount}</div>
            <div className="text-xs text-amber-600/80 mt-1">Tasks requiring sign-off</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-xs font-medium text-emerald-600">Completed Exits</div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">{metrics.completedCount}</div>
            <div className="text-xs text-emerald-600/80 mt-1">Fully handed over</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-xs font-medium text-blue-600">Voluntary Resignations</div>
            <div className="text-2xl font-bold text-blue-700 mt-1">{metrics.resignationCount}</div>
            <div className="text-xs text-blue-600/80 mt-1">{metrics.terminationCount} involuntary</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-xs font-medium text-slate-600">Avg Notice Period</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{metrics.avgNoticePeriodDays} Days</div>
            <div className="text-xs text-slate-400 mt-1">Standard SLA</div>
          </div>
        </div>
      )}

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'pipeline' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Exit Pipeline
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'my' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Separation Status
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search request #, employee, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2F75B5] w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
          >
            <option value="ALL">All Statuses</option>
            <option value="INITIATED">Initiated</option>
            <option value="CLEARANCE_IN_PROGRESS">Clearance In Progress</option>
            <option value="CLEARANCE_COMPLETED">Clearance Completed</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading offboarding pipeline...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <UserMinus className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">No separation records</h3>
            <p className="text-xs text-slate-500 mt-1">
              All team members are active in their positions.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Request #</th>
                <th className="p-3.5">Employee</th>
                <th className="p-3.5">Separation Type</th>
                <th className="p-3.5">Reason</th>
                <th className="p-3.5">Last Working Date</th>
                <th className="p-3.5">Department Clearance</th>
                <th className="p-3.5">Exit Interview</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5 font-semibold text-slate-900 font-mono">{req.requestNumber}</td>
                  <td className="p-3.5">
                    <div className="font-semibold text-slate-900">{req.employeeName}</div>
                    <div className="text-2xs text-slate-400">
                      {req.employeeCode} • {req.departmentName || 'General'}
                    </div>
                  </td>
                  <td className="p-3.5 font-medium text-slate-800">{req.separationType}</td>
                  <td className="p-3.5 text-slate-600 max-w-xs truncate">{req.reason}</td>
                  <td className="p-3.5 font-semibold text-slate-900">{req.officialLastWorkingDate || req.proposedLastWorkingDate}</td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          req.managerClearanceStatus === ClearanceItemStatus.CLEARED
                            ? 'bg-emerald-500'
                            : 'bg-amber-400'
                        }`}
                        title={`Manager: ${req.managerClearanceStatus}`}
                      />
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          req.hrClearanceStatus === ClearanceItemStatus.CLEARED
                            ? 'bg-emerald-500'
                            : 'bg-amber-400'
                        }`}
                        title={`HR: ${req.hrClearanceStatus}`}
                      />
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          req.itClearanceStatus === ClearanceItemStatus.CLEARED
                            ? 'bg-emerald-500'
                            : 'bg-amber-400'
                        }`}
                        title={`IT: ${req.itClearanceStatus}`}
                      />
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          req.financeClearanceStatus === ClearanceItemStatus.CLEARED
                            ? 'bg-emerald-500'
                            : 'bg-amber-400'
                        }`}
                        title={`Finance: ${req.financeClearanceStatus}`}
                      />
                      <span className="text-2xs text-slate-500 ml-1">
                        {[
                          req.managerClearanceStatus,
                          req.hrClearanceStatus,
                          req.itClearanceStatus,
                          req.financeClearanceStatus,
                        ].filter((s) => s === ClearanceItemStatus.CLEARED).length}
                        /4 Done
                      </span>
                    </div>
                  </td>
                  <td className="p-3.5">
                    {req.exitInterviewCompleted ? (
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-2xs font-medium">
                        Completed
                      </span>
                    ) : (
                      <span className="text-slate-400 text-2xs">Pending</span>
                    )}
                  </td>
                  <td className="p-3.5">{getStatusBadge(req.status)}</td>
                  <td className="p-3.5 text-right space-x-2">
                    <button
                      onClick={() => handleOpenClearance(req)}
                      className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium cursor-pointer"
                    >
                      Clearance Tasks
                    </button>
                    <button
                      onClick={() => handleOpenInterview(req)}
                      className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium cursor-pointer"
                    >
                      Exit Interview
                    </button>
                    <button
                      onClick={() => handleOpenHistory(req)}
                      className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium cursor-pointer"
                    >
                      Audit
                    </button>
                    {canManage && req.status !== OffboardingStatus.COMPLETED && (
                      <button
                        onClick={() => handleCompleteOffboarding(req.id)}
                        className="px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 font-medium cursor-pointer"
                      >
                        Finalize Exit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Clearance Checklist Modal */}
      {isClearanceModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs font-semibold text-blue-600">Clearance Checklist</span>
                <h3 className="text-lg font-bold text-slate-900">{selectedRequest.employeeName}</h3>
              </div>
              <button
                onClick={() => setIsClearanceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs grid grid-cols-3 gap-2">
              <div>
                <span className="text-slate-400">Separation Type:</span>
                <div className="font-semibold text-slate-800">{selectedRequest.separationType}</div>
              </div>
              <div>
                <span className="text-slate-400">Last Working Date:</span>
                <div className="font-semibold text-slate-800">
                  {selectedRequest.officialLastWorkingDate || selectedRequest.proposedLastWorkingDate}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Workflow State:</span>
                <div>{getStatusBadge(selectedRequest.status)}</div>
              </div>
            </div>

            {/* Checklist Items Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Departmental Clearances & Asset Handbacks
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Dept</th>
                      <th className="p-2.5">Clearance Task</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Cleared By</th>
                      <th className="p-2.5">Remarks</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {clearanceItems.map((item) => (
                      <tr key={item.id}>
                        <td className="p-2.5 font-semibold text-slate-700">{item.department}</td>
                        <td className="p-2.5">
                          <div className="font-medium text-slate-900">{item.itemTitle}</div>
                          {item.description && <div className="text-2xs text-slate-400">{item.description}</div>}
                        </td>
                        <td className="p-2.5">
                          {item.status === ClearanceItemStatus.CLEARED ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-2xs font-semibold">
                              CLEARED
                            </span>
                          ) : item.status === ClearanceItemStatus.WAIVED ? (
                            <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-2xs font-semibold">
                              WAIVED
                            </span>
                          ) : item.status === ClearanceItemStatus.BLOCKED ? (
                            <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded text-2xs font-semibold">
                              BLOCKED
                            </span>
                          ) : (
                            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-2xs font-semibold">
                              PENDING
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-600">{item.clearedByName || '—'}</td>
                        <td className="p-2.5 text-slate-500 text-2xs">{item.remarks || '—'}</td>
                        <td className="p-2.5 text-right">
                          {canManage && item.status !== ClearanceItemStatus.CLEARED && (
                            <button
                              onClick={() => {
                                setActingClearanceItem(item);
                                setClearanceActionStatus(ClearanceItemStatus.CLEARED);
                              }}
                              className="px-2 py-1 rounded bg-[#2F75B5] text-white hover:bg-[#1f5588] font-medium text-2xs cursor-pointer"
                            >
                              Sign Off
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Item Sub-modal */}
            {actingClearanceItem && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                <h5 className="text-xs font-bold text-blue-900">
                  Update Clearance: {actingClearanceItem.itemTitle} ({actingClearanceItem.department})
                </h5>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Clearance Decision *</label>
                    <select
                      value={clearanceActionStatus}
                      onChange={(e) => setClearanceActionStatus(e.target.value as ClearanceItemStatus)}
                      className="w-full border border-slate-300 rounded p-1.5 bg-white text-xs font-semibold"
                    >
                      <option value={ClearanceItemStatus.CLEARED}>Cleared (Pass / Handed Over)</option>
                      <option value={ClearanceItemStatus.WAIVED}>Waived (Not Applicable)</option>
                      <option value={ClearanceItemStatus.BLOCKED}>Blocked (Missing / Unsettled)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Remarks / Note</label>
                    <input
                      type="text"
                      placeholder="e.g. Asset received in good condition, accounts settled"
                      value={clearanceActionRemarks}
                      onChange={(e) => setClearanceActionRemarks(e.target.value)}
                      className="w-full border border-slate-300 rounded p-1.5 bg-white text-xs"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setActingClearanceItem(null)}
                    className="px-3 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitClearanceItem}
                    className="px-3 py-1 bg-[#2F75B5] text-white rounded text-xs font-semibold hover:bg-[#1f5588] cursor-pointer"
                  >
                    Confirm Sign-off
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsClearanceModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Interview Modal */}
      {isInterviewModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                Exit Interview: {selectedRequest.employeeName}
              </h3>
              <button onClick={() => setIsInterviewModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedInterview ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800">
                  Exit interview conducted on {new Date(selectedInterview.interviewDate).toLocaleDateString()} by{' '}
                  <span className="font-semibold">{selectedInterview.conductedByName || 'HR'}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Primary Reason for Leaving:</span>
                  <div className="mt-1 p-2 bg-slate-50 border border-slate-200 rounded text-slate-800">
                    {selectedInterview.primaryReasonForLeaving}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-400">Overall Experience:</span>
                    <div className="font-bold text-sm text-slate-800">{selectedInterview.overallExperienceRating}/5</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Manager Feedback:</span>
                    <div className="font-bold text-sm text-slate-800">
                      {selectedInterview.managerFeedbackRating}/5
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Company Culture:</span>
                    <div className="font-bold text-sm text-slate-800">{selectedInterview.companyCultureRating}/5</div>
                  </div>
                </div>
                {selectedInterview.compensationFeedback && (
                  <div>
                    <span className="font-semibold text-slate-700">Compensation Feedback:</span>
                    <div className="p-2 bg-slate-50 rounded border border-slate-200 mt-1 text-slate-700">
                      {selectedInterview.compensationFeedback}
                    </div>
                  </div>
                )}
                {selectedInterview.suggestionsForImprovement && (
                  <div>
                    <span className="font-semibold text-slate-700">Suggestions for Improvement:</span>
                    <div className="p-2 bg-slate-50 rounded border border-slate-200 mt-1 text-slate-700 italic">
                      "{selectedInterview.suggestionsForImprovement}"
                    </div>
                  </div>
                )}
                <div>
                  <span className="font-semibold text-slate-700">Would Recommend Company:</span>{' '}
                  <span className="font-bold text-slate-900">
                    {selectedInterview.wouldRecommendCompany ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Primary Reason for Leaving *</label>
                  <input
                    type="text"
                    value={interviewPrimaryReason}
                    onChange={(e) => setInterviewPrimaryReason(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Experience (1-5)</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={interviewOverallRating}
                      onChange={(e) => setInterviewOverallRating(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded p-2"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Manager (1-5)</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={interviewManagerRating}
                      onChange={(e) => setInterviewManagerRating(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded p-2"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Culture (1-5)</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={interviewCultureRating}
                      onChange={(e) => setInterviewCultureRating(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded p-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Compensation & Benefits Feedback</label>
                  <input
                    type="text"
                    value={interviewCompFeedback}
                    onChange={(e) => setInterviewCompFeedback(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Suggestions for Improvement</label>
                  <textarea
                    rows={2}
                    value={interviewSuggestions}
                    onChange={(e) => setInterviewSuggestions(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="recComp"
                    checked={interviewRecommend}
                    onChange={(e) => setInterviewRecommend(e.target.checked)}
                    className="rounded text-[#2F75B5]"
                  />
                  <label htmlFor="recComp" className="text-xs text-slate-700 font-medium">
                    Employee would recommend working at the company to others
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    onClick={() => setIsInterviewModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded text-xs font-medium text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitInterview}
                    className="px-4 py-2 bg-[#2F75B5] text-white rounded text-xs font-medium hover:bg-[#1f5588]"
                  >
                    Save Interview Record
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Audit Modal */}
      {isHistoryModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                Separation Audit: {selectedRequest.requestNumber}
              </h3>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {historyList.map((hist) => (
                <div key={hist.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span>{hist.action}</span>
                    <span className="text-slate-400 text-2xs">{new Date(hist.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="text-slate-600">
                    By <span className="font-medium text-slate-900">{hist.actorName}</span> ({hist.actorRole})
                  </div>
                  <div className="text-slate-600">{hist.details}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Initiate Resignation Modal */}
      {isInitiateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Initiate Employee Separation</h3>
              <button onClick={() => setIsInitiateModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Employee ID *</label>
                <input
                  type="text"
                  placeholder="e.g. emp-101"
                  value={initEmployeeId}
                  onChange={(e) => setInitEmployeeId(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Separation Type *</label>
                <select
                  value={initSeparationType}
                  onChange={(e) => setInitSeparationType(e.target.value as SeparationType)}
                  className="w-full border border-slate-300 rounded p-2 bg-white"
                >
                  <option value={SeparationType.RESIGNATION}>Voluntary Resignation</option>
                  <option value={SeparationType.TERMINATION_INVOLUNTARY}>Involuntary Termination</option>
                  <option value={SeparationType.TERMINATION_VOLUNTARY}>Mutual Separation Agreement</option>
                  <option value={SeparationType.RETIREMENT}>Retirement</option>
                  <option value={SeparationType.CONTRACT_END}>End of Contract</option>
                  <option value={SeparationType.PROBATION_SEPARATION}>Probation Separation</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Primary Reason *</label>
                <input
                  type="text"
                  placeholder="e.g. Career change, relocation, personal"
                  value={initReason}
                  onChange={(e) => setInitReason(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Notice Period (Days)</label>
                  <input
                    type="number"
                    value={initNoticePeriod}
                    onChange={(e) => setInitNoticePeriod(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Last Working Date *</label>
                  <input
                    type="date"
                    value={initLastWorkingDate}
                    onChange={(e) => setInitLastWorkingDate(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 font-semibold"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Manager / HR Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Transition or handover notes..."
                  value={initRemarks}
                  onChange={(e) => setInitRemarks(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsInitiateModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleInitiate}
                className="px-4 py-2 bg-[#2F75B5] text-white rounded-lg text-xs font-medium hover:bg-[#1f5588]"
              >
                Submit Separation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
