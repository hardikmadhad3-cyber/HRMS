import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  TrendingUp,
  Calendar,
  Target,
  Award,
  FileText,
  Plus,
  Layers,
  Sparkles,
} from 'lucide-react';

import { PerformanceDashboardTab } from './tabs/PerformanceDashboardTab.js';
import { PerformanceCyclesTab } from './tabs/PerformanceCyclesTab.js';
import { PerformanceGoalsTab } from './tabs/PerformanceGoalsTab.js';
import { PerformanceReviewsTab } from './tabs/PerformanceReviewsTab.js';
import { PerformanceTemplatesTab } from './tabs/PerformanceTemplatesTab.js';

import { CreateCycleModal } from './components/CreateCycleModal.js';
import { CreateGoalModal } from './components/CreateGoalModal.js';
import { CreateTemplateModal } from './components/CreateTemplateModal.js';

import {
  PerformanceCycle,
  PerformanceReviewTemplate,
  PerformanceGoal,
} from '../../types/performance.js';
import { performanceApi } from '../../services/performanceApi.js';
import { useAuth } from '../../context/AuthContext.js';
import { PermissionKey } from '../../types/auth.js';

export function PerformanceHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';
  const cycleParam = searchParams.get('cycleId') || undefined;

  const { hasPermission } = useAuth();
  const canManage = hasPermission(PermissionKey.PERFORMANCE_MANAGE);

  // Global cached cycles and templates for modals
  const [cycles, setCycles] = useState<PerformanceCycle[]>([]);
  const [templates, setTemplates] = useState<PerformanceReviewTemplate[]>([]);
  const [parentGoals, setParentGoals] = useState<PerformanceGoal[]>([]);

  // Modals state
  const [isCreateCycleOpen, setIsCreateCycleOpen] = useState(false);
  const [isCreateGoalOpen, setIsCreateGoalOpen] = useState(false);
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);

  const loadData = async () => {
    try {
      const [cycleRes, tplRes, goalsRes] = await Promise.all([
        performanceApi.getCycles(),
        performanceApi.getTemplates(),
        performanceApi.getGoals({ isManagerGoal: true }),
      ]);
      if (cycleRes.success && cycleRes.data) setCycles(cycleRes.data);
      if (tplRes.success && tplRes.data) setTemplates(tplRes.data);
      if (goalsRes.success && goalsRes.data) setParentGoals(goalsRes.data);
    } catch (err) {
      console.error('Error fetching performance shared state:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTabChange = (tabKey: string, cycleId?: string) => {
    const params: Record<string, string> = { tab: tabKey };
    if (cycleId) params.cycleId = cycleId;
    setSearchParams(params);
  };

  const tabs = [
    {
      id: 'dashboard',
      label: 'Performance Dashboard',
      icon: TrendingUp,
      description: 'Appraisal KPIs, grade distribution & company rating index',
    },
    {
      id: 'cycles',
      label: 'Appraisal Cycles',
      icon: Calendar,
      description: 'Review windows, submission deadlines & appraisal generation',
    },
    {
      id: 'goals',
      label: 'Goals & KRAs',
      icon: Target,
      description: 'Strategic objectives, key results & progress tracking',
    },
    {
      id: 'reviews',
      label: 'Performance Reviews',
      icon: Award,
      description: 'Self-appraisal, manager evaluation & final sign-off',
    },
    {
      id: 'templates',
      label: 'Framework Templates',
      icon: FileText,
      description: 'Goal/competency weightings, rating scales & categories',
    },
  ];

  return (
    <div className="space-y-6" id="performance-hub-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Performance Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Holistic performance architecture: appraisal cycles, cascading KRAs, self/manager reviews, competency rubrics, and immutable audit history.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsCreateGoalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <Target className="w-3.5 h-3.5" /> Define Goal
          </button>

          {canManage && (
            <button
              onClick={() => setIsCreateCycleOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Launch Cycle
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab View */}
      <div>
        {currentTab === 'dashboard' && (
          <PerformanceDashboardTab onNavigateTab={handleTabChange} />
        )}
        {currentTab === 'cycles' && (
          <PerformanceCyclesTab
            templates={templates}
            onOpenCreateCycle={() => setIsCreateCycleOpen(true)}
            onNavigateTab={handleTabChange}
          />
        )}
        {currentTab === 'goals' && (
          <PerformanceGoalsTab
            cycles={cycles}
            selectedCycleId={cycleParam}
            onOpenCreateGoal={() => setIsCreateGoalOpen(true)}
          />
        )}
        {currentTab === 'reviews' && (
          <PerformanceReviewsTab
            cycles={cycles}
            templates={templates}
            selectedCycleId={cycleParam}
          />
        )}
        {currentTab === 'templates' && (
          <PerformanceTemplatesTab
            templates={templates}
            onOpenCreateTemplate={() => setIsCreateTemplateOpen(true)}
            onRefresh={loadData}
          />
        )}
      </div>

      {/* Shared Modals */}
      {isCreateCycleOpen && (
        <CreateCycleModal
          templates={templates}
          onClose={() => setIsCreateCycleOpen(false)}
          onSuccess={loadData}
        />
      )}

      {isCreateGoalOpen && (
        <CreateGoalModal
          cycles={cycles}
          parentGoals={parentGoals}
          defaultCycleId={cycleParam}
          onClose={() => setIsCreateGoalOpen(false)}
          onSuccess={loadData}
        />
      )}

      {isCreateTemplateOpen && (
        <CreateTemplateModal
          onClose={() => setIsCreateTemplateOpen(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
