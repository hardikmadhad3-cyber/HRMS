import React, { useState } from 'react';
import { X, UserCheck, ShieldCheck, AlertCircle, Building, DollarSign, Calendar, Sparkles } from 'lucide-react';
import { EmployeeOnboarding } from '../../../types/recruitment.js';
import { recruitmentApi } from '../../../services/recruitmentApi.js';
import { useNotification } from '../../../context/NotificationContext.js';

interface EmployeeHandoffModalProps {
  isOpen: boolean;
  onboarding: EmployeeOnboarding;
  onClose: () => void;
  onSuccess: () => void;
}

export function EmployeeHandoffModal({
  isOpen,
  onboarding,
  onClose,
  onSuccess,
}: EmployeeHandoffModalProps) {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    gender: onboarding.joiningDetails?.gender || 'MALE',
    dateOfBirth: onboarding.joiningDetails?.dateOfBirth || '1995-06-15',
    maritalStatus: onboarding.joiningDetails?.maritalStatus || 'SINGLE',
    nationality: onboarding.joiningDetails?.nationality || 'United States',
    bloodGroup: onboarding.joiningDetails?.bloodGroup || 'O+',
    bankName: onboarding.joiningDetails?.bankName || 'JPMorgan Chase',
    accountNumber: onboarding.joiningDetails?.accountNumber || '1029384756',
    ifscCode: onboarding.joiningDetails?.ifscCode || 'CHASUS33',
    panNumber: onboarding.joiningDetails?.panNumber || 'ABCDE1234F',
    aadhaarNumber: onboarding.joiningDetails?.aadhaarNumber || '998877665544',
    addressLine1: onboarding.joiningDetails?.addressLine1 || '450 Tech Avenue, Suite 300',
    city: onboarding.joiningDetails?.city || 'San Francisco',
    state: onboarding.joiningDetails?.state || 'California',
    postalCode: onboarding.joiningDetails?.postalCode || '94107',
  });

  if (!isOpen) return null;

  const handleHandoff = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await recruitmentApi.completeAndHandoffToEmployeeMaster(onboarding.id, {
        joiningDetails: {
          ...onboarding.joiningDetails,
          ...formData,
        },
      });

      if (res.success) {
        showToast(
          'success',
          'Employee Provisioned',
          `Successfully handoff to Employee Master! Created Employee: ${res.data?.employee?.firstName} ${res.data?.employee?.lastName} (${res.data?.employee?.employeeCode})`
        );
        onSuccess();
        onClose();
      } else {
        showToast('error', 'Handoff Failed', res.error || 'Failed to complete handoff');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Error executing employee handoff');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded-lg">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Complete Onboarding & Employee Handoff</h2>
              <p className="text-xs text-slate-600">
                Promote <strong className="text-slate-900">{onboarding.fullName}</strong> into active Employee Master Directory.
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

        <form onSubmit={handleHandoff} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900">
              <p className="font-bold">Automated Organization & Payroll Placement</p>
              <p className="mt-0.5 text-blue-700">
                Placement: <strong>{onboarding.designationName}</strong> in <strong>{onboarding.departmentName}</strong> at <strong>{onboarding.workLocationName}</strong>.
                Joining date: <strong>{onboarding.joiningDate}</strong>.
              </p>
            </div>
          </div>

          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Personal & Statutory Verification Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Blood Group
              </label>
              <input
                type="text"
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Bank Name
              </label>
              <input
                type="text"
                required
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Bank Account #
              </label>
              <input
                type="text"
                required
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Routing / IFSC Code
              </label>
              <input
                type="text"
                value={formData.ifscCode}
                onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Address Line 1
              </label>
              <input
                type="text"
                value={formData.addressLine1}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                City, State, Postal Code
              </label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
                <input
                  type="text"
                  placeholder="State"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
                <input
                  type="text"
                  placeholder="Zip"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  className="px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>
            </div>
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
              className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Creating Employee...' : 'Confirm Employee Handoff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
