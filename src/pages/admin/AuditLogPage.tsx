import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/shell/PageHeader.js';
import { apiClient } from '../../services/apiClient.js';
import { AuditLogEntry } from '../../types/audit.js';
import { useAuth } from '../../context/AuthContext.js';
import { LoadingSkeleton, ErrorBanner } from '../../components/common/LoadingSkeleton.js';
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Eye,
  X,
  FileCode,
  Layers,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext.js';

interface AuditLogResponse {
  logs: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

export function AuditLogPage() {
  const { activeCompanyId } = useAuth();
  const { showToast } = useNotification();

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Selected Log Details Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const fetchLogs = async (targetPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (moduleFilter) params.append('targetModule', moduleFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('limit', String(pageSize));
      params.append('offset', String((targetPage - 1) * pageSize));

      const res = await apiClient.get<AuditLogResponse>(`/api/v1/administration/audit?${params.toString()}`);
      if (res.success && res.data) {
        setLogs(res.data.logs || []);
        setTotalLogs(res.data.total || 0);
        setPage(targetPage);
      } else {
        setError(res.error || 'Failed to load audit logs.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [activeCompanyId]);

  const totalPages = Math.ceil(totalLogs / pageSize);

  const modulesList = [
    'ALL',
    'ORGANIZATION',
    'EMPLOYEE',
    'ATTENDANCE',
    'LEAVE',
    'PAYROLL',
    'RECRUITMENT',
    'PERFORMANCE',
    'EXPENSE',
    'ASSET',
    'OFFBOARDING',
    'ADMINISTRATION',
    'REPORTING',
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Audit Trail & Immutable Governance Ledger"
        subtitle="Cryptographically verified immutable record of administrative actions, payroll calculations, security events and user modifications"
        breadcrumbs={[
          { label: 'HRMS Platform', path: '/dashboard' },
          { label: 'Administration' },
          { label: 'Audit Trail' },
        ]}
        actions={
          <button
            onClick={() => fetchLogs(page)}
            disabled={loading}
            className="px-3 py-1.5 bg-[#17365D] hover:bg-[#122b4a] disabled:opacity-50 text-white text-xs font-semibold rounded shadow-2xs flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Log
          </button>
        }
      />

      <div className="px-6 max-w-7xl mx-auto space-y-4">
        {/* Filter Controls Bar */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#17365D]" />
            <h3 className="text-xs font-bold text-[#17365D] uppercase tracking-wider">
              Audit Query Filters
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Search Keywords</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Actor, action, or details..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 border border-slate-200 rounded bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#17365D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Module</label>
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value === 'ALL' ? '' : e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#17365D]"
              >
                {modulesList.map((m) => (
                  <option key={m} value={m === 'ALL' ? '' : m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#17365D]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">End Date</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#17365D]"
                />
                <button
                  onClick={() => fetchLogs(1)}
                  className="px-3 py-1.5 bg-[#17365D] text-white font-semibold rounded text-xs hover:bg-[#122b4a] transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        {loading ? (
          <LoadingSkeleton rows={6} />
        ) : error ? (
          <ErrorBanner message={error} onRetry={() => fetchLogs(page)} />
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-[#17365D]">
                Showing {logs.length} of {totalLogs} Recorded System Events
              </span>
              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 font-mono text-[10px] rounded">
                Tenant Scoped
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 font-bold text-slate-700">
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Actor</th>
                    <th className="py-2.5 px-4">Module</th>
                    <th className="py-2.5 px-4">Action</th>
                    <th className="py-2.5 px-4">Summary & Diff</th>
                    <th className="py-2.5 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                        No audit records found matching query parameters.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <p className="font-bold text-slate-800">{log.actorName || 'System'}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{log.actorEmail || 'system@core'}</p>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded text-[10px] font-bold">
                            {log.targetModule}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#17365D] whitespace-nowrap">
                          {log.action}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-[11px] max-w-md truncate">
                          {log.changesSummary}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="p-1 rounded text-slate-600 hover:bg-slate-100 hover:text-blue-700 transition-colors"
                            title="Inspect Event Payload"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Page {page} of {totalPages} ({totalLogs} records)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => fetchLogs(page - 1)}
                    disabled={page <= 1}
                    className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => fetchLogs(page + 1)}
                    disabled={page >= totalPages}
                    className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Audit Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-3.5 bg-[#17365D] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-200" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Audit Event Payload #{selectedLog.id}
                </h3>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[500px] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block">Timestamp</span>
                  <span className="font-mono text-slate-800 font-bold">{new Date(selectedLog.timestamp).toISOString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block">Target Entity ID</span>
                  <span className="font-mono text-slate-800 font-bold">{selectedLog.targetEntityId || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block">Actor</span>
                  <span className="text-slate-800 font-semibold">{selectedLog.actorName} ({selectedLog.actorEmail})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block">IP Address</span>
                  <span className="font-mono text-slate-800">{selectedLog.ipAddress || '127.0.0.1'}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-700 block mb-1">Changes Summary</span>
                <p className="p-2.5 bg-blue-50/60 border border-blue-200 text-blue-900 rounded font-medium">
                  {selectedLog.changesSummary}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-700 block mb-1">State Payload Diff</span>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded text-[11px] font-mono overflow-x-auto max-h-48">
                  {JSON.stringify(
                    {
                      previousState: selectedLog.previousState || null,
                      newState: selectedLog.newState || null,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-right">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
