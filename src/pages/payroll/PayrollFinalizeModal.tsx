import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  FileCheck,
  Send,
  Sparkles,
} from 'lucide-react';
import { PayrollRun, PayrollException, PayrollExceptionSeverity } from '../../types/payroll.js';

interface PayrollFinalizeModalProps {
  run: PayrollRun;
  isOpen: boolean;
  onClose: () => void;
  onFinalized: () => void;
}

export function PayrollFinalizeModal({
  run,
  isOpen,
  onClose,
  onFinalized,
}: PayrollFinalizeModalProps) {
  const [exceptions, setExceptions] = useState<PayrollException[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [publishImmediately, setPublishImmediately] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (isOpen && run) {
      const fetchExceptions = async () => {
        try {
          setLoading(true);
          setError(null);
          const res = await fetch(`/api/payroll/runs/${run.id}`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
            },
          });
          const json = await res.json();
          if (res.ok && json.success) {
            setExceptions(json.data.exceptions || []);
          }
        } catch (err: any) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchExceptions();
    }
  }, [isOpen, run]);

  if (!isOpen) return null;

  const blockingExceptions = exceptions.filter(
    (e) => !e.isResolved && e.severity === PayrollExceptionSeverity.BLOCKING
  );
  const hasBlockers = blockingExceptions.length > 0;

  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasBlockers) {
      setError('Cannot finalize payroll run with unresolved blocking exceptions.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await fetch(`/api/payroll/runs/${run.id}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          payDate,
          publishPayslipsImmediately: publishImmediately,
          notes,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Finalization failed');
      }

      onFinalized();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error executing finalization transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400" />
            <h2 className="font-semibold text-base">Finalize Payroll Run #{run.runNumber}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFinalize} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg border border-rose-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Financial Summary */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
            <div className="flex justify-between font-semibold text-slate-700">
              <span>Total Employees:</span>
              <span className="text-slate-900 font-bold">{run.totalEmployees} staff</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total Gross Earnings:</span>
              <span className="font-mono text-slate-900 font-medium">
                ${run.totalGrossEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total Deductions:</span>
              <span className="font-mono text-rose-600 font-medium">
                -${run.totalGrossDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-sm font-bold text-indigo-900 pt-2 border-t border-slate-200">
              <span>Net Disbursement:</span>
              <span className="font-mono text-indigo-700">
                ${run.totalNetPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Blocker Validation Status */}
          {loading ? (
            <div className="text-slate-400 text-center py-2">Verifying calculation blockers...</div>
          ) : hasBlockers ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                {blockingExceptions.length} Blocker(s) Preventing Finalization:
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
                {blockingExceptions.map((be, idx) => (
                  <li key={idx}>
                    [{be.exceptionType}] {be.message}
                  </li>
                ))}
              </ul>
              <div className="text-[11px] text-rose-600 font-medium pt-1">
                You must resolve or override all blocking exceptions before finalizing.
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">
                All pre-finalization checks passed. 0 unresolved blocking exceptions.
              </span>
            </div>
          )}

          {/* Input Fields */}
          <div className="space-y-3 pt-1">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Disbursement / Pay Date</label>
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="publishImmediately"
                checked={publishImmediately}
                onChange={(e) => setPublishImmediately(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <label htmlFor="publishImmediately" className="text-slate-700 font-medium cursor-pointer">
                Publish payslips immediately to Employee Self-Service (ESS)
              </label>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Finalization Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Audit notes, disbursement batch ID, or approvals summary..."
                rows={2}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Immutability Notice:</strong> Once finalized, this run will be permanently locked.
              Payslips and snapshot version #{run.runNumber} will be frozen into the ledger.
            </span>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || hasBlockers}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Executing Transaction...
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  Confirm & Finalize Payroll
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
