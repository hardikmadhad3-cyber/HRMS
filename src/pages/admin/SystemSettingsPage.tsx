import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/shell/PageHeader.js';
import {
  Settings,
  Save,
  Shield,
  Bell,
  DollarSign,
  Clock,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Info,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient.js';
import { useAuth } from '../../context/AuthContext.js';
import { useNotification } from '../../context/NotificationContext.js';
import { SystemSetting } from '../../types/platform.js';

export function SystemSettingsPage() {
  const { activeCompanyId } = useAuth();
  const { showToast } = useNotification();

  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'GENERAL' | 'SECURITY' | 'NOTIFICATIONS' | 'PAYROLL' | 'ATTENDANCE'>('ALL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [activeCompanyId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<SystemSetting[]>('/api/v1/administration/settings');
      if (res.success && res.data) {
        setSettings(res.data);
      }
    } catch (err: any) {
      showToast('error', 'Error', err?.message || 'Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value } : s))
    );
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const payload = settings.map((s) => ({
        key: s.key,
        value: s.value,
        category: s.category,
        description: s.description,
        dataType: s.dataType,
        isPublic: s.isPublic,
      }));

      const res = await apiClient.put('/api/v1/administration/settings', { settings: payload });
      if (res.success) {
        showToast('success', 'Settings Saved', 'System configurations successfully updated and audit logged.');
        loadSettings();
      } else {
        showToast('error', 'Save Failed', res.error || 'Failed to persist settings');
      }
    } catch (err: any) {
      showToast('error', 'Error', err?.message || 'Server error updating settings');
    } finally {
      setSaving(false);
    }
  };

  const categories = [
    { key: 'ALL', label: 'All Settings', icon: <Sliders className="w-3.5 h-3.5" /> },
    { key: 'GENERAL', label: 'General & Localization', icon: <Settings className="w-3.5 h-3.5" /> },
    { key: 'SECURITY', label: 'Security & Auth', icon: <Shield className="w-3.5 h-3.5" /> },
    { key: 'NOTIFICATIONS', label: 'Notifications & Alerts', icon: <Bell className="w-3.5 h-3.5" /> },
    { key: 'PAYROLL', label: 'Payroll & Currency', icon: <DollarSign className="w-3.5 h-3.5" /> },
    { key: 'ATTENDANCE', label: 'Time & Attendance', icon: <Clock className="w-3.5 h-3.5" /> },
  ];

  const filteredSettings = settings.filter((s) => {
    if (activeCategory === 'ALL') return true;
    return s.category === activeCategory;
  });

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Enterprise System Settings & Defaults"
        subtitle="Global tenant parameters, operational thresholds, security timeouts, and notification rules"
        breadcrumbs={[
          { label: 'HRMS Platform', path: '/dashboard' },
          { label: 'Administration' },
          { label: 'System Settings' },
        ]}
        actions={
          <button
            onClick={handleSaveSettings}
            disabled={saving || loading}
            className="px-4 py-1.5 bg-[#17365D] hover:bg-[#122b4a] disabled:opacity-50 text-white text-xs font-semibold rounded shadow-2xs flex items-center gap-1.5 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        }
      />

      <div className="px-6 max-w-5xl mx-auto space-y-6">
        {/* Category Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.key
                  ? 'bg-[#17365D] text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>

        {/* Settings Form Container */}
        {loading ? (
          <div className="p-12 bg-white border border-slate-200 rounded-lg text-center space-y-3">
            <RefreshCw className="w-6 h-6 text-[#17365D] animate-spin mx-auto opacity-70" />
            <p className="text-xs text-slate-500 font-medium">Loading configuration parameters...</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden divide-y divide-slate-100">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#17365D]" />
                <h3 className="font-bold text-xs text-[#17365D] uppercase tracking-wider">
                  Configured Parameters ({filteredSettings.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Legal Entity: {activeCompanyId || 'comp-101'}
              </span>
            </div>

            {filteredSettings.map((s) => (
              <div key={s.key} className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="space-y-1 max-w-md">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-xs">{s.key}</span>
                    <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 font-mono text-[9px] rounded">
                      {s.category}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">{s.description}</p>
                </div>

                <div className="w-full sm:w-64 shrink-0">
                  {s.dataType === 'BOOLEAN' ? (
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={s.value === true || s.value === 'true'}
                        onChange={(e) => handleSettingChange(s.key, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#17365D]" />
                      <span className="ml-2 text-xs font-semibold text-slate-700">
                        {s.value === true || s.value === 'true' ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  ) : s.dataType === 'NUMBER' ? (
                    <input
                      type="number"
                      value={s.value}
                      onChange={(e) => handleSettingChange(s.key, Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-[#17365D] focus:outline-none text-xs font-semibold text-slate-800"
                    />
                  ) : (
                    <input
                      type="text"
                      value={String(s.value)}
                      onChange={(e) => handleSettingChange(s.key, e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-[#17365D] focus:outline-none text-xs text-slate-800"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
