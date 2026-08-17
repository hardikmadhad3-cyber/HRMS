import React, { useState, useEffect } from 'react';
import { X, Briefcase, Building, MapPin, DollarSign, Calendar, Users, AlertCircle } from 'lucide-react';
import { RequisitionPriority } from '../../../types/recruitment.js';
import { recruitmentApi } from '../../../services/recruitmentApi.js';
import { apiClient } from '../../../services/apiClient.js';
import { useNotification } from '../../../context/NotificationContext.js';

interface CreateRequisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateRequisitionModal({ isOpen, onClose, onSuccess }: CreateRequisitionModalProps) {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [workLocations, setWorkLocations] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    departmentId: '',
    designationId: '',
    workLocationId: '',
    branchId: '',
    openingsCount: 1,
    minExperienceYears: 2,
    maxExperienceYears: 5,
    minSalary: 80000,
    maxSalary: 120000,
    currency: 'USD',
    employmentType: 'FULL_TIME',
    priority: RequisitionPriority.MEDIUM,
    hiringManagerId: '',
    recruiterId: '',
    targetHireDate: '',
    jobDescription: '',
    requiredSkillsStr: 'TypeScript, React, Node.js',
  });

  useEffect(() => {
    if (isOpen) {
      loadMasterData();
    }
  }, [isOpen]);

  const loadMasterData = async () => {
    try {
      const [deptRes, desigRes, locRes, branchRes, empRes] = await Promise.all([
        apiClient.get<any[]>('/api/organization/departments'),
        apiClient.get<any[]>('/api/organization/designations'),
        apiClient.get<any[]>('/api/organization/work-locations'),
        apiClient.get<any[]>('/api/organization/branches'),
        apiClient.get<any[]>('/api/employees'),
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
      if (empRes.success && empRes.data) {
        setEmployees(empRes.data);
      }
    } catch (err) {
      console.error('Failed to load master metadata for requisition:', err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('error', 'Validation Error', 'Job Title is required');
      return;
    }

    const skills = formData.requiredSkillsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setLoading(true);
    try {
      const res = await recruitmentApi.createRequisition({
        ...formData,
        openingsCount: Number(formData.openingsCount),
        minExperienceYears: Number(formData.minExperienceYears),
        maxExperienceYears: Number(formData.maxExperienceYears),
        minSalary: Number(formData.minSalary),
        maxSalary: Number(formData.maxSalary),
        requiredSkills: skills,
        branchId: formData.branchId || undefined,
        hiringManagerId: formData.hiringManagerId || undefined,
        recruiterId: formData.recruiterId || undefined,
      });

      if (res.success) {
        showToast('success', 'Requisition Created', 'Job Requisition created successfully!');
        onSuccess();
        onClose();
      } else {
        showToast('error', 'Creation Failed', res.error || 'Failed to create requisition');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Error creating requisition');
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
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Create Job Requisition</h2>
              <p className="text-xs text-slate-500">Define position openings, salary budget, and qualification requirements</p>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Job Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Senior Full Stack Engineer"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                <option value={RequisitionPriority.LOW}>Low</option>
                <option value={RequisitionPriority.MEDIUM}>Medium</option>
                <option value={RequisitionPriority.HIGH}>High</option>
                <option value={RequisitionPriority.URGENT}>Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Designation <span className="text-rose-500">*</span>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                Branch
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
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Employment Type
              </label>
              <select
                value={formData.employmentType}
                onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERN">Intern</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Openings Count <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.openingsCount}
                onChange={(e) => setFormData({ ...formData, openingsCount: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Min Experience (Yrs)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={formData.minExperienceYears}
                onChange={(e) => setFormData({ ...formData, minExperienceYears: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Max Experience (Yrs)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={formData.maxExperienceYears}
                onChange={(e) => setFormData({ ...formData, maxExperienceYears: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Min Annual Salary ($)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={formData.minSalary}
                onChange={(e) => setFormData({ ...formData, minSalary: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Max Annual Salary ($)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={formData.maxSalary}
                onChange={(e) => setFormData({ ...formData, maxSalary: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Target Hire Date
              </label>
              <input
                type="date"
                value={formData.targetHireDate}
                onChange={(e) => setFormData({ ...formData, targetHireDate: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Hiring Manager
              </label>
              <select
                value={formData.hiringManagerId}
                onChange={(e) => setFormData({ ...formData, hiringManagerId: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                <option value="">(Select Hiring Manager)</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeCode})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Lead Recruiter
              </label>
              <select
                value={formData.recruiterId}
                onChange={(e) => setFormData({ ...formData, recruiterId: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                <option value="">(Select Recruiter)</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeCode})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Required Skills (comma separated)
            </label>
            <input
              type="text"
              value={formData.requiredSkillsStr}
              onChange={(e) => setFormData({ ...formData, requiredSkillsStr: e.target.value })}
              placeholder="e.g. React, TypeScript, Node.js, SQL"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Job Description & Core Responsibilities
            </label>
            <textarea
              rows={3}
              value={formData.jobDescription}
              onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
              placeholder="Outline role objectives, deliverables, and requirements..."
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
              {loading ? 'Creating...' : 'Create Requisition'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
