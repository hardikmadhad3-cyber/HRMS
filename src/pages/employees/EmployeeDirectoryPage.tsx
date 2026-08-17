import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Building,
  Briefcase,
  MapPin,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Calendar,
  AlertCircle,
  X,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useNotification } from '../../context/NotificationContext.js';
import { apiClient } from '../../services/apiClient.js';
import { EmployeeDirectoryItem, EmploymentType, EmploymentStatus } from '../../types/employee.js';
import { Department, Designation, Branch } from '../../types/organization.js';
import { PermissionKey } from '../../types/auth.js';

export function EmployeeDirectoryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, activeCompanyId, hasPermission } = useAuth();
  const { addNotification } = useNotification();

  const [employees, setEmployees] = useState<EmployeeDirectoryItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter Master Dropdowns
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Active Filter States
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('search') || '');
  const [selectedDept, setSelectedDept] = useState<string>(searchParams.get('departmentId') || '');
  const [selectedDesig, setSelectedDesig] = useState<string>(searchParams.get('designationId') || '');
  const [selectedBranch, setSelectedBranch] = useState<string>(searchParams.get('branchId') || '');
  const [selectedType, setSelectedType] = useState<string>(searchParams.get('employmentType') || '');
  const [selectedStatus, setSelectedStatus] = useState<string>(searchParams.get('status') || '');

  // Pagination
  const [page, setPage] = useState<number>(parseInt(searchParams.get('page') || '1', 10));
  const [limit, setLimit] = useState<number>(parseInt(searchParams.get('limit') || '20', 10));

  // Load Org Master data for filter dropdowns
  useEffect(() => {
    async function loadMasterFilters() {
      if (!activeCompanyId) return;
      const [deptRes, desigRes, branchRes] = await Promise.all([
        apiClient.get<Department[]>('/api/v1/organization/departments', activeCompanyId),
        apiClient.get<Designation[]>('/api/v1/organization/designations', activeCompanyId),
        apiClient.get<Branch[]>('/api/v1/organization/branches', activeCompanyId),
      ]);

      if (deptRes.success && deptRes.data) setDepartments(deptRes.data);
      if (desigRes.success && desigRes.data) setDesignations(desigRes.data);
      if (branchRes.success && branchRes.data) setBranches(branchRes.data);
    }
    loadMasterFilters();
  }, [activeCompanyId]);

  // Load Employees from Server
  const fetchEmployees = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    setError(null);

    const query = new URLSearchParams();
    if (searchQuery.trim()) query.set('search', searchQuery.trim());
    if (selectedDept) query.set('departmentId', selectedDept);
    if (selectedDesig) query.set('designationId', selectedDesig);
    if (selectedBranch) query.set('branchId', selectedBranch);
    if (selectedType) query.set('employmentType', selectedType);
    if (selectedStatus) query.set('status', selectedStatus);
    query.set('page', page.toString());
    query.set('limit', limit.toString());

    // Update browser URL query params without navigation
    setSearchParams(query, { replace: true });

    const res = await apiClient.get<EmployeeDirectoryItem[]>(
      `/api/v1/employees?${query.toString()}`,
      activeCompanyId
    );

    if (res.success && res.data) {
      setEmployees(res.data);
      setTotalCount((res as any).total ?? res.data.length);
    } else {
      setError(res.error || 'Failed to load employee directory.');
      addNotification({
        type: 'error',
        title: 'Data Load Failed',
        message: res.error || 'Unable to retrieve employee records.',
      });
    }
    setLoading(false);
  }, [
    activeCompanyId,
    searchQuery,
    selectedDept,
    selectedDesig,
    selectedBranch,
    selectedType,
    selectedStatus,
    page,
    limit,
    setSearchParams,
    addNotification,
  ]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedDept('');
    setSelectedDesig('');
    setSelectedBranch('');
    setSelectedType('');
    setSelectedStatus('');
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(searchQuery) ||
    Boolean(selectedDept) ||
    Boolean(selectedDesig) ||
    Boolean(selectedBranch) ||
    Boolean(selectedType) ||
    Boolean(selectedStatus);

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
      case 'RESIGNED':
      case 'TERMINATED':
      case 'RETIRED':
        return 'bg-slate-100 text-slate-600 border-slate-300';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getEmploymentTypeBadge = (type: EmploymentType) => {
    switch (type) {
      case 'FULL_TIME':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'CONTRACT':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'INTERN':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'PART_TIME':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12" id="employee-directory-page">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 text-[#17365D]">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Employee Directory</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Centralized employee master identity, organizational hierarchy, and lifecycle records.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchEmployees()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Refresh list"
            id="refresh-employees-btn"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {hasPermission(PermissionKey.EMPLOYEE_MANAGE) && (
            <button
              onClick={() => navigate('/employees/new')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#17365D] hover:bg-[#1f487e] rounded-lg shadow-xs transition-colors cursor-pointer"
              id="add-employee-btn"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>Search & Filter Directory</span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
              id="clear-filters-btn"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear all filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, code, email..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              id="employee-search-input"
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              id="filter-department"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Designation Filter */}
          <div>
            <select
              value={selectedDesig}
              onChange={(e) => {
                setSelectedDesig(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              id="filter-designation"
            >
              <option value="">All Designations</option>
              {designations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Employment Type */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              id="filter-employment-type"
            >
              <option value="">All Types</option>
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
              <option value="CONTRACT">Contract</option>
              <option value="PROBATION">Probation</option>
              <option value="INTERN">Intern</option>
              <option value="TEMPORARY">Temporary</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              id="filter-status"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PROBATION">Probation</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="NOTICE_PERIOD">Notice Period</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="RESIGNED">Resigned</option>
              <option value="TERMINATED">Terminated</option>
              <option value="RETIRED">Retired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Summary Bar */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="font-medium">
            Showing <span className="font-bold text-slate-900">{employees.length}</span> of{' '}
            <span className="font-bold text-slate-900">{totalCount}</span> registered employees
          </div>

          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-md focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border-b border-rose-200 text-rose-700 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">Loading employee records from server...</p>
          </div>
        ) : employees.length === 0 ? (
          /* Empty State */
          <div className="p-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-base font-bold text-slate-900">No Employees Found</h3>
              <p className="text-xs text-slate-500 mt-1">
                {hasActiveFilters
                  ? 'No employees match your search and filter criteria. Try resetting filters.'
                  : 'No employees have been onboarded yet for this company. Begin by adding your first employee.'}
              </p>
            </div>
            {hasPermission(PermissionKey.EMPLOYEE_MANAGE) && (
              <button
                onClick={() => navigate('/employees/new')}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#17365D] hover:bg-[#1f487e] rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add First Employee</span>
              </button>
            )}
          </div>
        ) : (
          /* Table Content */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs" id="employee-directory-table">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10.5px]">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Department & Role</th>
                  <th className="py-3 px-4">Branch & Location</th>
                  <th className="py-3 px-4">Reporting Manager</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Joining Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {employees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/employees/${emp.id}`)}
                  >
                    {/* Employee Profile Cell */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#17365D] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                          {emp.firstName.charAt(0)}
                          {emp.lastName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 hover:text-blue-700 transition-colors">
                            {emp.displayName}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">{emp.workEmail}</div>
                        </div>
                      </div>
                    </td>

                    {/* Employee Code */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {emp.employeeCode}
                      </span>
                    </td>

                    {/* Department & Designation */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{emp.designationName || '—'}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{emp.departmentName || '—'}</span>
                      </div>
                    </td>

                    {/* Branch & Location */}
                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-medium">{emp.branchName || '—'}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{emp.workLocationName || '—'}</span>
                      </div>
                    </td>

                    {/* Reporting Manager */}
                    <td className="py-3 px-4">
                      {emp.managerName ? (
                        <div className="flex items-center gap-1 text-slate-800">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-medium">{emp.managerName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">None (Root)</span>
                      )}
                    </td>

                    {/* Employment Type */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${getEmploymentTypeBadge(
                          emp.employmentType
                        )}`}
                      >
                        {emp.employmentType.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Joining Date */}
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11.5px]">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{emp.joiningDate}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${getStatusBadge(
                          emp.status
                        )}`}
                      >
                        {emp.status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Actions */}
                    <td
                      className="py-3 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => navigate(`/employees/${emp.id}`)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-100/60 transition-colors cursor-pointer inline-flex items-center gap-1 font-medium text-xs"
                        title="View Full Profile"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="hidden sm:inline">Profile</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Page <span className="font-semibold text-slate-900">{page}</span> of{' '}
              <span className="font-semibold text-slate-900">{totalPages}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setPage(i + 1)}
                    className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                      page === i + 1
                        ? 'bg-[#17365D] text-white font-bold'
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
