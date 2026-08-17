import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  AlertCircle,
  Building,
  Briefcase,
  MapPin,
  CreditCard,
  FileCheck,
  FileText,
  Upload,
  User,
  Phone,
  Shield,
  Trash2,
  Eye,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useNotification } from '../../context/NotificationContext.js';
import { apiClient } from '../../services/apiClient.js';
import {
  CreateEmployeeDTO,
  Gender,
  MaritalStatus,
  EmploymentType,
  BankAccountType,
  TaxRegime,
  DocumentType,
} from '../../types/employee.js';
import { Branch, Department, Designation, WorkLocation } from '../../types/organization.js';

interface StepItem {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ElementType;
}

const WIZARD_STEPS: StepItem[] = [
  { id: 1, title: 'Basic Information', subtitle: 'Identity & Personal Data', icon: User },
  { id: 2, title: 'Employment & Org', subtitle: 'Role, Org Unit & Hierarchy', icon: Building },
  { id: 3, title: 'Contact & Addresses', subtitle: 'Email, Phone & Residential', icon: Phone },
  { id: 4, title: 'Bank Account', subtitle: 'Payroll Disbursement', icon: CreditCard },
  { id: 5, title: 'Statutory Details', subtitle: 'Tax & Compliance IDs', icon: Shield },
  { id: 6, title: 'Initial Documents', subtitle: 'Certificates & Identity Proof', icon: FileText },
  { id: 7, title: 'Review & Submit', subtitle: 'Verify & Confirm Onboarding', icon: CheckCircle2 },
];

export function AddEmployeeWizardPage() {
  const navigate = useNavigate();
  const { activeCompanyId, user } = useAuth();
  const { addNotification } = useNotification();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Master Data Dropdowns
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [workLocations, setWorkLocations] = useState<WorkLocation[]>([]);
  const [managerOptions, setManagerOptions] = useState<
    Array<{ id: string; employeeCode: string; displayName: string; designationName?: string }>
  >([]);

  // Form State
  const [formData, setFormData] = useState<CreateEmployeeDTO>({
    // Step 1: Basic Information
    employeeCode: '',
    firstName: '',
    middleName: '',
    lastName: '',
    displayName: '',
    gender: 'MALE',
    dateOfBirth: '',
    maritalStatus: 'SINGLE',
    nationality: 'Indian',
    bloodGroup: '',

    // Step 2: Employment & Organization
    joiningDate: new Date().toISOString().slice(0, 10),
    employmentType: 'FULL_TIME',
    probationPeriodMonths: 3,
    noticePeriodDays: 30,
    branchId: '',
    departmentId: '',
    designationId: '',
    workLocationId: '',
    managerId: '',

    // Step 3: Contact & Address
    workEmail: '',
    personalEmail: '',
    mobileNumber: '',
    currentAddress: {
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      country: 'India',
      postalCode: '',
    },
    permanentAddress: {
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      country: 'India',
      postalCode: '',
      isSameAsCurrent: false,
    },
    emergencyContact: {
      contactName: '',
      relationship: 'Spouse',
      phoneNumber: '',
      alternatePhone: '',
      email: '',
    },

    // Step 4: Bank Details
    bankAccount: {
      accountHolderName: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      branchName: '',
      accountType: 'SAVINGS',
    },

    // Step 5: Statutory
    statutoryDetails: {
      panNumber: '',
      aadhaarNumber: '',
      uanNumber: '',
      pfNumber: '',
      esiNumber: '',
      taxRegime: 'NEW',
    },

    // Step 6: Documents
    documents: [],
  });

  const [confirmAccountNumber, setConfirmAccountNumber] = useState<string>('');

  // Initial Document Upload Form in Step 6
  const [newDoc, setNewDoc] = useState<{
    documentType: DocumentType;
    title: string;
    fileName: string;
    fileSizeBytes: number;
    mimeType: string;
    notes: string;
  }>({
    documentType: 'OFFER_LETTER',
    title: '',
    fileName: '',
    fileSizeBytes: 1024 * 500, // 500 KB mock
    mimeType: 'application/pdf',
    notes: '',
  });

  // Load Organization Masters for Dropdowns
  useEffect(() => {
    async function loadMasters() {
      if (!activeCompanyId) return;
      const [branchRes, deptRes, desigRes, locRes, mgrRes] = await Promise.all([
        apiClient.get<Branch[]>('/api/v1/organization/branches', activeCompanyId),
        apiClient.get<Department[]>('/api/v1/organization/departments', activeCompanyId),
        apiClient.get<Designation[]>('/api/v1/organization/designations', activeCompanyId),
        apiClient.get<WorkLocation[]>('/api/v1/organization/work-locations', activeCompanyId),
        apiClient.get<any[]>('/api/v1/employees/managers/options', activeCompanyId),
      ]);

      if (branchRes.success && branchRes.data) {
        setBranches(branchRes.data);
        if (branchRes.data.length > 0 && !formData.branchId) {
          setFormData((prev) => ({ ...prev, branchId: branchRes.data![0].id }));
        }
      }

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

      if (mgrRes.success && mgrRes.data) {
        setManagerOptions(mgrRes.data);
      }
    }
    loadMasters();
  }, [activeCompanyId]);

  // Sync display name dynamically if user hasn't typed custom display name
  const handleNameChange = (field: 'firstName' | 'middleName' | 'lastName', val: string) => {
    const updated = { ...formData, [field]: val };
    const fName = field === 'firstName' ? val : formData.firstName;
    const mName = field === 'middleName' ? val : formData.middleName;
    const lName = field === 'lastName' ? val : formData.lastName;
    const generatedDisplay = `${fName.trim()}${mName ? ' ' + mName.trim() : ''} ${lName.trim()}`.trim();
    updated.displayName = generatedDisplay;
    setFormData(updated);
  };

  // Sync permanent address if "Same as current" is toggled
  const handleSameAsCurrentToggle = (checked: boolean) => {
    if (checked && formData.currentAddress) {
      setFormData((prev) => ({
        ...prev,
        permanentAddress: {
          ...prev.currentAddress!,
          isSameAsCurrent: true,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        permanentAddress: {
          addressLine1: '',
          addressLine2: '',
          city: '',
          state: '',
          country: 'India',
          postalCode: '',
          isSameAsCurrent: false,
        },
      }));
    }
  };

  // Step Validation
  const validateStep = (step: number): boolean => {
    setErrorMessage(null);

    if (step === 1) {
      if (!formData.employeeCode.trim()) {
        setErrorMessage('Employee Code is required (e.g. EMP-101).');
        return false;
      }
      if (!formData.firstName.trim()) {
        setErrorMessage('First Name is required.');
        return false;
      }
      if (!formData.lastName.trim()) {
        setErrorMessage('Last Name is required.');
        return false;
      }
      if (!formData.dateOfBirth) {
        setErrorMessage('Date of Birth is required.');
        return false;
      }
      // Check Age (must be at least 18)
      const birthYear = new Date(formData.dateOfBirth).getFullYear();
      const currentYear = new Date().getFullYear();
      if (currentYear - birthYear < 18) {
        setErrorMessage('Employee must be at least 18 years old.');
        return false;
      }
    }

    if (step === 2) {
      if (!formData.joiningDate) {
        setErrorMessage('Joining Date is required.');
        return false;
      }
      if (!formData.branchId) {
        setErrorMessage('Please select a Branch.');
        return false;
      }
      if (!formData.departmentId) {
        setErrorMessage('Please select a Department.');
        return false;
      }
      if (!formData.designationId) {
        setErrorMessage('Please select a Designation.');
        return false;
      }
      if (!formData.workLocationId) {
        setErrorMessage('Please select a Work Location.');
        return false;
      }
    }

    if (step === 3) {
      if (!formData.workEmail.trim()) {
        setErrorMessage('Work Email is required.');
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.workEmail.trim())) {
        setErrorMessage('Invalid Work Email format.');
        return false;
      }
      if (!formData.mobileNumber.trim()) {
        setErrorMessage('Mobile Number is required.');
        return false;
      }
      if (!formData.currentAddress?.addressLine1?.trim()) {
        setErrorMessage('Current Address Line 1 is required.');
        return false;
      }
      if (!formData.currentAddress?.city?.trim()) {
        setErrorMessage('Current City is required.');
        return false;
      }
      if (!formData.currentAddress?.state?.trim()) {
        setErrorMessage('Current State is required.');
        return false;
      }
      if (!formData.currentAddress?.postalCode?.trim()) {
        setErrorMessage('Current Postal / Zip Code is required.');
        return false;
      }
    }

    if (step === 4) {
      // If user filled bank details, validate consistency
      if (formData.bankAccount?.accountNumber || formData.bankAccount?.bankName) {
        if (!formData.bankAccount.accountNumber?.trim()) {
          setErrorMessage('Account Number is required if bank info is provided.');
          return false;
        }
        if (confirmAccountNumber && confirmAccountNumber !== formData.bankAccount.accountNumber) {
          setErrorMessage('Account Number and Confirm Account Number do not match.');
          return false;
        }
        if (!formData.bankAccount.ifscCode?.trim()) {
          setErrorMessage('IFSC / Routing Code is required.');
          return false;
        }
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(WIZARD_STEPS.length, prev + 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setErrorMessage(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Add Document to list in Step 6
  const handleAddDocument = () => {
    if (!newDoc.title.trim()) {
      setErrorMessage('Please enter a Document Title.');
      return;
    }
    if (!newDoc.fileName.trim()) {
      setErrorMessage('Please select or specify a file name.');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      documents: [
        ...(prev.documents || []),
        {
          documentType: newDoc.documentType,
          title: newDoc.title.trim(),
          fileName: newDoc.fileName.trim(),
          fileSizeBytes: newDoc.fileSizeBytes,
          mimeType: newDoc.mimeType,
          notes: newDoc.notes.trim() || undefined,
        },
      ],
    }));

    setNewDoc({
      documentType: 'OFFER_LETTER',
      title: '',
      fileName: '',
      fileSizeBytes: 1024 * 500,
      mimeType: 'application/pdf',
      notes: '',
    });
    setErrorMessage(null);
  };

  const handleRemoveDoc = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      documents: prev.documents?.filter((_, i) => i !== index),
    }));
  };

  // Final Form Submission
  const handleSubmit = async () => {
    // Validate all required steps
    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const submissionPayload: CreateEmployeeDTO = {
      ...formData,
      employeeCode: formData.employeeCode.trim().toUpperCase(),
      workEmail: formData.workEmail.trim().toLowerCase(),
      personalEmail: formData.personalEmail?.trim().toLowerCase() || undefined,
      bankAccount: formData.bankAccount?.accountNumber
        ? {
            ...formData.bankAccount,
            accountHolderName: formData.bankAccount.accountHolderName || formData.displayName,
          }
        : undefined,
      statutoryDetails:
        formData.statutoryDetails?.panNumber || formData.statutoryDetails?.aadhaarNumber
          ? formData.statutoryDetails
          : undefined,
    };

    const res = await apiClient.post<{ employee: { id: string; employeeCode: string; displayName: string } }>(
      '/api/v1/employees',
      submissionPayload,
      activeCompanyId
    );

    setSubmitting(false);

    if (res.success && res.data) {
      addNotification({
        type: 'success',
        title: 'Employee Created Successfully',
        message: `Employee ${res.data.employee.employeeCode} (${res.data.employee.displayName}) has been onboarded.`,
      });
      navigate(`/employees/${res.data.employee.id}`);
    } else {
      setErrorMessage(res.error || 'Failed to create employee.');
      addNotification({
        type: 'error',
        title: 'Creation Failed',
        message: res.error || 'An error occurred during employee creation.',
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-16 space-y-6" id="add-employee-wizard-page">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/employees')}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Back to Directory"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Add New Employee</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive onboarding wizard across organization, contact, bank, and statutory compliance.
            </p>
          </div>
        </div>

        <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-50 text-[#17365D] border border-blue-200">
          Step {currentStep} of {WIZARD_STEPS.length}
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px]">
          {WIZARD_STEPS.map((step) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const StepIcon = step.icon;

            return (
              <div
                key={step.id}
                onClick={() => {
                  if (step.id < currentStep) setCurrentStep(step.id);
                }}
                className={`flex items-center gap-2.5 cursor-pointer group ${
                  step.id < currentStep ? 'opacity-90' : isCurrent ? 'opacity-100' : 'opacity-40'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    isCompleted
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isCurrent
                      ? 'bg-[#17365D] text-white ring-4 ring-blue-100 shadow-xs'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                </div>
                <div className="text-left">
                  <div
                    className={`text-xs font-bold leading-tight ${
                      isCurrent ? 'text-[#17365D]' : 'text-slate-800'
                    }`}
                  >
                    {step.title}
                  </div>
                  <div className="text-[10.5px] text-slate-400 font-medium leading-tight">
                    {step.subtitle}
                  </div>
                </div>

                {step.id < WIZARD_STEPS.length && (
                  <div className="w-8 h-px bg-slate-200 mx-1 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Message Alert */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-3 text-xs font-medium">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form Container */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-xs space-y-6">
        {/* ========================================================================= */}
        {/* STEP 1: Basic Information */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900">Step 1: Employee Identity & Personal Data</h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter government names, primary system identifier code, and basic demographic attributes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {/* Employee Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Employee Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.employeeCode}
                  onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. EMP-101"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                  required
                />
              </div>

              {/* First Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleNameChange('firstName', e.target.value)}
                  placeholder="e.g. Alexander"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              {/* Middle Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Middle Name</label>
                <input
                  type="text"
                  value={formData.middleName || ''}
                  onChange={(e) => handleNameChange('middleName', e.target.value)}
                  placeholder="e.g. James"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleNameChange('lastName', e.target.value)}
                  placeholder="e.g. Morgan"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Display Name</label>
                <input
                  type="text"
                  value={formData.displayName || ''}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Auto-generated or custom"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gender <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                  <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                </select>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date of Birth <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  required
                />
              </div>

              {/* Marital Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Marital Status</label>
                <select
                  value={formData.maritalStatus || 'SINGLE'}
                  onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value as MaritalStatus })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="SINGLE">Single</option>
                  <option value="MARRIED">Married</option>
                  <option value="DIVORCED">Divorced</option>
                  <option value="WIDOWED">Widowed</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Nationality */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nationality</label>
                <input
                  type="text"
                  value={formData.nationality || 'Indian'}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Blood Group */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
                <select
                  value={formData.bloodGroup || ''}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: Employment & Organization Assignment */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900">Step 2: Organizational Unit, Role & Hierarchy</h2>
              <p className="text-xs text-slate-500 mt-1">
                Assign the new hire to active branches, departments, job designations, and reporting hierarchy.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {/* Joining Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Joining Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.joiningDate}
                  onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  required
                />
              </div>

              {/* Employment Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Employment Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.employmentType}
                  onChange={(e) =>
                    setFormData({ ...formData, employmentType: e.target.value as EmploymentType })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="PROBATION">Probation</option>
                  <option value="INTERN">Intern</option>
                  <option value="TEMPORARY">Temporary</option>
                </select>
              </div>

              {/* Probation Period (Months) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Probation Period (Months)
                </label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  value={formData.probationPeriodMonths ?? 3}
                  onChange={(e) =>
                    setFormData({ ...formData, probationPeriodMonths: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Notice Period (Days) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notice Period (Days)</label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={formData.noticePeriodDays ?? 30}
                  onChange={(e) => setFormData({ ...formData, noticePeriodDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Branch */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Branch <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                >
                  <option value="">Select Branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Designation */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Designation <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.designationId}
                  onChange={(e) => setFormData({ ...formData, designationId: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                >
                  <option value="">Select Designation</option>
                  {designations.map((des) => (
                    <option key={des.id} value={des.id}>
                      {des.name} ({des.gradeLevel || des.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Work Location */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Work Location <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.workLocationId}
                  onChange={(e) => setFormData({ ...formData, workLocationId: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                >
                  <option value="">Select Work Location</option>
                  {workLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} - {loc.city}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reporting Manager */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reporting Manager</label>
                <select
                  value={formData.managerId || ''}
                  onChange={(e) => setFormData({ ...formData, managerId: e.target.value || undefined })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">None (Top-level / Executive)</option>
                  {managerOptions.map((mgr) => (
                    <option key={mgr.id} value={mgr.id}>
                      {mgr.displayName} [{mgr.employeeCode}] {mgr.designationName ? `— ${mgr.designationName}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: Contact & Addresses */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900">Step 3: Communication, Addresses & Emergency Contact</h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter corporate and personal contact channels, residential address details, and primary emergency contact.
              </p>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Work Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.workEmail}
                  onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                  placeholder="name@company.com"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Personal Email</label>
                <input
                  type="email"
                  value={formData.personalEmail || ''}
                  onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })}
                  placeholder="personal@gmail.com"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.mobileNumber}
                  onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              {/* Current Address */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>Current / Present Address</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Address Line 1 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.currentAddress?.addressLine1 || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        currentAddress: { ...formData.currentAddress!, addressLine1: e.target.value },
                      })
                    }
                    placeholder="House / Flat No, Street"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Address Line 2</label>
                  <input
                    type="text"
                    value={formData.currentAddress?.addressLine2 || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        currentAddress: { ...formData.currentAddress!, addressLine2: e.target.value },
                      })
                    }
                    placeholder="Landmark, Area"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      City <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.currentAddress?.city || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          currentAddress: { ...formData.currentAddress!, city: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      State <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.currentAddress?.state || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          currentAddress: { ...formData.currentAddress!, state: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Country</label>
                    <input
                      type="text"
                      value={formData.currentAddress?.country || 'India'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          currentAddress: { ...formData.currentAddress!, country: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Postal Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.currentAddress?.postalCode || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          currentAddress: { ...formData.currentAddress!, postalCode: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Permanent Address */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-purple-600" />
                    <span>Permanent Address</span>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-blue-700 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.permanentAddress?.isSameAsCurrent)}
                      onChange={(e) => handleSameAsCurrentToggle(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>Same as current</span>
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Address Line 1</label>
                  <input
                    type="text"
                    disabled={Boolean(formData.permanentAddress?.isSameAsCurrent)}
                    value={formData.permanentAddress?.addressLine1 || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        permanentAddress: { ...formData.permanentAddress!, addressLine1: e.target.value },
                      })
                    }
                    placeholder="House / Flat No, Street"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Address Line 2</label>
                  <input
                    type="text"
                    disabled={Boolean(formData.permanentAddress?.isSameAsCurrent)}
                    value={formData.permanentAddress?.addressLine2 || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        permanentAddress: { ...formData.permanentAddress!, addressLine2: e.target.value },
                      })
                    }
                    placeholder="Landmark, Area"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      disabled={Boolean(formData.permanentAddress?.isSameAsCurrent)}
                      value={formData.permanentAddress?.city || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          permanentAddress: { ...formData.permanentAddress!, city: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">State</label>
                    <input
                      type="text"
                      disabled={Boolean(formData.permanentAddress?.isSameAsCurrent)}
                      value={formData.permanentAddress?.state || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          permanentAddress: { ...formData.permanentAddress!, state: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Country</label>
                    <input
                      type="text"
                      disabled={Boolean(formData.permanentAddress?.isSameAsCurrent)}
                      value={formData.permanentAddress?.country || 'India'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          permanentAddress: { ...formData.permanentAddress!, country: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Postal Code</label>
                    <input
                      type="text"
                      disabled={Boolean(formData.permanentAddress?.isSameAsCurrent)}
                      value={formData.permanentAddress?.postalCode || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          permanentAddress: { ...formData.permanentAddress!, postalCode: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3">
              <div className="font-bold text-xs text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-700" />
                <span>Primary Emergency Contact</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Contact Person Name</label>
                  <input
                    type="text"
                    value={formData.emergencyContact?.contactName || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergencyContact: { ...formData.emergencyContact!, contactName: e.target.value },
                      })
                    }
                    placeholder="e.g. Eleanor Vance"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Relationship</label>
                  <input
                    type="text"
                    value={formData.emergencyContact?.relationship || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergencyContact: { ...formData.emergencyContact!, relationship: e.target.value },
                      })
                    }
                    placeholder="e.g. Spouse, Father, Sibling"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Primary Phone</label>
                  <input
                    type="tel"
                    value={formData.emergencyContact?.phoneNumber || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergencyContact: { ...formData.emergencyContact!, phoneNumber: e.target.value },
                      })
                    }
                    placeholder="+91 99999 88888"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={formData.emergencyContact?.email || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergencyContact: { ...formData.emergencyContact!, email: e.target.value },
                      })
                    }
                    placeholder="emergency@contact.com"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: Bank Details */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900">Step 4: Bank Account & Disbursement Info</h2>
              <p className="text-xs text-slate-500 mt-1">
                Banking details for monthly payroll execution. Masked for unauthorized roles in accordance with security policies.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {/* Account Holder Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Holder Name</label>
                <input
                  type="text"
                  value={formData.bankAccount?.accountHolderName || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankAccount: { ...formData.bankAccount!, accountHolderName: e.target.value },
                    })
                  }
                  placeholder={formData.displayName || 'As per bank records'}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Bank Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={formData.bankAccount?.bankName || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankAccount: { ...formData.bankAccount!, bankName: e.target.value },
                    })
                  }
                  placeholder="e.g. HDFC Bank, Chase"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Account Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Type</label>
                <select
                  value={formData.bankAccount?.accountType || 'SAVINGS'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankAccount: {
                        ...formData.bankAccount!,
                        accountType: e.target.value as BankAccountType,
                      },
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="SAVINGS">Savings Account</option>
                  <option value="SALARY">Salary Account</option>
                  <option value="CURRENT">Current Account</option>
                </select>
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number</label>
                <input
                  type="password"
                  value={formData.bankAccount?.accountNumber || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankAccount: { ...formData.bankAccount!, accountNumber: e.target.value },
                    })
                  }
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Confirm Account Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Account Number</label>
                <input
                  type="text"
                  value={confirmAccountNumber}
                  onChange={(e) => setConfirmAccountNumber(e.target.value)}
                  placeholder="Re-enter account number"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* IFSC / Routing Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC / Routing Code</label>
                <input
                  type="text"
                  value={formData.bankAccount?.ifscCode || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankAccount: { ...formData.bankAccount!, ifscCode: e.target.value.toUpperCase() },
                    })
                  }
                  placeholder="e.g. HDFC0001234"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                />
              </div>

              {/* Branch Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Branch Name</label>
                <input
                  type="text"
                  value={formData.bankAccount?.branchName || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankAccount: { ...formData.bankAccount!, branchName: e.target.value },
                    })
                  }
                  placeholder="e.g. Cyber City Branch, Sector 24"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 5: Statutory Details */}
        {/* ========================================================================= */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900">Step 5: Statutory & Compliance Numbers</h2>
              <p className="text-xs text-slate-500 mt-1">
                Income Tax PAN, Provident Fund UAN, and Employee State Insurance data (Encrypted and masked).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {/* PAN Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Income Tax PAN</label>
                <input
                  type="text"
                  maxLength={10}
                  value={formData.statutoryDetails?.panNumber || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      statutoryDetails: {
                        ...formData.statutoryDetails!,
                        panNumber: e.target.value.toUpperCase(),
                      },
                    })
                  }
                  placeholder="ABCDE1234F"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                />
              </div>

              {/* Aadhaar Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Aadhaar Card Number</label>
                <input
                  type="text"
                  maxLength={12}
                  value={formData.statutoryDetails?.aadhaarNumber || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      statutoryDetails: {
                        ...formData.statutoryDetails!,
                        aadhaarNumber: e.target.value,
                      },
                    })
                  }
                  placeholder="12-digit number"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* UAN Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Universal Account Number (UAN / PF)
                </label>
                <input
                  type="text"
                  maxLength={12}
                  value={formData.statutoryDetails?.uanNumber || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      statutoryDetails: {
                        ...formData.statutoryDetails!,
                        uanNumber: e.target.value,
                      },
                    })
                  }
                  placeholder="12-digit UAN"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* PF Member ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Provident Fund (PF) ID</label>
                <input
                  type="text"
                  value={formData.statutoryDetails?.pfNumber || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      statutoryDetails: {
                        ...formData.statutoryDetails!,
                        pfNumber: e.target.value,
                      },
                    })
                  }
                  placeholder="e.g. DL/CPM/0012345/000/123"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* ESI Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ESI Insurance Number</label>
                <input
                  type="text"
                  value={formData.statutoryDetails?.esiNumber || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      statutoryDetails: {
                        ...formData.statutoryDetails!,
                        esiNumber: e.target.value,
                      },
                    })
                  }
                  placeholder="e.g. 31001234560000001"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Tax Regime */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Regime Choice</label>
                <select
                  value={formData.statutoryDetails?.taxRegime || 'NEW'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      statutoryDetails: {
                        ...formData.statutoryDetails!,
                        taxRegime: e.target.value as TaxRegime,
                      },
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="NEW">New Tax Regime (Default 115BAC)</option>
                  <option value="OLD">Old Tax Regime (With Deductions)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 6: Initial Documents */}
        {/* ========================================================================= */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900">Step 6: Attach Initial Documents</h2>
              <p className="text-xs text-slate-500 mt-1">
                Upload verified copies of Signed Offer Letter, Resume, Government ID proof, or Educational Certificates.
              </p>
            </div>

            {/* Document Creation Card */}
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <div className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>Add Document Item</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Document Category</label>
                  <select
                    value={newDoc.documentType}
                    onChange={(e) => setNewDoc({ ...newDoc, documentType: e.target.value as DocumentType })}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="OFFER_LETTER">Signed Offer Letter</option>
                    <option value="RESUME">Resume / CV</option>
                    <option value="GOVERNMENT_ID">Government ID (Passport/PAN)</option>
                    <option value="EDUCATIONAL_CERTIFICATE">Educational Degree</option>
                    <option value="EXPERIENCE_LETTER">Prior Experience Letter</option>
                    <option value="ADDRESS_PROOF">Address Proof</option>
                    <option value="OTHER">Other Attachment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Document Title</label>
                  <input
                    type="text"
                    value={newDoc.title}
                    onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                    placeholder="e.g. Signed Offer Letter 2026"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">File Name</label>
                  <input
                    type="text"
                    value={newDoc.fileName}
                    onChange={(e) => setNewDoc({ ...newDoc, fileName: e.target.value })}
                    placeholder="e.g. offer_letter_signed.pdf"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAddDocument}
                    className="w-full px-3 py-1.5 text-xs font-semibold text-white bg-[#17365D] hover:bg-[#1f487e] rounded-md transition-colors cursor-pointer"
                  >
                    + Add to List
                  </button>
                </div>
              </div>
            </div>

            {/* Uploaded Documents List */}
            {formData.documents && formData.documents.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700">Attached Documents ({formData.documents.length}):</div>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden bg-white">
                  {formData.documents.map((doc, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50 text-xs">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="font-semibold text-slate-900">{doc.title}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {doc.fileName} • {doc.documentType}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveDoc(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                        title="Remove document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-500">
                  No initial documents added yet. You can attach documents now or upload them later on the employee profile.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 7: Review & Submit */}
        {/* ========================================================================= */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900">Step 7: Verification & Final Confirmation</h2>
              <p className="text-xs text-slate-500 mt-1">
                Please carefully review the employee onboarding record before committing to the live system database.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Identity Review Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-blue-600" />
                    <span>Personal Identity</span>
                  </div>
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="text-blue-600 hover:underline text-[11px] font-medium"
                  >
                    Edit
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-400">Employee Code:</span>{' '}
                    <span className="font-mono font-bold text-slate-900">{formData.employeeCode}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Full Name:</span>{' '}
                    <span className="font-semibold text-slate-900">{formData.displayName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Gender:</span> {formData.gender}
                  </div>
                  <div>
                    <span className="text-slate-400">DOB:</span> {formData.dateOfBirth}
                  </div>
                  <div>
                    <span className="text-slate-400">Nationality:</span> {formData.nationality}
                  </div>
                  <div>
                    <span className="text-slate-400">Blood Group:</span> {formData.bloodGroup || '—'}
                  </div>
                </div>
              </div>

              {/* Org & Role Review Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-emerald-600" />
                    <span>Organization Assignment</span>
                  </div>
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="text-blue-600 hover:underline text-[11px] font-medium"
                  >
                    Edit
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-400">Joining Date:</span>{' '}
                    <span className="font-mono font-semibold">{formData.joiningDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Employment Type:</span> {formData.employmentType}
                  </div>
                  <div>
                    <span className="text-slate-400">Branch:</span>{' '}
                    {branches.find((b) => b.id === formData.branchId)?.name || '—'}
                  </div>
                  <div>
                    <span className="text-slate-400">Department:</span>{' '}
                    {departments.find((d) => d.id === formData.departmentId)?.name || '—'}
                  </div>
                  <div>
                    <span className="text-slate-400">Designation:</span>{' '}
                    {designations.find((des) => des.id === formData.designationId)?.name || '—'}
                  </div>
                  <div>
                    <span className="text-slate-400">Reporting Manager:</span>{' '}
                    {managerOptions.find((m) => m.id === formData.managerId)?.displayName || 'None (Root)'}
                  </div>
                </div>
              </div>

              {/* Contact Review Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-purple-600" />
                    <span>Contact & Residence</span>
                  </div>
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="text-blue-600 hover:underline text-[11px] font-medium"
                  >
                    Edit
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-1 text-slate-700">
                  <div>
                    <span className="text-slate-400">Work Email:</span>{' '}
                    <span className="font-mono font-semibold text-slate-900">{formData.workEmail}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Mobile:</span> {formData.mobileNumber}
                  </div>
                  <div>
                    <span className="text-slate-400">Current City:</span> {formData.currentAddress?.city},{' '}
                    {formData.currentAddress?.state} ({formData.currentAddress?.postalCode})
                  </div>
                  <div>
                    <span className="text-slate-400">Emergency Contact:</span>{' '}
                    {formData.emergencyContact?.contactName ? (
                      <span>
                        {formData.emergencyContact.contactName} ({formData.emergencyContact.relationship}) -{' '}
                        {formData.emergencyContact.phoneNumber}
                      </span>
                    ) : (
                      '—'
                    )}
                  </div>
                </div>
              </div>

              {/* Bank & Statutory Review Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-amber-600" />
                    <span>Bank & Compliance</span>
                  </div>
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="text-blue-600 hover:underline text-[11px] font-medium"
                  >
                    Edit
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-400">Bank:</span> {formData.bankAccount?.bankName || '—'}
                  </div>
                  <div>
                    <span className="text-slate-400">Account:</span>{' '}
                    {formData.bankAccount?.accountNumber ? '••••••••' + formData.bankAccount.accountNumber.slice(-4) : '—'}
                  </div>
                  <div>
                    <span className="text-slate-400">PAN:</span> {formData.statutoryDetails?.panNumber || '—'}
                  </div>
                  <div>
                    <span className="text-slate-400">UAN:</span> {formData.statutoryDetails?.uanNumber || '—'}
                  </div>
                  <div>
                    <span className="text-slate-400">Tax Regime:</span> {formData.statutoryDetails?.taxRegime || 'NEW'}
                  </div>
                  <div>
                    <span className="text-slate-400">Docs Attached:</span> {formData.documents?.length || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons Footer */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/employees')}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {currentStep < WIZARD_STEPS.length ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#17365D] hover:bg-[#1f487e] rounded-lg shadow-xs transition-colors cursor-pointer"
                id="wizard-next-btn"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md transition-colors cursor-pointer disabled:opacity-50"
                id="wizard-submit-btn"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Committing Record...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Create Employee</span>
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
