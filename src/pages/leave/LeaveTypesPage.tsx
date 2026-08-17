import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Plus,
  Search,
  Filter,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileCheck,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { PermissionKey } from '../../types/auth.js';
import { leaveApi, CreateLeaveTypePayload } from '../../services/leaveApi.js';
import { LeaveType, LeaveCategory, LeavePaidType, LeaveUnit } from '../../types/leave.js';
import { PageHeader } from '../../components/shell/PageHeader.js';
import { useNotification } from '../../context/NotificationContext.js';

const CATEGORIES: { label: string; value: LeaveCategory }[] = [
  { label: 'Casual Leave (CL)', value: 'CASUAL' },
  { label: 'Sick / Medical Leave (SL)', value: 'SICK' },
  { label: 'Privilege / Earned Leave (PL)', value: 'PRIVILEGE' },
  { label: 'Maternity Leave (ML)', value: 'MATERNITY' },
  { label: 'Paternity Leave (PTL)', value: 'PATERNITY' },
  { label: 'Compensatory Off (Comp-Off)', value: 'COMP_OFF' },
  { label: 'Bereavement Leave', value: 'BEREAVEMENT' },
  { label: 'Loss of Pay / Unpaid', value: 'UNPAID' },
  { label: 'Other Special Leave', value: 'SPECIAL' },
];

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#64748B', // Slate
  '#EF4444', // Red
];

export function LeaveTypesPage() {
  const { activeCompanyId, hasPermission } = useAuth();
  const { addNotification } = useNotification();

  const [types, setTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal / Drawer state
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [formData, setFormData] = useState<CreateLeaveTypePayload>({
    code: '',
    name: '',
    description: '',
    category: 'CASUAL',
    paidType: 'PAID',
    unit: 'FULL_DAY',
    color: '#3B82F6',
    requiresReason: true,
    requiresAttachment: false,
    attachmentThresholdDays: 2,
    status: 'ACTIVE',
  });

  const fetchTypes = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const res = await leaveApi.getTypes(
        {
          search: search || undefined,
          category: categoryFilter || undefined,
          status: statusFilter || undefined,
        },
        activeCompanyId
      );
      if (res.success && res.data) {
        setTypes(res.data);
      }
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Fetch Error',
        message: err?.message || 'Could not load leave types.',
      });
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId, search, categoryFilter, statusFilter, addNotification]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const handleOpenCreate = () => {
    setEditingType(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      category: 'CASUAL',
      paidType: 'PAID',
      unit: 'FULL_DAY',
      color: '#3B82F6',
      requiresReason: true,
      requiresAttachment: false,
      attachmentThresholdDays: 2,
      status: 'ACTIVE',
    });
    setShowDrawer(true);
  };

  const handleOpenEdit = (lt: LeaveType) => {
    setEditingType(lt);
    setFormData({
      code: lt.code,
      name: lt.name,
      description: lt.description || '',
      category: lt.category,
      paidType: lt.paidType,
      unit: lt.unit,
      color: lt.color || '#3B82F6',
      requiresReason: lt.requiresReason !== false,
      requiresAttachment: Boolean(lt.requiresAttachment),
      attachmentThresholdDays: lt.attachmentThresholdDays || 2,
      status: lt.status,
    });
    setShowDrawer(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      addNotification({ type: 'warning', title: 'Validation', message: 'Code and Name are required.' });
      return;
    }

    try {
      if (editingType) {
        const res = await leaveApi.updateType(editingType.id, formData, activeCompanyId);
        if (res.success) {
          addNotification({
            type: 'success',
            title: 'Leave Type Updated',
            message: `Updated leave type ${res.data?.code}.`,
          });
          setShowDrawer(false);
          fetchTypes();
        } else {
          addNotification({ type: 'error', title: 'Error', message: res.error || 'Failed to update leave type.' });
        }
      } else {
        const res = await leaveApi.createType(formData, activeCompanyId);
        if (res.success) {
          addNotification({
            type: 'success',
            title: 'Leave Type Created',
            message: `Created leave type ${res.data?.code}.`,
          });
          setShowDrawer(false);
          fetchTypes();
        } else {
          addNotification({ type: 'error', title: 'Error', message: res.error || 'Failed to create leave type.' });
        }
      }
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Save Failed', message: err?.message });
    }
  };

  const handleToggleStatus = async (lt: LeaveType) => {
    const nextStatus = lt.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const res = await leaveApi.setTypeStatus(lt.id, nextStatus, activeCompanyId);
    if (res.success) {
      addNotification({
        type: 'success',
        title: 'Status Updated',
        message: `${lt.code} is now ${nextStatus}.`,
      });
      fetchTypes();
    } else {
      addNotification({ type: 'error', title: 'Status Update Failed', message: res.error });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Leave Types Master"
        subtitle="Catalog and configure organization-wide leave categories, pay classifications, and certificate attachments."
        actions={
          hasPermission(PermissionKey.LEAVE_MANAGE) && (
            <button
              onClick={handleOpenCreate}
              className="px-3.5 py-2 rounded-lg bg-[#17365D] hover:bg-[#122b4a] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Leave Type</span>
            </button>
          )
        }
      />

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex-1 w-full md:w-auto relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by code, title, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-blue-600"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Leave Types Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Leave Type</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Pay Classification</th>
                <th className="py-3 px-4">Allowed Unit</th>
                <th className="py-3 px-4">Proof Rules</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading leave types...
                  </td>
                </tr>
              ) : types.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No leave types found matching criteria.
                  </td>
                </tr>
              ) : (
                types.map((lt) => (
                  <tr key={lt.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: lt.color || '#3B82F6' }}
                        />
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span>{lt.name}</span>
                            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold">
                              {lt.code}
                            </span>
                          </div>
                          {lt.description && (
                            <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {lt.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{lt.category}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                          lt.paidType === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700'
                            : lt.paidType === 'SPECIAL'
                            ? 'bg-purple-50 text-purple-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {lt.paidType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{lt.unit.replace('_', ' ')}</td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {lt.requiresAttachment ? (
                        <div className="flex items-center gap-1 text-blue-700 text-[11px] font-medium">
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>Required (&gt; {lt.attachmentThresholdDays || 2} days)</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Optional</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          lt.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {lt.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {hasPermission(PermissionKey.LEAVE_MANAGE) && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(lt)}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit Type"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(lt)}
                            className={`p-1 rounded transition-colors ${
                              lt.status === 'ACTIVE'
                                ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={lt.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          >
                            {lt.status === 'ACTIVE' ? (
                              <XCircle className="w-3.5 h-3.5" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Leave Type Drawer / Modal */}
      {showDrawer && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>{editingType ? `Edit Leave Type: ${editingType.code}` : 'Create New Leave Type'}</span>
              </h3>
              <button onClick={() => setShowDrawer(false)} className="text-slate-400 hover:text-slate-600 text-lg">
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CL, SL, PL, ML"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono focus:outline-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as LeaveCategory })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Casual Leave"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Guidelines</label>
                <textarea
                  rows={2}
                  placeholder="Explain usage guidelines for employees..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pay Classification *</label>
                  <select
                    value={formData.paidType}
                    onChange={(e) => setFormData({ ...formData, paidType: e.target.value as LeavePaidType })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="PAID">Fully Paid</option>
                    <option value="HALF_PAID">Half Paid</option>
                    <option value="UNPAID">Loss of Pay (Unpaid)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Allowable Unit *</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value as LeaveUnit })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="FULL_DAY">Full Day Only</option>
                    <option value="HALF_DAY">Full Day or Half Day</option>
                    <option value="HOURLY">Hourly Units</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Badge Color</label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c })}
                      className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${
                        formData.color === c ? 'scale-125 ring-2 ring-blue-600 ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={formData.color || '#3B82F6'}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <div className="font-semibold text-slate-800">Application Rules & Attachments</div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk-reason"
                    checked={formData.requiresReason}
                    onChange={(e) => setFormData({ ...formData, requiresReason: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <label htmlFor="chk-reason" className="text-slate-700">
                    Mandatory Reason for Leave Application
                  </label>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="chk-attach"
                      checked={formData.requiresAttachment}
                      onChange={(e) => setFormData({ ...formData, requiresAttachment: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600"
                    />
                    <label htmlFor="chk-attach" className="text-slate-700">
                      Require Supporting Attachment (e.g. Medical Certificate)
                    </label>
                  </div>

                  {formData.requiresAttachment && (
                    <div className="pl-6 flex items-center gap-2">
                      <span className="text-slate-600">Threshold: if leave exceeds</span>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={formData.attachmentThresholdDays || 2}
                        onChange={(e) =>
                          setFormData({ ...formData, attachmentThresholdDays: parseInt(e.target.value) || 1 })
                        }
                        className="w-16 px-2 py-1 border border-slate-300 rounded text-center"
                      />
                      <span className="text-slate-600">consecutive days</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDrawer(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#17365D] text-white font-bold hover:bg-[#122b4a] cursor-pointer"
                >
                  {editingType ? 'Save Changes' : 'Create Leave Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
