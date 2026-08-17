import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Calendar,
  Clock,
  AlertTriangle,
  RotateCw,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { PayrollPeriod, PayrollCalendar } from '../../types/payroll.js';

interface CalculatePayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunCalculated: (runId: string) => void;
}

export function CalculatePayrollModal({
  isOpen,
  onClose,
  onRunCalculated,
}: CalculatePayrollModalProps) {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPeriods();
    }
  }, [isOpen]);

  const fetchPeriods = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/payroll/calendars', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const calendars: PayrollCalendar[] = json.data;
        const allPeriods: PayrollPeriod[] = [];
        calendars.forEach((c) => {
          if (c.periods) {
            allPeriods.push(...c.periods);
          }
        });
        const openPeriods = allPeriods.filter((p) => p.status !== 'CLOSED');
        setPeriods(openPeriods.length > 0 ? openPeriods : allPeriods);
        if (openPeriods.length > 0 && !selectedPeriodId) {
          setSelectedPeriodId(openPeriods[0].id);
        } else if (allPeriods.length > 0 && !selectedPeriodId) {
          setSelectedPeriodId(allPeriods[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load payroll periods');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPeriodId) {
      setError('Please select a payroll period.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch('/api/payroll/runs/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          payrollPeriodId: selectedPeriodId,
          notes: notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to calculate payroll');
      }
      onRunCalculated(json.data.run.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Calculation failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden"
        id="calculate-payroll-modal"
      >
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-400/30">
              <Play className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Execute Payroll Calculation</h2>
              <p className="text-xs text-slate-400">Deterministic gross-to-net engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCalculate} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Payroll Period <span className="text-rose-500">*</span>
            </label>
            {loading ? (
              <div className="py-2 text-xs text-slate-500 flex items-center gap-2">
                <RotateCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                Loading periods...
              </div>
            ) : (
              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.periodName} ({p.periodCode}) — {p.startDate} to {p.endDate} [{p.status}]
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedPeriod && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-700 font-medium">
                <span>Pay Date: {selectedPeriod.payDate || 'Month End'}</span>
                <span>Cutoff: {selectedPeriod.cutoffDate || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Engine will consume authoritative finalized Time & Leave snapshot</span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Run Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Regular monthly payroll run for January 2026"
              rows={2}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loading || !selectedPeriodId}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Run Calculation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
