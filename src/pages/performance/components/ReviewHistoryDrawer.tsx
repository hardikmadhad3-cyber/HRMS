import React, { useState, useEffect } from 'react';
import { X, History, Clock, User, Shield, CheckCircle, FileText } from 'lucide-react';
import { PerformanceReview, PerformanceReviewHistory } from '../../../types/performance.js';
import { performanceApi } from '../../../services/performanceApi.js';

interface ReviewHistoryDrawerProps {
  review: PerformanceReview;
  onClose: () => void;
}

export function ReviewHistoryDrawer({ review, onClose }: ReviewHistoryDrawerProps) {
  const [history, setHistory] = useState<PerformanceReviewHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      try {
        const res = await performanceApi.getReviewHistory(review.id);
        if (res.success && res.data) {
          setHistory(res.data);
        } else {
          setError(res.error || 'Failed to load history');
        }
      } catch (err: any) {
        setError(err.message || 'Error loading history');
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [review.id]);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-lg h-full shadow-2xl border-l border-slate-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-200 text-slate-700 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Appraisal Audit Ledger</h3>
              <p className="text-xs text-slate-500">
                {review.employeeName} ({review.employeeCode}) • {review.cycleName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">Loading audit ledger...</div>
          ) : error ? (
            <div className="p-4 bg-rose-50 text-rose-700 text-xs rounded-lg">{error}</div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">No audit history entries recorded.</div>
          ) : (
            <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
              {history.map((item, idx) => (
                <div key={item.id || idx} className="relative group">
                  {/* Timeline dot */}
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-xs" />

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        {item.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 font-medium">{item.comment}</p>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200 text-[11px] text-slate-500">
                      <User className="w-3.5 h-3.5" />
                      <span>{item.actorName || 'System'}</span>
                      {item.actorRole && (
                        <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-xs font-mono text-[9px]">
                          {item.actorRole}
                        </span>
                      )}
                    </div>

                    {/* Snapshot payload preview if available */}
                    {item.snapshotData && Object.keys(item.snapshotData).length > 0 && (
                      <details className="text-[11px] text-slate-600 bg-white p-2 rounded-md border border-slate-200">
                        <summary className="cursor-pointer font-semibold text-slate-700">
                          View Snapshot Payload
                        </summary>
                        <pre className="mt-1 text-[10px] font-mono text-slate-700 overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(item.snapshotData, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
