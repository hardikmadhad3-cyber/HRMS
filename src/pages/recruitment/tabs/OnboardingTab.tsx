import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  CheckCircle2,
  Clock,
  FileCheck,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Search,
  Filter,
  Users,
  Building,
  Briefcase,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  EmployeeOnboarding,
  OnboardingStatus,
  OnboardingTask,
  OnboardingDocument,
  OnboardingTaskStatus,
  OnboardingDocStatus,
} from '../../../types/recruitment.js';
import { recruitmentApi } from '../../../services/recruitmentApi.js';
import { useNotification } from '../../../context/NotificationContext.js';

interface OnboardingTabProps {
  onOpenHandoffModal: (onboarding: EmployeeOnboarding) => void;
  selectedOnboardingId?: string;
}

export function OnboardingTab({ onOpenHandoffModal, selectedOnboardingId }: OnboardingTabProps) {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(true);
  const [onboardings, setOnboardings] = useState<EmployeeOnboarding[]>([]);
  const [activeOnboarding, setActiveOnboarding] = useState<EmployeeOnboarding | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    loadOnboardings();
  }, []);

  const loadOnboardings = async () => {
    setLoading(true);
    try {
      const res = await recruitmentApi.getOnboardings();
      if (res.success && res.data) {
        setOnboardings(res.data);
        if (res.data.length > 0) {
          const match = selectedOnboardingId
            ? res.data.find((o) => o.id === selectedOnboardingId)
            : res.data[0];
          setActiveOnboarding(match || res.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load employee onboardings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (task: OnboardingTask) => {
    const newStatus =
      task.status === OnboardingTaskStatus.COMPLETED
        ? OnboardingTaskStatus.PENDING
        : OnboardingTaskStatus.COMPLETED;
    try {
      const res = await recruitmentApi.updateTaskStatus(task.id, newStatus);
      if (res.success) {
        showToast('success', 'Task Updated', `Task marked as ${newStatus}`);
        loadOnboardings();
      } else {
        showToast('error', 'Update Failed', res.error || 'Failed to update task');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Error updating task status');
    }
  };

  const handleVerifyDoc = async (doc: OnboardingDocument) => {
    try {
      const res = await recruitmentApi.updateDocumentStatus(doc.id, OnboardingDocStatus.VERIFIED);
      if (res.success) {
        showToast('success', 'Document Verified', `Document ${doc.documentName} verified!`);
        loadOnboardings();
      } else {
        showToast('error', 'Verification Failed', res.error || 'Failed to verify document');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Error verifying document');
    }
  };

  const filteredOnboardings = onboardings.filter((o) => {
    return statusFilter === 'ALL' || o.status === statusFilter;
  });

  return (
    <div className="space-y-5">
      {/* Top Filter Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Filter Status:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
          >
            <option value="ALL">All Active Onboardings ({onboardings.length})</option>
            <option value={OnboardingStatus.NOT_STARTED}>Not Started</option>
            <option value={OnboardingStatus.IN_PROGRESS}>In Progress</option>
            <option value={OnboardingStatus.COMPLETED}>Completed (Active Employee)</option>
          </select>
        </div>
      </div>

      {/* Main Two-Column View: Onboarding Roster & Interactive Checklist Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Side: Onboarding Candidates */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col h-[700px]">
          <div className="p-3.5 bg-slate-50/70 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span>New Hires Onboarding ({filteredOnboardings.length})</span>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading onboardings...</div>
            ) : filteredOnboardings.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No active onboardings found.</div>
            ) : (
              filteredOnboardings.map((o) => {
                const isSelected = activeOnboarding?.id === o.id;
                const totalTasks = o.tasks?.length || 0;
                const doneTasks = o.tasks?.filter((t) => t.status === OnboardingTaskStatus.COMPLETED).length || 0;
                const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : (o.overallProgress || 0);

                return (
                  <div
                    key={o.id}
                    onClick={() => setActiveOnboarding(o)}
                    className={`p-4 cursor-pointer transition-colors ${
                      isSelected ? 'bg-emerald-50/80 border-l-4 border-emerald-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{o.fullName}</h4>
                        <p className="text-xs text-slate-500 font-medium">{o.designationName || 'Role'}</p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          o.status === OnboardingStatus.COMPLETED
                            ? 'bg-purple-100 text-purple-800'
                            : o.status === OnboardingStatus.IN_PROGRESS
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {o.status}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Checklist Completion</span>
                        <span className="font-bold text-slate-700">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Active Onboarding Interactive Dossier */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-2xs p-6 h-[700px] overflow-y-auto flex flex-col justify-between">
          {activeOnboarding ? (
            <div className="space-y-6">
              {/* Header Profile Section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900">{activeOnboarding.fullName}</h3>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Joining: {activeOnboarding.joiningDate}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {activeOnboarding.designationName || 'Role'} • {activeOnboarding.departmentName || 'Dept'} • {activeOnboarding.workLocationName || 'Location'}
                  </p>
                </div>

                {activeOnboarding.status !== OnboardingStatus.COMPLETED && !activeOnboarding.employeeId ? (
                  <button
                    onClick={() => onOpenHandoffModal(activeOnboarding)}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-2 shrink-0"
                  >
                    <UserCheck className="w-4 h-4" />
                    Handoff to Employee Master
                  </button>
                ) : (
                  <div className="px-3.5 py-1.5 bg-purple-50 border border-purple-200 text-purple-800 rounded-lg text-xs font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    Active Master Employee (Handoff Complete)
                  </div>
                )}
              </div>

              {/* Tasks Checklist Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-slate-500" />
                    Onboarding Provisioning Tasks ({activeOnboarding.tasks?.filter((t) => t.status === OnboardingTaskStatus.COMPLETED).length || 0} / {activeOnboarding.tasks?.length || 0})
                  </h4>
                </div>

                <div className="space-y-2">
                  {activeOnboarding.tasks && activeOnboarding.tasks.length > 0 ? (
                    activeOnboarding.tasks.map((task) => {
                      const isDone = task.status === OnboardingTaskStatus.COMPLETED;
                      return (
                        <div
                          key={task.id}
                          onClick={() => handleToggleTask(task)}
                          className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isDone
                              ? 'bg-emerald-50/50 border-emerald-200 text-slate-700'
                              : 'bg-slate-50 hover:bg-slate-100/70 border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isDone}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <div>
                              <div className={`text-xs font-bold ${isDone ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                                {task.title}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                Dept: <span className="font-semibold text-slate-700">{task.category}</span>
                                {task.description ? ` • ${task.description}` : ''}
                              </div>
                            </div>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {task.status}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4 text-xs text-slate-400">
                      No provisioning tasks generated.
                    </div>
                  )}
                </div>
              </div>

              {/* Document Collection & Verification */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-slate-500" />
                  Compliance Document Collection & Verification
                </h4>

                <div className="space-y-2">
                  {activeOnboarding.documents && activeOnboarding.documents.length > 0 ? (
                    activeOnboarding.documents.map((doc) => {
                      const isVerified = doc.status === OnboardingDocStatus.VERIFIED;
                      return (
                        <div
                          key={doc.id}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-900">{doc.documentName}</div>
                            <div className="text-[10px] text-slate-500">Type: {doc.documentType}</div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isVerified
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : doc.status === OnboardingDocStatus.SUBMITTED
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {doc.status}
                            </span>

                            {!isVerified && (
                              <button
                                onClick={() => handleVerifyDoc(doc)}
                                className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
                              >
                                Verify Doc
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4 text-xs text-slate-400">
                      No documents associated with this onboarding.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-slate-400">
              Select an onboarding candidate to view checklist and verify documents.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
