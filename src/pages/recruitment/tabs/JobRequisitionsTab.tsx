import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Search,
  Filter,
  Plus,
  Building,
  MapPin,
  DollarSign,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  MoreVertical,
} from 'lucide-react';
import { JobRequisition, RequisitionStatus, RequisitionPriority } from '../../../types/recruitment.js';
import { recruitmentApi } from '../../../services/recruitmentApi.js';
import { useNotification } from '../../../context/NotificationContext.js';

interface JobRequisitionsTabProps {
  onOpenCreate: () => void;
  onSelectRequisitionForCandidates: (requisitionId: string) => void;
}

export function JobRequisitionsTab({
  onOpenCreate,
  onSelectRequisitionForCandidates,
}: JobRequisitionsTabProps) {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(true);
  const [requisitions, setRequisitions] = useState<JobRequisition[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    loadRequisitions();
  }, []);

  const loadRequisitions = async () => {
    setLoading(true);
    try {
      const res = await recruitmentApi.getRequisitions();
      if (res.success && res.data) {
        setRequisitions(res.data);
      }
    } catch (err) {
      console.error('Failed to load job requisitions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: RequisitionStatus) => {
    try {
      const res = await recruitmentApi.updateRequisitionStatus(id, newStatus);
      if (res.success) {
        showToast('success', 'Status Updated', `Requisition marked as ${newStatus}`);
        loadRequisitions();
      } else {
        showToast('error', 'Update Failed', res.error || 'Failed to update status');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Error updating requisition status');
    }
  };

  const filteredRequisitions = requisitions.filter((req) => {
    const matchesSearch =
      req.title.toLowerCase().includes(search.toLowerCase()) ||
      req.requisitionNumber.toLowerCase().includes(search.toLowerCase()) ||
      req.departmentName?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5">
      {/* Top Filter & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, number, department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
          >
            <option value="ALL">All Statuses ({requisitions.length})</option>
            <option value={RequisitionStatus.DRAFT}>Draft</option>
            <option value={RequisitionStatus.PENDING_APPROVAL}>Pending Approval</option>
            <option value={RequisitionStatus.APPROVED}>Approved</option>
            <option value={RequisitionStatus.ON_HOLD}>On Hold</option>
            <option value={RequisitionStatus.CLOSED}>Closed</option>
          </select>
        </div>

        <button
          onClick={onOpenCreate}
          className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Post Job Requisition
        </button>
      </div>

      {/* Requisitions List Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredRequisitions.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No Job Requisitions Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Get started by posting your first job opening to track headcount budget, interviews, and candidates.
          </p>
          <button
            onClick={onOpenCreate}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Post Requisition
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRequisitions.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between overflow-hidden"
            >
              <div className="p-5 space-y-4">
                {/* Header line */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {req.requisitionNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          req.priority === RequisitionPriority.URGENT
                            ? 'bg-rose-100 text-rose-800'
                            : req.priority === RequisitionPriority.HIGH
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {req.priority}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{req.title}</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {req.departmentName} • {req.designationName}
                    </p>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                      req.status === RequisitionStatus.APPROVED
                        ? 'bg-emerald-100 text-emerald-800'
                        : req.status === RequisitionStatus.PENDING_APPROVAL
                        ? 'bg-amber-100 text-amber-800'
                        : req.status === RequisitionStatus.ON_HOLD
                        ? 'bg-purple-100 text-purple-800'
                        : req.status === RequisitionStatus.CLOSED
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>

                {/* Location & Salary Badges */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{req.workLocationName || 'HQ'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      ${(req.minSalary / 1000).toFixed(0)}k - ${(req.maxSalary / 1000).toFixed(0)}k
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {req.filledCount} / {req.openingsCount} Openings Filled
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {req.minExperienceYears}-{req.maxExperienceYears} yrs exp
                    </span>
                  </div>
                </div>

                {/* Skills tags */}
                {req.requiredSkills && req.requiredSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {req.requiredSkills.map((s, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {req.status === RequisitionStatus.DRAFT && (
                    <button
                      onClick={() => handleStatusChange(req.id, RequisitionStatus.PENDING_APPROVAL)}
                      className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                    >
                      Submit for Approval
                    </button>
                  )}
                  {req.status === RequisitionStatus.PENDING_APPROVAL && (
                    <button
                      onClick={() => handleStatusChange(req.id, RequisitionStatus.APPROVED)}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                    >
                      Approve & Open
                    </button>
                  )}
                  {req.status === RequisitionStatus.APPROVED && (
                    <button
                      onClick={() => handleStatusChange(req.id, RequisitionStatus.ON_HOLD)}
                      className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors"
                    >
                      Hold
                    </button>
                  )}
                  {req.status === RequisitionStatus.ON_HOLD && (
                    <button
                      onClick={() => handleStatusChange(req.id, RequisitionStatus.APPROVED)}
                      className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                    >
                      Resume
                    </button>
                  )}
                </div>

                <button
                  onClick={() => onSelectRequisitionForCandidates(req.id)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  View Pipeline ({req.activeApplicationsCount || 0}) <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
