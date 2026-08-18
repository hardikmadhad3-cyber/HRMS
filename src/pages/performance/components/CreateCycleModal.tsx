import React, { useState } from 'react';
import { X, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  PerformanceCycleType,
  PerformanceReviewTemplate,
  CreatePerformanceCycleDTO,
} from '../../../types/performance.js';
import { performanceApi } from '../../../services/performanceApi.js';

interface CreateCycleModalProps {
  templates: PerformanceReviewTemplate[];
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateCycleModal({ templates, onClose, onSuccess }: CreateCycleModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [cycleType, setCycleType] = useState<PerformanceCycleType>(PerformanceCycleType.HALF_YEARLY);
  const [startDate, setStartDate] = useState('2026-07-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [selfReviewDeadline, setSelfReviewDeadline] = useState('2027-01-15');
  const [managerReviewDeadline, setManagerReviewDeadline] = useState('2027-01-31');
  const [defaultTemplateId, setDefaultTemplateId] = useState<string>(templates[0]?.id || '');
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !startDate || !endDate) {
      setError('Please provide cycle code, name, and valid cycle date ranges.');
      return;
    }

    setLoading(true);
    setError(null);

    const dto: CreatePerformanceCycleDTO = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      cycleType,
      startDate,
      endDate,
      selfReviewDeadline: selfReviewDeadline || endDate,
      managerReviewDeadline: managerReviewDeadline || endDate,
      defaultTemplateId: defaultTemplateId || undefined,
      description: description.trim() || undefined,
    };

    try {
      const res = await performanceApi.createCycle(dto);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || 'Failed to create performance cycle');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Launch Performance Cycle</h3>
              <p className="text-xs text-slate-500">Configure appraisal duration, evaluation windows and deadlines.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Cycle Code & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Cycle Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. CYC-2026-H2"
                className="w-full text-xs font-mono uppercase border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Cadence / Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={cycleType}
                onChange={(e) => setCycleType(e.target.value as PerformanceCycleType)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value={PerformanceCycleType.HALF_YEARLY}>Half-Yearly (H1 / H2)</option>
                <option value={PerformanceCycleType.ANNUAL}>Annual (Full Year)</option>
                <option value={PerformanceCycleType.QUARTERLY}>Quarterly (Q1 - Q4)</option>
                <option value={PerformanceCycleType.PROJECT}>Project / Milestone Based</option>
                <option value={PerformanceCycleType.PROBATION}>Probation Review</option>
              </select>
            </div>
          </div>

          {/* Cycle Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Cycle Display Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 2026 H2 Mid-Year Performance Appraisal"
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Default Template */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Default Appraisal Template
            </label>
            <select
              value={defaultTemplateId}
              onChange={(e) => setDefaultTemplateId(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.goalWeightagePct}% Goals / {t.competencyWeightagePct}% Competencies)
                </option>
              ))}
            </select>
          </div>

          {/* Start and End Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Period Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Period End Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
                required
              />
            </div>
          </div>

          {/* Review Deadlines */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Self-Review Submission Deadline
              </label>
              <input
                type="date"
                value={selfReviewDeadline}
                onChange={(e) => setSelfReviewDeadline(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Manager-Review Final Deadline
              </label>
              <input
                type="date"
                value={managerReviewDeadline}
                onChange={(e) => setManagerReviewDeadline(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description / Instructions
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Instructions to managers and employees regarding goals and appraisal..."
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Creating...' : 'Create Cycle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
