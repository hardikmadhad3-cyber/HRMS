import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  CheckSquare,
  Square,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useNotification } from '../../context/NotificationContext.js';
import { apiClient } from '../../services/apiClient.js';
import { Shift, BulkShiftAssignmentDTO, ShiftAssignmentType } from '../../types/shift.js';
import { EmployeeDirectoryItem } from '../../types/employee.js';
import { Department, Branch } from '../../types/organization.js';

interface BulkAssignShiftDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  shifts: Shift[];
  departments: Department[];
  branches: Branch[];
  onSuccess: () => void;
}

export function BulkAssignShiftDrawer({
  isOpen,
  onClose,
  shifts,
  departments,
  branches,
  onSuccess,
}: BulkAssignShiftDrawerProps) {
  const { activeCompanyId } = useAuth();
  const { addNotification } = useNotification();

  const [employees, setEmployees] = useState<EmployeeDirectoryItem[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Filters for employee list
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');

  // Selected Employee IDs
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  // Shift assignment payload
  const [shiftId, setShiftId] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [effectiveTo, setEffectiveTo] = useState('');
  const [assignmentType, setAssignmentType] = useState<ShiftAssignmentType>('PERMANENT');
  const [reason, setReason] = useState('Department-wide shift re-allocation');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen && activeCompanyId) {
      loadEmployees();
      if (shifts.length > 0 && !shiftId) {
        setShiftId(shifts[0].id);
      }
      setSelectedEmployeeIds([]);
      setServerError(null);
    }
  }, [isOpen, activeCompanyId]);

  const loadEmployees = async () => {
    setLoadingEmployees(true);
    const res = await apiClient.get<EmployeeDirectoryItem[]>('/api/v1/employees', { status: 'ACTIVE' }, activeCompanyId);
    if (res.success && res.data) {
      setEmployees(res.data);
    }
    setLoadingEmployees(false);
  };

  const filteredEmployees = employees.filter((emp) => {
    if (search) {
      const q = search.toLowerCase();
      const matchName = emp.displayName.toLowerCase().includes(q);
      const matchCode = emp.employeeCode.toLowerCase().includes(q);
      if (!matchName && !matchCode) return false;
    }
    if (selectedDept && emp.departmentId !== selectedDept) return false;
    if (selectedBranch && emp.branchId !== selectedBranch) return false;
    return true;
  });

  const toggleSelectAll = () => {
    if (selectedEmployeeIds.length === filteredEmployees.length) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(filteredEmployees.map((e) => e.id));
    }
  };

  const toggleSelectEmployee = (id: string) => {
    if (selectedEmployeeIds.includes(id)) {
      setSelectedEmployeeIds(selectedEmployeeIds.filter((empId) => empId !== id));
    } else {
      setSelectedEmployeeIds([...selectedEmployeeIds, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompanyId) return;

    if (selectedEmployeeIds.length === 0) {
      setServerError('Please select at least one employee for bulk shift assignment.');
      return;
    }
    if (!shiftId) {
      setServerError('Please select a target shift.');
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

    const payload: BulkShiftAssignmentDTO = {
      employeeIds: selectedEmployeeIds,
      shiftId,
      effectiveFrom,
      effectiveTo: effectiveTo || undefined,
      assignmentType,
      reason: reason.trim(),
      notes: notes.trim() || undefined,
    };

    const res = await apiClient.post<{ assignedCount: number }>(
      '/api/v1/attendance/shift-assignments/bulk',
      payload,
      activeCompanyId
    );

    setSubmitting(false);

    if (res.success) {
      addNotification({
        type: 'success',
        title: 'Bulk Assignment Complete',
        message: `Successfully allocated shift to ${selectedEmployeeIds.length} employees effective from ${effectiveFrom}.`,
      });
      onSuccess();
      onClose();
    } else {
      setServerError(res.error || 'Failed to complete bulk shift assignment.');
      addNotification({
        type: 'error',
        title: 'Bulk Assignment Failed',
        message: res.error || 'An error occurred during bulk assignment.',
      });
    }
  };

  if (!isOpen) return null;

  const targetShift = shifts.find((s) => s.id === shiftId);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-fadeIn">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Bulk Shift Assignment</h2>
              <p className="text-xs text-slate-500">
                Batch assign multiple employees or entire teams to a target shift roster
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
                <p className="font-medium">Bulk Assignment Error</p>
                <p className="text-xs text-red-600 mt-0.5">{serverError}</p>
              </div>
            </div>
          )}

          {/* Target Shift Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Target Shift to Allocate <span className="text-red-500">*</span>
            </label>
            <select
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 font-medium"
            >
              {shifts.filter((s) => s.status === 'ACTIVE').map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name} ({s.startTime} to {s.endTime}){s.isOvernight ? ' [OVERNIGHT]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Schedule Parameters */}
          <div className="grid grid-cols-2 gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Effective From Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Effective To Date <span className="text-slate-400">(Optional)</span>
              </label>
              <input
                type="date"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Assignment Type</label>
              <select
                value={assignmentType}
                onChange={(e) => setAssignmentType(e.target.value as ShiftAssignmentType)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="PERMANENT">PERMANENT</option>
                <option value="TEMPORARY">TEMPORARY</option>
                <option value="ROTATIONAL">ROTATIONAL</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Change Reason</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          {/* Employee Multi-Selection Box */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-slate-700">
                Select Employees ({selectedEmployeeIds.length} of {filteredEmployees.length} selected)
              </label>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                {selectedEmployeeIds.length === filteredEmployees.length && filteredEmployees.length > 0 ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" /> Deselect All
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5" /> Select All ({filteredEmployees.length})
                  </>
                )}
              </button>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter name / code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* List */}
            <div className="border border-slate-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-slate-100 bg-white">
              {filteredEmployees.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">No matching employees found</div>
              ) : (
                filteredEmployees.map((emp) => {
                  const isSelected = selectedEmployeeIds.includes(emp.id);
                  return (
                    <label
                      key={emp.id}
                      className={`flex items-center justify-between p-2.5 hover:bg-slate-50 cursor-pointer transition ${
                        isSelected ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectEmployee(emp.id)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300"
                        />
                        <div>
                          <div className="text-xs font-semibold text-slate-900">
                            {emp.displayName}{' '}
                            <span className="text-[10px] font-mono text-slate-500 font-normal">
                              ({emp.employeeCode})
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {emp.departmentName || 'No Dept'} •{' '}
                            {emp.designationName || 'No Designation'}
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
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
            disabled={submitting || selectedEmployeeIds.length === 0}
            onClick={handleSubmit}
            className="px-5 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
          >
            {submitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing Batch...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Assign to {selectedEmployeeIds.length} Employees
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
