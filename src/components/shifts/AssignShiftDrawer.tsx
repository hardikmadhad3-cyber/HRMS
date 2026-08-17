import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  User,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Shield,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useNotification } from '../../context/NotificationContext.js';
import { apiClient } from '../../services/apiClient.js';
import { Shift, EmployeeShiftAssignment, CreateShiftAssignmentDTO, ShiftAssignmentType } from '../../types/shift.js';
import { Employee } from '../../types/employee.js';

interface AssignShiftDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  shifts: Shift[];
  preSelectedEmployeeId?: string;
  preSelectedShiftId?: string;
  onSuccess: () => void;
}

export function AssignShiftDrawer({
  isOpen,
  onClose,
  shifts,
  preSelectedEmployeeId,
  preSelectedShiftId,
  onSuccess,
}: AssignShiftDrawerProps) {
  const { activeCompanyId } = useAuth();
  const { addNotification } = useNotification();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Form State
  const [employeeId, setEmployeeId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [effectiveTo, setEffectiveTo] = useState('');
  const [assignmentType, setAssignmentType] = useState<ShiftAssignmentType>('PERMANENT');
  const [reason, setReason] = useState('Standard operational shift allocation');
  const [notes, setNotes] = useState('');

  // Selected employee's current shift
  const [currentShiftInfo, setCurrentShiftInfo] = useState<EmployeeShiftAssignment | null>(null);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && activeCompanyId) {
      loadEmployees();
      if (preSelectedEmployeeId) setEmployeeId(preSelectedEmployeeId);
      if (preSelectedShiftId) setShiftId(preSelectedShiftId);
      else if (shifts.length > 0 && !shiftId) setShiftId(shifts[0].id);
      setServerError(null);
    }
  }, [isOpen, activeCompanyId, preSelectedEmployeeId, preSelectedShiftId]);

  useEffect(() => {
    if (employeeId && activeCompanyId) {
      loadEmployeeCurrentShift(employeeId);
    } else {
      setCurrentShiftInfo(null);
    }
  }, [employeeId, activeCompanyId]);

  const loadEmployees = async () => {
    setLoadingEmployees(true);
    const res = await apiClient.get<Employee[]>('/api/v1/employees', { status: 'ACTIVE' }, activeCompanyId);
    if (res.success && res.data) {
      setEmployees(res.data);
      if (!employeeId && !preSelectedEmployeeId && res.data.length > 0) {
        setEmployeeId(res.data[0].id);
      }
    }
    setLoadingEmployees(false);
  };

  const loadEmployeeCurrentShift = async (empId: string) => {
    setLoadingHistory(true);
    const res = await apiClient.get<{
      currentShift: EmployeeShiftAssignment | null;
      futureShift: EmployeeShiftAssignment | null;
      history: EmployeeShiftAssignment[];
    }>(`/api/v1/attendance/employees/${empId}/shift-history`, undefined, activeCompanyId);
    if (res.success && res.data) {
      setCurrentShiftInfo(res.data.currentShift);
    }
    setLoadingHistory(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompanyId) return;

    if (!employeeId) {
      setServerError('Please select an employee.');
      return;
    }
    if (!shiftId) {
      setServerError('Please select a shift.');
      return;
    }
    if (!effectiveFrom) {
      setServerError('Effective From date is required.');
      return;
    }
    if (effectiveTo && effectiveTo < effectiveFrom) {
      setServerError('Effective To date cannot be earlier than Effective From date.');
      return;
    }

    setSubmitting(true);
    setServerError(null);

    const payload: CreateShiftAssignmentDTO = {
      employeeId,
      shiftId,
      effectiveFrom,
      effectiveTo: effectiveTo || undefined,
      assignmentType,
      reason: reason.trim(),
      notes: notes.trim() || undefined,
    };

    const res = await apiClient.post<EmployeeShiftAssignment>(
      '/api/v1/attendance/shift-assignments',
      payload,
      activeCompanyId
    );

    setSubmitting(false);

    if (res.success) {
      addNotification({
        type: 'success',
        title: 'Shift Assigned',
        message: 'Shift assignment has been recorded and effective history updated.',
      });
      onSuccess();
      onClose();
    } else {
      setServerError(res.error || 'Failed to assign shift.');
      addNotification({
        type: 'error',
        title: 'Assignment Failed',
        message: res.error || 'Could not assign shift.',
      });
    }
  };

  if (!isOpen) return null;

  const targetShift = shifts.find((s) => s.id === shiftId);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-fadeIn">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Assign Employee Shift</h2>
              <p className="text-xs text-slate-500">
                Effective-dated shift scheduling with automatic timeline management
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {serverError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-sm text-red-700">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Assignment Error</p>
                <p className="text-xs text-red-600 mt-0.5">{serverError}</p>
              </div>
            </div>
          )}

          {/* Employee Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Select Employee <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                disabled={loadingEmployees}
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.displayName} ({emp.employeeCode}) — {emp.workEmail}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Current Shift Indicator Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span className="font-medium flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" /> Currently Effective Shift
              </span>
              {loadingHistory && <span className="text-[10px] text-blue-600">Loading timeline...</span>}
            </div>

            {currentShiftInfo ? (
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: currentShiftInfo.shiftColor || '#3B82F6' }}
                  />
                  <span className="font-semibold text-slate-900 text-sm">
                    {currentShiftInfo.shiftCode} ({currentShiftInfo.shiftName})
                  </span>
                </div>
                <div className="text-right text-xs text-slate-600 font-mono">
                  {currentShiftInfo.shiftStartTime} - {currentShiftInfo.shiftEndTime}
                  <div className="text-[10px] text-slate-400">
                    Effective: {currentShiftInfo.effectiveFrom}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No existing active shift recorded for this employee.</p>
            )}
          </div>

          {/* Target Shift Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              New Shift to Assign <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              {shifts.filter((s) => s.status === 'ACTIVE').map((s) => {
                const isSelected = shiftId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setShiftId(s.id)}
                    className={`p-3 rounded-lg border text-left flex items-center justify-between transition ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: s.color || '#3B82F6' }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{s.code}</span>
                          <span className="text-xs text-slate-600">{s.name}</span>
                          {s.isOvernight && (
                            <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-indigo-100 text-indigo-700 rounded">
                              OVERNIGHT
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 font-mono">
                          {s.startTime} - {s.endTime} ({s.fullDayHours} hrs)
                        </span>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dates & Assignment Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Effective From Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-500">Date this shift begins applying</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Effective To Date <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="date"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-500">Leave blank for permanent allocation</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Assignment Type</label>
              <select
                value={assignmentType}
                onChange={(e) => setAssignmentType(e.target.value as ShiftAssignmentType)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="PERMANENT">PERMANENT (Standard Role Shift)</option>
                <option value="TEMPORARY">TEMPORARY (Project / Emergency)</option>
                <option value="ROTATIONAL">ROTATIONAL (Weekly/Bi-weekly Roster)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Reason for Assignment</label>
              <input
                type="text"
                placeholder="e.g. Onboarding, Project Rotation"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Additional Notes</label>
            <textarea
              rows={2}
              placeholder="Internal HR remarks or approval reference..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="px-5 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
          >
            {submitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Confirm Shift Assignment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
