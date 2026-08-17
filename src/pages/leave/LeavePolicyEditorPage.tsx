import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ShieldCheck,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Layers,
  Sliders,
  Calendar,
  Info,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { leaveApi, CreateLeavePolicyPayload } from '../../services/leaveApi.js';
import { LeaveType, LeavePolicy, LeavePolicyRule } from '../../types/leave.js';
import { PageHeader } from '../../components/shell/PageHeader.js';
import { useNotification } from '../../context/NotificationContext.js';

export function LeavePolicyEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id && id !== 'new');
  const { activeCompanyId } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availableTypes, setAvailableTypes] = useState<LeaveType[]>([]);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<number>(1);
  const [isDefault, setIsDefault] = useState(false);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // Rules list
  const [rules, setRules] = useState<Array<any>>([]);
  const [activeRuleIndex, setActiveRuleIndex] = useState<number>(0);

  // Departments for eligibility (mocked/loaded if needed)
  const [employmentTypes, setEmploymentTypes] = useState<string[]>(['FULL_TIME', 'PROBATION']);
  const [minServiceDays, setMinServiceDays] = useState<number>(0);

  const fetchInitialData = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const typesRes = await leaveApi.getTypes(undefined, activeCompanyId);
      const types = typesRes.data || [];
      setAvailableTypes(types);

      if (isEditMode && id) {
        const policyRes = await leaveApi.getPolicyById(id, activeCompanyId);
        if (policyRes.success && policyRes.data) {
          const p = policyRes.data;
          setCode(p.code);
          setName(p.name);
          setDescription(p.description || '');
          setPriority(p.priority || 1);
          setIsDefault(Boolean(p.isDefault));
          setStatus(p.status);
          setRules(p.rules || []);
          if (p.eligibility) {
            setEmploymentTypes(p.eligibility.employmentTypes || []);
            setMinServiceDays(p.eligibility.minServiceDays || 0);
          }
        }
      } else {
        // Pre-populate with all active leave types default templates
        const defaultRules = types
          .filter((t) => t.status === 'ACTIVE')
          .map((t) => ({
            leaveTypeId: t.id,
            leaveTypeCode: t.code,
            leaveTypeName: t.name,
            leaveCategory: t.category,
            leavePaidType: t.paidType,
            annualEntitlement: t.category === 'CASUAL' ? 12 : t.category === 'SICK' ? 12 : t.category === 'PRIVILEGE' ? 15 : 0,
            accrualFrequency: t.category === 'PRIVILEGE' ? 'MONTHLY_PRORATED' : 'ANNUAL_UPFRONT',
            accrualTiming: 'START_OF_PERIOD',
            prorationRule: 'PRORATE_BY_DAYS',
            allowCarryForward: t.category === 'PRIVILEGE',
            maxCarryForwardDays: t.category === 'PRIVILEGE' ? 30 : 0,
            carryForwardExpiryMonths: 12,
            allowEncashment: t.category === 'PRIVILEGE',
            minBalanceForEncashment: 10,
            maxEncashmentDaysPerYear: 10,
            sandwichRuleEnabled: false,
            includeHolidays: false,
            includeWeeklyOffs: false,
            minDaysPerRequest: 0.5,
            maxConsecutiveDays: 30,
            allowBackdated: true,
            maxBackdatedDays: 7,
            allowNegativeBalance: false,
            negativeBalanceLimit: 0,
            requiresAttachment: t.requiresAttachment,
            attachmentThresholdDays: t.attachmentThresholdDays || 2,
            minServiceDaysRequired: 0,
            allowDuringProbation: t.category !== 'PRIVILEGE',
            applicableGender: t.category === 'MATERNITY' ? 'FEMALE' : t.category === 'PATERNITY' ? 'MALE' : 'ALL',
            applicableMaritalStatus: 'ALL',
            status: 'ACTIVE',
          }));
        setRules(defaultRules);
      }
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Loading Error',
        message: err?.message || 'Failed to load policy data.',
      });
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId, isEditMode, id, addNotification]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleAddRuleForType = (typeId: string) => {
    const lt = availableTypes.find((t) => t.id === typeId);
    if (!lt) return;

    if (rules.some((r) => r.leaveTypeId === typeId)) {
      addNotification({ type: 'warning', title: 'Already Added', message: `${lt.name} is already in this policy.` });
      return;
    }

    const newRule = {
      leaveTypeId: lt.id,
      leaveTypeCode: lt.code,
      leaveTypeName: lt.name,
      leaveCategory: lt.category,
      leavePaidType: lt.paidType,
      annualEntitlement: 12,
      accrualFrequency: 'ANNUAL_UPFRONT',
      accrualTiming: 'START_OF_PERIOD',
      prorationRule: 'PRORATE_BY_DAYS',
      allowCarryForward: false,
      maxCarryForwardDays: 0,
      carryForwardExpiryMonths: 12,
      allowEncashment: false,
      minBalanceForEncashment: 0,
      maxEncashmentDaysPerYear: 0,
      sandwichRuleEnabled: false,
      includeHolidays: false,
      includeWeeklyOffs: false,
      minDaysPerRequest: 0.5,
      maxConsecutiveDays: 30,
      allowBackdated: true,
      maxBackdatedDays: 7,
      allowNegativeBalance: false,
      negativeBalanceLimit: 0,
      requiresAttachment: lt.requiresAttachment,
      attachmentThresholdDays: lt.attachmentThresholdDays || 2,
      minServiceDaysRequired: 0,
      allowDuringProbation: true,
      applicableGender: 'ALL',
      applicableMaritalStatus: 'ALL',
      status: 'ACTIVE',
    };

    setRules([...rules, newRule]);
    setActiveRuleIndex(rules.length);
  };

  const handleRemoveRule = (index: number) => {
    const updated = [...rules];
    updated.splice(index, 1);
    setRules(updated);
    if (activeRuleIndex >= updated.length) {
      setActiveRuleIndex(Math.max(0, updated.length - 1));
    }
  };

  const updateCurrentRule = (field: string, value: any) => {
    const updated = [...rules];
    if (!updated[activeRuleIndex]) return;
    updated[activeRuleIndex] = {
      ...updated[activeRuleIndex],
      [field]: value,
    };
    setRules(updated);
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name) {
      addNotification({ type: 'warning', title: 'Validation', message: 'Policy Code and Name are mandatory.' });
      return;
    }
    if (rules.length === 0) {
      addNotification({
        type: 'warning',
        title: 'Rules Required',
        message: 'A leave policy must contain at least one leave rule.',
      });
      return;
    }

    setSaving(true);
    const payload: CreateLeavePolicyPayload = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description.trim() || undefined,
      priority: Number(priority) || 1,
      isDefault: Boolean(isDefault),
      status,
      rules: rules.map((r) => ({
        leaveTypeId: r.leaveTypeId,
        annualEntitlement: Number(r.annualEntitlement) || 0,
        accrualFrequency: r.accrualFrequency,
        accrualTiming: r.accrualTiming,
        prorationRule: r.prorationRule,
        allowCarryForward: Boolean(r.allowCarryForward),
        maxCarryForwardDays: Number(r.maxCarryForwardDays) || 0,
        carryForwardExpiryMonths: Number(r.carryForwardExpiryMonths) || 12,
        allowEncashment: Boolean(r.allowEncashment),
        minBalanceForEncashment: Number(r.minBalanceForEncashment) || 0,
        maxEncashmentDaysPerYear: Number(r.maxEncashmentDaysPerYear) || 0,
        sandwichRuleEnabled: Boolean(r.sandwichRuleEnabled),
        includeHolidays: Boolean(r.includeHolidays),
        includeWeeklyOffs: Boolean(r.includeWeeklyOffs),
        minDaysPerRequest: Number(r.minDaysPerRequest) || 0.5,
        maxConsecutiveDays: Number(r.maxConsecutiveDays) || 30,
        allowBackdated: Boolean(r.allowBackdated),
        maxBackdatedDays: Number(r.maxBackdatedDays) || 7,
        allowNegativeBalance: Boolean(r.allowNegativeBalance),
        negativeBalanceLimit: Number(r.negativeBalanceLimit) || 0,
        requiresAttachment: Boolean(r.requiresAttachment),
        attachmentThresholdDays: Number(r.attachmentThresholdDays) || 2,
        minServiceDaysRequired: Number(r.minServiceDaysRequired) || 0,
        allowDuringProbation: Boolean(r.allowDuringProbation),
        applicableGender: r.applicableGender || 'ALL',
        applicableMaritalStatus: r.applicableMaritalStatus || 'ALL',
        status: r.status || 'ACTIVE',
      })),
      eligibility: {
        employmentTypes,
        minServiceDays: Number(minServiceDays) || 0,
      },
    };

    try {
      if (isEditMode && id) {
        const res = await leaveApi.updatePolicy(id, payload, activeCompanyId);
        if (res.success) {
          addNotification({
            type: 'success',
            title: 'Policy Updated',
            message: `Leave policy ${code} successfully saved.`,
          });
          navigate('/leave/policies');
        } else {
          addNotification({ type: 'error', title: 'Update Failed', message: res.error });
        }
      } else {
        const res = await leaveApi.createPolicy(payload, activeCompanyId);
        if (res.success) {
          addNotification({
            type: 'success',
            title: 'Policy Created',
            message: `Leave policy ${code} successfully created.`,
          });
          navigate('/leave/policies');
        } else {
          addNotification({ type: 'error', title: 'Creation Failed', message: res.error });
        }
      }
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Save Failed', message: err?.message });
    } finally {
      setSaving(false);
    }
  };

  const currentRule = rules[activeRuleIndex];

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
        Loading Policy Studio...
      </div>
    );
  }

  const unusedLeaveTypes = availableTypes.filter((t) => !rules.some((r) => r.leaveTypeId === t.id));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/leave/policies')}
          className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {isEditMode ? `Edit Policy: ${name || code}` : 'Create New Leave Policy'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure full deterministic leave rules, accrual mechanics, sandwich handling, and eligibility filters.
          </p>
        </div>
      </div>

      <form onSubmit={handleSavePolicy} className="space-y-6">
        {/* Section 1: Master Policy Configuration */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <h2 className="font-bold text-sm text-slate-900">1. Basic Policy Information</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Policy Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. POL-STANDARD, POL-EXEC"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono focus:outline-blue-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Policy Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Standard Full-Time Policy"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-blue-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Evaluation Priority</label>
              <input
                type="number"
                min={1}
                max={99}
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-blue-600"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Lower numbers evaluate first</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Policy Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-semibold text-slate-700 mb-1">Description / Summary</label>
            <input
              type="text"
              placeholder="e.g. Default leave rules for full-time regular staff in headquarters."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-blue-600"
            />
          </div>

          <div className="flex items-center gap-2 pt-1 text-xs">
            <input
              type="checkbox"
              id="chk-default-policy"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-slate-300 text-purple-600"
            />
            <label htmlFor="chk-default-policy" className="font-semibold text-slate-700 cursor-pointer">
              Set as Default Company Policy (Applied automatically when no specific assignment matches)
            </label>
          </div>
        </div>

        {/* Section 2: Leave Type Rules Matrix */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <div>
                <h2 className="font-bold text-sm text-slate-900">2. Leave Type Rules Engine</h2>
                <p className="text-[11px] text-slate-500">
                  Configure entitlement, accrual rhythm, carry forward, encashment, and sandwich calculations per leave type.
                </p>
              </div>
            </div>

            {unusedLeaveTypes.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  id="select-add-type"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddRuleForType(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700"
                >
                  <option value="" disabled>
                    + Add Leave Type Rule...
                  </option>
                  {unusedLeaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {rules.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No leave rules defined. Use the dropdown above to add leave rules.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 min-h-[480px]">
              {/* Left Sidebar: Leave Rule Tabs */}
              <div className="md:col-span-1 border-r border-slate-200 bg-slate-50/40 p-3 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                  Leave Rules ({rules.length})
                </div>
                {rules.map((rule, idx) => {
                  const isActive = activeRuleIndex === idx;
                  return (
                    <div
                      key={rule.leaveTypeId || idx}
                      onClick={() => setActiveRuleIndex(idx)}
                      className={`p-2.5 rounded-lg cursor-pointer transition-all flex items-center justify-between text-xs ${
                        isActive
                          ? 'bg-white border border-blue-200 shadow-xs font-bold text-blue-700'
                          : 'hover:bg-slate-100 text-slate-700 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">
                          {rule.leaveTypeCode}
                        </span>
                        <span className="truncate">{rule.leaveTypeName}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-slate-400 font-mono">{rule.annualEntitlement}d</span>
                        {rules.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveRule(idx);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Remove Rule"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Panel: Rule Parameter Configurations */}
              {currentRule && (
                <div className="md:col-span-3 p-6 space-y-6 text-xs bg-white">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <span>{currentRule.leaveTypeName}</span>
                        <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-bold">
                          {currentRule.leaveTypeCode}
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Category: {currentRule.leaveCategory} • Pay: {currentRule.leavePaidType}
                      </p>
                    </div>
                  </div>

                  {/* Grid 1: Entitlement & Accrual */}
                  <div className="space-y-3">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs text-blue-900">
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Accrual & Entitlement Schedule</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Annual Entitlement (Days) *</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={currentRule.annualEntitlement}
                          onChange={(e) => updateCurrentRule('annualEntitlement', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 focus:outline-blue-600"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Accrual Frequency *</label>
                        <select
                          value={currentRule.accrualFrequency}
                          onChange={(e) => updateCurrentRule('accrualFrequency', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="ANNUAL_UPFRONT">Annual Upfront (Lump Sum on Jan 1)</option>
                          <option value="MONTHLY_PRORATED">Monthly Prorated (1/12th per month)</option>
                          <option value="QUARTERLY">Quarterly (1/4th per quarter)</option>
                          <option value="BIANNUAL">Biannual (1/2 per half-year)</option>
                          <option value="NO_ACCRUAL">No Accrual (Static / Event-Based)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Accrual Timing</label>
                        <select
                          value={currentRule.accrualTiming}
                          onChange={(e) => updateCurrentRule('accrualTiming', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="START_OF_PERIOD">Start of Period (Advance Credit)</option>
                          <option value="END_OF_PERIOD">End of Period (Earned upon completion)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Mid-Year Joining Proration</label>
                        <select
                          value={currentRule.prorationRule}
                          onChange={(e) => updateCurrentRule('prorationRule', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="PRORATE_BY_DAYS">Prorate Exact Calendar Days</option>
                          <option value="PRORATE_BY_MONTHS">Prorate by Remaining Full Months</option>
                          <option value="FULL_ENTITLEMENT">Grant Full Entitlement Regardless of Joining Date</option>
                          <option value="NO_PRORATION">No Proration (0 Days until Next Year)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Minimum Service Required</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={currentRule.minServiceDaysRequired || 0}
                            onChange={(e) =>
                              updateCurrentRule('minServiceDaysRequired', parseInt(e.target.value) || 0)
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-300"
                          />
                          <span className="text-slate-500 whitespace-nowrap">days tenure</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Grid 2: Carry Forward & Encashment */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs text-purple-900">
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Year-End Carry Forward & Encashment Rules</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Carry Forward Card */}
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="chk-cf"
                            checked={currentRule.allowCarryForward}
                            onChange={(e) => updateCurrentRule('allowCarryForward', e.target.checked)}
                            className="rounded border-slate-300 text-purple-600"
                          />
                          <label htmlFor="chk-cf" className="font-bold text-slate-800">
                            Allow Carry Forward to Next Year
                          </label>
                        </div>

                        {currentRule.allowCarryForward && (
                          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                            <div>
                              <span className="text-slate-600 block mb-0.5">Max Carry Days:</span>
                              <input
                                type="number"
                                min="0"
                                value={currentRule.maxCarryForwardDays}
                                onChange={(e) =>
                                  updateCurrentRule('maxCarryForwardDays', parseFloat(e.target.value) || 0)
                                }
                                className="w-full px-2 py-1 rounded border border-slate-300 bg-white"
                              />
                            </div>
                            <div>
                              <span className="text-slate-600 block mb-0.5">Expires After:</span>
                              <select
                                value={currentRule.carryForwardExpiryMonths}
                                onChange={(e) =>
                                  updateCurrentRule('carryForwardExpiryMonths', parseInt(e.target.value) || 12)
                                }
                                className="w-full px-2 py-1 rounded border border-slate-300 bg-white"
                              >
                                <option value={3}>3 Months</option>
                                <option value={6}>6 Months</option>
                                <option value={12}>12 Months (Full Year)</option>
                                <option value={0}>Never (Accumulate)</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Encashment Card */}
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="chk-encash"
                            checked={currentRule.allowEncashment}
                            onChange={(e) => updateCurrentRule('allowEncashment', e.target.checked)}
                            className="rounded border-slate-300 text-purple-600"
                          />
                          <label htmlFor="chk-encash" className="font-bold text-slate-800">
                            Allow Leave Encashment (Payout)
                          </label>
                        </div>

                        {currentRule.allowEncashment && (
                          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                            <div>
                              <span className="text-slate-600 block mb-0.5">Min Balance Retained:</span>
                              <input
                                type="number"
                                min="0"
                                value={currentRule.minBalanceForEncashment}
                                onChange={(e) =>
                                  updateCurrentRule('minBalanceForEncashment', parseFloat(e.target.value) || 0)
                                }
                                className="w-full px-2 py-1 rounded border border-slate-300 bg-white"
                              />
                            </div>
                            <div>
                              <span className="text-slate-600 block mb-0.5">Max Encash Days/Yr:</span>
                              <input
                                type="number"
                                min="0"
                                value={currentRule.maxEncashmentDaysPerYear}
                                onChange={(e) =>
                                  updateCurrentRule('maxEncashmentDaysPerYear', parseFloat(e.target.value) || 0)
                                }
                                className="w-full px-2 py-1 rounded border border-slate-300 bg-white"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Grid 3: Sandwich & Calendar Days Calculation */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs text-amber-900">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Sandwich & Non-Working Days Deduction Behavior</span>
                    </div>

                    <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/70 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="chk-sandwich"
                          checked={currentRule.sandwichRuleEnabled}
                          onChange={(e) => updateCurrentRule('sandwichRuleEnabled', e.target.checked)}
                          className="rounded border-amber-300 text-amber-600"
                        />
                        <label htmlFor="chk-sandwich" className="font-bold text-amber-900">
                          Enable Sandwich Rule (Holidays/Weekly-Offs between leave dates are deducted as leave)
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6 pt-1 text-[11px]">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="chk-inc-holidays"
                            checked={currentRule.includeHolidays}
                            onChange={(e) => updateCurrentRule('includeHolidays', e.target.checked)}
                            className="rounded border-slate-300 text-amber-600"
                          />
                          <label htmlFor="chk-inc-holidays" className="text-slate-700">
                            Count Public Holidays as Leave Days
                          </label>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="chk-inc-woff"
                            checked={currentRule.includeWeeklyOffs}
                            onChange={(e) => updateCurrentRule('includeWeeklyOffs', e.target.checked)}
                            className="rounded border-slate-300 text-amber-600"
                          />
                          <label htmlFor="chk-inc-woff" className="text-slate-700">
                            Count Weekly Offs (Sat/Sun) as Leave Days
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Grid 4: Request Limits, Probation & Eligibility */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs text-slate-900">
                      <Info className="w-3.5 h-3.5" />
                      <span>Application Limits & Demographic Eligibility</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Min Days Per Request</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          value={currentRule.minDaysPerRequest}
                          onChange={(e) => updateCurrentRule('minDaysPerRequest', parseFloat(e.target.value) || 0.5)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Max Consecutive Days</label>
                        <input
                          type="number"
                          min="1"
                          value={currentRule.maxConsecutiveDays}
                          onChange={(e) => updateCurrentRule('maxConsecutiveDays', parseInt(e.target.value) || 30)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Backdated Application</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={currentRule.allowBackdated}
                            onChange={(e) => updateCurrentRule('allowBackdated', e.target.checked)}
                            className="rounded border-slate-300 text-blue-600"
                          />
                          <span className="text-slate-700">Allowed (up to</span>
                          <input
                            type="number"
                            min="1"
                            value={currentRule.maxBackdatedDays || 7}
                            onChange={(e) => updateCurrentRule('maxBackdatedDays', parseInt(e.target.value) || 7)}
                            className="w-14 px-1 py-1 rounded border border-slate-300 text-center"
                          />
                          <span className="text-slate-700">days)</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Probation Eligibility</label>
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            id="chk-prob"
                            checked={currentRule.allowDuringProbation}
                            onChange={(e) => updateCurrentRule('allowDuringProbation', e.target.checked)}
                            className="rounded border-slate-300 text-blue-600"
                          />
                          <label htmlFor="chk-prob" className="text-slate-700 font-medium">
                            Allow during Probation
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Applicable Gender</label>
                        <select
                          value={currentRule.applicableGender}
                          onChange={(e) => updateCurrentRule('applicableGender', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="ALL">All Genders</option>
                          <option value="FEMALE">Female Employees Only</option>
                          <option value="MALE">Male Employees Only</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Negative Balance (Advance)</label>
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            id="chk-neg"
                            checked={currentRule.allowNegativeBalance}
                            onChange={(e) => updateCurrentRule('allowNegativeBalance', e.target.checked)}
                            className="rounded border-slate-300 text-blue-600"
                          />
                          <label htmlFor="chk-neg" className="text-slate-700">
                            Allow Negative Balance
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => navigate('/leave/policies')}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer text-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-[#17365D] hover:bg-[#122b4a] text-white font-bold flex items-center gap-2 transition-colors cursor-pointer text-xs shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Policy...' : isEditMode ? 'Save Policy Changes' : 'Create & Activate Policy'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
