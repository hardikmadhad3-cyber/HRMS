import React, { useEffect, useState } from 'react';
import {
  X,
  History,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { apiClient } from '../../services/apiClient.js';
import { EmployeeShiftAssignment } from '../../types/shift.js';

interface ShiftHistoryModalProps {
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  isOpen: boolean;
  onClose: () => void;
  onAssignNew?: () => void;
}

export function ShiftHistoryModal({
  employeeId,
  employeeName,
  employeeCode,
  isOpen,
  onClose,
  onAssignNew,
}: ShiftHistoryModalProps) {
  const { activeCompanyId } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [history, setHistory] = useState<EmployeeShiftAssignment[]>([]);
  const [currentShift, setCurrentShift] = useState<EmployeeShiftAssignment | null>(null);
  const [futureShift, setFutureShift] = useState<EmployeeShiftAssignment | null>(null);

  useEffect(() => {
    if (isOpen && employeeId && activeCompanyId) {
      loadHistory();
    }
  }, [isOpen, employeeId, activeCompanyId]);

  const loadHistory = async () => {
    setLoading(true);
    const res = await apiClient.get<{
      currentShift: EmployeeShiftAssignment | null;
      futureShift: EmployeeShiftAssignment | null;
      history: EmployeeShiftAssignment[];
    }>(`/api/v1/attendance/employees/${employeeId}/shift-history`, undefined, activeCompanyId);

    if (res.success && res.data) {
      setHistory(res.data.history);
      setCurrentShift(res.data.currentShift);
      setFutureShift(res.data.futureShift);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Shift Assignment Timeline
              </h3>
              <p className="text-xs text-slate-500">
                {employeeName} ({employeeCode}) • Effective-dated audit trail
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Active Shift Card */}
          {currentShift ? (
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block mb-1">
                  Currently Effective Shift
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: currentShift.shiftColor || '#3B82F6' }}
                  />
                  <span className="font-bold text-slate-900 text-sm">
                    {currentShift.shiftCode} — {currentShift.shiftName}
                  </span>
                </div>
                <span className="text-xs text-slate-600 font-mono mt-0.5 block">
                  {currentShift.shiftStartTime} - {currentShift.shiftEndTime}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-900 block">
                  From: {currentShift.effectiveFrom}
                </span>
                <span className="text-[10px] text-slate-500">
                  {currentShift.effectiveTo ? `To: ${currentShift.effectiveTo}` : 'Open-ended (Active)'}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 text-center">
              No currently effective shift assigned to this employee.
            </div>
          )}

          {/* Future Scheduled Shift */}
          {futureShift && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-amber-800 block">
                  Scheduled Future Shift
                </span>
                <span className="font-semibold text-slate-900">
                  {futureShift.shiftCode} ({futureShift.shiftStartTime} - {futureShift.shiftEndTime})
                </span>
              </div>
              <span className="text-amber-800 font-medium">Starts: {futureShift.effectiveFrom}</span>
            </div>
          )}

          {/* Timeline List */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Historical Assignment Records ({history.length})
            </h4>

            {loading ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading shift records...</div>
            ) : history.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-slate-200">
                No shift history records found.
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {history.map((record) => (
                  <div key={record.id} className="relative">
                    <span
                      className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ring-2 ring-slate-300"
                      style={{ backgroundColor: record.shiftColor || '#3B82F6' }}
                    />
                    <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs hover:border-slate-300 transition">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{record.shiftCode}</span>
                          <span className="text-slate-500 font-mono">
                            ({record.shiftStartTime} - {record.shiftEndTime})
                          </span>
                        </div>
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-slate-100 text-slate-700 rounded uppercase">
                          {record.assignmentType}
                        </span>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-1.5">
                        <span>
                          Period: <strong>{record.effectiveFrom}</strong> to{' '}
                          <strong>{record.effectiveTo || 'Present'}</strong>
                        </span>
                        {record.reason && (
                          <span className="italic text-slate-400 truncate max-w-xs">
                            "{record.reason}"
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100"
          >
            Close
          </button>
          {onAssignNew && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onAssignNew();
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Schedule New Shift
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
