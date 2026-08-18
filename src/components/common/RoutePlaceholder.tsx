import React from 'react';
import { useLocation } from 'react-router-dom';
import { ROUTE_REGISTRY, RouteConfig } from '../../routes/routesConfig.js';
import { PageHeader } from '../shell/PageHeader.js';
import { Layers, ShieldCheck, FileText, CheckCircle } from 'lucide-react';
import { PermissionKey } from '../../types/auth.js';

interface RoutePlaceholderProps {
  title?: string;
  description?: string;
}

export function RoutePlaceholder({ title: customTitle, description: customDescription }: RoutePlaceholderProps) {
  const location = useLocation();
  const foundRoute = ROUTE_REGISTRY.find((r) => r.path === location.pathname);

  const route: Partial<RouteConfig> & { title: string; subtitle?: string; category: string; phase: string } = foundRoute || {
    title: customTitle || 'Module Page',
    subtitle: customDescription || 'HRMS Subsystem',
    phase: 'Phase 1 (Core HR)',
    category: 'HRMS Subsystem',
    isImplemented: false,
  };

  const displayTitle = customTitle || route.title;
  const displaySubtitle = customDescription || route.subtitle;

  return (
    <div>
      <PageHeader
        title={displayTitle}
        subtitle={displaySubtitle}
        breadcrumbs={[
          { label: 'HRMS Portal', path: '/dashboard' },
          { label: route.category || 'Module' },
          { label: displayTitle },
        ]}
      />

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Foundation Notice Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-2xs">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2F75B5]">
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                  {route.phase}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-semibold text-slate-600">Route Registered & Secured</span>
              </div>

              <h2 className="text-base font-bold text-[#17365D]">{displayTitle} Module Placeholder</h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {displaySubtitle ||
                  'This route is fully integrated into the HRMS Application Shell, Navigation Hierarchy, Route Guard, and Server Permission Layer.'}
              </p>
            </div>
          </div>
        </div>

        {/* Technical Architecture Specs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 text-xs">
            <div className="flex items-center gap-2 font-bold text-[#17365D] mb-3">
              <ShieldCheck className="w-4 h-4 text-[#2F75B5]" />
              <span>Security & Access Control</span>
            </div>
            <ul className="space-y-2 text-slate-600">
              <li className="flex justify-between border-b border-slate-100 pb-1.5">
                <span>Required Permission:</span>
                <code className="font-mono bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                  {route.requiredPermission || 'Standard Authenticated User'}
                </code>
              </li>
              <li className="flex justify-between border-b border-slate-100 pb-1.5">
                <span>Data Isolation:</span>
                <span className="font-semibold text-slate-800">Server-Enforced Multi-Company Context</span>
              </li>
              <li className="flex justify-between">
                <span>Audit Trail:</span>
                <span className="font-semibold text-emerald-600">Event Logging Configured</span>
              </li>
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 text-xs">
            <div className="flex items-center gap-2 font-bold text-[#17365D] mb-3">
              <FileText className="w-4 h-4 text-[#2F75B5]" />
              <span>Specification Reference</span>
            </div>
            <ul className="space-y-2 text-slate-600">
              <li className="flex justify-between border-b border-slate-100 pb-1.5">
                <span>Specification Document:</span>
                <span className="font-semibold text-slate-800">Document 5 (UI/UX Specification)</span>
              </li>
              <li className="flex justify-between border-b border-slate-100 pb-1.5">
                <span>Target Layout:</span>
                <span className="font-semibold text-slate-800">Responsive Data Grid & Form Drawer</span>
              </li>
              <li className="flex justify-between">
                <span>API Layer:</span>
                <span className="font-semibold text-slate-800">REST Architecture (/api/v1/*)</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Capability Checklist */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 text-xs">
          <h3 className="font-bold text-[#17365D] mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Phase 0 Foundation Architecture Ready</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Application Shell & Breadcrumb Integration</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Role-Based Route Guard Enforcement</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Multi-Company Header Context Binding</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Database Data Access Abstraction Layer</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
