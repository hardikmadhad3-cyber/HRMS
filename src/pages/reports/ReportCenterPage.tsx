import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/shell/PageHeader.js';
import {
  FileBarChart2,
  Download,
  FileSpreadsheet,
  Filter,
  RefreshCw,
  Search,
  Calendar,
  Users,
  Clock,
  Briefcase,
  DollarSign,
  Award,
  Layers,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient.js';
import { useAuth } from '../../context/AuthContext.js';
import { useNotification } from '../../context/NotificationContext.js';
import {
  ReportCategoryKey,
  ReportDefinition,
  ReportExecutionResult,
} from '../../types/platform.js';

export function ReportCenterPage() {
  const { activeCompanyId } = useAuth();
  const { showToast } = useNotification();

  const [catalog, setCatalog] = useState<ReportDefinition[]>([]);
  const [selectedReportKey, setSelectedReportKey] = useState<ReportCategoryKey>('HEADCOUNT');
  const [loading, setLoading] = useState(false);
  const [reportResult, setReportResult] = useState<ReportExecutionResult | null>(null);

  // Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    if (selectedReportKey && activeCompanyId) {
      executeReport(selectedReportKey, 1);
    }
  }, [selectedReportKey, activeCompanyId]);

  const loadCatalog = async () => {
    try {
      const res = await apiClient.get<ReportDefinition[]>('/api/v1/reports/catalog');
      if (res.success && res.data) {
        setCatalog(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load report catalog:', err);
    }
  };

  const executeReport = async (key: ReportCategoryKey = selectedReportKey, targetPage = page) => {
    setLoading(true);
    try {
      const res = await apiClient.post<ReportExecutionResult>('/api/v1/reports/execute', {
        reportKey: key,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: statusFilter || undefined,
        page: targetPage,
        pageSize,
      });

      if (res.success && res.data) {
        setReportResult(res.data);
        setPage(targetPage);
      } else {
        showToast('error', 'Report Execution Failed', res.error || 'Unable to execute report');
      }
    } catch (err: any) {
      showToast('error', 'Report Error', err?.message || 'Server error generating operational report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await apiClient.post<ReportExecutionResult>('/api/v1/reports/export', {
        reportKey: selectedReportKey,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: statusFilter || undefined,
        exportFormat: 'CSV',
      });

      if (res.success && res.data && res.data.csvContent) {
        const blob = new Blob([res.data.csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${selectedReportKey.toLowerCase()}_report_${new Date().toISOString().substring(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('success', 'Report Exported', 'CSV report downloaded successfully.');
      }
    } catch (err: any) {
      showToast('error', 'Export Failed', err?.message || 'Failed to download report CSV');
    }
  };

  const handleExportJSON = () => {
    if (!reportResult) return;
    const blob = new Blob([JSON.stringify(reportResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedReportKey.toLowerCase()}_report_${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'JSON Exported', 'Structured report JSON downloaded.');
  };

  const categories = ['ALL', 'Core HR', 'Time & Attendance', 'Leave Management', 'Payroll', 'Talent Acquisition', 'Talent Management', 'Finance & Claims', 'Assets & IT', 'Offboarding'];

  const filteredCatalog = catalog.filter((r) => {
    if (categoryFilter !== 'ALL' && r.category !== categoryFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
    }
    return true;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Core HR': return <Users className="w-4 h-4 text-blue-600" />;
      case 'Time & Attendance': return <Clock className="w-4 h-4 text-amber-600" />;
      case 'Leave Management': return <Calendar className="w-4 h-4 text-purple-600" />;
      case 'Payroll': return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case 'Talent Acquisition': return <Briefcase className="w-4 h-4 text-indigo-600" />;
      case 'Talent Management': return <Award className="w-4 h-4 text-rose-600" />;
      default: return <Layers className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Enterprise Report Center & Business Intelligence"
        subtitle="Operational registries, compliance ledgers, headcount analytics and multi-entity reports"
        breadcrumbs={[{ label: 'HRMS Platform', path: '/dashboard' }, { label: 'Report Center' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={loading || !reportResult}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold rounded shadow-2xs flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              onClick={handleExportJSON}
              disabled={loading || !reportResult}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-semibold rounded shadow-2xs flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </button>
          </div>
        }
      />

      <div className="px-6 max-w-7xl mx-auto space-y-6">
        {/* Category Navigation Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar border-b border-slate-200">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all ${
                categoryFilter === cat
                  ? 'bg-[#17365D] text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Report Selector Grid & Search */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search operational reports catalog..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#17365D]"
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredCatalog.length} available reports
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredCatalog.map((rpt) => {
              const isSelected = selectedReportKey === rpt.key;
              return (
                <button
                  key={rpt.key}
                  onClick={() => setSelectedReportKey(rpt.key)}
                  className={`text-left p-3 rounded-lg border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-600 shadow-2xs ring-1 ring-blue-600'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded text-[10px]">
                        {rpt.category}
                      </span>
                      {getCategoryIcon(rpt.category)}
                    </div>
                    <h4 className="font-bold text-[#17365D] text-xs line-clamp-1">{rpt.title}</h4>
                    <p className="text-slate-500 text-[11px] line-clamp-2 leading-relaxed">{rpt.description}</p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                    <span>Key: {rpt.key}</span>
                    <span className={isSelected ? 'text-blue-700 font-bold' : ''}>
                      {isSelected ? '● Active' : 'Select'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Filter Bar */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#17365D]" />
              <h3 className="text-xs font-bold text-[#17365D] uppercase tracking-wider">
                Report Filters & Execution Parameters
              </h3>
            </div>
            <button
              onClick={() => executeReport(selectedReportKey, 1)}
              disabled={loading}
              className="px-3 py-1 bg-[#17365D] hover:bg-[#122b4a] disabled:opacity-50 text-white text-xs font-semibold rounded flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Run Report
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
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
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#17365D]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Status Filter</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#17365D]"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="APPROVED">APPROVED</option>
                <option value="PENDING">PENDING</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setStatusFilter('');
                  executeReport(selectedReportKey, 1);
                }}
                className="w-full px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-xs transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Report Output Container */}
        {loading ? (
          <div className="p-12 bg-white border border-slate-200 rounded-lg text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#17365D] animate-spin mx-auto opacity-70" />
            <p className="text-xs font-semibold text-slate-600">Generating operational dataset & aggregations...</p>
          </div>
        ) : reportResult ? (
          <div className="space-y-4">
            {/* KPI Summary Cards */}
            {reportResult.summaryMetrics && Object.keys(reportResult.summaryMetrics).length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(reportResult.summaryMetrics).map(([metricKey, metricVal]) => (
                  <div key={metricKey} className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
                    <p className="text-[11px] font-semibold text-slate-500">{metricKey}</p>
                    <p className="text-lg font-bold text-[#17365D] mt-1">{metricVal}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Main Data Table */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-[#17365D]">{reportResult.title}</h3>
                  <p className="text-[10px] text-slate-500">
                    Generated at {new Date(reportResult.generatedAt).toLocaleString()} • {reportResult.totalRows} total records
                  </p>
                </div>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded text-[10px]">
                  Tenant Scoped
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-bold">
                      {reportResult.columns.map((col) => (
                        <th key={col.key} className="px-4 py-2.5 whitespace-nowrap">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportResult.rows.length === 0 ? (
                      <tr>
                        <td colSpan={reportResult.columns.length} className="p-8 text-center text-slate-400 italic">
                          No matching records found for the applied filter criteria.
                        </td>
                      </tr>
                    ) : (
                      reportResult.rows.map((row: any, rIdx: number) => (
                        <tr key={row.id || rIdx} className="hover:bg-slate-50/80 transition-colors">
                          {reportResult.columns.map((col) => {
                            const val = row[col.key];
                            if (col.type === 'badge') {
                              return (
                                <td key={col.key} className="px-4 py-2.5 whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    String(val).includes('ACTIVE') || String(val).includes('APPROVED') || String(val).includes('PRESENT') || String(val).includes('COMPLETED')
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : String(val).includes('INACTIVE') || String(val).includes('REJECTED') || String(val).includes('ABSENT')
                                      ? 'bg-red-50 text-red-800 border border-red-200'
                                      : 'bg-blue-50 text-blue-800 border border-blue-200'
                                  }`}>
                                    {String(val || '—')}
                                  </span>
                                </td>
                              );
                            }
                            if (col.type === 'currency') {
                              return (
                                <td key={col.key} className="px-4 py-2.5 whitespace-nowrap font-semibold text-slate-800">
                                  {String(val || '—')}
                                </td>
                              );
                            }
                            return (
                              <td key={col.key} className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                                {String(val !== undefined && val !== null ? val : '—')}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {reportResult.totalPages > 1 && (
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Page {page} of {reportResult.totalPages} ({reportResult.totalRows} records)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => executeReport(selectedReportKey, page - 1)}
                      disabled={page <= 1}
                      className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => executeReport(selectedReportKey, page + 1)}
                      disabled={page >= reportResult.totalPages}
                      className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
