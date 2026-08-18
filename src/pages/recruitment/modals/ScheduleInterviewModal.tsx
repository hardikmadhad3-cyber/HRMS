import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Video, Users, AlertCircle } from 'lucide-react';
import { InterviewType } from '../../../types/recruitment.js';
import { recruitmentApi } from '../../../services/recruitmentApi.js';
import { apiClient } from '../../../services/apiClient.js';
import { useNotification } from '../../../context/NotificationContext.js';

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  applicationId: string;
  candidateName?: string;
  requisitionTitle?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ScheduleInterviewModal({
  isOpen,
  applicationId,
  candidateName,
  requisitionTitle,
  onClose,
  onSuccess,
}: ScheduleInterviewModalProps) {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    roundNumber: 1,
    roundName: 'Technical & Architecture Round',
    interviewType: InterviewType.VIDEO,
    scheduledStartTime: '',
    scheduledEndTime: '',
    meetingLink: 'https://meet.google.com/xyz-abcd-efg',
    location: '',
    selectedInterviewerIds: [] as string[],
  });

  useEffect(() => {
    if (isOpen) {
      loadEmployees();
      // Set default start time 1 day from now at 10:00 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      const end = new Date(tomorrow);
      end.setHours(11, 0, 0, 0);

      const toLocalISO = (d: Date) => d.toISOString().slice(0, 16);

      setFormData((prev) => ({
        ...prev,
        scheduledStartTime: toLocalISO(tomorrow),
        scheduledEndTime: toLocalISO(end),
      }));
    }
  }, [isOpen]);

  const loadEmployees = async () => {
    try {
      const res = await apiClient.get<any[]>('/api/employees');
      if (res.success && res.data) {
        setEmployees(res.data);
      }
    } catch (err) {
      console.error('Failed to load employees for interviewers list:', err);
    }
  };

  if (!isOpen) return null;

  const handleInterviewerToggle = (empId: string) => {
    setFormData((prev) => {
      const exists = prev.selectedInterviewerIds.includes(empId);
      return {
        ...prev,
        selectedInterviewerIds: exists
          ? prev.selectedInterviewerIds.filter((id) => id !== empId)
          : [...prev.selectedInterviewerIds, empId],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.scheduledStartTime || !formData.scheduledEndTime) {
      showToast('error', 'Validation Error', 'Start and End times are required');
      return;
    }

    if (formData.selectedInterviewerIds.length === 0) {
      showToast('error', 'Validation Error', 'Please select at least one interviewer');
      return;
    }

    setLoading(true);
    try {
      const res = await recruitmentApi.scheduleInterview({
        applicationId,
        roundNumber: Number(formData.roundNumber),
        roundName: formData.roundName,
        interviewType: formData.interviewType,
        scheduledStartTime: new Date(formData.scheduledStartTime).toISOString(),
        scheduledEndTime: new Date(formData.scheduledEndTime).toISOString(),
        meetingLink: formData.meetingLink || undefined,
        location: formData.location || undefined,
        interviewerIds: formData.selectedInterviewerIds,
      });

      if (res.success) {
        showToast('success', 'Interview Scheduled', 'Interview round scheduled and calendar invites prepared!');
        onSuccess();
        onClose();
      } else {
        showToast('error', 'Scheduling Failed', res.error || 'Failed to schedule interview');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Error scheduling interview');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Schedule Interview Round</h2>
              <p className="text-xs text-slate-500">
                Candidate: <strong className="text-slate-800">{candidateName || 'Applicant'}</strong> • {requisitionTitle || 'Role'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Round Number
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.roundNumber}
                onChange={(e) => setFormData({ ...formData, roundNumber: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-hidden"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Round Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.roundName}
                onChange={(e) => setFormData({ ...formData, roundName: e.target.value })}
                placeholder="e.g. System Design & Coding"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Format
              </label>
              <select
                value={formData.interviewType}
                onChange={(e) => setFormData({ ...formData, interviewType: e.target.value as any })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-hidden"
              >
                <option value={InterviewType.VIDEO}>Google Meet / Video</option>
                <option value={InterviewType.IN_PERSON}>In-Person Office</option>
                <option value={InterviewType.PHONE}>Phone Call</option>
                <option value={InterviewType.TECHNICAL_TEST}>Technical Live Assessment</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Start Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={formData.scheduledStartTime}
                onChange={(e) => setFormData({ ...formData, scheduledStartTime: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                End Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={formData.scheduledEndTime}
                onChange={(e) => setFormData({ ...formData, scheduledEndTime: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Video Call URL / Room Location
            </label>
            <input
              type="text"
              value={formData.meetingLink}
              onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
              placeholder="https://meet.google.com/..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Select Panel Interviewers <span className="text-rose-500">*</span>
            </label>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 p-1 bg-slate-50/50">
              {employees.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">Loading interviewers...</div>
              ) : (
                employees.map((emp) => {
                  const isChecked = formData.selectedInterviewerIds.includes(emp.id);
                  return (
                    <label
                      key={emp.id}
                      className="flex items-center justify-between p-2.5 hover:bg-white rounded-md cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleInterviewerToggle(emp.id)}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                        <div>
                          <div className="text-xs font-semibold text-slate-900">
                            {emp.firstName} {emp.lastName}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {emp.designation?.name || 'Staff'} • {emp.department?.name || 'Dept'}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400">{emp.employeeCode}</span>
                    </label>
                  );
                })
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Selected panel members will receive evaluation scorecards upon interview completion.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Scheduling...' : 'Confirm & Send Invites'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
