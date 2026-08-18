import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Coffee,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Moon,
  Sun,
  Shield,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useNotification } from '../../context/NotificationContext.js';
import { apiClient } from '../../services/apiClient.js';
import { Shift, CreateShiftDTO, DayOfWeek, ShiftStatus } from '../../types/shift.js';

interface AddEditShiftDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  shiftToEdit?: Shift | null;
  onSuccess: () => void;
}

const COLOR_PRESETS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#6366F1', // Indigo
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#64748B', // Slate
];

const DAYS_OF_WEEK: { label: string; value: DayOfWeek; short: string }[] = [
  { label: 'Monday', value: 'MONDAY', short: 'Mon' },
  { label: 'Tuesday', value: 'TUESDAY', short: 'Tue' },
  { label: 'Wednesday', value: 'WEDNESDAY', short: 'Wed' },
  { label: 'Thursday', value: 'THURSDAY', short: 'Thu' },
  { label: 'Friday', value: 'FRIDAY', short: 'Fri' },
  { label: 'Saturday', value: 'SATURDAY', short: 'Sat' },
  { label: 'Sunday', value: 'SUNDAY', short: 'Sun' },
];

export function AddEditShiftDrawer({
  isOpen,
  onClose,
  shiftToEdit,
  onSuccess,
}: AddEditShiftDrawerProps) {
  const { activeCompanyId } = useAuth();
  const { addNotification } = useNotification();

  const [activeSection, setActiveSection] = useState<'basic' | 'timing' | 'breaks' | 'rules' | 'weeklyOff' | 'review'>('basic');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [status, setStatus] = useState<ShiftStatus>('ACTIVE');

  // Timings
  const [startTime, setStartTime] = useState('09:30');
  const [endTime, setEndTime] = useState('18:30');
  const [isOvernight, setIsOvernight] = useState(false);
  const [halfDayHours, setHalfDayHours] = useState(4.5);
  const [fullDayHours, setFullDayHours] = useState(8.0);

  // Grace & Rules
  const [lateEntryGraceMinutes, setLateEntryGraceMinutes] = useState(15);
  const [earlyExitGraceMinutes, setEarlyExitGraceMinutes] = useState(15);
  const [lateAllowed, setLateAllowed] = useState(true);
  const [earlyExitAllowed, setEarlyExitAllowed] = useState(true);

  // Breaks
  const [breaks, setBreaks] = useState<Array<{ breakName: string; startTime: string; endTime: string; durationMinutes?: number; isPaid?: boolean }>>([
    { breakName: 'Lunch Break', startTime: '13:00', endTime: '14:00', durationMinutes: 60, isPaid: false },
  ]);

  // Weekly Off
  const [weeklyOffDays, setWeeklyOffDays] = useState<DayOfWeek[]>(['SUNDAY']);
  const [alternateSaturday, setAlternateSaturday] = useState(false);

  useEffect(() => {
    if (shiftToEdit) {
      setCode(shiftToEdit.code);
      setName(shiftToEdit.name);
      setDescription(shiftToEdit.description || '');
      setColor(shiftToEdit.color || '#3B82F6');
      setStatus(shiftToEdit.status);

      setStartTime(shiftToEdit.startTime);
      setEndTime(shiftToEdit.endTime);
      setIsOvernight(shiftToEdit.isOvernight);
      setHalfDayHours(shiftToEdit.halfDayHours);
      setFullDayHours(shiftToEdit.fullDayHours);

      setLateEntryGraceMinutes(shiftToEdit.lateEntryGraceMinutes);
      setEarlyExitGraceMinutes(shiftToEdit.earlyExitGraceMinutes);
      setLateAllowed(shiftToEdit.lateAllowed);
      setEarlyExitAllowed(shiftToEdit.earlyExitAllowed);

      if (shiftToEdit.breaks && shiftToEdit.breaks.length > 0) {
        setBreaks(
          shiftToEdit.breaks.map((b) => ({
            breakName: b.breakName,
            startTime: b.startTime,
            endTime: b.endTime,
            durationMinutes: b.durationMinutes,
            isPaid: b.isPaid,
          }))
        );
      } else {
        setBreaks([]);
      }

      if (shiftToEdit.weeklyOffRule) {
        setWeeklyOffDays(shiftToEdit.weeklyOffRule.daysOfWeek);
        setAlternateSaturday(shiftToEdit.weeklyOffRule.alternateSaturday);
      } else {
        setWeeklyOffDays(['SUNDAY']);
        setAlternateSaturday(false);
      }
    } else {
      // Defaults for new shift
      setCode('');
      setName('');
      setDescription('');
      setColor('#3B82F6');
      setStatus('ACTIVE');
      setStartTime('09:30');
      setEndTime('18:30');
      setIsOvernight(false);
      setHalfDayHours(4.5);
      setFullDayHours(8.0);
      setLateEntryGraceMinutes(15);
      setEarlyExitGraceMinutes(15);
      setLateAllowed(true);
      setEarlyExitAllowed(true);
      setBreaks([
        { breakName: 'Lunch Break', startTime: '13:00', endTime: '14:00', durationMinutes: 60, isPaid: false },
      ]);
      setWeeklyOffDays(['SUNDAY']);
      setAlternateSaturday(false);
    }
    setActiveSection('basic');
    setServerError(null);
  }, [shiftToEdit, isOpen]);

  // Auto-detect overnight toggle if end time <= start time
  const handleEndTimeChange = (newEnd: string) => {
    setEndTime(newEnd);
    if (newEnd && startTime && newEnd <= startTime) {
      setIsOvernight(true);
    }
  };

  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    if (newStart && endTime && endTime <= newStart) {
      setIsOvernight(true);
    }
  };

  const toggleDay = (day: DayOfWeek) => {
    if (weeklyOffDays.includes(day)) {
      if (weeklyOffDays.length === 1) {
        addNotification({ type: 'warning', title: 'At least 1 day', message: 'At least one weekly off day is recommended.' });
      }
      setWeeklyOffDays(weeklyOffDays.filter((d) => d !== day));
    } else {
      setWeeklyOffDays([...weeklyOffDays, day]);
    }
  };

  const addBreakRow = () => {
    setBreaks([
      ...breaks,
      { breakName: 'Tea Break', startTime: '16:00', endTime: '16:15', durationMinutes: 15, isPaid: true },
    ]);
  };

  const removeBreakRow = (index: number) => {
    setBreaks(breaks.filter((_, i) => i !== index));
  };

  const updateBreakRow = (index: number, field: string, value: any) => {
    const updated = [...breaks];
    updated[index] = { ...updated[index], [field]: value };
    setBreaks(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompanyId) return;

    // Validation
    if (!code.trim()) {
      setServerError('Shift Code is required.');
      setActiveSection('basic');
      return;
    }
    if (!name.trim()) {
      setServerError('Shift Name is required.');
      setActiveSection('basic');
      return;
    }
    if (!isOvernight && endTime <= startTime) {
      setServerError('End time must be later than start time, or toggle "Overnight Shift".');
      setActiveSection('timing');
      return;
    }

    setSubmitting(true);
    setServerError(null);

    const payload: CreateShiftDTO = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description.trim(),
      color,
      status,
      startTime,
      endTime,
      isOvernight,
      halfDayHours: Number(halfDayHours),
      fullDayHours: Number(fullDayHours),
      lateEntryGraceMinutes: Number(lateEntryGraceMinutes),
      earlyExitGraceMinutes: Number(earlyExitGraceMinutes),
      lateAllowed,
      earlyExitAllowed,
      breaks: breaks.filter((b) => b.breakName.trim() && b.startTime && b.endTime),
      weeklyOffDays,
      alternateSaturday,
    };

    const res = shiftToEdit
      ? await apiClient.put<Shift>(`/api/v1/attendance/shifts/${shiftToEdit.id}`, payload, activeCompanyId)
      : await apiClient.post<Shift>('/api/v1/attendance/shifts', payload, activeCompanyId);

    setSubmitting(false);

    if (res.success) {
      addNotification({
        type: 'success',
        title: shiftToEdit ? 'Shift Updated' : 'Shift Created',
        message: `Shift '${payload.code}' has been successfully ${shiftToEdit ? 'updated' : 'configured'}.`,
      });
      onSuccess();
      onClose();
    } else {
      setServerError(res.error || 'Failed to save shift configuration.');
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: res.error || 'Could not save shift.',
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-fadeIn">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: color }}
            >
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {shiftToEdit ? `Edit Shift: ${shiftToEdit.code}` : 'Configure New Shift'}
              </h2>
              <p className="text-xs text-slate-500">
                Enterprise shift timings, grace windows, breaks & weekly off rules
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

        {/* Section Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-6 overflow-x-auto gap-2 py-2">
          {[
            { id: 'basic', label: '1. Basic Info', icon: Layers },
            { id: 'timing', label: '2. Timings & Overnight', icon: Clock },
            { id: 'breaks', label: `3. Breaks (${breaks.length})`, icon: Coffee },
            { id: 'rules', label: '4. Grace & Rules', icon: Shield },
            { id: 'weeklyOff', label: '5. Weekly Off', icon: Calendar },
            { id: 'review', label: '6. Review', icon: CheckCircle2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition ${
                  isCurrent
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {serverError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-sm text-red-700">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Validation Error</p>
                <p className="text-xs text-red-600 mt-0.5">{serverError}</p>
              </div>
            </div>
          )}

          {/* 1. BASIC INFORMATION */}
          {activeSection === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Shift Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GENERAL, NIGHT, MORNING"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono uppercase"
                  />
                  <span className="text-[10px] text-slate-500">Unique identifier within company</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Shift Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. General Day Shift"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe the department applicability or shift specifics..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Calendar Badge Color</label>
                  <div className="flex items-center gap-2">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-6 h-6 rounded-full border-2 transition ${
                          color === c ? 'border-slate-900 scale-110' : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Shift Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ShiftStatus)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="ACTIVE">ACTIVE (Available for Roster)</option>
                    <option value="INACTIVE">INACTIVE (Archived)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 2. TIMINGS & OVERNIGHT */}
          {activeSection === 'timing' && (
            <div className="space-y-5">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Start Time (24h) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        required
                        value={startTime}
                        onChange={(e) => handleStartTimeChange(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      End Time (24h) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        required
                        value={endTime}
                        onChange={(e) => handleEndTimeChange(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Overnight Shift Toggle Card */}
                <div className="pt-2">
                  <label className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-slate-300 transition">
                    <input
                      type="checkbox"
                      checked={isOvernight}
                      onChange={(e) => setIsOvernight(e.target.checked)}
                      className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 font-medium text-slate-800 text-sm">
                        <Moon className="w-4 h-4 text-indigo-600" />
                        <span>Overnight Shift (Spans Across Midnight)</span>
                        {isOvernight && (
                          <span className="px-2 py-0.5 text-[10px] bg-indigo-100 text-indigo-700 rounded-full font-semibold">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Enable this when work hours cross into the following calendar day (e.g. 21:00 → 06:00).
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Full-Day Working Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="24"
                    value={fullDayHours}
                    onChange={(e) => setFullDayHours(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-500">Benchmark minimum for full-day (typically 8.0 hrs)</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Half-Day Threshold Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="12"
                    value={halfDayHours}
                    onChange={(e) => setHalfDayHours(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-500">Benchmark minimum for half-day (typically 4.5 hrs)</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. BREAKS CONFIGURATION */}
          {activeSection === 'breaks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-900">Shift Break Schedule</h3>
                  <p className="text-xs text-slate-500">Define designated meal and rest periods for this shift</p>
                </div>
                <button
                  type="button"
                  onClick={addBreakRow}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Break
                </button>
              </div>

              {breaks.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                  <Coffee className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700">No Breaks Configured</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Click "Add Break" to register lunch, dinner, or tea intervals.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {breaks.map((b, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3"
                    >
                      <div className="flex-1 grid grid-cols-4 gap-2">
                        <div className="col-span-1">
                          <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Break Name</label>
                          <input
                            type="text"
                            required
                            placeholder="Lunch / Tea"
                            value={b.breakName}
                            onChange={(e) => updateBreakRow(idx, 'breakName', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Start Time</label>
                          <input
                            type="time"
                            required
                            value={b.startTime}
                            onChange={(e) => updateBreakRow(idx, 'startTime', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded bg-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-slate-600 mb-0.5">End Time</label>
                          <input
                            type="time"
                            required
                            value={b.endTime}
                            onChange={(e) => updateBreakRow(idx, 'endTime', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded bg-white font-mono"
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-4">
                          <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={b.isPaid}
                              onChange={(e) => updateBreakRow(idx, 'isPaid', e.target.checked)}
                              className="w-3.5 h-3.5 text-blue-600 rounded"
                            />
                            <span>Paid</span>
                          </label>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeBreakRow(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. GRACE & RULES */}
          {activeSection === 'rules' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
                <h3 className="text-sm font-medium text-slate-900">Punctuality & Grace Margins</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Late Entry Grace (Minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={lateEntryGraceMinutes}
                      onChange={(e) => setLateEntryGraceMinutes(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-500">Allowed arrival delay before marking Late</span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Early Exit Grace (Minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={earlyExitGraceMinutes}
                      onChange={(e) => setEarlyExitGraceMinutes(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-500">Allowed early departure window</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                  <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lateAllowed}
                      onChange={(e) => setLateAllowed(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-blue-600 rounded"
                    />
                    <div>
                      <span className="font-medium">Late In Allowed</span>
                      <p className="text-[10px] text-slate-500">Allow attendance check-in even when late</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={earlyExitAllowed}
                      onChange={(e) => setEarlyExitAllowed(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-blue-600 rounded"
                    />
                    <div>
                      <span className="font-medium">Early Exit Allowed</span>
                      <p className="text-[10px] text-slate-500">Allow early checkout with recorded exit timestamp</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 5. WEEKLY OFF CONFIGURATION */}
          {activeSection === 'weeklyOff' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-slate-900">Designated Weekly Off Days</h3>
                <p className="text-xs text-slate-500">
                  Select non-working schedule days for employees assigned to this shift
                </p>
              </div>

              <div className="grid grid-cols-7 gap-2 pt-2">
                {DAYS_OF_WEEK.map((d) => {
                  const isSelected = weeklyOffDays.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      className={`p-3 rounded-lg border text-center transition flex flex-col items-center justify-center gap-1 ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs">{d.short}</span>
                      <span className="text-[10px] opacity-80">{isSelected ? 'OFF' : 'WORK'}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-3">
                <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition">
                  <input
                    type="checkbox"
                    checked={alternateSaturday}
                    onChange={(e) => setAlternateSaturday(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300"
                  />
                  <div>
                    <span className="text-xs font-medium text-slate-800">
                      Alternate Saturday Off (2nd & 4th Saturdays)
                    </span>
                    <p className="text-[10px] text-slate-500">
                      Automatically marks the 2nd and 4th Saturday of each month as non-working weekly off.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* 6. REVIEW */}
          {activeSection === 'review' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-bold text-slate-900 text-sm">{code || 'SHIFT_CODE'}</span>
                    <span className="text-xs text-slate-500">({name || 'Unnamed Shift'})</span>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                    status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Shift Timings:</span>{' '}
                    <span className="font-semibold text-slate-800 font-mono">{startTime} - {endTime}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Overnight:</span>{' '}
                    <span className="font-semibold text-slate-800">{isOvernight ? 'YES (Spans Midnight)' : 'NO'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Grace Period:</span>{' '}
                    <span className="font-semibold text-slate-800">{lateEntryGraceMinutes}m Late / {earlyExitGraceMinutes}m Early</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Working Benchmark:</span>{' '}
                    <span className="font-semibold text-slate-800">{fullDayHours} hrs (Half: {halfDayHours} hrs)</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Weekly Offs:</span>{' '}
                    <span className="font-semibold text-slate-800">
                      {weeklyOffDays.join(', ')} {alternateSaturday ? '(+ 2nd/4th Sat)' : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Breaks Count:</span>{' '}
                    <span className="font-semibold text-slate-800">{breaks.length} registered</span>
                  </div>
                </div>
              </div>
            </div>
          )}
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
          <div className="flex items-center gap-2">
            {activeSection !== 'basic' && (
              <button
                type="button"
                onClick={() => {
                  const sections: Array<'basic' | 'timing' | 'breaks' | 'rules' | 'weeklyOff' | 'review'> = [
                    'basic', 'timing', 'breaks', 'rules', 'weeklyOff', 'review'
                  ];
                  const curIdx = sections.indexOf(activeSection);
                  if (curIdx > 0) setActiveSection(sections[curIdx - 1]);
                }}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition"
              >
                Previous
              </button>
            )}

            {activeSection !== 'review' ? (
              <button
                type="button"
                onClick={() => {
                  const sections: Array<'basic' | 'timing' | 'breaks' | 'rules' | 'weeklyOff' | 'review'> = [
                    'basic', 'timing', 'breaks', 'rules', 'weeklyOff', 'review'
                  ];
                  const curIdx = sections.indexOf(activeSection);
                  if (curIdx < sections.length - 1) setActiveSection(sections[curIdx + 1]);
                }}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
              >
                Next Section
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="px-5 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
              >
                {submitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {shiftToEdit ? 'Save Changes' : 'Create Shift'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
