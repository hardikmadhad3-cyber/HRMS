import React, { useState } from 'react';
import { X, FileText, CheckCircle2, AlertCircle, Plus, Trash2 } from 'lucide-react';
import {
  RatingScaleItem,
  CompetencyItem,
  CreatePerformanceTemplateDTO,
} from '../../../types/performance.js';
import { performanceApi } from '../../../services/performanceApi.js';

interface CreateTemplateModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateTemplateModal({ onClose, onSuccess }: CreateTemplateModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goalWeightagePct, setGoalWeightagePct] = useState<number>(60);
  const [competencyWeightagePct, setCompetencyWeightagePct] = useState<number>(40);

  const [ratingScale, setRatingScale] = useState<RatingScaleItem[]>([
    { rating: 5, label: 'Outstanding (O)', description: 'Consistently far exceeds objectives', minScore: 4.5, maxScore: 5.0 },
    { rating: 4, label: 'Exceeds Expectations (EE)', description: 'Consistently above standard performance', minScore: 3.5, maxScore: 4.49 },
    { rating: 3, label: 'Meets Expectations (ME)', description: 'Successfully meets all job expectations', minScore: 2.5, maxScore: 3.49 },
    { rating: 2, label: 'Needs Improvement (NI)', description: 'Requires guided improvement', minScore: 1.5, maxScore: 2.49 },
    { rating: 1, label: 'Unsatisfactory (U)', description: 'Falls below acceptable performance', minScore: 1.0, maxScore: 1.49 },
  ]);

  const [competencies, setCompetencies] = useState<CompetencyItem[]>([
    { id: 'c-1', name: 'Technical Excellence & Quality', category: 'Functional', description: 'Clean architecture, testing, and zero critical regressions.', weightage: 25 },
    { id: 'c-2', name: 'Ownership & Accountability', category: 'Behavioral', description: 'Proactive end-to-end execution and responsibility.', weightage: 25 },
    { id: 'c-3', name: 'Collaboration & Teamwork', category: 'Behavioral', description: 'Helpful code reviews, empathetic communication.', weightage: 25 },
    { id: 'c-4', name: 'Innovation & Problem Solving', category: 'Core', description: 'Creative problem solving and performance optimization.', weightage: 25 },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddCompetency = () => {
    const newComp: CompetencyItem = {
      id: `c-${Date.now()}`,
      name: '',
      category: 'Behavioral',
      description: '',
      weightage: 25,
    };
    setCompetencies([...competencies, newComp]);
  };

  const handleRemoveCompetency = (index: number) => {
    setCompetencies(competencies.filter((_, i) => i !== index));
  };

  const handleCompetencyChange = (index: number, field: keyof CompetencyItem, value: any) => {
    setCompetencies((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setError('Template code and name are required.');
      return;
    }

    if (Math.abs(goalWeightagePct + competencyWeightagePct - 100) > 0.01) {
      setError('Goal weightage and competency weightage must add up to 100%.');
      return;
    }

    setLoading(true);
    setError(null);

    const dto: CreatePerformanceTemplateDTO = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description.trim() || undefined,
      goalWeightagePct,
      competencyWeightagePct,
      ratingScale,
      competencies,
    };

    try {
      const res = await performanceApi.createTemplate(dto);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || 'Failed to create template');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Create Appraisal Framework Template</h3>
              <p className="text-xs text-slate-500">Define weightage balance, rating scales, and core competencies.</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Code & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Template Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. ENG-PERF-TEMPLATE"
                className="w-full text-xs font-mono uppercase border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Template Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Engineering Balanced Appraisal"
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          {/* Weightages */}
          <div className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Scoring Weightage Calibration (Total: 100%)
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Goal / KRA Weightage (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={goalWeightagePct}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setGoalWeightagePct(val);
                    setCompetencyWeightagePct(100 - val);
                  }}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Competency Weightage (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={competencyWeightagePct}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setCompetencyWeightagePct(val);
                    setGoalWeightagePct(100 - val);
                  }}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Guidelines for review managers using this template..."
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Competency Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Competencies Catalog ({competencies.length})
              </h4>
              <button
                type="button"
                onClick={handleAddCompetency}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Competency
              </button>
            </div>

            <div className="space-y-2.5">
              {competencies.map((comp, idx) => (
                <div key={comp.id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={comp.name}
                      onChange={(e) => handleCompetencyChange(idx, 'name', e.target.value)}
                      placeholder="Competency Title (e.g. Technical Excellence)"
                      className="flex-1 text-xs border border-slate-300 rounded-md p-1.5 bg-white"
                      required
                    />
                    <select
                      value={comp.category}
                      onChange={(e) => handleCompetencyChange(idx, 'category', e.target.value)}
                      className="w-28 text-xs border border-slate-300 rounded-md p-1.5 bg-white"
                    >
                      <option value="Functional">Functional</option>
                      <option value="Behavioral">Behavioral</option>
                      <option value="Core">Core</option>
                      <option value="Leadership">Leadership</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRemoveCompetency(idx)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={comp.description}
                    onChange={(e) => handleCompetencyChange(idx, 'description', e.target.value)}
                    placeholder="Evaluation criteria and description..."
                    className="w-full text-[11px] border border-slate-300 rounded-md p-1.5 bg-white"
                  />
                </div>
              ))}
            </div>
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
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
