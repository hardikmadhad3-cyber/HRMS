import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  CheckCircle2,
  AlertCircle,
  Layers,
  Star,
  Settings2,
  Tag,
} from 'lucide-react';
import {
  PerformanceReviewTemplate,
  GoalCategory,
} from '../../../types/performance.js';
import { performanceApi } from '../../../services/performanceApi.js';
import { useAuth } from '../../../context/AuthContext.js';
import { PermissionKey } from '../../../types/auth.js';

interface PerformanceTemplatesTabProps {
  templates: PerformanceReviewTemplate[];
  onOpenCreateTemplate: () => void;
  onRefresh: () => void;
}

export function PerformanceTemplatesTab({
  templates,
  onOpenCreateTemplate,
  onRefresh,
}: PerformanceTemplatesTabProps) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PermissionKey.PERFORMANCE_MANAGE);

  const [categories, setCategories] = useState<GoalCategory[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  // New Category form state
  const [isAddCatOpen, setIsAddCatOpen] = useState(false);
  const [catCode, setCatCode] = useState('');
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catWeight, setCatWeight] = useState(25);
  const [catSaving, setCatSaving] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  const loadCategories = async () => {
    setLoadingCats(true);
    try {
      const res = await performanceApi.getGoalCategories();
      if (res.success && res.data) {
        setCategories(res.data);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoadingCats(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catCode.trim() || !catName.trim()) {
      setCatError('Code and Name are required.');
      return;
    }
    setCatSaving(true);
    setCatError(null);
    try {
      const res = await performanceApi.createGoalCategory({
        code: catCode.trim().toUpperCase(),
        name: catName.trim(),
        description: catDesc.trim() || undefined,
        defaultWeightage: catWeight,
      });
      if (res.success) {
        setIsAddCatOpen(false);
        setCatCode('');
        setCatName('');
        setCatDesc('');
        loadCategories();
      } else {
        setCatError(res.error || 'Failed to save category');
      }
    } catch (err: any) {
      setCatError(err.message || 'Error saving category');
    } finally {
      setCatSaving(false);
    }
  };

  return (
    <div className="space-y-8" id="performance-templates-tab">
      {/* Templates Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Appraisal Framework Templates</h2>
            <p className="text-xs text-slate-500">
              Configured appraisal blueprints defining goal vs competency weightings, rating rubrics, and competencies.
            </p>
          </div>

          {canManage && (
            <button
              onClick={onOpenCreateTemplate}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" /> New Framework Template
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                    {tpl.code}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">{tpl.name}</h3>
                  {tpl.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{tpl.description}</p>
                  )}
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                  Active
                </span>
              </div>

              {/* Weightage Bar */}
              <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                <div className="flex justify-between font-semibold">
                  <span className="text-blue-700">Goals: {tpl.goalWeightagePct}%</span>
                  <span className="text-purple-700">Competencies: {tpl.competencyWeightagePct}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 flex overflow-hidden">
                  <div
                    className="bg-blue-600 h-2"
                    style={{ width: `${tpl.goalWeightagePct}%` }}
                    title={`Goals: ${tpl.goalWeightagePct}%`}
                  />
                  <div
                    className="bg-purple-600 h-2"
                    style={{ width: `${tpl.competencyWeightagePct}%` }}
                    title={`Competencies: ${tpl.competencyWeightagePct}%`}
                  />
                </div>
              </div>

              {/* Competencies Preview */}
              <div className="space-y-2 text-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Configured Competencies ({tpl.competencies?.length || 0})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(tpl.competencies || []).map((comp) => (
                    <span
                      key={comp.id}
                      className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium"
                    >
                      {comp.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Goal Categories Section */}
      <div className="space-y-4 pt-6 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Goal / KRA Categories</h2>
            <p className="text-xs text-slate-500">
              Taxonomy for organizational objectives (Financial, Operational, Customer, Learning).
            </p>
          </div>

          {canManage && (
            <button
              onClick={() => setIsAddCatOpen(true)}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors flex items-center gap-1 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" /> Add Category
            </button>
          )}
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-700">{cat.code}</span>
                <span className="text-[10px] font-semibold text-slate-400">
                  {cat.defaultWeightage}% Default
                </span>
              </div>
              <div className="text-xs font-bold text-slate-900">{cat.name}</div>
              {cat.description && (
                <p className="text-[11px] text-slate-500 line-clamp-2">{cat.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add Category Modal */}
      {isAddCatOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Add Goal Category</h3>
              <button onClick={() => setIsAddCatOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {catError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg">{catError}</div>
            )}

            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Category Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={catCode}
                  onChange={(e) => setCatCode(e.target.value)}
                  placeholder="e.g. STRATEGIC_INITIATIVES"
                  className="w-full text-xs font-mono uppercase border border-slate-300 rounded-lg p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Strategic Initiatives & Innovation"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Default Weightage (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={catWeight}
                  onChange={(e) => setCatWeight(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Brief scope of goals under this category..."
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddCatOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={catSaving}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  {catSaving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
