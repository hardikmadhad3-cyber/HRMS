import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  AlertTriangle,
  ShieldAlert,
  FileCheck,
} from 'lucide-react';
import { PayrollRun } from '../../types/payroll.js';

interface PayrollReopenModalProps {
  run: PayrollRun;
  isOpen: boolean;
  onClose: () => void;
  onReopened: () => void;
}

export function PayrollReopenModal({
  run,
  isOpen,
  onClose,
  onReopened,
}: PayrollReopenModalProps) {
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A comprehensive audit reason is mandatory to reopen finalized payroll.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await fetch(`/api/payroll/runs/${run.id}/reopen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to reopen payroll run');
      }

      onReopened();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error reopening run');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-amber-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-400" />
            <h2 className="font-semibold text-base">Controlled Payroll Reopen (Run #{run.runNumber})</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg border border-rose-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-1 text-[11px]">
            <div className="font-semibold flex items-center gap-1">
              <ShieldAlert className="w-4 h-4 text-amber-700" />
              Compliance & Immutability Standard
            </div>
            <p>
              Reopening finalized payroll marks current snapshot version #{run.runNumber} as <strong>SUPERSEDED</strong>.
              The original snapshot remains permanently in the audit ledger and cannot be deleted or overwritten.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1.5">
              Reason for Reopen / Rerun <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder="E.g. Approved retroactive attendance adjustment, compensation correction for employee #EMP-102, or tax recalculation..."
              rows={4}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
          </div>

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
              disabled={isSubmitting || !reason.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reopen Payroll
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
