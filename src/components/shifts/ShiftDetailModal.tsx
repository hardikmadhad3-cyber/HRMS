import React from 'react';
import {
  X,
  Clock,
  Coffee,
  Calendar,
  Shield,
  Moon,
  Users,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Shift } from '../../types/shift.js';

interface ShiftDetailModalProps {
  shift: Shift | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (shift: Shift) => void;
}

export function ShiftDetailModal({ shift, isOpen, onClose, onEdit }: ShiftDetailModalProps) {
  if (!isOpen || !shift) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: shift.color || '#3B82F6' }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{shift.code}</h3>
                <span className="text-sm text-slate-600 font-medium">— {shift.name}</span>
                {shift.isOvernight && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-full flex items-center gap-1">
                    <Moon className="w-3 h-3" /> OVERNIGHT
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    shift.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {shift.status}
                </span>
              </div>
              {shift.description && (
                <p className="text-xs text-slate-500 mt-0.5">{shift.description}</p>
              )}
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
        <div className="p-6 space-y-6">
          {/* Timing Overview Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 block mb-1">
                Shift Window
              </span>
              <span className="text-sm font-bold text-slate-900 font-mono">
                {shift.startTime} - {shift.endTime}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 block mb-1">
                Full-Day Benchmark
              </span>
              <span className="text-sm font-bold text-slate-900">
                {shift.fullDayHours} Hours
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 block mb-1">
                Half-Day Threshold
              </span>
              <span className="text-sm font-bold text-slate-900">
                {shift.halfDayHours} Hours
              </span>
            </div>
          </div>

          {/* Grace Margins & Late Rules */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              Punctuality & Grace Policies
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500">Late Entry Grace:</span>{' '}
                <span className="font-semibold text-slate-900">{shift.lateEntryGraceMinutes} Minutes</span>
              </div>
              <div>
                <span className="text-slate-500">Early Exit Grace:</span>{' '}
                <span className="font-semibold text-slate-900">{shift.earlyExitGraceMinutes} Minutes</span>
              </div>
              <div>
                <span className="text-slate-500">Late Arrival Permitted:</span>{' '}
                <span className="font-semibold text-slate-900">{shift.lateAllowed ? 'YES' : 'NO'}</span>
              </div>
              <div>
                <span className="text-slate-500">Early Departure Permitted:</span>{' '}
                <span className="font-semibold text-slate-900">{shift.earlyExitAllowed ? 'YES' : 'NO'}</span>
              </div>
            </div>
          </div>

          {/* Breaks Configuration */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
              <Coffee className="w-3.5 h-3.5 text-amber-600" />
              Scheduled Breaks ({shift.breaks?.length || 0})
            </h4>
            {!shift.breaks || shift.breaks.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-200">
                No formal breaks defined for this shift.
              </p>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-200">
                {shift.breaks.map((b) => (
                  <div key={b.id} className="p-2.5 px-3.5 flex items-center justify-between text-xs bg-white">
                    <div>
                      <span className="font-semibold text-slate-900">{b.breakName}</span>
                      <span className="text-slate-500 font-mono ml-2">
                        ({b.startTime} - {b.endTime})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-600 font-medium">{b.durationMinutes} min</span>
                      <span
                        className={`px-1.5 py-0.5 text-[10px] rounded font-semibold ${
                          b.isPaid ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {b.isPaid ? 'PAID' : 'UNPAID'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weekly Off Rule */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              Weekly Off Schedule
            </h4>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500">Off Days:</span>{' '}
                <span className="font-semibold text-slate-900">
                  {shift.weeklyOffRule?.daysOfWeek?.join(', ') || 'SUNDAY'}
                </span>
                {shift.weeklyOffRule?.alternateSaturday && (
                  <span className="ml-1 text-blue-600 font-medium">(+ 2nd & 4th Saturdays)</span>
                )}
              </div>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 rounded-full">
                {shift.weeklyOffRule?.name || 'Default Weekly Off'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-slate-400" />
            <span>Currently assigned: <strong>{shift.assignedEmployeesCount || 0}</strong> active employees</span>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(shift);
                }}
                className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
              >
                Edit Policy
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
