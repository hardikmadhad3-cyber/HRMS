import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/shell/PageHeader.js';
import { apiClient } from '../../services/apiClient.js';
import { AuditLogEntry } from '../../types/audit.js';
import { useAuth } from '../../context/AuthContext.js';
import { LoadingSkeleton, ErrorBanner } from '../../components/common/LoadingSkeleton.js';
import { ShieldCheck, Search, Filter } from 'lucide-react';

export function AuditLogPage() {
  const { activeCompanyId } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    const res = await apiClient.get<AuditLogEntry[]>('/api/v1/administration/audit', activeCompanyId);
    if (res.success && res.data) {
      setLogs(res.data);
    } else {
      setError(res.error || 'Failed to load audit logs.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [activeCompanyId]);

  return (
    <div>
      <PageHeader
        title="Audit Trail & System Events"
        subtitle="Immutable record of security, configuration and business actions"
        breadcrumbs={[
          { label: 'HRMS Portal', path: '/dashboard' },
          { label: 'Administration' },
          { label: 'Audit Log' },
        ]}
      />

      <div className="p-6 max-w-7xl mx-auto space-y-4">
        {loading ? (
          <LoadingSkeleton rows={4} />
        ) : error ? (
          <ErrorBanner message={error} onRetry={fetchLogs} />
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Module</th>
                  <th className="py-2.5 px-4">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{log.actorName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{log.actorEmail}</p>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#17365D]">{log.action}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">
                        {log.targetModule}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-[11px]">{log.changesSummary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
