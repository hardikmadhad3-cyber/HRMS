import React from 'react';
import { PageHeader } from '../../components/shell/PageHeader.js';
import { Settings, Save } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext.js';

export function SystemSettingsPage() {
  const { showToast } = useNotification();

  return (
    <div>
      <PageHeader
        title="System Settings"
        subtitle="Cross-module configuration defaults and global system settings"
        breadcrumbs={[
          { label: 'HRMS Portal', path: '/dashboard' },
          { label: 'Administration' },
          { label: 'System Settings' },
        ]}
        primaryAction={{
          label: 'Save Configuration',
          icon: <Save className="w-3.5 h-3.5" />,
          onClick: () => showToast('success', 'Settings Saved', 'Global system settings persisted.'),
        }}
      />

      <div className="p-6 max-w-4xl mx-auto space-y-4 text-xs">
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
          <h3 className="font-bold text-[#17365D] text-sm border-b border-slate-100 pb-2">
            General System & Security Defaults
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Session Timeout (Minutes)</label>
              <input
                type="number"
                defaultValue={30}
                className="w-full max-w-xs p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Max Document File Size (MB)</label>
              <input
                type="number"
                defaultValue={10}
                className="w-full max-w-xs p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Multi-Company Data Isolation Policy</label>
              <select className="w-full max-w-md p-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#2F75B5] focus:outline-none">
                <option value="STRICT">Strict Isolation (Server HTTP Header Enforcement)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
