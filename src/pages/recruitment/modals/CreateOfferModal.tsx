import React, { useState, useEffect } from 'react';
import { X, Award, DollarSign, Calendar, Building, Briefcase, AlertCircle } from 'lucide-react';
import { OfferStatus } from '../../../types/recruitment.js';
import { recruitmentApi } from '../../../services/recruitmentApi.js';
import { apiClient } from '../../../services/apiClient.js';
import { useNotification } from '../../../context/NotificationContext.js';

interface CreateOfferModalProps {
  isOpen: boolean;
  applicationId: string;
  candidateName?: string;
  requisitionTitle?: string;
  candidateExpectedCtc?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateOfferModal({
  isOpen,
  applicationId,
  candidateName,
  requisitionTitle,
  candidateExpectedCtc,
  onClose,
  onSuccess,
}: CreateOfferModalProps) {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [workLocations, setWorkLocations] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  const defaultBasic = Math.round((candidateExpectedCtc || 120000) * 0.5);
  const defaultHra = Math.round((candidateExpectedCtc || 120000) * 0.25);
  const defaultSpecial = Math.round((candidateExpectedCtc || 120000) * 0.15);
  const defaultVariable = Math.round((candidateExpectedCtc || 120000) * 0.1);

  const [formData, setFormData] = useState({
    designationId: '',
    departmentId: '',
    workLocationId: '',
    branchId: '',
    joiningDate: '',
    expiryDate: '',
    basicSalary: defaultBasic,
    hraSalary: defaultHra,
    specialAllowance: defaultSpecial,
    variableBonus: defaultVariable,
    probationMonths: 3,
    noticePeriodDays: 30,
    currency: 'USD',
    notes: 'Offer package includes full health insurance, 401(k) matching, and annual performance incentive.',
  });

  useEffect(() => {
    if (isOpen) {
      loadMasterData();
      const inTwoWeeks = new Date();
      inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 7);

      setFormData((prev) => ({
        ...prev,
        joiningDate: inTwoWeeks.toISOString().slice(0, 10),
        expiryDate: expiry.toISOString().slice(0, 10),
      }));
    }
  }, [isOpen]);

  const loadMasterData = async () => {
    try {
      const [deptRes, desigRes, locRes, branchRes] = await Promise.all([
        apiClient.get<any[]>('/api/organization/departments'),
        apiClient.get<any[]>('/api/organization/designations'),
        apiClient.get<any[]>('/api/organization/work-locations'),
        apiClient.get<any[]>('/api/organization/branches'),
      ]);

      if (deptRes.success && deptRes.data) {
        setDepartments(deptRes.data);
        if (deptRes.data.length > 0 && !formData.departmentId) {
          setFormData((prev) => ({ ...prev, departmentId: deptRes.data![0].id }));
        }
      }
      if (desigRes.success && desigRes.data) {
        setDesignations(desigRes.data);
        if (desigRes.data.length > 0 && !formData.designationId) {
          setFormData((prev) => ({ ...prev, designationId: desigRes.data![0].id }));
        }
      }
      if (locRes.success && locRes.data) {
        setWorkLocations(locRes.data);
        if (locRes.data.length > 0 && !formData.workLocationId) {
          setFormData((prev) => ({ ...prev, workLocationId: locRes.data![0].id }));
        }
      }
      if (branchRes.success && branchRes.data) {
        setBranches(branchRes.data);
        if (branchRes.data.length > 0 && !formData.branchId) {
          setFormData((prev) => ({ ...prev, branchId: branchRes.data![0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to load master metadata for offer generation:', err);
    }
  };

  if (!isOpen) return null;

  const totalAnnualCtc =
    Number(formData.basicSalary || 0) +
    Number(formData.hraSalary || 0) +
    Number(formData.specialAllowance || 0) +
    Number(formData.variableBonus || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.joiningDate) {
      showToast('error', 'Validation Error', 'Proposed Joining Date is required');
      return;
    }

    setLoading(true);
    try {
      const res = await recruitmentApi.createOffer({
        applicationId,
        designationId: formData.designationId,
        departmentId: formData.departmentId,
        workLocationId: formData.workLocationId,
        branchId: formData.branchId || undefined,
        joiningDate: formData.joiningDate,
        expiryDate: formData.expiryDate || undefined,
        annualCtc: totalAnnualCtc,
        basicSalary: Number(formData.basicSalary),
        hraSalary: Number(formData.hraSalary),
        specialAllowance: Number(formData.specialAllowance),
        variableBonus: Number(formData.variableBonus),
        probationMonths: Number(formData.probationMonths),
        noticePeriodDays: Number(formData.noticePeriodDays),
        currency: formData.currency,
        notes: formData.notes,
      });

      if (res.success) {
        showToast('success', 'Offer Created', 'Job Offer generated and logged into the offer roster!');
        onSuccess();
        onClose();
      } else {
        showToast('error', 'Creation Failed', res.error || 'Failed to create offer');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Error creating offer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Generate Job Offer</h2>
              <p className="text-xs text-slate-500">
                Candidate: <strong className="text-slate-800">{candidateName || 'Applicant'}</strong> • {requisitionTitle || 'Role'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Organization Placement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Offered Designation <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.designationId}
                onChange={(e) => setFormData({ ...formData, designationId: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                {designations.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Department <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Work Location <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.workLocationId}
                onChange={(e) => setFormData({ ...formData, workLocationId: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                {workLocations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Branch (Optional)
              </label>
              <select
                value={formData.branchId}
                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                <option value="">(Primary Branch)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Compensation Breakdown */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Annual Compensation Structure (CTC)
              </h3>
              <div className="text-right">
                <span className="text-xs text-slate-500 mr-2">Total Computed CTC:</span>
                <span className="text-base font-bold text-blue-700">
                  ${totalAnnualCtc.toLocaleString()} {formData.currency}/yr
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Basic Salary ($)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.basicSalary}
                  onChange={(e) => setFormData({ ...formData, basicSalary: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">HRA Allowance ($)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.hraSalary}
                  onChange={(e) => setFormData({ ...formData, hraSalary: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Special Allowance ($)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.specialAllowance}
                  onChange={(e) => setFormData({ ...formData, specialAllowance: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Variable / Bonus ($)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.variableBonus}
                  onChange={(e) => setFormData({ ...formData, variableBonus: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Dates & Terms */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Proposed Joining Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Offer Expiry Date
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Probation (Months)
              </label>
              <input
                type="number"
                min="0"
                value={formData.probationMonths}
                onChange={(e) => setFormData({ ...formData, probationMonths: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Notice Period (Days)
              </label>
              <input
                type="number"
                min="0"
                value={formData.noticePeriodDays}
                onChange={(e) => setFormData({ ...formData, noticePeriodDays: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Offer Letter Terms & Special Conditions
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Creating...' : 'Generate Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
