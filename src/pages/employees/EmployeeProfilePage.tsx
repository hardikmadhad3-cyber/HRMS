import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User,
  Building,
  Briefcase,
  MapPin,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  Shield,
  FileText,
  History,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  Edit3,
  UserCheck,
  Upload,
  Download,
  Trash2,
  Check,
  X,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useNotification } from '../../context/NotificationContext.js';
import { apiClient } from '../../services/apiClient.js';
import {
  EmployeeProfileDTO,
  EmploymentStatus,
  EmploymentType,
  DocumentType,
  DocumentVerificationStatus,
  Gender,
  MaritalStatus,
  BankAccountType,
  TaxRegime,
  AssignmentChangeReason,
} from '../../types/employee.js';
import { Branch, Department, Designation, WorkLocation } from '../../types/organization.js';
import { PermissionKey, UserRole } from '../../types/auth.js';
import { Shift, EmployeeShiftAssignment } from '../../types/shift.js';
import { ShiftHistoryModal } from '../../components/shifts/ShiftHistoryModal.js';
import { AssignShiftDrawer } from '../../components/shifts/AssignShiftDrawer.js';
import { EmployeeLeavePolicyTab } from '../../components/leave/EmployeeLeavePolicyTab.js';

type ProfileTab =
  | 'overview'
  | 'employment'
  | 'shifts'
  | 'leave'
  | 'personal'
  | 'contact'
  | 'bank'
  | 'statutory'
  | 'documents'
  | 'history';

export function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeCompanyId, user, hasPermission } = useAuth();
  const { addNotification } = useNotification();

  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [profile, setProfile] = useState<EmployeeProfileDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Shifts state (Phase 2A)
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftHistory, setShiftHistory] = useState<EmployeeShiftAssignment[]>([]);
  const [loadingShifts, setLoadingShifts] = useState<boolean>(false);
  const [showShiftHistoryModal, setShowShiftHistoryModal] = useState<boolean>(false);
  const [showAssignShiftDrawer, setShowAssignShiftDrawer] = useState<boolean>(false);

  // Modals state
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState<boolean>(false);
  const [showDocUploadModal, setShowDocUploadModal] = useState<boolean>(false);
  const [showEditPersonalModal, setShowEditPersonalModal] = useState<boolean>(false);
  const [showEditContactModal, setShowEditContactModal] = useState<boolean>(false);
  const [showEditBankModal, setShowEditBankModal] = useState<boolean>(false);
  const [showEditStatutoryModal, setShowEditStatutoryModal] = useState<boolean>(false);

  // Unmask sensitive state
  const [showFullBank, setShowFullBank] = useState<boolean>(false);

  // Dropdown masters for assignments
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [workLocations, setWorkLocations] = useState<WorkLocation[]>([]);
  const [managerOptions, setManagerOptions] = useState<Array<{ id: string; displayName: string; employeeCode: string }>>([]);

  // Fetch shift details
  const fetchShiftData = useCallback(async () => {
    if (!id || !activeCompanyId) return;
    setLoadingShifts(true);
    const [shiftsRes, histRes] = await Promise.all([
      apiClient.get<Shift[]>('/api/v1/attendance/shifts', { status: 'ACTIVE' }, activeCompanyId),
      apiClient.get<{
        currentShift: EmployeeShiftAssignment | null;
        futureShift: EmployeeShiftAssignment | null;
        history: EmployeeShiftAssignment[];
      } | EmployeeShiftAssignment[]>(`/api/v1/attendance/employees/${id}/shift-history`, undefined, activeCompanyId),
    ]);
    if (shiftsRes.success && shiftsRes.data) {
      setShifts(Array.isArray(shiftsRes.data) ? shiftsRes.data : []);
    }
    if (histRes.success && histRes.data) {
      if (Array.isArray(histRes.data)) {
        setShiftHistory(histRes.data);
      } else if (Array.isArray((histRes.data as any).history)) {
        setShiftHistory((histRes.data as any).history);
      } else {
        setShiftHistory([]);
      }
    } else {
      setShiftHistory([]);
    }
    setLoadingShifts(false);
  }, [id, activeCompanyId]);

  // Fetch full employee profile
  const fetchProfile = useCallback(async () => {
    if (!id || !activeCompanyId) return;
    setLoading(true);
    setError(null);

    const res = await apiClient.get<EmployeeProfileDTO>(`/api/v1/employees/${id}`, activeCompanyId);
    if (res.success && res.data) {
      setProfile(res.data);
    } else {
      setError(res.error || 'Failed to retrieve employee profile.');
      addNotification({
        type: 'error',
        title: 'Profile Error',
        message: res.error || 'Could not load employee details.',
      });
    }
    setLoading(false);
  }, [id, activeCompanyId, addNotification]);

  useEffect(() => {
    fetchProfile();
    fetchShiftData();
  }, [fetchProfile, fetchShiftData]);

  // Load masters for assignment and manager options
  useEffect(() => {
    async function loadMasters() {
      if (!activeCompanyId) return;
      const [branchRes, deptRes, desigRes, locRes, mgrRes] = await Promise.all([
        apiClient.get<Branch[]>('/api/v1/organization/branches', activeCompanyId),
        apiClient.get<Department[]>('/api/v1/organization/departments', activeCompanyId),
        apiClient.get<Designation[]>('/api/v1/organization/designations', activeCompanyId),
        apiClient.get<WorkLocation[]>('/api/v1/organization/work-locations', activeCompanyId),
        apiClient.get<any[]>(`/api/v1/employees/managers/options?excludeId=${id}`, activeCompanyId),
      ]);

      if (branchRes.success && branchRes.data) setBranches(branchRes.data);
      if (deptRes.success && deptRes.data) setDepartments(deptRes.data);
      if (desigRes.success && desigRes.data) setDesignations(desigRes.data);
      if (locRes.success && locRes.data) setWorkLocations(locRes.data);
      if (mgrRes.success && mgrRes.data) setManagerOptions(mgrRes.data);
    }
    loadMasters();
  }, [activeCompanyId, id]);

  // -------------------------------------------------------------
  // HANDLERS FOR STATUS CHANGE MODAL
  // -------------------------------------------------------------
  const [statusForm, setStatusForm] = useState<{
    status: EmploymentStatus;
    effectiveDate: string;
    reason: string;
    comments: string;
  }>({
    status: 'ACTIVE',
    effectiveDate: new Date().toISOString().slice(0, 10),
    reason: '',
    comments: '',
  });

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!statusForm.reason.trim()) {
      addNotification({ type: 'warning', title: 'Required Field', message: 'Reason is required for status change.' });
      return;
    }

    const res = await apiClient.patch(
      `/api/v1/employees/${profile.employee.id}/status`,
      statusForm,
      activeCompanyId
    );

    if (res.success) {
      addNotification({
        type: 'success',
        title: 'Status Updated',
        message: `Employee status changed to ${statusForm.status}.`,
      });
      setShowStatusModal(false);
      fetchProfile();
    } else {
      addNotification({ type: 'error', title: 'Update Failed', message: res.error || 'Failed to update status.' });
    }
  };

  // -------------------------------------------------------------
  // HANDLERS FOR ASSIGNMENT CHANGE MODAL (Promotion / Transfer)
  // -------------------------------------------------------------
  const [assignmentForm, setAssignmentForm] = useState<{
    effectiveFrom: string;
    branchId: string;
    departmentId: string;
    designationId: string;
    workLocationId: string;
    managerId?: string;
    changeReason: AssignmentChangeReason;
    notes?: string;
  }>({
    effectiveFrom: new Date().toISOString().slice(0, 10),
    branchId: '',
    departmentId: '',
    designationId: '',
    workLocationId: '',
    managerId: '',
    changeReason: 'TRANSFER',
    notes: '',
  });

  const openAssignmentModal = () => {
    if (profile?.currentAssignment) {
      setAssignmentForm({
        effectiveFrom: new Date().toISOString().slice(0, 10),
        branchId: profile.currentAssignment.branchId,
        departmentId: profile.currentAssignment.departmentId,
        designationId: profile.currentAssignment.designationId,
        workLocationId: profile.currentAssignment.workLocationId,
        managerId: profile.currentAssignment.managerId || '',
        changeReason: 'PROMOTION',
        notes: '',
      });
    }
    setShowAssignmentModal(true);
  };

  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const res = await apiClient.post(
      `/api/v1/employees/${profile.employee.id}/assignments`,
      {
        ...assignmentForm,
        managerId: assignmentForm.managerId || undefined,
      },
      activeCompanyId
    );

    if (res.success) {
      addNotification({
        type: 'success',
        title: 'Assignment Updated',
        message: 'New organization assignment recorded with effective-dating.',
      });
      setShowAssignmentModal(false);
      fetchProfile();
    } else {
      addNotification({ type: 'error', title: 'Assignment Error', message: res.error || 'Failed to update assignment.' });
    }
  };

  // -------------------------------------------------------------
  // HANDLERS FOR DOCUMENT MANAGEMENT
  // -------------------------------------------------------------
  const [docUploadForm, setDocUploadForm] = useState<{
    documentType: DocumentType;
    title: string;
    fileName: string;
    fileSizeBytes: number;
    mimeType: string;
    notes: string;
  }>({
    documentType: 'GOVERNMENT_ID',
    title: '',
    fileName: '',
    fileSizeBytes: 1024 * 750,
    mimeType: 'application/pdf',
    notes: '',
  });

  const handleDocUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!docUploadForm.title.trim() || !docUploadForm.fileName.trim()) {
      addNotification({ type: 'warning', title: 'Missing Info', message: 'Document title and file name are required.' });
      return;
    }

    const res = await apiClient.post(
      `/api/v1/employees/${profile.employee.id}/documents`,
      docUploadForm,
      activeCompanyId
    );

    if (res.success) {
      addNotification({
        type: 'success',
        title: 'Document Uploaded',
        message: 'Document metadata has been attached to employee profile.',
      });
      setShowDocUploadModal(false);
      setDocUploadForm({
        documentType: 'GOVERNMENT_ID',
        title: '',
        fileName: '',
        fileSizeBytes: 1024 * 750,
        mimeType: 'application/pdf',
        notes: '',
      });
      fetchProfile();
    } else {
      addNotification({ type: 'error', title: 'Upload Failed', message: res.error || 'Could not upload document.' });
    }
  };

  const handleVerifyDocument = async (docId: string, status: 'VERIFIED' | 'REJECTED') => {
    if (!profile) return;
    const res = await apiClient.patch(
      `/api/v1/employees/${profile.employee.id}/documents/${docId}/verify`,
      { status, notes: `Verified by HR Administrator ${user?.fullName || ''}` },
      activeCompanyId
    );

    if (res.success) {
      addNotification({
        type: 'success',
        title: 'Document Status Updated',
        message: `Document marked as ${status}.`,
      });
      fetchProfile();
    } else {
      addNotification({ type: 'error', title: 'Verification Error', message: res.error || 'Failed to update status.' });
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!profile) return;
    if (!confirm('Are you sure you want to delete this document attachment?')) return;

    const res = await apiClient.delete(
      `/api/v1/employees/${profile.employee.id}/documents/${docId}`,
      activeCompanyId
    );

    if (res.success) {
      addNotification({
        type: 'success',
        title: 'Document Deleted',
        message: 'Document record removed successfully.',
      });
      fetchProfile();
    } else {
      addNotification({ type: 'error', title: 'Delete Failed', message: res.error || 'Failed to delete document.' });
    }
  };

  // -------------------------------------------------------------
  // HANDLERS FOR PROFILE DETAILS EDIT
  // -------------------------------------------------------------
  const [personalEditForm, setPersonalEditForm] = useState<{
    firstName: string;
    middleName?: string;
    lastName: string;
    displayName: string;
    gender: Gender;
    dateOfBirth: string;
    maritalStatus: MaritalStatus;
    nationality: string;
    bloodGroup?: string;
  }>({
    firstName: '',
    lastName: '',
    displayName: '',
    gender: 'MALE',
    dateOfBirth: '',
    maritalStatus: 'SINGLE',
    nationality: 'Indian',
  });

  const openPersonalModal = () => {
    if (!profile) return;
    setPersonalEditForm({
      firstName: profile.employee.firstName,
      middleName: profile.employee.middleName || '',
      lastName: profile.employee.lastName,
      displayName: profile.employee.displayName,
      gender: profile.employee.gender,
      dateOfBirth: profile.employee.dateOfBirth,
      maritalStatus: profile.employee.maritalStatus,
      nationality: profile.employee.nationality,
      bloodGroup: profile.employee.bloodGroup || '',
    });
    setShowEditPersonalModal(true);
  };

  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const res = await apiClient.put(
      `/api/v1/employees/${profile.employee.id}`,
      { personal: personalEditForm },
      activeCompanyId
    );

    if (res.success) {
      addNotification({ type: 'success', title: 'Profile Updated', message: 'Personal details updated successfully.' });
      setShowEditPersonalModal(false);
      fetchProfile();
    } else {
      addNotification({ type: 'error', title: 'Update Failed', message: res.error || 'Failed to update personal data.' });
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center max-w-4xl mx-auto bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading comprehensive employee profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-12 text-center max-w-2xl mx-auto bg-white rounded-xl border border-rose-200 shadow-xs space-y-4">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Unable to Load Employee</h2>
        <p className="text-xs text-slate-500">{error || 'Employee record does not exist or has been archived.'}</p>
        <button
          onClick={() => navigate('/employees')}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#17365D] hover:bg-[#1f487e] rounded-lg cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Directory</span>
        </button>
      </div>
    );
  }

  const {
    employee,
    currentAssignment,
    addresses,
    emergencyContacts,
    bankAccount,
    statutoryDetails,
    documents,
    statusHistory,
    assignmentHistory,
  } = profile;

  const currentAddress = addresses.find((a) => a.type === 'CURRENT');
  const permanentAddress = addresses.find((a) => a.type === 'PERMANENT');
  const primaryEmergency = emergencyContacts.find((c) => c.isPrimary) || emergencyContacts[0];

  const getStatusBadge = (status: EmploymentStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PROBATION':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ON_LEAVE':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'NOTICE_PERIOD':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'SUSPENDED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-300';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16" id="employee-profile-page">
      {/* Top Breadcrumb & Return Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/employees')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Directory</span>
        </button>

        <div className="flex items-center gap-2">
          {hasPermission(PermissionKey.EMPLOYEE_MANAGE) && (
            <>
              <button
                onClick={() => {
                  setStatusForm({
                    status: employee.status,
                    effectiveDate: new Date().toISOString().slice(0, 10),
                    reason: '',
                    comments: '',
                  });
                  setShowStatusModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                <span>Update Status</span>
              </button>

              <button
                onClick={openAssignmentModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#17365D] hover:bg-[#1f487e] rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Building className="w-3.5 h-3.5" />
                <span>Reassign / Promote</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Employee Hero Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            {/* Avatar Initials */}
            <div className="w-16 h-16 rounded-2xl bg-[#17365D] text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-xs">
              {employee.firstName.charAt(0)}
              {employee.lastName.charAt(0)}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900">{employee.displayName}</h1>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                  {employee.employeeCode}
                </span>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadge(
                    employee.status
                  )}`}
                >
                  {employee.status.replace('_', ' ')}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentAssignment?.designationName || 'No Designation'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentAssignment?.departmentName || 'No Department'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentAssignment?.branchName || 'No Branch'}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-mono pt-1">
                <div className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{employee.workEmail}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{employee.mobileNumber}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Joined: {employee.joiningDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Badge on Right */}
          <div className="flex sm:flex-row md:flex-col gap-2 shrink-0 md:text-right border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6">
            <div>
              <div className="text-[10.5px] uppercase font-bold tracking-wider text-slate-400">Reporting To</div>
              <div className="text-xs font-bold text-slate-800 mt-0.5 flex items-center md:justify-end gap-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{currentAssignment?.managerName || 'Root Executive'}</span>
              </div>
            </div>
            <div className="mt-2">
              <div className="text-[10.5px] uppercase font-bold tracking-wider text-slate-400">Employment Type</div>
              <div className="text-xs font-semibold text-blue-700 mt-0.5">
                {employee.employmentType.replace('_', ' ') || 'FULL TIME'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs px-2 pt-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: User },
            { id: 'employment', label: 'Employment & Org', icon: Building },
            { id: 'shifts', label: 'Shift & Schedule', icon: Clock },
            { id: 'leave', label: 'Leave Policy', icon: Shield },
            { id: 'personal', label: 'Personal Info', icon: User },
            { id: 'contact', label: 'Contact & Address', icon: Phone },
            { id: 'bank', label: 'Bank Details', icon: CreditCard },
            { id: 'statutory', label: 'Statutory & Tax', icon: Shield },
            { id: 'documents', label: `Documents (${documents.length})`, icon: FileText },
            { id: 'history', label: 'Audit & History', icon: History },
          ].map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ProfileTab)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'border-[#17365D] text-[#17365D] bg-blue-50/50'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <TabIcon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Main Summaries */}
          <div className="lg:col-span-2 space-y-6">
            {/* Primary Current Assignment Snapshot */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-blue-600" />
                  <span>Current Organizational Placement</span>
                </div>
                {hasPermission(PermissionKey.EMPLOYEE_MANAGE) && (
                  <button
                    onClick={openAssignmentModal}
                    className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Change</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="text-slate-400 font-medium">Designation / Title</div>
                  <div className="font-bold text-slate-900 mt-0.5">{currentAssignment?.designationName || '—'}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium">Department</div>
                  <div className="font-bold text-slate-900 mt-0.5">{currentAssignment?.departmentName || '—'}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium">Branch Location</div>
                  <div className="font-bold text-slate-900 mt-0.5">{currentAssignment?.branchName || '—'}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium">Reporting Manager</div>
                  <div className="font-bold text-slate-900 mt-0.5">{currentAssignment?.managerName || 'None (Root)'}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium">Work Location Hub</div>
                  <div className="font-bold text-slate-900 mt-0.5">{currentAssignment?.workLocationName || '—'}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium">Effective Since</div>
                  <div className="font-mono font-semibold text-slate-900 mt-0.5">
                    {currentAssignment?.effectiveFrom || employee.joiningDate}
                  </div>
                </div>
              </div>
            </div>

            {/* Personal & Contact Snapshot */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-purple-600" />
                  <span>Personal & Emergency Snapshot</span>
                </div>
                <button
                  onClick={() => setActiveTab('personal')}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  View Details
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="text-slate-400 font-medium">Legal Full Name</div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {employee.firstName} {employee.middleName} {employee.lastName}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium">Gender & DOB</div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {employee.gender} • {employee.dateOfBirth}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium">Blood Group</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{employee.bloodGroup || 'Not provided'}</div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-slate-400 font-medium">Current Residential Address</div>
                  <div className="font-medium text-slate-800 mt-0.5">
                    {currentAddress
                      ? `${currentAddress.addressLine1}, ${currentAddress.city}, ${currentAddress.state} - ${currentAddress.postalCode}`
                      : 'No address recorded'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium">Emergency Contact</div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {primaryEmergency
                      ? `${primaryEmergency.contactName} (${primaryEmergency.relationship})`
                      : 'None registered'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: Compliance Status & Quick Timeline */}
          <div className="space-y-6">
            {/* Compliance & Verification Health */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-3 border-b border-slate-100">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Compliance & Verification Status</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-slate-500" />
                    <span className="font-medium text-slate-700">Bank Account</span>
                  </div>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[10.5px] ${
                      bankAccount
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {bankAccount ? 'Configured' : 'Missing'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-slate-500" />
                    <span className="font-medium text-slate-700">PAN & Tax Identity</span>
                  </div>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[10.5px] ${
                      statutoryDetails?.panNumber
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {statutoryDetails?.panNumber ? 'Recorded' : 'Pending'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span className="font-medium text-slate-700">Attached Documents</span>
                  </div>
                  <span className="font-bold text-slate-900">{documents.length} Files</span>
                </div>
              </div>
            </div>

            {/* Recent Status Changes */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-3 border-b border-slate-100">
                <History className="w-4 h-4 text-blue-600" />
                <span>Recent Status Lifecycle</span>
              </div>

              <div className="space-y-3">
                {statusHistory.slice(0, 3).map((item) => (
                  <div key={item.id} className="text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>
                        {item.previousStatus ? `${item.previousStatus} → ` : ''}
                        <span className="text-blue-700">{item.newStatus}</span>
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">{item.effectiveDate}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 italic">"{item.reason}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: EMPLOYMENT & ORGANIZATION */}
      {/* ========================================================================= */}
      {activeTab === 'employment' && (
        <div className="space-y-6">
          {/* Current Assignment Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Current Organization Assignment</h3>
                <p className="text-xs text-slate-500">Live operational assignment active in company payroll and directory.</p>
              </div>
              {hasPermission(PermissionKey.EMPLOYEE_MANAGE) && (
                <button
                  onClick={openAssignmentModal}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#17365D] hover:bg-[#1f487e] rounded-lg shadow-2xs cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Create Assignment Change</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-slate-400 font-semibold uppercase text-[10.5px]">Branch</div>
                <div className="font-bold text-slate-900 text-sm mt-1">{currentAssignment?.branchName || '—'}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">Facility Location</div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-slate-400 font-semibold uppercase text-[10.5px]">Department</div>
                <div className="font-bold text-slate-900 text-sm mt-1">{currentAssignment?.departmentName || '—'}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">Cost Center & Function</div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-slate-400 font-semibold uppercase text-[10.5px]">Designation</div>
                <div className="font-bold text-slate-900 text-sm mt-1">{currentAssignment?.designationName || '—'}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">Primary Job Title</div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-slate-400 font-semibold uppercase text-[10.5px]">Work Location</div>
                <div className="font-bold text-slate-900 text-sm mt-1">{currentAssignment?.workLocationName || '—'}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">Facility Location</div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-slate-400 font-semibold uppercase text-[10.5px]">Reporting Line Manager</div>
                <div className="font-bold text-slate-900 text-sm mt-1">{currentAssignment?.managerName || 'None (Direct to Executive)'}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">Direct Hierarchy Supervisor</div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-slate-400 font-semibold uppercase text-[10.5px]">Employment Parameters</div>
                <div className="font-bold text-blue-700 text-sm mt-1">{employee.employmentType.replace('_', ' ')}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">Notice Period: {employee.noticePeriodDays} Days</div>
              </div>
            </div>
          </div>

          {/* Historical Assignments Timeline */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Effective-Dated Assignment History</h3>
                <p className="text-xs text-slate-500">Immutable chronological chain of organizational movements, promotions, and transfers.</p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                {assignmentHistory.length} Assignment Records
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10.5px]">
                    <th className="py-2.5 px-3">Effective Date</th>
                    <th className="py-2.5 px-3">Department & Role</th>
                    <th className="py-2.5 px-3">Branch & Location</th>
                    <th className="py-2.5 px-3">Manager</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assignmentHistory.map((item) => {
                    const isCurrent = !item.effectiveTo;
                    return (
                      <tr key={item.id} className={isCurrent ? 'bg-blue-50/30 font-medium' : 'text-slate-700'}>
                        <td className="py-2.5 px-3 font-mono">
                          {item.effectiveFrom} {item.effectiveTo ? `→ ${item.effectiveTo}` : '→ Present'}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{item.designationName}</div>
                          <div className="text-[11px] text-slate-500">{item.departmentName}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div>{item.branchName}</div>
                          <div className="text-[11px] text-slate-500">{item.workLocationName}</div>
                        </td>
                        <td className="py-2.5 px-3">{item.managerName || 'None'}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-medium text-slate-900">{item.changeReason || 'JOINING'}</span>
                          {item.notes && <div className="text-[11px] text-slate-400">{item.notes}</div>}
                        </td>
                        <td className="py-2.5 px-3">
                          {isCurrent ? (
                            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Current
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">Archived</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: SHIFTS & SCHEDULE (Phase 2A) */}
      {/* ========================================================================= */}
      {activeTab === 'shifts' && (
        <div className="space-y-6">
          {/* Active Shift Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Current Work Shift & Schedule Policy</h3>
                <p className="text-xs text-slate-500">
                  Active shift assignment determining work hours, grace allowances, breaks, and roster entries.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowShiftHistoryModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <span>Timeline</span>
                </button>
                {hasPermission(PermissionKey.ATTENDANCE_MANAGE) && (
                  <button
                    type="button"
                    onClick={() => setShowAssignShiftDrawer(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Assign Shift</span>
                  </button>
                )}
              </div>
            </div>

            {loadingShifts ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading shift assignment...</div>
            ) : (!Array.isArray(shiftHistory) || shiftHistory.length === 0) ? (
              <div className="p-6 text-center border border-dashed border-slate-300 rounded-lg space-y-2">
                <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-medium text-slate-600">No shift currently assigned to this employee.</p>
                {hasPermission(PermissionKey.ATTENDANCE_MANAGE) && (
                  <button
                    type="button"
                    onClick={() => setShowAssignShiftDrawer(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                  >
                    Assign a Shift Now
                  </button>
                )}
              </div>
            ) : (
              (() => {
                const currentShift = shiftHistory.find((s) => !s.effectiveTo) || shiftHistory[0];
                if (!currentShift) return null;
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <div className="text-slate-400 font-semibold uppercase text-[10px]">Shift Code & Name</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: currentShift.shiftColor || '#3B82F6' }}
                        />
                        <span className="font-bold text-slate-900 text-sm">{currentShift.shiftCode}</span>
                      </div>
                      <div className="text-slate-600 text-[11px]">{currentShift.shiftName}</div>
                      {currentShift.isOvernight && (
                        <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold bg-indigo-100 text-indigo-700 rounded mt-1">
                          OVERNIGHT SHIFT
                        </span>
                      )}
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <div className="text-slate-400 font-semibold uppercase text-[10px]">Standard Work Timings</div>
                      <div className="font-bold font-mono text-slate-900 text-sm mt-1">
                        {currentShift.shiftStartTime} — {currentShift.shiftEndTime}
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Full Day: {currentShift.fullDayHours} hrs • Half Day: {currentShift.halfDayHours} hrs
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <div className="text-slate-400 font-semibold uppercase text-[10px]">Effective Period</div>
                      <div className="font-semibold text-slate-900 mt-1">
                        From: <span className="font-mono">{currentShift.effectiveFrom}</span>
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        To: {currentShift.effectiveTo ? <span className="font-mono">{currentShift.effectiveTo}</span> : 'Open-Ended (Present)'}
                      </div>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 mt-1">
                        {currentShift.assignmentType}
                      </span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <div className="text-slate-400 font-semibold uppercase text-[10px]">Weekly Off Policy</div>
                      <div className="font-semibold text-slate-900 mt-1">
                        {currentShift.weeklyOffDays?.join(', ') || 'SUNDAY'}
                      </div>
                      {currentShift.alternateSaturday && (
                        <div className="text-blue-600 text-[11px] font-medium">+ Alternate Saturdays Off</div>
                      )}
                    </div>
                  </div>
                );
              })()
            )}
          </div>

          {/* Historical Shift Assignments Chain */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Shift Assignment History Chain</h3>
                <p className="text-xs text-slate-500">
                  Full immutable chronological record of shift allocations and effective date ranges.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                {Array.isArray(shiftHistory) ? shiftHistory.length : 0} Shifts Recorded
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10.5px]">
                    <th className="py-2.5 px-3">Effective Range</th>
                    <th className="py-2.5 px-3">Shift Code & Name</th>
                    <th className="py-2.5 px-3">Timings (24h)</th>
                    <th className="py-2.5 px-3">Assignment Type</th>
                    <th className="py-2.5 px-3">Weekly Off</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Array.isArray(shiftHistory) && shiftHistory.map((item) => {
                    const isCurrent = !item.effectiveTo;
                    return (
                      <tr key={item.id} className={isCurrent ? 'bg-blue-50/30 font-medium' : 'text-slate-700'}>
                        <td className="py-2.5 px-3 font-mono">
                          {item.effectiveFrom} {item.effectiveTo ? `→ ${item.effectiveTo}` : '→ Present'}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: item.shiftColor || '#3B82F6' }}
                            />
                            <div>
                              <div className="font-bold text-slate-900">{item.shiftCode}</div>
                              <div className="text-[10.5px] text-slate-500">{item.shiftName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {item.shiftStartTime} - {item.shiftEndTime}
                          {item.isOvernight && (
                            <span className="text-[9px] text-indigo-600 ml-1 font-sans font-bold">NIGHT</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {item.assignmentType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {item.weeklyOffDays?.join(', ') || 'SUNDAY'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {isCurrent ? (
                            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active Shift
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">Past</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: LEAVE POLICY (Phase 3A) */}
      {/* ========================================================================= */}
      {activeTab === 'leave' && (
        <EmployeeLeavePolicyTab
          employeeId={employee.id}
          employeeName={employee.displayName}
          employeeCode={employee.employeeCode}
          companyId={activeCompanyId || employee.companyId}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PERSONAL INFO */}
      {/* ========================================================================= */}
      {activeTab === 'personal' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Personal & Identity Information</h3>
              <p className="text-xs text-slate-500">Legal demographic attributes and registered personal data.</p>
            </div>
            {hasPermission(PermissionKey.EMPLOYEE_MANAGE) && (
              <button
                onClick={openPersonalModal}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#17365D] bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Personal Details</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-xs">
            <div>
              <div className="text-slate-400 font-medium">First Name</div>
              <div className="font-bold text-slate-900 text-sm mt-0.5">{employee.firstName}</div>
            </div>

            <div>
              <div className="text-slate-400 font-medium">Middle Name</div>
              <div className="font-bold text-slate-900 text-sm mt-0.5">{employee.middleName || '—'}</div>
            </div>

            <div>
              <div className="text-slate-400 font-medium">Last Name</div>
              <div className="font-bold text-slate-900 text-sm mt-0.5">{employee.lastName}</div>
            </div>

            <div>
              <div className="text-slate-400 font-medium">Display Name</div>
              <div className="font-bold text-slate-900 text-sm mt-0.5">{employee.displayName}</div>
            </div>

            <div>
              <div className="text-slate-400 font-medium">Gender</div>
              <div className="font-semibold text-slate-900 mt-0.5">{employee.gender}</div>
            </div>

            <div>
              <div className="text-slate-400 font-medium">Date of Birth</div>
              <div className="font-mono font-semibold text-slate-900 mt-0.5">{employee.dateOfBirth}</div>
            </div>

            <div>
              <div className="text-slate-400 font-medium">Marital Status</div>
              <div className="font-semibold text-slate-900 mt-0.5">{employee.maritalStatus}</div>
            </div>

            <div>
              <div className="text-slate-400 font-medium">Nationality</div>
              <div className="font-semibold text-slate-900 mt-0.5">{employee.nationality}</div>
            </div>

            <div>
              <div className="text-slate-400 font-medium">Blood Group</div>
              <div className="font-semibold text-slate-900 mt-0.5">{employee.bloodGroup || 'Not specified'}</div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CONTACT & ADDRESS */}
      {/* ========================================================================= */}
      {activeTab === 'contact' && (
        <div className="space-y-6">
          {/* Communication Channels */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="font-bold text-xs text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100">
              Electronic Communication Channels
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-slate-400 font-medium">Work Email (Primary Login)</div>
                <div className="font-mono font-bold text-slate-900 mt-1">{employee.workEmail}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-slate-400 font-medium">Personal Email</div>
                <div className="font-mono font-semibold text-slate-900 mt-1">{employee.personalEmail || '—'}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-slate-400 font-medium">Mobile Phone Number</div>
                <div className="font-mono font-bold text-slate-900 mt-1">{employee.mobileNumber}</div>
              </div>
            </div>
          </div>

          {/* Addresses Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Address */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span>Present / Current Residence</span>
              </div>

              {currentAddress ? (
                <div className="text-xs space-y-1 text-slate-700 leading-relaxed">
                  <div className="font-semibold text-slate-900">{currentAddress.addressLine1}</div>
                  {currentAddress.addressLine2 && <div>{currentAddress.addressLine2}</div>}
                  <div>
                    {currentAddress.city}, {currentAddress.state}
                  </div>
                  <div>
                    {currentAddress.country} — <span className="font-mono font-bold">{currentAddress.postalCode}</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">No current address recorded.</div>
              )}
            </div>

            {/* Permanent Address */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <MapPin className="w-4 h-4 text-purple-600" />
                <span>Permanent Residence</span>
              </div>

              {permanentAddress ? (
                <div className="text-xs space-y-1 text-slate-700 leading-relaxed">
                  <div className="font-semibold text-slate-900">{permanentAddress.addressLine1}</div>
                  {permanentAddress.addressLine2 && <div>{permanentAddress.addressLine2}</div>}
                  <div>
                    {permanentAddress.city}, {permanentAddress.state}
                  </div>
                  <div>
                    {permanentAddress.country} — <span className="font-mono font-bold">{permanentAddress.postalCode}</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">No permanent address recorded.</div>
              )}
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <Phone className="w-4 h-4 text-amber-600" />
              <span>Primary Emergency Contact</span>
            </div>

            {primaryEmergency ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <div className="text-slate-400 font-medium">Contact Person</div>
                  <div className="font-bold text-slate-900 mt-0.5">{primaryEmergency.contactName}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium">Relationship</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{primaryEmergency.relationship}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium">Phone Number</div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">{primaryEmergency.phoneNumber}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium">Alternate Contact</div>
                  <div className="font-mono text-slate-600 mt-0.5">{primaryEmergency.alternatePhone || primaryEmergency.email || '—'}</div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic">No emergency contact registered.</div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: BANK DETAILS */}
      {/* ========================================================================= */}
      {activeTab === 'bank' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Bank Account & Payroll Disbursement</h3>
              <p className="text-xs text-slate-500">
                Direct credit account for monthly net salary transfers. Sensitive account numbers are masked by default.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {bankAccount && (
                <button
                  onClick={() => setShowFullBank(!showFullBank)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
                >
                  {showFullBank ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showFullBank ? 'Mask Account' : 'Show Account'}</span>
                </button>
              )}
            </div>
          </div>

          {bankAccount ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-slate-400 font-semibold uppercase text-[10.5px]">Account Holder</div>
                <div className="font-bold text-slate-900 text-sm mt-1">{bankAccount.accountHolderName}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">As registered in banking system</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-slate-400 font-semibold uppercase text-[10.5px]">Bank Name</div>
                <div className="font-bold text-slate-900 text-sm mt-1">{bankAccount.bankName}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">{bankAccount.branchName || 'Main Branch'}</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-slate-400 font-semibold uppercase text-[10.5px]">Account Number</div>
                <div className="font-mono font-bold text-slate-900 text-sm mt-1">
                  {showFullBank
                    ? bankAccount.accountNumber
                    : bankAccount.accountNumber
                    ? `••••••••${bankAccount.accountNumber.slice(-4)}`
                    : '••••••••'}
                </div>
                <div className="text-slate-500 text-[11px] mt-0.5">Type: {bankAccount.accountType}</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-slate-400 font-semibold uppercase text-[10.5px]">IFSC / Routing Code</div>
                <div className="font-mono font-bold text-slate-900 text-sm mt-1">{bankAccount.ifscCode}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">Interbank clearing code</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-slate-400 font-semibold uppercase text-[10.5px]">Verification Status</div>
                <div className="mt-1">
                  <span
                    className={`inline-block font-bold text-xs px-2 py-0.5 rounded ${
                      bankAccount.isVerified
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {bankAccount.isVerified ? 'Verified & Active' : 'Self-declared (Unverified)'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <CreditCard className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-600 font-medium">No bank account details configured.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Please attach bank account for direct payroll processing.</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: STATUTORY & TAX */}
      {/* ========================================================================= */}
      {activeTab === 'statutory' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Statutory Compliance & Tax Identification</h3>
            <p className="text-xs text-slate-500">Government identification keys for tax withholding and PF/ESI compliance.</p>
          </div>

          {statutoryDetails ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-slate-400 font-semibold uppercase text-[10.5px]">Income Tax PAN</div>
                <div className="font-mono font-bold text-slate-900 text-sm mt-1">{statutoryDetails.panNumber || '—'}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">Direct Tax Assessment Key</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-slate-400 font-semibold uppercase text-[10.5px]">Aadhaar Number</div>
                <div className="font-mono font-bold text-slate-900 text-sm mt-1">
                  {statutoryDetails.aadhaarNumber
                    ? `••••••••${statutoryDetails.aadhaarNumber.slice(-4)}`
                    : '—'}
                </div>
                <div className="text-slate-500 text-[11px] mt-0.5">Unique Identification Number (Masked)</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-slate-400 font-semibold uppercase text-[10.5px]">Universal Account Number (UAN)</div>
                <div className="font-mono font-bold text-slate-900 text-sm mt-1">{statutoryDetails.uanNumber || '—'}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">EPFO Universal Portal ID</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-slate-400 font-semibold uppercase text-[10.5px]">Provident Fund (PF) ID</div>
                <div className="font-mono font-bold text-slate-900 text-sm mt-1">{statutoryDetails.pfNumber || '—'}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">Employer PF Member ID</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-slate-400 font-semibold uppercase text-[10.5px]">ESI Insurance Number</div>
                <div className="font-mono font-bold text-slate-900 text-sm mt-1">{statutoryDetails.esiNumber || '—'}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">State Insurance Corporation ID</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-slate-400 font-semibold uppercase text-[10.5px]">Tax Regime</div>
                <div className="font-bold text-blue-700 text-sm mt-1">
                  {statutoryDetails.taxRegime === 'NEW' ? 'New Tax Regime (115BAC)' : 'Old Tax Regime (With Deductions)'}
                </div>
                <div className="text-slate-500 text-[11px] mt-0.5">Selected by employee</div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Shield className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-600 font-medium">No statutory records configured.</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: DOCUMENTS */}
      {/* ========================================================================= */}
      {activeTab === 'documents' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Employee Documents & Attachments</h3>
              <p className="text-xs text-slate-500">
                Official certificates, offer letters, government IDs, and verification statuses.
              </p>
            </div>

            {hasPermission(PermissionKey.EMPLOYEE_MANAGE) && (
              <button
                onClick={() => setShowDocUploadModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#17365D] hover:bg-[#1f487e] rounded-lg shadow-2xs cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Document</span>
              </button>
            )}
          </div>

          {documents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10.5px]">
                    <th className="py-2.5 px-3">Document Title</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">File Name</th>
                    <th className="py-2.5 px-3">Uploaded At</th>
                    <th className="py-2.5 px-3">Verification</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>{doc.title}</span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {doc.documentType.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500">{doc.fileName}</td>

                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                        {doc.createdAt ? doc.createdAt.slice(0, 10) : '—'}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10.5px] font-bold ${
                            doc.verificationStatus === 'VERIFIED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : doc.verificationStatus === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {doc.verificationStatus}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* HR Verification Buttons */}
                          {hasPermission(PermissionKey.EMPLOYEE_MANAGE) && doc.verificationStatus === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleVerifyDocument(doc.id, 'VERIFIED')}
                                className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                title="Approve & Verify"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleVerifyDocument(doc.id, 'REJECTED')}
                                className="p-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100"
                                title="Reject Document"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          <a
                            href={`/api/v1/employees/${profile.employee.id}/documents/${doc.id}/download`}
                            download
                            className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                            title="Download Document"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          {hasPermission(PermissionKey.EMPLOYEE_MANAGE) && (
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-600 font-medium">No documents attached yet.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Upload signed contracts, IDs, or degree certificates.</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: AUDIT & HISTORY */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Employment Status Lifecycle Audit</h3>
            <p className="text-xs text-slate-500">Historical trail of status transitions (Probation, Active, Leave, Separation).</p>
          </div>

          <div className="space-y-4">
            {statusHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-200 text-xs"
              >
                <div className="p-2 rounded-lg bg-blue-100 text-blue-800 shrink-0">
                  <History className="w-4 h-4" />
                </div>

                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-900 text-sm">
                      {item.previousStatus ? `${item.previousStatus} → ` : 'Initial Status: '}
                      <span className="text-blue-700">{item.newStatus}</span>
                    </div>
                    <div className="font-mono text-slate-400 text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Effective: {item.effectiveDate}</span>
                    </div>
                  </div>

                  <div className="text-slate-700">
                    <span className="font-medium text-slate-500">Reason:</span> {item.reason}
                  </div>

                  {item.comments && (
                    <div className="text-slate-500 text-[11px]">
                      <span className="font-medium">Comments:</span> {item.comments}
                    </div>
                  )}

                  <div className="text-[10.5px] text-slate-400 pt-1">
                    Recorded by <span className="font-semibold text-slate-600">{item.createdByName || 'System'}</span> on{' '}
                    {item.createdAt?.slice(0, 19).replace('T', ' ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: STATUS CHANGE MODAL */}
      {/* ========================================================================= */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Update Employment Status</h3>
              <button onClick={() => setShowStatusModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleStatusSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Employment Status *</label>
                <select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value as EmploymentStatus })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  required
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PROBATION">PROBATION</option>
                  <option value="ON_LEAVE">ON LEAVE</option>
                  <option value="NOTICE_PERIOD">NOTICE PERIOD</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="RESIGNED">RESIGNED</option>
                  <option value="TERMINATED">TERMINATED</option>
                  <option value="RETIRED">RETIRED</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Effective Date *</label>
                <input
                  type="date"
                  value={statusForm.effectiveDate}
                  onChange={(e) => setStatusForm({ ...statusForm, effectiveDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Status Change *</label>
                <input
                  type="text"
                  value={statusForm.reason}
                  onChange={(e) => setStatusForm({ ...statusForm, reason: e.target.value })}
                  placeholder="e.g. Probation confirmed, Submitted resignation letter"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks / Supporting Notes</label>
                <textarea
                  rows={2}
                  value={statusForm.comments}
                  onChange={(e) => setStatusForm({ ...statusForm, comments: e.target.value })}
                  placeholder="Optional internal HR audit notes..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#17365D] hover:bg-[#1f487e] rounded-lg shadow-2xs"
                >
                  Update Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ASSIGNMENT CHANGE MODAL (Promotion / Transfer / Manager change) */}
      {/* ========================================================================= */}
      {showAssignmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Record Organization Movement</h3>
                <p className="text-xs text-slate-500">Creates an effective-dated assignment with organizational chain preservation.</p>
              </div>
              <button onClick={() => setShowAssignmentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignmentSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Effective Date *</label>
                  <input
                    type="date"
                    value={assignmentForm.effectiveFrom}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, effectiveFrom: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Change Reason *</label>
                  <select
                    value={assignmentForm.changeReason}
                    onChange={(e) =>
                      setAssignmentForm({
                        ...assignmentForm,
                        changeReason: e.target.value as AssignmentChangeReason,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                    required
                  >
                    <option value="PROMOTION">PROMOTION</option>
                    <option value="TRANSFER">DEPARTMENT / BRANCH TRANSFER</option>
                    <option value="ROLE_CHANGE">ROLE CHANGE / DESIGNATION</option>
                    <option value="MANAGER_CHANGE">REPORTING MANAGER CHANGE</option>
                    <option value="CONFIRMATION">CONFIRMATION</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Branch *</label>
                  <select
                    value={assignmentForm.branchId}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, branchId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                    required
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department *</label>
                  <select
                    value={assignmentForm.departmentId}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, departmentId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                    required
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation *</label>
                  <select
                    value={assignmentForm.designationId}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, designationId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                    required
                  >
                    {designations.map((des) => (
                      <option key={des.id} value={des.id}>
                        {des.name} ({des.gradeLevel || des.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Work Location *</label>
                  <select
                    value={assignmentForm.workLocationId}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, workLocationId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                    required
                  >
                    {workLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} - {loc.city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reporting Manager</label>
                <select
                  value={assignmentForm.managerId || ''}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, managerId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                >
                  <option value="">None (Top-Level Executive)</option>
                  {managerOptions.map((mgr) => (
                    <option key={mgr.id} value={mgr.id}>
                      {mgr.displayName} [{mgr.employeeCode}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
                <textarea
                  rows={2}
                  value={assignmentForm.notes || ''}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, notes: e.target.value })}
                  placeholder="Promotion rationale, office transfer justification..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignmentModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#17365D] hover:bg-[#1f487e] rounded-lg shadow-2xs"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DOCUMENT UPLOAD MODAL */}
      {/* ========================================================================= */}
      {showDocUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Upload Employee Document</h3>
              <button onClick={() => setShowDocUploadModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDocUploadSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Document Type *</label>
                <select
                  value={docUploadForm.documentType}
                  onChange={(e) =>
                    setDocUploadForm({
                      ...docUploadForm,
                      documentType: e.target.value as DocumentType,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  required
                >
                  <option value="GOVERNMENT_ID">Government ID (Passport/PAN/Aadhaar)</option>
                  <option value="OFFER_LETTER">Signed Offer Letter</option>
                  <option value="APPOINTMENT_LETTER">Appointment Letter</option>
                  <option value="EXPERIENCE_LETTER">Prior Experience Letter</option>
                  <option value="RESUME">Resume / CV</option>
                  <option value="EDUCATIONAL_CERTIFICATE">Educational Degree / Transcript</option>
                  <option value="PAYSLIP">Previous Employer Payslip</option>
                  <option value="ADDRESS_PROOF">Address Proof</option>
                  <option value="OTHER">Other Attachment</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Document Title *</label>
                <input
                  type="text"
                  value={docUploadForm.title}
                  onChange={(e) => setDocUploadForm({ ...docUploadForm, title: e.target.value })}
                  placeholder="e.g. Master's Degree Certificate"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">File Name *</label>
                <input
                  type="text"
                  value={docUploadForm.fileName}
                  onChange={(e) => setDocUploadForm({ ...docUploadForm, fileName: e.target.value })}
                  placeholder="e.g. degree_certificate_2024.pdf"
                  className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Description</label>
                <textarea
                  rows={2}
                  value={docUploadForm.notes}
                  onChange={(e) => setDocUploadForm({ ...docUploadForm, notes: e.target.value })}
                  placeholder="Optional verification notes..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDocUploadModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#17365D] hover:bg-[#1f487e] rounded-lg shadow-2xs"
                >
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: EDIT PERSONAL DETAILS MODAL */}
      {/* ========================================================================= */}
      {showEditPersonalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Edit Personal Information</h3>
              <button onClick={() => setShowEditPersonalModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePersonalSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={personalEditForm.firstName}
                    onChange={(e) => setPersonalEditForm({ ...personalEditForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={personalEditForm.lastName}
                    onChange={(e) => setPersonalEditForm({ ...personalEditForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Display Name</label>
                <input
                  type="text"
                  value={personalEditForm.displayName}
                  onChange={(e) => setPersonalEditForm({ ...personalEditForm, displayName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={personalEditForm.gender}
                    onChange={(e) => setPersonalEditForm({ ...personalEditForm, gender: e.target.value as Gender })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                    <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Marital Status</label>
                  <select
                    value={personalEditForm.maritalStatus}
                    onChange={(e) =>
                      setPersonalEditForm({
                        ...personalEditForm,
                        maritalStatus: e.target.value as MaritalStatus,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  >
                    <option value="SINGLE">Single</option>
                    <option value="MARRIED">Married</option>
                    <option value="DIVORCED">Divorced</option>
                    <option value="WIDOWED">Widowed</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Blood Group</label>
                  <input
                    type="text"
                    value={personalEditForm.bloodGroup || ''}
                    onChange={(e) => setPersonalEditForm({ ...personalEditForm, bloodGroup: e.target.value })}
                    placeholder="e.g. O+, B+"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nationality</label>
                  <input
                    type="text"
                    value={personalEditForm.nationality}
                    onChange={(e) => setPersonalEditForm({ ...personalEditForm, nationality: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditPersonalModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#17365D] hover:bg-[#1f487e] rounded-lg shadow-2xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shift History Modal */}
      {id && (
        <ShiftHistoryModal
          employeeId={id}
          employeeName={employee.displayName}
          employeeCode={employee.employeeCode}
          isOpen={showShiftHistoryModal}
          onClose={() => setShowShiftHistoryModal(false)}
          onAssignNew={() => {
            setShowShiftHistoryModal(false);
            setShowAssignShiftDrawer(true);
          }}
        />
      )}

      {/* Assign Shift Drawer */}
      <AssignShiftDrawer
        isOpen={showAssignShiftDrawer}
        onClose={() => setShowAssignShiftDrawer(false)}
        shifts={shifts}
        preSelectedEmployeeId={id}
        onSuccess={() => {
          fetchShiftData();
          addNotification({
            type: 'success',
            title: 'Shift Assigned',
            message: `Updated shift assignment for ${employee.displayName}.`,
          });
        }}
      />
    </div>
  );
}
