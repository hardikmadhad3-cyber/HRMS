import React, { useState, useEffect } from 'react';
import { X, UserPlus, Mail, Phone, Building2, Award, DollarSign, FileText, AlertCircle } from 'lucide-react';
import { CandidateSource, JobRequisition } from '../../../types/recruitment.js';
import { recruitmentApi } from '../../../services/recruitmentApi.js';
import { useNotification } from '../../../context/NotificationContext.js';

interface CreateCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultRequisitionId?: string;
}

export function CreateCandidateModal({ isOpen, onClose, onSuccess, defaultRequisitionId }: CreateCandidateModalProps) {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(false);
  const [requisitions, setRequisitions] = useState<JobRequisition[]>([]);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    currentCompany: '',
    currentDesignation: '',
    currentCtc: 120000,
    expectedCtc: 145000,
    currency: 'USD',
    experienceYears: 4,
    noticePeriodDays: 30,
    skillsStr: 'TypeScript, React, PostgreSQL',
    source: CandidateSource.LINKEDIN,
    applyToRequisitionId: defaultRequisitionId || '',
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadRequisitions();
      if (defaultRequisitionId) {
        setFormData((prev) => ({ ...prev, applyToRequisitionId: defaultRequisitionId }));
      }
    }
  }, [isOpen, defaultRequisitionId]);

  const loadRequisitions = async () => {
    try {
      const res = await recruitmentApi.getRequisitions();
      if (res.success && res.data) {
        setRequisitions(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch requisitions for candidate form:', err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.phone.trim()) {
      showToast('error', 'Validation Error', 'First name, last name, email and phone are required');
      return;
    }

    const skills = formData.skillsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setLoading(true);
    try {
      const res = await recruitmentApi.createCandidate({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        currentCompany: formData.currentCompany.trim() || undefined,
        currentDesignation: formData.currentDesignation.trim() || undefined,
        currentCtc: Number(formData.currentCtc),
        expectedCtc: Number(formData.expectedCtc),
        currency: formData.currency,
        experienceYears: Number(formData.experienceYears),
        noticePeriodDays: Number(formData.noticePeriodDays),
        skills,
        source: formData.source,
        notes: formData.notes.trim() || undefined,
        applyToRequisitionId: formData.applyToRequisitionId || undefined,
      });

      if (res.success) {
        showToast(
          'success',
          'Candidate Added',
          formData.applyToRequisitionId
            ? 'Candidate added and application created in recruitment pipeline!'
            : 'Candidate profile added to pool successfully!'
        );
        onSuccess();
        onClose();
      } else {
        showToast('error', 'Failed to Add', res.error || 'Failed to add candidate');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Error adding candidate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Add Candidate to Pool</h2>
              <p className="text-xs text-slate-500">Register candidate profile, resume skills, and assign to open job requisitions</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="e.g. David"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="e.g. Miller"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="david.miller@example.com"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 392-1084"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Current Employer
              </label>
              <input
                type="text"
                value={formData.currentCompany}
                onChange={(e) => setFormData({ ...formData, currentCompany: e.target.value })}
                placeholder="e.g. Oracle / Accenture"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Current Designation
              </label>
              <input
                type="text"
                value={formData.currentDesignation}
                onChange={(e) => setFormData({ ...formData, currentDesignation: e.target.value })}
                placeholder="e.g. Software Engineer"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Total Experience (Yrs)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={formData.experienceYears}
                onChange={(e) => setFormData({ ...formData, experienceYears: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Notice Period (Days)
              </label>
              <input
                type="number"
                min="0"
                value={formData.noticePeriodDays}
                onChange={(e) => setFormData({ ...formData, noticePeriodDays: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Source
              </label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value as any })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
              >
                <option value={CandidateSource.LINKEDIN}>LinkedIn</option>
                <option value={CandidateSource.CAREER_PAGE}>Career Page</option>
                <option value={CandidateSource.REFERRAL}>Referral</option>
                <option value={CandidateSource.JOB_BOARD}>Job Board</option>
                <option value={CandidateSource.DIRECT}>Direct Sourcing</option>
                <option value={CandidateSource.AGENCY}>Agency</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Current CTC ($/Year)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={formData.currentCtc}
                onChange={(e) => setFormData({ ...formData, currentCtc: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Expected CTC ($/Year)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={formData.expectedCtc}
                onChange={(e) => setFormData({ ...formData, expectedCtc: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Candidate Skills (comma separated)
            </label>
            <input
              type="text"
              value={formData.skillsStr}
              onChange={(e) => setFormData({ ...formData, skillsStr: e.target.value })}
              placeholder="e.g. React, Node.js, SQL, Docker"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
          </div>

          <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-lg">
            <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">
              Assign to Job Requisition (Optional Application Link)
            </label>
            <p className="text-xs text-blue-700 mb-2">
              Selecting an active requisition immediately creates a tracked application in the hiring pipeline.
            </p>
            <select
              value={formData.applyToRequisitionId}
              onChange={(e) => setFormData({ ...formData, applyToRequisitionId: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden font-medium text-slate-800"
            >
              <option value="">(None - Keep in General Talent Pool)</option>
              {requisitions.map((req) => (
                <option key={req.id} value={req.id}>
                  {req.requisitionNumber} - {req.title} ({req.departmentName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Recruiter Evaluation Notes
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Initial screening observations, portfolio links, or communication notes..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
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
              className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Adding...' : 'Add Candidate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
