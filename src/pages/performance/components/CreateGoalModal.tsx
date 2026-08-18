import React, { useState, useEffect } from 'react';
import { X, Target, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  PerformanceCycle,
  GoalCategory,
  MeasurementType,
  CreatePerformanceGoalDTO,
  PerformanceGoal,
} from '../../../types/performance.js';
import { performanceApi } from '../../../services/performanceApi.js';
import { useAuth } from '../../../context/AuthContext.js';

interface CreateGoalModalProps {
  cycles: PerformanceCycle[];
  parentGoals?: PerformanceGoal[];
  defaultCycleId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateGoalModal({
  cycles,
  parentGoals = [],
  defaultCycleId,
  onClose,
  onSuccess,
}: CreateGoalModalProps) {
  const { user } = useAuth();
  const [cycleId, setCycleId] = useState<string>(defaultCycleId || cycles[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('OPERATIONAL');
  const [categories, setCategories] = useState<GoalCategory[]>([]);
  const [measurementType, setMeasurementType] = useState<MeasurementType>(MeasurementType.PERCENTAGE);
  const [targetValue, setTargetValue] = useState<number>(100);
  const [unit, setUnit] = useState<string>('%');
  const [weightage, setWeightage] = useState<number>(25);
  const [dueDate, setDueDate] = useState<string>('');
  const [parentGoalId, setParentGoalId] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await performanceApi.getGoalCategories();
        if (res.success && res.data) {
          setCategories(res.data);
          if (res.data.length > 0) setCategory(res.data[0].code);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    }
    loadCategories();
  }, []);

  const handleMeasurementTypeChange = (type: MeasurementType) => {
    setMeasurementType(type);
    if (type === MeasurementType.PERCENTAGE) {
      setUnit('%');
      setTargetValue(100);
    } else if (type === MeasurementType.MILESTONE) {
      setUnit('% Complete');
      setTargetValue(100);
    } else if (type === MeasurementType.CURRENCY) {
      setUnit('$');
      setTargetValue(50000);
    } else {
      setUnit('Units');
      setTargetValue(10);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !cycleId) {
      setError('Please provide a goal title and select an appraisal cycle.');
      return;
    }

    setLoading(true);
    setError(null);

    const dto: CreatePerformanceGoalDTO = {
      cycleId,
      title: title.trim(),
      description: description.trim(),
      category,
      measurementType,
      targetValue,
      unit,
      weightage,
      dueDate: dueDate || undefined,
      parentGoalId: parentGoalId || undefined,
    };

    try {
      const res = await performanceApi.createGoal(dto);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || 'Failed to create goal');
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
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Define Performance Goal / KRA</h3>
              <p className="text-xs text-slate-500">Set measurable key results and strategic objectives.</p>
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

          {/* Cycle & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Appraisal Cycle <span className="text-rose-500">*</span>
              </label>
              <select
                value={cycleId}
                onChange={(e) => setCycleId(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-emerald-500"
                required
              >
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Goal Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-emerald-500"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.code}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Goal Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Goal / KRA Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Deliver Phase 6 Performance Module with 100% test coverage"
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description & Success Criteria
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of deliverables, standards, and metrics..."
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Measurement Type, Target, Unit, Weightage */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Type
              </label>
              <select
                value={measurementType}
                onChange={(e) => handleMeasurementTypeChange(e.target.value as MeasurementType)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
              >
                <option value={MeasurementType.PERCENTAGE}>Percentage</option>
                <option value={MeasurementType.NUMERIC}>Numeric</option>
                <option value={MeasurementType.MILESTONE}>Milestone</option>
                <option value={MeasurementType.CURRENCY}>Currency</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Target Value
              </label>
              <input
                type="number"
                step="any"
                value={targetValue}
                onChange={(e) => setTargetValue(parseFloat(e.target.value) || 0)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Unit
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Weight (%)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={weightage}
                onChange={(e) => setWeightage(parseFloat(e.target.value) || 0)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2"
                required
              />
            </div>
          </div>

          {/* Due Date & Parent Goal Alignment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Target Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Cascading Strategic Goal (Parent)
              </label>
              <select
                value={parentGoalId}
                onChange={(e) => setParentGoalId(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
              >
                <option value="">None (Standalone Objective)</option>
                {parentGoals.map((pg) => (
                  <option key={pg.id} value={pg.id}>
                    {pg.title}
                  </option>
                ))}
              </select>
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
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Creating...' : 'Create Performance Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
