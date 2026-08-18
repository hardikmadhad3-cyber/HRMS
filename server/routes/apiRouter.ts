import { Router, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService.js';
import { OrganizationService, ServiceActor } from '../services/OrganizationService.js';
import { AuditService } from '../services/AuditService.js';
import { EmployeeService } from '../services/EmployeeService.js';
import { ShiftService } from '../services/ShiftService.js';
import { AttendanceService } from '../services/AttendanceService.js';
import { OvertimeService } from '../services/OvertimeService.js';
import { AttendancePeriodService } from '../services/AttendancePeriodService.js';
import { OvertimePolicyRepository } from '../database/repositories/OvertimePolicyRepository.js';
import { AttendancePeriodRepository } from '../database/repositories/AttendancePeriodRepository.js';
import { LeaveTypeService } from '../services/LeaveTypeService.js';
import { LeavePolicyService } from '../services/LeavePolicyService.js';
import { EmployeeLeavePolicyService } from '../services/EmployeeLeavePolicyService.js';
import { LeaveEligibilityService } from '../services/LeaveEligibilityService.js';
import { LeaveLedgerService } from '../services/LeaveLedgerService.js';
import { LeaveCalculationService } from '../services/LeaveCalculationService.js';
import { LeaveAccrualService } from '../services/LeaveAccrualService.js';
import { LeaveRequestService } from '../services/LeaveRequestService.js';
import { LeaveRequestRepository } from '../database/repositories/LeaveRequestRepository.js';
import { LeaveYearRepository } from '../database/repositories/LeaveYearRepository.js';
import { LeaveAttendanceReconciliationService } from '../services/LeaveAttendanceReconciliationService.js';
import { LeaveAttendanceReconciliationRepository } from '../database/repositories/LeaveAttendanceReconciliationRepository.js';
import { TimeLeavePeriodSnapshotRepository } from '../database/repositories/TimeLeavePeriodSnapshotRepository.js';
import { PayrollConfigService } from '../services/PayrollConfigService.js';
import { EmployeeCompensationService } from '../services/EmployeeCompensationService.js';
import { PayrollCalculationService } from '../services/PayrollCalculationService.js';
import { PayrollFinalizationService } from '../services/PayrollFinalizationService.js';
import { PayrollRunRepository } from '../database/repositories/PayrollRunRepository.js';
import { PayrollRunEmployeeRepository } from '../database/repositories/PayrollRunEmployeeRepository.js';
import { PayslipRepository } from '../database/repositories/PayslipRepository.js';
import { PayrollPeriodSnapshotRepository } from '../database/repositories/PayrollPeriodSnapshotRepository.js';
import { RecruitmentService } from '../services/RecruitmentService.js';
import { OnboardingService } from '../services/OnboardingService.js';
<<<<<<< HEAD
import { PerformanceService } from '../services/PerformanceService.js';
import { ReportService } from '../services/ReportService.js';
import { NotificationService } from '../services/NotificationService.js';
import { AdminService } from '../services/AdminService.js';
import { expenseRouter } from './expenseRoutes.js';
import { assetRouter } from './assetRoutes.js';
import { offboardingRouter } from './offboardingRoutes.js';
=======
>>>>>>> 4a1448526a9835d6aa52ec14365c16a1afc6f77f
import { authMiddleware, AuthenticatedRequest, requirePermission } from '../middleware/authMiddleware.js';
import { PermissionKey, UserRole } from '../../src/types/auth.js';

export const apiRouter = Router();

// Ensure all API responses default to JSON
apiRouter.use((_req, res: Response, next: NextFunction) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

/**
 * Helper to extract actor from request
 */
function getActor(req: AuthenticatedRequest): ServiceActor {
  return {
    id: req.user?.id || 'anonymous',
    name: req.user?.fullName || 'Anonymous User',
    email: req.user?.email || 'anonymous@hrms.enterprise.com',
    role: req.user?.role || 'GUEST',
    ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1',
  };
}

/**
 * PUBLIC AUTHENTICATION ENDPOINTS (No token required)
 */
apiRouter.post('/auth/login', async (req: AuthenticatedRequest, res: Response) => {
  const { username, password } = req.body;
  if (!username) {
    return res.status(400).json({
      success: false,
      error: 'Username or email identifier is required for authentication.',
      code: 'MISSING_CREDENTIALS',
    });
  }

  const user = await AuthService.authenticate(username, password);
  if (!user) {
    if (username) {
      await AuditService.log({
        actorId: 'anonymous',
        actorName: username,
        actorEmail: `${username}@hrms.enterprise.com`,
        action: 'LOGIN_FAILURE',
        targetModule: 'Authentication',
        companyId: 'ALL',
        changesSummary: `Failed authentication attempt for username '${username}'.`,
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid credentials provided. Authentication failed.',
      code: 'INVALID_CREDENTIALS',
    });
  }

  const ipAddress = (req.ip || req.socket.remoteAddress || '127.0.0.1') as string;
  const userAgent = req.headers['user-agent'] as string | undefined;
  const { sessionId, token } = await AuthService.createSession(user.id, { ipAddress, userAgent });

  await AuditService.log({
    actorId: user.id,
    actorName: user.fullName,
    actorEmail: user.email,
    action: 'LOGIN_SUCCESS',
    targetModule: 'Authentication',
    companyId: user.activeCompanyId,
    changesSummary: `User authenticated successfully with role ${user.role} (Session ${sessionId}).`,
  });

  return res.json({
    success: true,
    data: {
      token,
      sessionId,
      user,
    },
  });
});

// PROTECTED ROUTES: Apply auth middleware to all subsequent /api/v1 routes
apiRouter.use(authMiddleware);

/**
 * PROTECTED AUTHENTICATION ENDPOINTS
 */
apiRouter.post('/auth/logout', async (req: AuthenticatedRequest, res: Response) => {
  if (req.sessionId) {
    await AuthService.revokeSession(req.sessionId);
  }

  if (req.user) {
    await AuditService.log({
      actorId: req.user.id,
      actorName: req.user.fullName,
      actorEmail: req.user.email,
      action: 'LOGOUT',
      targetModule: 'Authentication',
      companyId: req.user.activeCompanyId,
      changesSummary: `User logged out and session revoked.`,
    });
  }

  return res.json({
    success: true,
    message: 'Logged out successfully and server session revoked.',
  });
});

apiRouter.get('/auth/me', (req: AuthenticatedRequest, res: Response) => {
  return res.json({ success: true, data: req.user });
});

// =========================================================================
// 1. COMPANIES ENDPOINTS
// =========================================================================
apiRouter.get('/organization/companies', requirePermission(PermissionKey.ORGANIZATION_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const allCompanies = await OrganizationService.getCompanies();
  if (req.user?.role === UserRole.SUPER_ADMIN) {
    return res.json({ success: true, data: allCompanies });
  }
  const permitted = allCompanies.filter((c) => req.user?.companyIds.includes(c.id));
  return res.json({ success: true, data: permitted });
});

apiRouter.get('/organization/companies/:id', requirePermission(PermissionKey.ORGANIZATION_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const company = await OrganizationService.getCompanyById(req.params.id);
  if (!company) {
    return res.status(404).json({ success: false, error: 'Company not found.', code: 'NOT_FOUND' });
  }
  if (req.user?.role !== UserRole.SUPER_ADMIN && !req.user?.companyIds.includes(company.id)) {
    return res.status(403).json({ success: false, error: 'Forbidden: Access to this company is restricted.', code: 'COMPANY_ACCESS_DENIED' });
  }
  return res.json({ success: true, data: company });
});

apiRouter.post('/organization/companies', requirePermission(PermissionKey.ORGANIZATION_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const actor = getActor(req);
    const created = await OrganizationService.createCompany(req.body, actor);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

apiRouter.put('/organization/companies/:id', requirePermission(PermissionKey.ORGANIZATION_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const actor = getActor(req);
    const updated = await OrganizationService.updateCompany(req.params.id, req.body, actor);
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

apiRouter.patch('/organization/companies/:id/status', requirePermission(PermissionKey.ORGANIZATION_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const actor = getActor(req);
    const { status } = req.body;
    if (status !== 'ACTIVE' && status !== 'INACTIVE') {
      return res.status(400).json({ success: false, error: "Status must be either 'ACTIVE' or 'INACTIVE'.", code: 'VALIDATION_ERROR' });
    }
    const updated = await OrganizationService.toggleCompanyStatus(req.params.id, status, actor);
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// 2. BRANCHES ENDPOINTS (Tenant Isolated)
// =========================================================================
apiRouter.get('/organization/branches', requirePermission(PermissionKey.ORGANIZATION_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.user?.activeCompanyId || 'comp-101';
  const { search, status } = req.query;
  const branches = await OrganizationService.getBranches(
    companyId,
    typeof search === 'string' ? search : undefined,
    status === 'ACTIVE' || status === 'INACTIVE' ? status : undefined
  );
  return res.json({ success: true, data: branches });
});

apiRouter.get('/organization/branches/:id', requirePermission(PermissionKey.ORGANIZATION_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.user?.activeCompanyId || 'comp-101';
  const branch = await OrganizationService.getBranchById(req.params.id, companyId);
  if (!branch) {
    return res.status(404).json({ success: false, error: 'Branch not found in current company.', code: 'NOT_FOUND' });
  }
  return res.json({ success: true, data: branch });
});

apiRouter.post('/organization/branches', requirePermission(PermissionKey.ORGANIZATION_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const actor = getActor(req);
    const created = await OrganizationService.createBranch(req.body, companyId, actor);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

apiRouter.put('/organization/branches/:id', requirePermission(PermissionKey.ORGANIZATION_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const actor = getActor(req);
    const updated = await OrganizationService.updateBranch(req.params.id, req.body, companyId, actor);
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

apiRouter.patch('/organization/branches/:id/status', requirePermission(PermissionKey.ORGANIZATION_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const actor = getActor(req);
    const { status } = req.body;
    if (status !== 'ACTIVE' && status !== 'INACTIVE') {
      return res.status(400).json({ success: false, error: "Status must be either 'ACTIVE' or 'INACTIVE'.", code: 'VALIDATION_ERROR' });
    }
    const updated = await OrganizationService.toggleBranchStatus(req.params.id, status, companyId, actor);
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// 3. DEPARTMENTS ENDPOINTS (Tenant Isolated)
// =========================================================================
apiRouter.get('/organization/departments', requirePermission(PermissionKey.ORGANIZATION_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.user?.activeCompanyId || 'comp-101';
  const { search, status } = req.query;
  const departments = await OrganizationService.getDepartments(
    companyId,
    typeof search === 'string' ? search : undefined,
    status === 'ACTIVE' || status === 'INACTIVE' ? status : undefined
  );
  return res.json({ success: true, data: departments });
});

apiRouter.get('/organization/departments/:id', requirePermission(PermissionKey.ORGANIZATION_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.user?.activeCompanyId || 'comp-101';
  const dept = await OrganizationService.getDepartmentById(req.params.id, companyId);
  if (!dept) {
    return res.status(404).json({ success: false, error: 'Department not found in current company.', code: 'NOT_FOUND' });
  }
  return res.json({ success: true, data: dept });
});

apiRouter.post('/organization/departments', requirePermission(PermissionKey.ORGANIZATION_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const actor = getActor(req);
    const created = await OrganizationService.createDepartment(req.body, companyId, actor);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

apiRouter.put('/organization/departments/:id', requirePermission(PermissionKey.ORGANIZATION_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const actor = getActor(req);
    const updated = await OrganizationService.updateDepartment(req.params.id, req.body, companyId, actor);
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

apiRouter.patch('/organization/departments/:id/status', requirePermission(PermissionKey.ORGANIZATION_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const actor = getActor(req);
    const { status } = req.body;
    if (status !== 'ACTIVE' && status !== 'INACTIVE') {
      return res.status(400).json({ success: false, error: "Status must be either 'ACTIVE' or 'INACTIVE'.", code: 'VALIDATION_ERROR' });
    }
    const updated = await OrganizationService.toggleDepartmentStatus(req.params.id, status, companyId, actor);
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// 4. DESIGNATIONS ENDPOINTS (Tenant Isolated)
// =========================================================================
apiRouter.get('/organization/designations', requirePermission(PermissionKey.ORGANIZATION_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.user?.activeCompanyId || 'comp-101';
  const { search, status } = req.query;
  const designations = await OrganizationService.getDesignations(
    companyId,
    typeof search === 'string' ? search : undefined,
    status === 'ACTIVE' || status === 'INACTIVE' ? status : undefined
  );
  return res.json({ success: true, data: designations });
});

apiRouter.get('/organization/designations/:id', requirePermission(PermissionKey.ORGANIZATION_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.user?.activeCompanyId || 'comp-101';
  const desig = await OrganizationService.getDesignationById(req.params.id, companyId);
  if (!desig) {
    return res.status(404).json({ success: false, error: 'Designation not found in current company.', code: 'NOT_FOUND' });
  }
  return res.json({ success: true, data: desig });
});

apiRouter.post('/organization/designations', requirePermission(PermissionKey.ORGANIZATION_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const actor = getActor(req);
    const created = await OrganizationService.createDesignation(req.body, companyId, actor);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

apiRouter.put('/organization/designations/:id', requirePermission(PermissionKey.ORGANIZATION_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const actor = getActor(req);
    const updated = await OrganizationService.updateDesignation(req.params.id, req.body, companyId, actor);
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// 5. WORK LOCATIONS ENDPOINTS (Tenant Isolated)
// =========================================================================
const getWorkLocationsHandler = async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.user?.activeCompanyId || 'comp-101';
  const { search, status, branchId } = req.query;
  const locations = await OrganizationService.getWorkLocations(
    companyId,
    typeof search === 'string' ? search : undefined,
    status === 'ACTIVE' || status === 'INACTIVE' ? status : undefined,
    typeof branchId === 'string' ? branchId : undefined
  );
  return res.json({ success: true, data: locations });
};

apiRouter.get('/organization/work-locations', requirePermission(PermissionKey.ORGANIZATION_VIEW), getWorkLocationsHandler);
apiRouter.get('/organization/locations', requirePermission(PermissionKey.ORGANIZATION_VIEW), getWorkLocationsHandler);

apiRouter.get('/organization/work-locations/:id', requirePermission(PermissionKey.ORGANIZATION_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.user?.activeCompanyId || 'comp-101';
  const loc = await OrganizationService.getWorkLocationById(req.params.id, companyId);
  if (!loc) {
    return res.status(404).json({ success: false, error: 'Work location not found in current company.', code: 'NOT_FOUND' });
  }
  return res.json({ success: true, data: loc });
});

apiRouter.post('/organization/work-locations', requirePermission(PermissionKey.ORGANIZATION_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const actor = getActor(req);
    const created = await OrganizationService.createWorkLocation(req.body, companyId, actor);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

apiRouter.put('/organization/work-locations/:id', requirePermission(PermissionKey.ORGANIZATION_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const actor = getActor(req);
    const updated = await OrganizationService.updateWorkLocation(req.params.id, req.body, companyId, actor);
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// 6. HOLIDAYS ENDPOINTS (Tenant Isolated)
// =========================================================================
apiRouter.get('/organization/holidays', requirePermission(PermissionKey.ORGANIZATION_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.user?.activeCompanyId || 'comp-101';
  const { year, workLocationId, search, status } = req.query;
  const parsedYear = year ? parseInt(year as string, 10) : undefined;
  const holidays = await OrganizationService.getHolidays(
    companyId,
    isNaN(parsedYear as number) ? undefined : parsedYear,
    typeof workLocationId === 'string' ? workLocationId : undefined,
    typeof search === 'string' ? search : undefined,
    status === 'ACTIVE' || status === 'INACTIVE' ? status : undefined
  );
  return res.json({ success: true, data: holidays });
});

apiRouter.get('/organization/holidays/:id', requirePermission(PermissionKey.ORGANIZATION_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.user?.activeCompanyId || 'comp-101';
  const holiday = await OrganizationService.getHolidayById(req.params.id, companyId);
  if (!holiday) {
    return res.status(404).json({ success: false, error: 'Holiday not found in current company.', code: 'NOT_FOUND' });
  }
  return res.json({ success: true, data: holiday });
});

apiRouter.post('/organization/holidays', requirePermission(PermissionKey.ORGANIZATION_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const actor = getActor(req);
    const created = await OrganizationService.createHoliday(req.body, companyId, actor);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

apiRouter.put('/organization/holidays/:id', requirePermission(PermissionKey.ORGANIZATION_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const actor = getActor(req);
    const updated = await OrganizationService.updateHoliday(req.params.id, req.body, companyId, actor);
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

apiRouter.delete('/organization/holidays/:id', requirePermission(PermissionKey.ORGANIZATION_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const actor = getActor(req);
    await OrganizationService.deleteHoliday(req.params.id, companyId, actor);
    return res.json({ success: true, message: 'Holiday deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// 7. EMPLOYEE CORE ENDPOINTS (Phase 1C)
// =========================================================================

// Employee Directory Listing with Filtering, Sorting & Pagination
apiRouter.get('/employees', requirePermission(PermissionKey.EMPLOYEE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const {
      search,
      branchId,
      departmentId,
      designationId,
      workLocationId,
      employmentType,
      status,
      managerId,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await EmployeeService.getDirectory(
      companyId,
      {
        search: typeof search === 'string' ? search : undefined,
        branchId: typeof branchId === 'string' ? branchId : undefined,
        departmentId: typeof departmentId === 'string' ? departmentId : undefined,
        designationId: typeof designationId === 'string' ? designationId : undefined,
        workLocationId: typeof workLocationId === 'string' ? workLocationId : undefined,
        employmentType: typeof employmentType === 'string' ? (employmentType as any) : undefined,
        status: typeof status === 'string' ? (status as any) : undefined,
        managerId: typeof managerId === 'string' ? managerId : undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 50,
        sortBy: typeof sortBy === 'string' ? sortBy : 'employeeCode',
        sortOrder: sortOrder === 'desc' ? 'desc' : 'asc',
      },
      req.user!
    );

    return res.json({
      success: true,
      data: result.items,
      total: result.total,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });
  } catch (err) {
    next(err);
  }
});

// Candidate Managers Dropdown for Selection
apiRouter.get('/employees/managers/options', requirePermission(PermissionKey.EMPLOYEE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { excludeId } = req.query;
    const managers = await EmployeeService.getManagerOptions(
      companyId,
      typeof excludeId === 'string' ? excludeId : undefined
    );
    return res.json({ success: true, data: managers });
  } catch (err) {
    next(err);
  }
});

// Get Full Comprehensive Employee Profile
apiRouter.get('/employees/:id', requirePermission(PermissionKey.EMPLOYEE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const profile = await EmployeeService.getProfile(req.params.id, companyId, req.user!);
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Employee profile not found in current company.',
        code: 'NOT_FOUND',
      });
    }
    return res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
});

// Add Employee Transactional Creation
apiRouter.post('/employees', requirePermission(PermissionKey.EMPLOYEE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const profile = await EmployeeService.createEmployee(req.body, companyId, req.user!);
    return res.status(201).json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
});

// Update Employee Profile
apiRouter.put('/employees/:id', requirePermission(PermissionKey.EMPLOYEE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const profile = await EmployeeService.updateEmployee(req.params.id, req.body, companyId, req.user!);
    return res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
});

// Create Effective-Dated Organization Assignment Change (Transfer / Promotion / Manager change)
apiRouter.post('/employees/:id/assignments', requirePermission(PermissionKey.EMPLOYEE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const profile = await EmployeeService.createAssignmentChange(req.params.id, req.body, companyId, req.user!);
    return res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
});

// Update Employment Status
apiRouter.patch('/employees/:id/status', requirePermission(PermissionKey.EMPLOYEE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const profile = await EmployeeService.updateStatus(req.params.id, req.body, companyId, req.user!);
    return res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
});

// Document Upload Metadata
apiRouter.post('/employees/:id/documents', requirePermission(PermissionKey.EMPLOYEE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const doc = await EmployeeService.uploadDocument(req.params.id, req.body, companyId, req.user!);
    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
});

// Document Verification
apiRouter.patch('/employees/:id/documents/:docId/verify', requirePermission(PermissionKey.EMPLOYEE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { status, notes } = req.body;
    if (status !== 'VERIFIED' && status !== 'REJECTED') {
      return res.status(400).json({ success: false, error: "Status must be 'VERIFIED' or 'REJECTED'.", code: 'VALIDATION_ERROR' });
    }
    const doc = await EmployeeService.verifyDocument(req.params.docId, req.params.id, status, notes, companyId, req.user!);
    return res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
});

// Delete Document
apiRouter.delete('/employees/:id/documents/:docId', requirePermission(PermissionKey.EMPLOYEE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    await EmployeeService.deleteDocument(req.params.docId, req.params.id, companyId, req.user!);
    return res.json({ success: true, message: 'Document deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

// Download Document (Mock binary download stream or metadata)
apiRouter.get('/employees/:id/documents/:docId/download', requirePermission(PermissionKey.EMPLOYEE_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="document-${req.params.docId}.txt"`);
  return res.send(`HRMS Secure Document Download Payload - ID: ${req.params.docId}`);
});

// =========================================================================
// PHASE 2A: SHIFT MANAGEMENT & EMPLOYEE SHIFT ASSIGNMENTS
// =========================================================================

// 1. Shift Summary Metrics
apiRouter.get('/attendance/shifts/summary', requirePermission(PermissionKey.ATTENDANCE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const summary = await ShiftService.getShiftSummary(companyId);
    return res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
});

// 2. List Shifts
apiRouter.get('/attendance/shifts', requirePermission(PermissionKey.ATTENDANCE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { search, status, isOvernight } = req.query;
    const filter = {
      search: search ? String(search) : undefined,
      status: status ? (String(status) as any) : undefined,
      isOvernight: isOvernight !== undefined ? isOvernight === 'true' : undefined,
    };
    const shifts = await ShiftService.getShifts(companyId, filter);
    return res.json({ success: true, data: shifts });
  } catch (err) {
    next(err);
  }
});

// 3. Get Shift by ID
apiRouter.get('/attendance/shifts/:id', requirePermission(PermissionKey.ATTENDANCE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const shift = await ShiftService.getShiftById(req.params.id, companyId);
    if (!shift) {
      return res.status(404).json({ success: false, error: 'Shift not found in current company context.', code: 'SHIFT_NOT_FOUND' });
    }
    return res.json({ success: true, data: shift });
  } catch (err) {
    next(err);
  }
});

// 4. Create Shift
apiRouter.post('/attendance/shifts', requirePermission(PermissionKey.ATTENDANCE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const actor = getActor(req);
    const created = await ShiftService.createShift(req.body, companyId, actor);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

// 5. Update Shift
apiRouter.put('/attendance/shifts/:id', requirePermission(PermissionKey.ATTENDANCE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const actor = getActor(req);
    const updated = await ShiftService.updateShift(req.params.id, req.body, companyId, actor);
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// 6. Toggle Shift Status
apiRouter.patch('/attendance/shifts/:id/status', requirePermission(PermissionKey.ATTENDANCE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { status } = req.body;
    if (status !== 'ACTIVE' && status !== 'INACTIVE') {
      return res.status(400).json({ success: false, error: "Status must be 'ACTIVE' or 'INACTIVE'.", code: 'VALIDATION_ERROR' });
    }
    const actor = getActor(req);
    const updated = await ShiftService.toggleShiftStatus(req.params.id, status, companyId, actor);
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// 7. Get Shift Assignments List
apiRouter.get('/attendance/shift-assignments', requirePermission(PermissionKey.ATTENDANCE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { employeeId, shiftId, departmentId, branchId, search, status, effectiveDate } = req.query;
    const filter = {
      employeeId: employeeId ? String(employeeId) : undefined,
      shiftId: shiftId ? String(shiftId) : undefined,
      departmentId: departmentId ? String(departmentId) : undefined,
      branchId: branchId ? String(branchId) : undefined,
      search: search ? String(search) : undefined,
      status: status ? (String(status) as any) : undefined,
      effectiveDate: effectiveDate ? String(effectiveDate) : undefined,
    };
    const assignments = await ShiftService.getEmployeeShiftAssignments(companyId, filter);
    return res.json({ success: true, data: assignments });
  } catch (err) {
    next(err);
  }
});

// 8. Get Single Employee Shift History
apiRouter.get('/attendance/employees/:employeeId/shift-history', requirePermission(PermissionKey.ATTENDANCE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const history = await ShiftService.getEmployeeShiftHistory(req.params.employeeId, companyId);
    return res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
});

// 9. Assign Shift to Employee
apiRouter.post('/attendance/shift-assignments', requirePermission(PermissionKey.ATTENDANCE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const actor = getActor(req);
    const created = await ShiftService.assignShift(req.body, companyId, actor);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

// 10. Bulk Shift Assignment
apiRouter.post('/attendance/shift-assignments/bulk', requirePermission(PermissionKey.ATTENDANCE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const actor = getActor(req);
    const result = await ShiftService.bulkAssignShift(req.body, companyId, actor);
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 11. Get Shift Roster Grid
apiRouter.get('/attendance/shift-roster', requirePermission(PermissionKey.ATTENDANCE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { startDate, endDate, departmentId, branchId, employeeId, search } = req.query;
    
    // Default to current 7-day week if dates not provided
    const start = startDate ? String(startDate) : new Date().toISOString().slice(0, 10);
    let end = endDate ? String(endDate) : '';
    if (!end) {
      const d = new Date(start);
      d.setDate(d.getDate() + 6);
      end = d.toISOString().slice(0, 10);
    }

    const query = {
      startDate: start,
      endDate: end,
      departmentId: departmentId ? String(departmentId) : undefined,
      branchId: branchId ? String(branchId) : undefined,
      employeeId: employeeId ? String(employeeId) : undefined,
      search: search ? String(search) : undefined,
    };

    const roster = await ShiftService.getShiftRoster(companyId, query);
    return res.json({ success: true, data: roster });
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// PHASE 2B — ATTENDANCE PUNCHES & DAILY/MONTHLY ATTENDANCE ENGINE
// =========================================================================

// Helper to resolve linked employee ID for logged-in user
function resolveEmployeeIdForUser(req: AuthenticatedRequest): string {
  const companyId = req.user?.activeCompanyId || 'comp-101';
  const db = (AttendanceService as any).db;
  const userEmail = req.user?.email;
  const empCode = req.user?.employeeCode;

  const emp = Array.from(db.employees.values()).find(
    (e: any) => e.companyId === companyId && (e.workEmail === userEmail || (empCode && e.employeeCode === empCode))
  );

  if (emp) return (emp as any).id;
  // Fallback to emp-101 for demo admin
  return 'emp-101';
}

// 1. Employee Check-In (ESS)
apiRouter.post('/attendance/check-in', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const employeeId = req.body.employeeId || resolveEmployeeIdForUser(req);
    const actor = req.user!;

    const result = await AttendanceService.recordPunch(
      employeeId,
      companyId,
      {
        punchType: 'CHECK_IN',
        punchTime: req.body.punchTime,
        source: req.body.source || 'ESS',
        deviceId: req.body.deviceId,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        locationAddress: req.body.locationAddress,
        notes: req.body.notes,
      },
      actor
    );

    return res.status(201).json({
      success: true,
      message: 'Check-in recorded successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// 2. Employee Check-Out (ESS)
apiRouter.post('/attendance/check-out', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const employeeId = req.body.employeeId || resolveEmployeeIdForUser(req);
    const actor = req.user!;

    const result = await AttendanceService.recordPunch(
      employeeId,
      companyId,
      {
        punchType: 'CHECK_OUT',
        punchTime: req.body.punchTime,
        source: req.body.source || 'ESS',
        deviceId: req.body.deviceId,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        locationAddress: req.body.locationAddress,
        notes: req.body.notes,
      },
      actor
    );

    return res.status(201).json({
      success: true,
      message: 'Check-out recorded successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// 3. My Attendance Today Status (ESS)
apiRouter.get('/attendance/me/status', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const employeeId = resolveEmployeeIdForUser(req);
    const status = await AttendanceService.getEmployeeTodayStatus(employeeId, companyId);
    return res.json({ success: true, data: status });
  } catch (err) {
    next(err);
  }
});

// 4. My Punch & Daily Attendance History (ESS)
apiRouter.get('/attendance/me/history', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const employeeId = resolveEmployeeIdForUser(req);
    const { page, limit, startDate, endDate } = req.query;

    const list = await AttendanceService.getDailyAttendanceList(
      companyId,
      {
        employeeId,
        startDate: startDate ? String(startDate) : undefined,
        endDate: endDate ? String(endDate) : undefined,
        page: page ? parseInt(String(page), 10) : 1,
        limit: limit ? parseInt(String(limit), 10) : 30,
      },
      req.user!
    );

    return res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

// 5. Daily Attendance List (Company / HR / Manager / Admin)
apiRouter.get('/attendance/daily', requirePermission(PermissionKey.ATTENDANCE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { date, departmentId, branchId, designationId, employeeId, status, hasException, search } = req.query;

    const result = await AttendanceService.getDailyAttendanceList(
      companyId,
      {
        date: date ? String(date) : undefined,
        departmentId: departmentId ? String(departmentId) : undefined,
        branchId: branchId ? String(branchId) : undefined,
        designationId: designationId ? String(designationId) : undefined,
        employeeId: employeeId ? String(employeeId) : undefined,
        status: status as any,
        hasException: hasException !== undefined ? hasException === 'true' : undefined,
        search: search ? String(search) : undefined,
      },
      req.user!
    );

    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 6. Employee Specific Daily Attendance
apiRouter.get('/attendance/employees/:employeeId/daily', requirePermission(PermissionKey.ATTENDANCE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;

    const result = await AttendanceService.getDailyAttendanceList(
      companyId,
      {
        employeeId,
        startDate: startDate ? String(startDate) : undefined,
        endDate: endDate ? String(endDate) : undefined,
      },
      req.user!
    );

    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 7. Monthly Attendance Matrix View
apiRouter.get('/attendance/monthly', requirePermission(PermissionKey.ATTENDANCE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const now = new Date();
    const month = req.query.month ? parseInt(String(req.query.month), 10) : now.getUTCMonth() + 1;
    const year = req.query.year ? parseInt(String(req.query.year), 10) : now.getUTCFullYear();
    const departmentId = req.query.departmentId ? String(req.query.departmentId) : undefined;
    const branchId = req.query.branchId ? String(req.query.branchId) : undefined;
    const employeeId = req.query.employeeId ? String(req.query.employeeId) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;

    const matrix = await AttendanceService.getMonthlyMatrix(
      companyId,
      { month, year, departmentId, branchId, employeeId, search },
      req.user!
    );

    return res.json({ success: true, data: matrix });
  } catch (err) {
    next(err);
  }
});

// 8. Idempotent / Batch Attendance Recalculation
apiRouter.post('/attendance/recalculate', requirePermission(PermissionKey.ATTENDANCE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const result = await AttendanceService.recalculateAttendance(companyId, req.body, req.user!);
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 9. Regularization Requests Listing
apiRouter.get('/attendance/regularizations', requirePermission(PermissionKey.ATTENDANCE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { employeeId, status, startDate, endDate } = req.query;

    const requests = await AttendanceService.listRegularizationRequests(
      companyId,
      {
        employeeId: employeeId ? String(employeeId) : undefined,
        status: status as any,
        startDate: startDate ? String(startDate) : undefined,
        endDate: endDate ? String(endDate) : undefined,
      },
      req.user!
    );

    return res.json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
});

// 10. Submit Regularization Request
apiRouter.post('/attendance/regularizations', requirePermission(PermissionKey.ATTENDANCE_RECORD), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const employeeId = req.body.employeeId || resolveEmployeeIdForUser(req);
    const created = await AttendanceService.submitRegularization(employeeId, companyId, req.body, req.user!);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

// 11. Approve / Reject Regularization Request
apiRouter.patch('/attendance/regularizations/:id/action', requirePermission(PermissionKey.ATTENDANCE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const actioned = await AttendanceService.actionRegularization(id, companyId, req.body, req.user!);
    return res.json({ success: true, data: actioned });
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// PHASE 2C — OVERTIME & ATTENDANCE PERIOD FINALIZATION
// =========================================================================

// 1. Get Company Overtime Policy
apiRouter.get('/attendance/overtime/policy', requirePermission(PermissionKey.ATTENDANCE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const policy = await OvertimePolicyRepository.findByCompanyId(companyId);
    return res.json({ success: true, data: policy });
  } catch (err) {
    next(err);
  }
});

// 2. Update Company Overtime Policy
apiRouter.put('/attendance/overtime/policy', requirePermission(PermissionKey.ATTENDANCE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const existing = await OvertimePolicyRepository.findByCompanyId(companyId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Overtime policy not found for company.' });
    }
    const updated = await OvertimePolicyRepository.update(existing.id, companyId, req.body);
    await AuditService.log({
      companyId,
      actorId: req.user!.id,
      actorName: req.user!.fullName,
      actorEmail: req.user!.email,
      action: 'OVERTIME_POLICY_UPDATED',
      targetModule: 'ATTENDANCE',
      targetRecordId: existing.id,
      changesSummary: `Updated overtime policy parameters for ${existing.name}`,
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// 3. Calculate Overtime Eligibility for Employee & Date
apiRouter.get('/attendance/overtime/eligibility', requirePermission(PermissionKey.ATTENDANCE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const employeeId = (req.query.employeeId as string) || resolveEmployeeIdForUser(req);
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const result = await OvertimeService.calculateEligibility(companyId, employeeId, date);
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 4. List Overtime Requests
apiRouter.get('/attendance/overtime', requirePermission(PermissionKey.ATTENDANCE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { employeeId, status, startDate, endDate, month, year, departmentId, branchId, search } = req.query;
    const filter = {
      employeeId: employeeId ? String(employeeId) : undefined,
      status: status ? (String(status) as any) : undefined,
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      month: month ? parseInt(String(month), 10) : undefined,
      year: year ? parseInt(String(year), 10) : undefined,
      departmentId: departmentId ? String(departmentId) : undefined,
      branchId: branchId ? String(branchId) : undefined,
      search: search ? String(search) : undefined,
    };
    const requests = await OvertimeService.listRequests(companyId, req.user!, filter);
    return res.json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
});

// 5. Submit Overtime Request
apiRouter.post('/attendance/overtime', requirePermission(PermissionKey.ATTENDANCE_RECORD), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const created = await OvertimeService.submitRequest(companyId, req.user!, req.body);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

// 6. Action (Approve / Reject) Overtime Request
apiRouter.patch('/attendance/overtime/:id/action', requirePermission(PermissionKey.ATTENDANCE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const actioned = await OvertimeService.actionRequest(companyId, id, req.user!, req.body);
    return res.json({ success: true, data: actioned });
  } catch (err) {
    next(err);
  }
});

// 7. List Attendance Periods
apiRouter.get('/attendance/periods', requirePermission(PermissionKey.ATTENDANCE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const periods = await AttendancePeriodRepository.findAll(companyId);
    return res.json({ success: true, data: periods });
  } catch (err) {
    next(err);
  }
});

// 8. Get or Create Current Period
apiRouter.get('/attendance/periods/current', requirePermission(PermissionKey.ATTENDANCE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const now = new Date();
    const year = req.query.year ? parseInt(String(req.query.year), 10) : now.getUTCFullYear();
    const month = req.query.month ? parseInt(String(req.query.month), 10) : now.getUTCMonth() + 1;
    const period = await AttendancePeriodService.getOrCreatePeriod(companyId, year, month, req.user);
    return res.json({ success: true, data: period });
  } catch (err) {
    next(err);
  }
});

// 9. Get Period by ID
apiRouter.get('/attendance/periods/:id', requirePermission(PermissionKey.ATTENDANCE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const period = await AttendancePeriodRepository.findById(req.params.id, companyId);
    if (!period) {
      return res.status(404).json({ success: false, error: 'Attendance period not found.' });
    }
    return res.json({ success: true, data: period });
  } catch (err) {
    next(err);
  }
});

// 10. Create Period Explicitly
apiRouter.post('/attendance/periods', requirePermission(PermissionKey.ATTENDANCE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { year, month } = req.body;
    if (!year || !month) {
      return res.status(400).json({ success: false, error: 'Year and Month are required.' });
    }
    const period = await AttendancePeriodService.getOrCreatePeriod(companyId, year, month, req.user);
    return res.status(201).json({ success: true, data: period });
  } catch (err) {
    next(err);
  }
});

// 11. Get Period Review Report & Blockers
apiRouter.get('/attendance/periods/:id/review', requirePermission(PermissionKey.ATTENDANCE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const report = await AttendancePeriodService.getPeriodReviewReport(companyId, req.params.id, req.user!);
    return res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
});

// 12. Finalize Attendance Period
apiRouter.post('/attendance/periods/:id/finalize', requirePermission(PermissionKey.ATTENDANCE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const finalized = await AttendancePeriodService.finalizePeriod(companyId, req.user!, {
      periodId: req.params.id,
      forceFinalize: req.body.forceFinalize,
      notes: req.body.notes,
    });
    return res.json({ success: true, data: finalized, message: 'Attendance period finalized successfully.' });
  } catch (err) {
    next(err);
  }
});

// 13. Reopen Attendance Period
apiRouter.post('/attendance/periods/:id/reopen', requirePermission(PermissionKey.ATTENDANCE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const reopened = await AttendancePeriodService.reopenPeriod(companyId, req.user!, {
      periodId: req.params.id,
      reason: req.body.reason,
    });
    return res.json({ success: true, data: reopened, message: 'Attendance period reopened successfully.' });
  } catch (err) {
    next(err);
  }
});

// 14. Get Payroll Summaries for Period
apiRouter.get('/attendance/periods/:id/payroll-summary', requirePermission(PermissionKey.ATTENDANCE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const summaries = await AttendancePeriodService.getPeriodSummaries(companyId, req.params.id, req.user!);
    return res.json({ success: true, data: summaries });
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// PHASE 3A: LEAVE CONFIGURATION & POLICY ENGINE
// =========================================================================

// --- 1. LEAVE YEARS / PERIODS ---
apiRouter.get('/leave/years', requirePermission(PermissionKey.LEAVE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const years = await LeaveYearRepository.findAll(companyId);
    return res.json({ success: true, data: years });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/leave/years', requirePermission(PermissionKey.LEAVE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { code, name, startDate, endDate, isDefault, status } = req.body;
    if (!code || !name || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Code, name, startDate, and endDate are required.' });
    }
    if (endDate < startDate) {
      return res.status(400).json({ success: false, error: 'End date must be greater than or equal to start date.' });
    }
    const cleanCode = code.trim().toUpperCase();
    const existing = await LeaveYearRepository.findByCode(cleanCode, companyId);
    if (existing) {
      return res.status(409).json({ success: false, error: `Leave year with code "${cleanCode}" already exists.` });
    }
    const id = `ly-${companyId.replace('comp-', '')}-${cleanCode.toLowerCase()}-${Date.now() % 10000}`;
    const created = await LeaveYearRepository.create({
      id,
      companyId,
      code: cleanCode,
      name: name.trim(),
      startDate,
      endDate,
      isDefault: Boolean(isDefault),
      status: status || 'ACTIVE',
      createdBy: req.user?.id,
    });
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

apiRouter.put('/leave/years/:id', requirePermission(PermissionKey.LEAVE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const updated = await LeaveYearRepository.update(req.params.id, companyId, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Leave year not found.' });
    }
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// --- 2. LEAVE TYPES MASTER ---
apiRouter.get('/leave/types', requirePermission(PermissionKey.LEAVE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const filters = {
      status: req.query.status as any,
      category: req.query.category as string,
      search: req.query.search as string,
    };
    const types = await LeaveTypeService.getLeaveTypes(companyId, filters);
    return res.json({ success: true, data: types });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/leave/types/:id', requirePermission(PermissionKey.LEAVE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const type = await LeaveTypeService.getLeaveTypeById(req.params.id, companyId);
    if (!type) {
      return res.status(404).json({ success: false, error: 'Leave type not found.' });
    }
    return res.json({ success: true, data: type });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/leave/types', requirePermission(PermissionKey.LEAVE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const created = await LeaveTypeService.createLeaveType(companyId, req.user!, req.body);
    return res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    if (err?.message?.includes('LEAVE_TYPE_CODE_EXISTS')) {
      return res.status(409).json({ success: false, error: err.message, code: 'LEAVE_TYPE_CODE_EXISTS' });
    }
    next(err);
  }
});

apiRouter.put('/leave/types/:id', requirePermission(PermissionKey.LEAVE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const updated = await LeaveTypeService.updateLeaveType(req.params.id, companyId, req.user!, req.body);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    if (err?.message?.includes('LEAVE_TYPE_CODE_EXISTS')) {
      return res.status(409).json({ success: false, error: err.message, code: 'LEAVE_TYPE_CODE_EXISTS' });
    }
    if (err?.message?.includes('LEAVE_TYPE_NOT_FOUND')) {
      return res.status(404).json({ success: false, error: err.message, code: 'LEAVE_TYPE_NOT_FOUND' });
    }
    next(err);
  }
});

apiRouter.patch('/leave/types/:id/status', requirePermission(PermissionKey.LEAVE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { status } = req.body;
    if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Valid status (ACTIVE or INACTIVE) is required.' });
    }
    const updated = await LeaveTypeService.setLeaveTypeStatus(req.params.id, companyId, req.user!, status);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    if (err?.message?.includes('LEAVE_TYPE_NOT_FOUND')) {
      return res.status(404).json({ success: false, error: err.message, code: 'LEAVE_TYPE_NOT_FOUND' });
    }
    next(err);
  }
});

// --- 3. LEAVE POLICIES MASTER & RULES ---
apiRouter.get('/leave/policies', requirePermission(PermissionKey.LEAVE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const filters = {
      status: req.query.status as any,
      search: req.query.search as string,
    };
    const policies = await LeavePolicyService.getPolicies(companyId, filters);
    return res.json({ success: true, data: policies });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/leave/policies/:id', requirePermission(PermissionKey.LEAVE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const policy = await LeavePolicyService.getPolicyById(req.params.id, companyId);
    if (!policy) {
      return res.status(404).json({ success: false, error: 'Leave policy not found.' });
    }
    return res.json({ success: true, data: policy });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/leave/policies', requirePermission(PermissionKey.LEAVE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const created = await LeavePolicyService.createPolicy(companyId, req.user!, req.body);
    return res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    if (err?.message?.includes('LEAVE_POLICY_CODE_EXISTS')) {
      return res.status(409).json({ success: false, error: err.message, code: 'LEAVE_POLICY_CODE_EXISTS' });
    }
    if (err?.message?.includes('VALIDATION_ERROR') || err?.message?.includes('INVALID_LEAVE_POLICY')) {
      return res.status(400).json({ success: false, error: err.message, code: 'VALIDATION_ERROR' });
    }
    next(err);
  }
});

apiRouter.put('/leave/policies/:id', requirePermission(PermissionKey.LEAVE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const updated = await LeavePolicyService.updatePolicy(req.params.id, companyId, req.user!, req.body);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    if (err?.message?.includes('LEAVE_POLICY_NOT_FOUND')) {
      return res.status(404).json({ success: false, error: err.message, code: 'LEAVE_POLICY_NOT_FOUND' });
    }
    if (err?.message?.includes('LEAVE_POLICY_CODE_EXISTS')) {
      return res.status(409).json({ success: false, error: err.message, code: 'LEAVE_POLICY_CODE_EXISTS' });
    }
    next(err);
  }
});

apiRouter.patch('/leave/policies/:id/status', requirePermission(PermissionKey.LEAVE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { status } = req.body;
    if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Valid status (ACTIVE or INACTIVE) is required.' });
    }
    const updated = await LeavePolicyService.setPolicyStatus(req.params.id, companyId, req.user!, status);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    if (err?.message?.includes('LEAVE_POLICY_NOT_FOUND')) {
      return res.status(404).json({ success: false, error: err.message, code: 'LEAVE_POLICY_NOT_FOUND' });
    }
    next(err);
  }
});

// --- 4. EMPLOYEE POLICY ASSIGNMENTS ---
apiRouter.get('/leave/assignments/employee/:employeeId', requirePermission(PermissionKey.LEAVE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const history = await EmployeeLeavePolicyService.getEmployeePolicyHistory(req.params.employeeId, companyId);
    return res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/leave/assignments', requirePermission(PermissionKey.LEAVE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const assignment = await EmployeeLeavePolicyService.assignPolicy(companyId, req.user!, req.body);
    return res.status(201).json({ success: true, data: assignment });
  } catch (err: any) {
    if (err?.message?.includes('EMPLOYEE_NOT_FOUND') || err?.message?.includes('LEAVE_POLICY_NOT_FOUND')) {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err?.message?.includes('VALIDATION_ERROR') || err?.message?.includes('INACTIVE_POLICY')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
});

apiRouter.put('/leave/assignments/:id/cancel', requirePermission(PermissionKey.LEAVE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const cancelled = await EmployeeLeavePolicyService.cancelAssignment(req.params.id, companyId, req.user!);
    return res.json({ success: true, data: cancelled });
  } catch (err: any) {
    if (err?.message?.includes('ASSIGNMENT_NOT_FOUND')) {
      return res.status(404).json({ success: false, error: err.message });
    }
    next(err);
  }
});

// --- 5. DETERMINISTIC LEAVE POLICY PREVIEW & ELIGIBILITY EVALUATION ---
apiRouter.get('/leave/policy-preview', requirePermission(PermissionKey.LEAVE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const employeeId = req.query.employeeId as string;
    const asOfDate = req.query.asOfDate as string;
    const leaveTypeId = req.query.leaveTypeId as string;

    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'employeeId query parameter is required for policy evaluation.' });
    }

    const evaluation = await LeaveEligibilityService.evaluateEligibility(
      employeeId,
      companyId,
      asOfDate,
      leaveTypeId
    );
    return res.json({ success: true, data: evaluation });
  } catch (err: any) {
    if (err?.message?.includes('EMPLOYEE_NOT_FOUND')) {
      return res.status(404).json({ success: false, error: err.message });
    }
    next(err);
  }
});

// =========================================================================
// PHASE 3B: LEAVE TRANSACTIONS, BALANCES, ACCRUALS & REQUESTS
// =========================================================================

// --- 6. LEAVE BALANCES ---
apiRouter.get('/leave/balances/me', requirePermission(PermissionKey.LEAVE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const employeeId = req.user?.employeeId || req.user?.id;
    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'No employee context linked to current session.' });
    }
    const balances = await LeaveLedgerService.getEmployeeBalances(employeeId, companyId, req.query.leaveYearId as string);
    return res.json({ success: true, data: balances });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/leave/me/balances', requirePermission(PermissionKey.LEAVE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const employeeId = req.user?.employeeId || req.user?.id;
    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'No employee context linked to current session.' });
    }
    const balances = await LeaveLedgerService.getEmployeeBalances(employeeId, companyId, req.query.leaveYearId as string);
    return res.json({ success: true, data: balances });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/leave/balances/employee/:employeeId', requirePermission(PermissionKey.LEAVE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const balances = await LeaveLedgerService.getEmployeeBalances(req.params.employeeId, companyId, req.query.leaveYearId as string);
    return res.json({ success: true, data: balances });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/leave/balances/opening', requirePermission(PermissionKey.LEAVE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const result = await LeaveLedgerService.postOpeningBalance(companyId, req.user!, req.body);
    return res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    if (err?.code === 'DUPLICATE_OPENING_BALANCE') {
      return res.status(409).json({ success: false, error: err.message, code: err.code });
    }
    if (err?.code === 'EMPLOYEE_NOT_FOUND' || err?.code === 'LEAVE_TYPE_NOT_FOUND') {
      return res.status(404).json({ success: false, error: err.message, code: err.code });
    }
    next(err);
  }
});

apiRouter.post('/leave/balances/adjust', requirePermission(PermissionKey.LEAVE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const result = await LeaveLedgerService.postManualAdjustment(companyId, req.user!, req.body);
    return res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    if (err?.code === 'EMPLOYEE_NOT_FOUND' || err?.code === 'LEAVE_TYPE_NOT_FOUND') {
      return res.status(404).json({ success: false, error: err.message, code: err.code });
    }
    next(err);
  }
});

apiRouter.post('/leave/balances/rebuild', requirePermission(PermissionKey.LEAVE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { employeeId, leaveTypeId, leaveYearId } = req.body;
    if (!employeeId || !leaveTypeId || !leaveYearId) {
      return res.status(400).json({ success: false, error: 'employeeId, leaveTypeId, and leaveYearId are required.' });
    }
    const balance = await LeaveLedgerService.rebuildEmployeeLeaveBalance(employeeId, leaveTypeId, leaveYearId, companyId);
    return res.json({ success: true, data: balance });
  } catch (err) {
    next(err);
  }
});

// --- 7. IMMUTABLE LEAVE LEDGER ---
apiRouter.get('/leave/ledger', requirePermission(PermissionKey.LEAVE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const isSuperAdmin = req.user?.role === UserRole.SUPER_ADMIN;
    const isHrAdmin = req.user?.role === UserRole.HR_ADMIN || req.user?.permissions?.includes(PermissionKey.LEAVE_MANAGE);

    let employeeId = req.query.employeeId as string | undefined;
    if (!isSuperAdmin && !isHrAdmin) {
      employeeId = req.user?.employeeId || req.user?.id;
    }

    const filter = {
      employeeId,
      leaveTypeId: req.query.leaveTypeId as string | undefined,
      leaveYearId: req.query.leaveYearId as string | undefined,
      transactionType: req.query.transactionType as any,
      fromDate: req.query.fromDate as string | undefined,
      toDate: req.query.toDate as string | undefined,
      referenceType: req.query.referenceType as string | undefined,
      referenceId: req.query.referenceId as string | undefined,
    };

    const entries = await LeaveLedgerService.getLedgerHistory(companyId, filter);
    return res.json({ success: true, data: entries });
  } catch (err) {
    next(err);
  }
});

// --- 8. LEAVE ACCRUAL ENGINE ---
apiRouter.post('/leave/accruals/run', requirePermission(PermissionKey.LEAVE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const result = await LeaveAccrualService.runAccrual(companyId, req.user!, req.body);
    return res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    if (err?.code === 'ACCRUAL_ALREADY_PROCESSED') {
      return res.status(409).json({ success: false, error: err.message, code: err.code });
    }
    next(err);
  }
});

apiRouter.get('/leave/accruals/logs', requirePermission(PermissionKey.LEAVE_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const logs = await LeaveAccrualService.getLogs(companyId, req.query.accrualPeriod as string);
    return res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
});

// --- 9. DURATION & BREAKDOWN CALCULATION ---
apiRouter.post('/leave/calculate', requirePermission(PermissionKey.LEAVE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    let employeeId = req.body.employeeId;
    if (!employeeId) {
      employeeId = req.user?.employeeId || req.user?.id;
    }

    const calcResult = await LeaveCalculationService.calculateLeave(companyId, {
      ...req.body,
      employeeId,
    });
    return res.json({ success: true, data: calcResult });
  } catch (err: any) {
    if (err?.code === 'EMPLOYEE_NOT_FOUND' || err?.code === 'LEAVE_TYPE_NOT_FOUND') {
      return res.status(404).json({ success: false, error: err.message, code: err.code });
    }
    next(err);
  }
});

// --- 10. LEAVE REQUESTS MASTER ---
apiRouter.get('/leave/requests', requirePermission(PermissionKey.LEAVE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const filter = {
      employeeId: req.query.employeeId as string | undefined,
      leaveTypeId: req.query.leaveTypeId as string | undefined,
      leaveYearId: req.query.leaveYearId as string | undefined,
      status: req.query.status as any,
      fromDate: req.query.fromDate as string | undefined,
      toDate: req.query.toDate as string | undefined,
      search: req.query.search as string | undefined,
      scope: req.query.scope as 'me' | 'team' | 'company' | undefined,
    };

    const requests = await LeaveRequestService.getRequests(companyId, req.user!, filter);
    return res.json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/leave/requests/:id', requirePermission(PermissionKey.LEAVE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const request = await LeaveRequestRepository.findById(req.params.id, companyId);
    if (!request) {
      return res.status(404).json({ success: false, error: `Leave request '${req.params.id}' not found.`, code: 'LEAVE_REQUEST_NOT_FOUND' });
    }
    return res.json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/leave/requests', requirePermission(PermissionKey.LEAVE_APPLY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const created = await LeaveRequestService.createRequest(companyId, req.user!, req.body);
    return res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    if (err?.code === 'OVERLAPPING_LEAVE_REQUEST') {
      return res.status(409).json({ success: false, error: err.message, code: err.code });
    }
    if (
      err?.code === 'INSUFFICIENT_LEAVE_BALANCE' ||
      err?.code === 'NEGATIVE_BALANCE_LIMIT_EXCEEDED' ||
      err?.code === 'ATTACHMENT_REQUIRED' ||
      err?.code === 'INELIGIBLE_LEAVE_APPLICATION' ||
      err?.code === 'INVALID_DATE_RANGE' ||
      err?.code === 'ZERO_CHARGEABLE_DAYS'
    ) {
      return res.status(400).json({ success: false, error: err.message, code: err.code });
    }
    if (err?.code === 'EMPLOYEE_NOT_FOUND' || err?.code === 'LEAVE_TYPE_NOT_FOUND') {
      return res.status(404).json({ success: false, error: err.message, code: err.code });
    }
    next(err);
  }
});

apiRouter.post('/leave/requests/:id/action', requirePermission(PermissionKey.LEAVE_APPROVE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const result = await LeaveRequestService.actionRequest(req.params.id, companyId, req.user!, req.body);
    return res.json({ success: true, data: result });
  } catch (err: any) {
    if (err?.code === 'LEAVE_REQUEST_NOT_FOUND') {
      return res.status(404).json({ success: false, error: err.message, code: err.code });
    }
    if (err?.code === 'UNAUTHORIZED_APPROVER') {
      return res.status(403).json({ success: false, error: err.message, code: err.code });
    }
    if (err?.code === 'INVALID_REQUEST_STATUS' || err?.code === 'INVALID_ACTION') {
      return res.status(400).json({ success: false, error: err.message, code: err.code });
    }
    next(err);
  }
});

apiRouter.post('/leave/requests/:id/cancel', requirePermission(PermissionKey.LEAVE_APPLY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const result = await LeaveRequestService.cancelRequest(req.params.id, companyId, req.user!, req.body);
    return res.json({ success: true, data: result });
  } catch (err: any) {
    if (err?.code === 'LEAVE_REQUEST_NOT_FOUND') {
      return res.status(404).json({ success: false, error: err.message, code: err.code });
    }
    if (err?.code === 'FORBIDDEN_CANCELLATION') {
      return res.status(403).json({ success: false, error: err.message, code: err.code });
    }
    if (err?.code === 'INVALID_REQUEST_STATUS') {
      return res.status(400).json({ success: false, error: err.message, code: err.code });
    }
    next(err);
  }
});

// --- 11. TEAM LEAVE CALENDAR ---
apiRouter.get('/leave/calendar', requirePermission(PermissionKey.LEAVE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const startDate = (req.query.startDate as string) || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const endDate = (req.query.endDate as string) || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);
    const departmentId = req.query.departmentId as string | undefined;

    const events = await LeaveRequestService.getTeamCalendar(companyId, req.user!, startDate, endDate, departmentId);
    return res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// PHASE 3C: LEAVE ↔ ATTENDANCE RECONCILIATION & PAYROLL EXPORT
// =========================================================================

// Reconcile a single employee date
apiRouter.post('/reconciliation/reconcile-date', requirePermission(PermissionKey.ATTENDANCE_PERIOD_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { employeeId, date } = req.body;
    if (!employeeId || !date) {
      return res.status(400).json({ success: false, error: 'employeeId and date (YYYY-MM-DD) are required.' });
    }
    const result = await LeaveAttendanceReconciliationService.reconcileEmployeeDate(companyId, employeeId, date, {
      actor: getActor(req),
    });
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// Reconcile entire attendance period
apiRouter.post('/reconciliation/reconcile-period', requirePermission(PermissionKey.ATTENDANCE_PERIOD_FINALIZE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { periodId } = req.body;
    if (!periodId) {
      return res.status(400).json({ success: false, error: 'periodId is required.' });
    }
    const result = await LeaveAttendanceReconciliationService.reconcilePeriod(companyId, periodId, getActor(req));
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// Get employee date-by-date reconciliation trace & explanations
apiRouter.get('/reconciliation/employee-trace', requirePermission(PermissionKey.ATTENDANCE_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const employeeId = (req.query.employeeId as string) || req.user?.id;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    if (!employeeId || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'employeeId, startDate, and endDate are required.' });
    }

    const traces = await LeaveAttendanceReconciliationService.getEmployeeReconciliations(
      companyId,
      employeeId,
      startDate,
      endDate
    );
    return res.json({ success: true, data: traces });
  } catch (err) {
    next(err);
  }
});

// Get all active reconciliation conflicts in a date range
apiRouter.get('/reconciliation/conflicts', requirePermission(PermissionKey.ATTENDANCE_PERIOD_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const startDate = (req.query.startDate as string) || '2026-01-01';
    const endDate = (req.query.endDate as string) || '2026-12-31';

    const conflicts = await LeaveAttendanceReconciliationRepository.findConflicts(companyId, startDate, endDate);
    return res.json({ success: true, data: conflicts });
  } catch (err) {
    next(err);
  }
});

// Get finalized Time & Leave Snapshots for an attendance period
apiRouter.get('/reconciliation/snapshots/:periodId', requirePermission(PermissionKey.ATTENDANCE_PERIOD_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { periodId } = req.params;
    const snapshots = await TimeLeavePeriodSnapshotRepository.findVersionsByPeriod(periodId, companyId);
    return res.json({ success: true, data: snapshots });
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// PHASE 4A: PAYROLL CONFIGURATION & EMPLOYEE COMPENSATION
// =========================================================================

// --- 1. Salary Components Master ---
apiRouter.get('/payroll/components', requirePermission(PermissionKey.PAYROLL_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { type, isActive, search } = req.query;
    const components = await PayrollConfigService.getSalaryComponents(companyId, {
      type: type as any,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search: search as string,
    });
    return res.json({ success: true, data: components });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/payroll/components/:id', requirePermission(PermissionKey.PAYROLL_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const component = await PayrollConfigService.getSalaryComponentById(id, companyId);
    if (!component) {
      return res.status(404).json({ success: false, error: 'Salary component not found.', code: 'COMPONENT_NOT_FOUND' });
    }
    return res.json({ success: true, data: component });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/payroll/components', requirePermission(PermissionKey.PAYROLL_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const actor = getActor(req);
    const created = await PayrollConfigService.createSalaryComponent(companyId, req.body, actor);
    return res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    if (err.message?.includes('SALARY_COMPONENT_CODE_EXISTS')) {
      return res.status(409).json({ success: false, error: err.message, code: 'SALARY_COMPONENT_CODE_EXISTS' });
    }
    next(err);
  }
});

apiRouter.put('/payroll/components/:id', requirePermission(PermissionKey.PAYROLL_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const actor = getActor(req);
    const updated = await PayrollConfigService.updateSalaryComponent(id, companyId, req.body, actor);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    if (err.message?.includes('SALARY_COMPONENT_NOT_FOUND')) {
      return res.status(404).json({ success: false, error: err.message, code: 'SALARY_COMPONENT_NOT_FOUND' });
    }
    if (err.message?.includes('SALARY_COMPONENT_CODE_EXISTS')) {
      return res.status(409).json({ success: false, error: err.message, code: 'SALARY_COMPONENT_CODE_EXISTS' });
    }
    next(err);
  }
});

apiRouter.delete('/payroll/components/:id', requirePermission(PermissionKey.PAYROLL_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const actor = getActor(req);
    await PayrollConfigService.deleteSalaryComponent(id, companyId, actor);
    return res.json({ success: true, message: 'Salary component deleted successfully.' });
  } catch (err: any) {
    if (err.message?.includes('COMPONENT_IN_USE')) {
      return res.status(400).json({ success: false, error: err.message, code: 'COMPONENT_IN_USE' });
    }
    next(err);
  }
});

// --- 2. Salary Structures Master ---
apiRouter.get('/payroll/structures', requirePermission(PermissionKey.PAYROLL_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { isActive, search } = req.query;
    const structures = await PayrollConfigService.getSalaryStructures(companyId, {
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search: search as string,
    });
    return res.json({ success: true, data: structures });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/payroll/structures/:id', requirePermission(PermissionKey.PAYROLL_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const structure = await PayrollConfigService.getSalaryStructureById(id, companyId);
    if (!structure) {
      return res.status(404).json({ success: false, error: 'Salary structure not found.', code: 'STRUCTURE_NOT_FOUND' });
    }
    return res.json({ success: true, data: structure });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/payroll/structures', requirePermission(PermissionKey.PAYROLL_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const actor = getActor(req);
    const { components = [], ...structureData } = req.body;
    const created = await PayrollConfigService.createSalaryStructure(companyId, structureData, components, actor);
    return res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    if (err.message?.includes('SALARY_STRUCTURE_CODE_EXISTS')) {
      return res.status(409).json({ success: false, error: err.message, code: 'SALARY_STRUCTURE_CODE_EXISTS' });
    }
    if (err.message?.includes('Duplicate salary component') || err.message?.includes('not found')) {
      return res.status(400).json({ success: false, error: err.message, code: 'INVALID_STRUCTURE_DEFINITION' });
    }
    next(err);
  }
});

apiRouter.put('/payroll/structures/:id', requirePermission(PermissionKey.PAYROLL_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const actor = getActor(req);
    const { components, ...structureData } = req.body;
    const updated = await PayrollConfigService.updateSalaryStructure(id, companyId, structureData, components, actor);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    if (err.message?.includes('SALARY_STRUCTURE_NOT_FOUND')) {
      return res.status(404).json({ success: false, error: err.message, code: 'SALARY_STRUCTURE_NOT_FOUND' });
    }
    if (err.message?.includes('SALARY_STRUCTURE_CODE_EXISTS')) {
      return res.status(409).json({ success: false, error: err.message, code: 'SALARY_STRUCTURE_CODE_EXISTS' });
    }
    next(err);
  }
});

apiRouter.delete('/payroll/structures/:id', requirePermission(PermissionKey.PAYROLL_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const actor = getActor(req);
    await PayrollConfigService.deleteSalaryStructure(id, companyId, actor);
    return res.json({ success: true, message: 'Salary structure deleted successfully.' });
  } catch (err: any) {
    if (err.message?.includes('STRUCTURE_IN_USE')) {
      return res.status(400).json({ success: false, error: err.message, code: 'STRUCTURE_IN_USE' });
    }
    next(err);
  }
});

// --- 3. Payroll Calendars & Periods ---
apiRouter.get('/payroll/calendars', requirePermission(PermissionKey.PAYROLL_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { year, isActive, search } = req.query;
    const calendars = await PayrollConfigService.getPayrollCalendars(companyId, {
      year: year ? parseInt(year as string, 10) : undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search: search as string,
    });
    return res.json({ success: true, data: calendars });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/payroll/calendars/:id', requirePermission(PermissionKey.PAYROLL_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const calendar = await PayrollConfigService.getPayrollCalendarById(id, companyId);
    if (!calendar) {
      return res.status(404).json({ success: false, error: 'Payroll calendar not found.', code: 'CALENDAR_NOT_FOUND' });
    }
    return res.json({ success: true, data: calendar });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/payroll/calendars', requirePermission(PermissionKey.PAYROLL_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const actor = getActor(req);
    const { periods, ...calData } = req.body;
    const created = await PayrollConfigService.createPayrollCalendar(companyId, calData, periods, actor);
    return res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    if (err.message?.includes('PAYROLL_CALENDAR_CODE_EXISTS')) {
      return res.status(409).json({ success: false, error: err.message, code: 'PAYROLL_CALENDAR_CODE_EXISTS' });
    }
    next(err);
  }
});

apiRouter.patch('/payroll/periods/:id/status', requirePermission(PermissionKey.PAYROLL_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const { status } = req.body;
    const actor = getActor(req);
    const updated = await PayrollConfigService.updatePeriodStatus(id, companyId, status, actor);
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// --- 4. Employee Compensation Assignments (Sensitive Access Control) ---
apiRouter.get('/payroll/compensations', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const actor = getActor(req);
    const { status, salaryStructureId, search } = req.query;
    const list = await EmployeeCompensationService.getAllCompensations(
      companyId,
      {
        status: status as any,
        salaryStructureId: salaryStructureId as string,
        search: search as string,
      },
      actor
    );
    return res.json({ success: true, data: list });
  } catch (err: any) {
    if (err.message?.includes('FORBIDDEN_COMPENSATION_ACCESS')) {
      return res.status(403).json({ success: false, error: err.message, code: 'FORBIDDEN_COMPENSATION_ACCESS' });
    }
    next(err);
  }
});

apiRouter.get('/payroll/compensations/employee/:employeeId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { employeeId } = req.params;
    const actor = getActor(req);
    const history = await EmployeeCompensationService.getCompensationsByEmployee(employeeId, companyId, actor);
    return res.json({ success: true, data: history });
  } catch (err: any) {
    if (err.message?.includes('FORBIDDEN_COMPENSATION_ACCESS')) {
      return res.status(403).json({ success: false, error: err.message, code: 'FORBIDDEN_COMPENSATION_ACCESS' });
    }
    next(err);
  }
});

apiRouter.get('/payroll/compensations/employee/:employeeId/current', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { employeeId } = req.params;
    const { asOfDate } = req.query;
    const actor = getActor(req);
    const current = await EmployeeCompensationService.getCurrentCompensation(employeeId, companyId, asOfDate as string, actor);
    return res.json({ success: true, data: current });
  } catch (err: any) {
    if (err.message?.includes('FORBIDDEN_COMPENSATION_ACCESS')) {
      return res.status(403).json({ success: false, error: err.message, code: 'FORBIDDEN_COMPENSATION_ACCESS' });
    }
    next(err);
  }
});

apiRouter.get('/payroll/compensations/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const actor = getActor(req);
    const record = await EmployeeCompensationService.getCompensationById(id, companyId, actor);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Compensation record not found.', code: 'COMPENSATION_NOT_FOUND' });
    }
    return res.json({ success: true, data: record });
  } catch (err: any) {
    if (err.message?.includes('FORBIDDEN_COMPENSATION_ACCESS')) {
      return res.status(403).json({ success: false, error: err.message, code: 'FORBIDDEN_COMPENSATION_ACCESS' });
    }
    next(err);
  }
});

apiRouter.post('/payroll/compensations', requirePermission(PermissionKey.PAYROLL_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const actor = getActor(req);
    const { overrides = [], ...assignmentData } = req.body;
    const created = await EmployeeCompensationService.assignCompensation(companyId, assignmentData, overrides, actor);
    return res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    if (err.message?.includes('FORBIDDEN_COMPENSATION_MANAGE')) {
      return res.status(403).json({ success: false, error: err.message, code: 'FORBIDDEN_COMPENSATION_MANAGE' });
    }
    if (err.message?.includes('COMPENSATION_OVERLAP_ERROR') || err.message?.includes('OVERRIDE_NOT_ALLOWED')) {
      return res.status(400).json({ success: false, error: err.message, code: 'INVALID_COMPENSATION_DATA' });
    }
    next(err);
  }
});

apiRouter.put('/payroll/compensations/:id', requirePermission(PermissionKey.PAYROLL_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const actor = getActor(req);
    const { overrides, ...updateData } = req.body;
    const updated = await EmployeeCompensationService.updateCompensation(id, companyId, updateData, overrides, actor);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    if (err.message?.includes('FORBIDDEN_COMPENSATION_MANAGE')) {
      return res.status(403).json({ success: false, error: err.message, code: 'FORBIDDEN_COMPENSATION_MANAGE' });
    }
    next(err);
  }
});

apiRouter.post('/payroll/compensations/:id/cancel', requirePermission(PermissionKey.PAYROLL_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const actor = getActor(req);
    await EmployeeCompensationService.cancelCompensation(id, companyId, actor);
    return res.json({ success: true, message: 'Compensation record cancelled.' });
  } catch (err: any) {
    next(err);
  }
});

// Get specific finalized Time & Leave Snapshot for payroll export
apiRouter.get('/reconciliation/snapshot/:periodId/version/:version', requirePermission(PermissionKey.ATTENDANCE_PERIOD_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { periodId, version } = req.params;
    const snapshot = await TimeLeavePeriodSnapshotRepository.findByPeriodAndVersion(
      periodId,
      parseInt(version, 10),
      companyId
    );
    if (!snapshot) {
      return res.status(404).json({ success: false, error: 'Snapshot version not found.' });
    }
    return res.json({ success: true, data: snapshot });
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// DOCUMENT 4 CANONICAL PAYROLL-READY TIME & LEAVE CONSUMPTION API
// =========================================================================
apiRouter.get('/time-payroll/periods/:periodId/summary', requirePermission(PermissionKey.ATTENDANCE_PERIOD_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { periodId } = req.params;
    const versionQuery = req.query.version as string | undefined;

    const period = await AttendancePeriodRepository.findById(periodId, companyId);
    if (!period) {
      return res.status(404).json({ success: false, error: `Attendance period '${periodId}' not found.`, code: 'ATTENDANCE_PERIOD_NOT_FOUND' });
    }

    if (period.status !== 'FINALIZED' && period.status !== 'LOCKED') {
      return res.status(400).json({
        success: false,
        error: `Attendance period '${period.name}' is currently in '${period.status}' status. Authoritative payroll consumption requires a FINALIZED period snapshot.`,
        code: 'ATTENDANCE_PERIOD_NOT_FINALIZED',
      });
    }

    let snapshot: any = null;
    if (versionQuery) {
      snapshot = await TimeLeavePeriodSnapshotRepository.findByPeriodAndVersion(periodId, parseInt(versionQuery, 10), companyId);
    } else {
      snapshot = await TimeLeavePeriodSnapshotRepository.findLatestSnapshot(periodId, companyId);
    }

    if (!snapshot) {
      return res.status(404).json({
        success: false,
        error: `Finalized Time & Leave snapshot not found for period '${periodId}' (Version: ${versionQuery || 'latest'}).`,
        code: 'SNAPSHOT_NOT_FOUND',
      });
    }

    return res.json({
      success: true,
      data: {
        periodId: snapshot.periodId,
        periodName: period.name,
        companyId: snapshot.companyId,
        version: snapshot.version,
        status: snapshot.status,
        finalizedAt: snapshot.finalizedAt,
        finalizedBy: snapshot.finalizedBy,
        finalizedByName: snapshot.finalizedByName,
        summariesCount: snapshot.summariesCount,
        summaries: snapshot.summaries,
      },
    });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/time-payroll/periods/:periodId/snapshots', requirePermission(PermissionKey.ATTENDANCE_PERIOD_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { periodId } = req.params;
    const snapshots = await TimeLeavePeriodSnapshotRepository.findVersionsByPeriod(periodId, companyId);
    return res.json({ success: true, data: snapshots });
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// PHASE 4A: PAYROLL CONFIGURATION & EMPLOYEE COMPENSATION
// =========================================================================

// --- 1. Salary Components Master ---
apiRouter.get('/payroll/components', requirePermission(PermissionKey.PAYROLL_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { type, isActive, search } = req.query;
    const components = await PayrollConfigService.getSalaryComponents(companyId, {
      type: type as any,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search: search as string,
    });
    return res.json({ success: true, data: components });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/payroll/components/:id', requirePermission(PermissionKey.PAYROLL_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const component = await PayrollConfigService.getSalaryComponentById(id, companyId);
    if (!component) {
      return res.status(404).json({ success: false, error: 'Salary component not found.', code: 'COMPONENT_NOT_FOUND' });
    }
    return res.json({ success: true, data: component });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/payroll/components', requirePermission(PermissionKey.PAYROLL_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const actor = getActor(req);
    const created = await PayrollConfigService.createSalaryComponent(companyId, req.body, actor);
    return res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    if (err.message?.includes('SALARY_COMPONENT_CODE_EXISTS')) {
      return res.status(409).json({ success: false, error: err.message, code: 'SALARY_COMPONENT_CODE_EXISTS' });
    }
    next(err);
  }
});

apiRouter.put('/payroll/components/:id', requirePermission(PermissionKey.PAYROLL_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const actor = getActor(req);
    const updated = await PayrollConfigService.updateSalaryComponent(id, companyId, req.body, actor);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    if (err.message?.includes('SALARY_COMPONENT_NOT_FOUND')) {
      return res.status(404).json({ success: false, error: err.message, code: 'SALARY_COMPONENT_NOT_FOUND' });
    }
    if (err.message?.includes('SALARY_COMPONENT_CODE_EXISTS')) {
      return res.status(409).json({ success: false, error: err.message, code: 'SALARY_COMPONENT_CODE_EXISTS' });
    }
    next(err);
  }
});

apiRouter.delete('/payroll/components/:id', requirePermission(PermissionKey.PAYROLL_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const actor = getActor(req);
    await PayrollConfigService.deleteSalaryComponent(id, companyId, actor);
    return res.json({ success: true, message: 'Salary component deleted successfully.' });
  } catch (err: any) {
    if (err.message?.includes('COMPONENT_IN_USE')) {
      return res.status(400).json({ success: false, error: err.message, code: 'COMPONENT_IN_USE' });
    }
    next(err);
  }
});

// --- 2. Salary Structures Master ---
apiRouter.get('/payroll/structures', requirePermission(PermissionKey.PAYROLL_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { isActive, search } = req.query;
    const structures = await PayrollConfigService.getSalaryStructures(companyId, {
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search: search as string,
    });
    return res.json({ success: true, data: structures });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/payroll/structures/:id', requirePermission(PermissionKey.PAYROLL_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const structure = await PayrollConfigService.getSalaryStructureById(id, companyId);
    if (!structure) {
      return res.status(404).json({ success: false, error: 'Salary structure not found.', code: 'STRUCTURE_NOT_FOUND' });
    }
    return res.json({ success: true, data: structure });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/payroll/structures', requirePermission(PermissionKey.PAYROLL_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const actor = getActor(req);
    const { components = [], ...structureData } = req.body;
    const created = await PayrollConfigService.createSalaryStructure(companyId, structureData, components, actor);
    return res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    if (err.message?.includes('SALARY_STRUCTURE_CODE_EXISTS')) {
      return res.status(409).json({ success: false, error: err.message, code: 'SALARY_STRUCTURE_CODE_EXISTS' });
    }
    if (err.message?.includes('Duplicate salary component') || err.message?.includes('not found')) {
      return res.status(400).json({ success: false, error: err.message, code: 'INVALID_STRUCTURE_DEFINITION' });
    }
    next(err);
  }
});

apiRouter.put('/payroll/structures/:id', requirePermission(PermissionKey.PAYROLL_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const actor = getActor(req);
    const { components, ...structureData } = req.body;
    const updated = await PayrollConfigService.updateSalaryStructure(id, companyId, structureData, components, actor);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    if (err.message?.includes('SALARY_STRUCTURE_NOT_FOUND')) {
      return res.status(404).json({ success: false, error: err.message, code: 'SALARY_STRUCTURE_NOT_FOUND' });
    }
    if (err.message?.includes('SALARY_STRUCTURE_CODE_EXISTS')) {
      return res.status(409).json({ success: false, error: err.message, code: 'SALARY_STRUCTURE_CODE_EXISTS' });
    }
    next(err);
  }
});

apiRouter.delete('/payroll/structures/:id', requirePermission(PermissionKey.PAYROLL_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const actor = getActor(req);
    await PayrollConfigService.deleteSalaryStructure(id, companyId, actor);
    return res.json({ success: true, message: 'Salary structure deleted successfully.' });
  } catch (err: any) {
    if (err.message?.includes('STRUCTURE_IN_USE')) {
      return res.status(400).json({ success: false, error: err.message, code: 'STRUCTURE_IN_USE' });
    }
    next(err);
  }
});

// --- 3. Payroll Calendars & Periods ---
apiRouter.get('/payroll/calendars', requirePermission(PermissionKey.PAYROLL_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { year, isActive, search } = req.query;
    const calendars = await PayrollConfigService.getPayrollCalendars(companyId, {
      year: year ? parseInt(year as string, 10) : undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search: search as string,
    });
    return res.json({ success: true, data: calendars });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/payroll/calendars/:id', requirePermission(PermissionKey.PAYROLL_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const calendar = await PayrollConfigService.getPayrollCalendarById(id, companyId);
    if (!calendar) {
      return res.status(404).json({ success: false, error: 'Payroll calendar not found.', code: 'CALENDAR_NOT_FOUND' });
    }
    return res.json({ success: true, data: calendar });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/payroll/calendars', requirePermission(PermissionKey.PAYROLL_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const actor = getActor(req);
    const { periods, ...calData } = req.body;
    const created = await PayrollConfigService.createPayrollCalendar(companyId, calData, periods, actor);
    return res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    if (err.message?.includes('PAYROLL_CALENDAR_CODE_EXISTS')) {
      return res.status(409).json({ success: false, error: err.message, code: 'PAYROLL_CALENDAR_CODE_EXISTS' });
    }
    next(err);
  }
});

apiRouter.patch('/payroll/periods/:id/status', requirePermission(PermissionKey.PAYROLL_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const { status } = req.body;
    const actor = getActor(req);
    const updated = await PayrollConfigService.updatePeriodStatus(id, companyId, status, actor);
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// --- 4. Employee Compensation Assignments (Sensitive Access Control) ---
apiRouter.get('/payroll/compensations', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const actor = getActor(req);
    const { status, salaryStructureId, search } = req.query;
    const list = await EmployeeCompensationService.getAllCompensations(
      companyId,
      {
        status: status as any,
        salaryStructureId: salaryStructureId as string,
        search: search as string,
      },
      actor
    );
    return res.json({ success: true, data: list });
  } catch (err: any) {
    if (err.message?.includes('FORBIDDEN_COMPENSATION_ACCESS')) {
      return res.status(403).json({ success: false, error: err.message, code: 'FORBIDDEN_COMPENSATION_ACCESS' });
    }
    next(err);
  }
});

apiRouter.get('/payroll/compensations/employee/:employeeId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { employeeId } = req.params;
    const actor = getActor(req);
    const history = await EmployeeCompensationService.getCompensationsByEmployee(employeeId, companyId, actor);
    return res.json({ success: true, data: history });
  } catch (err: any) {
    if (err.message?.includes('FORBIDDEN_COMPENSATION_ACCESS')) {
      return res.status(403).json({ success: false, error: err.message, code: 'FORBIDDEN_COMPENSATION_ACCESS' });
    }
    next(err);
  }
});

apiRouter.get('/payroll/compensations/employee/:employeeId/current', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { employeeId } = req.params;
    const { asOfDate } = req.query;
    const actor = getActor(req);
    const current = await EmployeeCompensationService.getCurrentCompensation(employeeId, companyId, asOfDate as string, actor);
    return res.json({ success: true, data: current });
  } catch (err: any) {
    if (err.message?.includes('FORBIDDEN_COMPENSATION_ACCESS')) {
      return res.status(403).json({ success: false, error: err.message, code: 'FORBIDDEN_COMPENSATION_ACCESS' });
    }
    next(err);
  }
});

apiRouter.get('/payroll/compensations/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const actor = getActor(req);
    const record = await EmployeeCompensationService.getCompensationById(id, companyId, actor);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Compensation record not found.', code: 'COMPENSATION_NOT_FOUND' });
    }
    return res.json({ success: true, data: record });
  } catch (err: any) {
    if (err.message?.includes('FORBIDDEN_COMPENSATION_ACCESS')) {
      return res.status(403).json({ success: false, error: err.message, code: 'FORBIDDEN_COMPENSATION_ACCESS' });
    }
    next(err);
  }
});

apiRouter.post('/payroll/compensations', requirePermission(PermissionKey.PAYROLL_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const actor = getActor(req);
    const { overrides = [], ...assignmentData } = req.body;
    const created = await EmployeeCompensationService.assignCompensation(companyId, assignmentData, overrides, actor);
    return res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    if (err.message?.includes('FORBIDDEN_COMPENSATION_MANAGE')) {
      return res.status(403).json({ success: false, error: err.message, code: 'FORBIDDEN_COMPENSATION_MANAGE' });
    }
    if (err.message?.includes('COMPENSATION_OVERLAP_ERROR') || err.message?.includes('OVERRIDE_NOT_ALLOWED')) {
      return res.status(400).json({ success: false, error: err.message, code: 'INVALID_COMPENSATION_DATA' });
    }
    next(err);
  }
});

apiRouter.put('/payroll/compensations/:id', requirePermission(PermissionKey.PAYROLL_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const actor = getActor(req);
    const { overrides, ...updateData } = req.body;
    const updated = await EmployeeCompensationService.updateCompensation(id, companyId, updateData, overrides, actor);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    if (err.message?.includes('FORBIDDEN_COMPENSATION_MANAGE')) {
      return res.status(403).json({ success: false, error: err.message, code: 'FORBIDDEN_COMPENSATION_MANAGE' });
    }
    next(err);
  }
});

apiRouter.post('/payroll/compensations/:id/cancel', requirePermission(PermissionKey.PAYROLL_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const actor = getActor(req);
    await EmployeeCompensationService.cancelCompensation(id, companyId, actor);
    return res.json({ success: true, message: 'Compensation record cancelled.' });
  } catch (err: any) {
    next(err);
  }
});

// =========================================================================
// PHASE 4B: PAYROLL CALCULATION ENGINE ENDPOINTS
// =========================================================================

/**
 * List all payroll runs
 */
apiRouter.get('/payroll/runs', requirePermission(PermissionKey.PAYROLL_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { status, periodId } = req.query;
    let runs = await PayrollRunRepository.findAll(companyId, status as any);
    if (periodId) {
      runs = runs.filter((r) => r.payrollPeriodId === periodId);
    }
    return res.json({ success: true, data: runs });
  } catch (err: any) {
    next(err);
  }
});

/**
 * Get Payroll Run Details & Summary (including employees and exceptions)
 */
apiRouter.get('/payroll/runs/:id', requirePermission(PermissionKey.PAYROLL_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const summary = await PayrollCalculationService.getPayrollRunSummary(id, companyId);
    if (!summary) {
      return res.status(404).json({ success: false, error: 'Payroll run not found.', code: 'PAYROLL_RUN_NOT_FOUND' });
    }
    return res.json({ success: true, data: summary });
  } catch (err: any) {
    next(err);
  }
});

/**
 * Initiate & Execute Deterministic Payroll Run Calculation
 */
apiRouter.post('/payroll/runs/calculate', requirePermission(PermissionKey.PAYROLL_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const actor = getActor(req);
    const { payrollPeriodId, attendanceSnapshotId, notes } = req.body;

    if (!payrollPeriodId) {
      return res.status(400).json({ success: false, error: 'payrollPeriodId is required.', code: 'MISSING_PERIOD_ID' });
    }

    const summary = await PayrollCalculationService.calculatePayrollRun(
      companyId,
      { payrollPeriodId, attendanceSnapshotId, notes },
      actor
    );

    return res.status(201).json({ success: true, data: summary });
  } catch (err: any) {
    if (err.message?.includes('PAYROLL_BLOCKED') || err.message?.includes('FINALIZED')) {
      return res.status(400).json({ success: false, error: err.message, code: 'ATTENDANCE_SNAPSHOT_NOT_FINALIZED' });
    }
    next(err);
  }
});

/**
 * Recalculate full payroll run while DRAFT
 */
apiRouter.post('/payroll/runs/:id/recalculate', requirePermission(PermissionKey.PAYROLL_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const actor = getActor(req);

    const run = await PayrollRunRepository.findById(id, companyId);
    if (!run) {
      return res.status(404).json({ success: false, error: 'Payroll run not found.', code: 'PAYROLL_RUN_NOT_FOUND' });
    }

    const summary = await PayrollCalculationService.calculatePayrollRun(
      companyId,
      { payrollPeriodId: run.payrollPeriodId, attendanceSnapshotId: run.attendanceSnapshotId, notes: run.notes },
      actor
    );

    return res.json({ success: true, data: summary });
  } catch (err: any) {
    next(err);
  }
});

/**
 * Recalculate single employee within a payroll run
 */
apiRouter.post('/payroll/runs/:id/employees/:employeeId/recalculate', requirePermission(PermissionKey.PAYROLL_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id, employeeId } = req.params;
    const actor = getActor(req);

    const updatedEmp = await PayrollCalculationService.recalculateEmployee(id, employeeId, companyId, actor);
    return res.json({ success: true, data: updatedEmp });
  } catch (err: any) {
    next(err);
  }
});

/**
 * Update Payroll Run Status (DRAFT -> REVIEW -> APPROVED)
 */
apiRouter.patch('/payroll/runs/:id/status', requirePermission(PermissionKey.PAYROLL_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const { status } = req.body;
    const actor = getActor(req);

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required.', code: 'MISSING_STATUS' });
    }

    const updated = await PayrollCalculationService.updateRunStatus(id, companyId, status, actor);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    next(err);
  }
});

/**
 * Delete a DRAFT Payroll Run
 */
apiRouter.delete('/payroll/runs/:id', requirePermission(PermissionKey.PAYROLL_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const run = await PayrollRunRepository.findById(id, companyId);
    if (!run) {
      return res.status(404).json({ success: false, error: 'Payroll run not found.', code: 'PAYROLL_RUN_NOT_FOUND' });
    }

    if (run.status === 'FINALIZED' || run.status === 'APPROVED') {
      return res.status(400).json({ success: false, error: `Cannot delete ${run.status} payroll run.`, code: 'INVALID_RUN_STATE' });
    }

    await PayrollRunRepository.delete(id, companyId);
    return res.json({ success: true, message: 'Payroll run deleted successfully.' });
  } catch (err: any) {
    next(err);
  }
});

/**
 * Get individual Employee Payroll Calculation Result with all component items and formulas
 */
apiRouter.get('/payroll/runs/:id/employees/:employeeId', requirePermission(PermissionKey.PAYROLL_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id, employeeId } = req.params;

    // RBAC: If role is EMPLOYEE, restrict strictly to own employeeId
    if (req.user?.role === UserRole.EMPLOYEE && req.user?.employeeId !== employeeId) {
      return res.status(403).json({ success: false, error: 'Access denied. You can only view your own payroll result.', code: 'FORBIDDEN_PAYROLL_ACCESS' });
    }

    const result = await PayrollRunEmployeeRepository.findByRunAndEmployee(id, employeeId, companyId, true);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Employee payroll record not found.', code: 'RECORD_NOT_FOUND' });
    }
    return res.json({ success: true, data: result });
  } catch (err: any) {
    next(err);
  }
});

/**
 * Employee Self-Service: Preview own latest/current payroll calculation
 */
apiRouter.get('/payroll/me/preview', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const employeeId = req.user?.employeeId;
    const { runId } = req.query;

    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'No employee account linked to this user.', code: 'NO_EMPLOYEE_LINK' });
    }

    const preview = await PayrollCalculationService.getEmployeePayrollPreview(employeeId, companyId, runId as string);
    if (!preview) {
      return res.status(404).json({ success: false, error: 'No payroll calculation preview available.', code: 'NO_PAYROLL_PREVIEW' });
    }
    return res.json({ success: true, data: preview });
  } catch (err: any) {
    next(err);
  }
});

// =========================================================================
// PHASE 4C: PAYROLL FINALIZATION, VERSIONED SNAPSHOTS & PAYSLIPS
// =========================================================================

/**
 * Finalize Payroll Run with Blocker Checks & Payslip Materialization
 */
apiRouter.post('/payroll/runs/:id/finalize', requirePermission(PermissionKey.PAYROLL_FINALIZE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const actor = getActor(req);

    const result = await PayrollFinalizationService.finalizePayrollRun(companyId, id, req.body, actor);
    return res.json({
      success: true,
      message: `Payroll run #${result.run.runNumber} finalized successfully. Generated ${result.totalPayslips} payslips.`,
      data: result,
    });
  } catch (err: any) {
    const msg = err.message || '';
    if (msg.includes('PAYROLL_ALREADY_FINALIZED')) {
      return res.status(409).json({ success: false, error: msg, code: 'PAYROLL_ALREADY_FINALIZED' });
    }
    if (msg.includes('PAYROLL_BLOCKERS_PRESENT')) {
      return res.status(422).json({ success: false, error: msg, code: 'PAYROLL_BLOCKERS_PRESENT' });
    }
    if (msg.includes('PAYROLL_RUN_LOCKED')) {
      return res.status(423).json({ success: false, error: msg, code: 'PAYROLL_RUN_LOCKED' });
    }
    next(err);
  }
});

/**
 * Controlled Reopen of Finalized Payroll Run
 */
apiRouter.post('/payroll/runs/:id/reopen', requirePermission(PermissionKey.PAYROLL_FINALIZE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const { reason } = req.body;
    const actor = getActor(req);

    if (!reason) {
      return res.status(400).json({ success: false, error: 'Audit reason is required to reopen payroll.', code: 'REOPEN_REASON_REQUIRED' });
    }

    const result = await PayrollFinalizationService.reopenPayrollRun(companyId, id, reason, actor);
    return res.json({
      success: true,
      message: `Payroll run #${result.reopenedRun.runNumber} reopened. Historical snapshot preserved as SUPERSEDED.`,
      data: result,
    });
  } catch (err: any) {
    next(err);
  }
});

/**
 * Publish Payslips to Employees for a Finalized Run
 */
apiRouter.post('/payroll/runs/:id/publish-payslips', requirePermission(PermissionKey.PAYROLL_MANAGE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const actor = getActor(req);

    const result = await PayrollFinalizationService.publishPayslips(id, companyId, actor);
    return res.json({
      success: true,
      message: `Published ${result.publishedCount} payslips.`,
      data: result,
    });
  } catch (err: any) {
    next(err);
  }
});

/**
 * Get Tabular Payroll Register with Department Breakdowns
 */
apiRouter.get('/payroll/runs/:id/register', requirePermission(PermissionKey.PAYROLL_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;

    const register = await PayrollFinalizationService.getPayrollRegister(id, companyId);
    if (!register) {
      return res.status(404).json({ success: false, error: 'Payroll run or register not found.', code: 'RECORD_NOT_FOUND' });
    }
    return res.json({ success: true, data: register });
  } catch (err: any) {
    next(err);
  }
});

/**
 * Get Versioned Snapshots for a Payroll Run or Period
 */
apiRouter.get('/payroll/runs/:id/snapshots', requirePermission(PermissionKey.PAYROLL_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;

    const snapshot = await PayrollPeriodSnapshotRepository.findByRunId(id, companyId);
    return res.json({ success: true, data: snapshot ? [snapshot] : [] });
  } catch (err: any) {
    next(err);
  }
});

/**
 * Get all Payslips for a Payroll Run
 */
apiRouter.get('/payroll/runs/:id/payslips', requirePermission(PermissionKey.PAYROLL_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;

    const payslips = await PayslipRepository.findByRunId(id, companyId);
    return res.json({ success: true, data: payslips });
  } catch (err: any) {
    next(err);
  }
});

/**
 * Search / Filter Payslips across company
 */
apiRouter.get('/payroll/payslips', requirePermission(PermissionKey.PAYROLL_VIEW), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { payrollRunId, payrollPeriodId, employeeId, status, year, search } = req.query;

    const payslips = await PayslipRepository.findMany(companyId, {
      payrollRunId: payrollRunId as string,
      payrollPeriodId: payrollPeriodId as string,
      employeeId: employeeId as string,
      status: status as any,
      year: year ? parseInt(year as string, 10) : undefined,
      search: search as string,
    });
    return res.json({ success: true, data: payslips });
  } catch (err: any) {
    next(err);
  }
});

/**
 * Get Individual Payslip by ID (with Self or HR/Payroll security)
 */
apiRouter.get('/payroll/payslips/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;

    const payslip = await PayrollFinalizationService.getPayslipById(id, companyId, {
      id: req.user?.id || '',
      role: req.user?.role || UserRole.EMPLOYEE,
      employeeId: req.user?.employeeId,
    });

    if (!payslip) {
      return res.status(404).json({ success: false, error: 'Payslip not found.', code: 'PAYSLIP_NOT_FOUND' });
    }
    return res.json({ success: true, data: payslip });
  } catch (err: any) {
    if (err.message?.includes('FORBIDDEN_PAYSLIP_ACCESS')) {
      return res.status(403).json({ success: false, error: err.message, code: 'FORBIDDEN_PAYSLIP_ACCESS' });
    }
    next(err);
  }
});

/**
 * Public Secure Token Download for Payslip
 */
apiRouter.get('/payroll/payslips/download/:token', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const payslip = await PayrollFinalizationService.getPayslipByToken(token);
    if (!payslip) {
      return res.status(404).json({ success: false, error: 'Invalid or expired download token.', code: 'INVALID_TOKEN' });
    }
    return res.json({ success: true, data: payslip });
  } catch (err: any) {
    next(err);
  }
});

/**
 * Get Employee Payslips History (HR / Admin or Employee Self)
 */
apiRouter.get('/payroll/employees/:employeeId/payslips', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { employeeId } = req.params;
    const { year } = req.query;

    const payslips = await PayrollFinalizationService.getEmployeePayslips(
      employeeId,
      companyId,
      {
        id: req.user?.id || '',
        role: req.user?.role || UserRole.EMPLOYEE,
        employeeId: req.user?.employeeId,
      },
      year ? parseInt(year as string, 10) : undefined
    );

    return res.json({ success: true, data: payslips });
  } catch (err: any) {
    if (err.message?.includes('FORBIDDEN_PAYSLIP_ACCESS')) {
      return res.status(403).json({ success: false, error: err.message, code: 'FORBIDDEN_PAYSLIP_ACCESS' });
    }
    next(err);
  }
});

/**
 * Employee Self-Service (ESS): Get My Payslips
 */
apiRouter.get('/payroll/me/payslips', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const employeeId = req.user?.employeeId;
    const { year } = req.query;

    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'No employee record linked to current user account.', code: 'NO_EMPLOYEE_LINK' });
    }

    const payslips = await PayrollFinalizationService.getEmployeePayslips(
      employeeId,
      companyId,
      {
        id: req.user?.id || '',
        role: req.user?.role || UserRole.EMPLOYEE,
        employeeId,
      },
      year ? parseInt(year as string, 10) : undefined
    );

    return res.json({ success: true, data: payslips });
  } catch (err: any) {
    next(err);
  }
});

/**
 * Employee Self-Service (ESS): Get Single My Payslip
 */
apiRouter.get('/payroll/me/payslips/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.activeCompanyId || 'comp-101';
    const { id } = req.params;
    const employeeId = req.user?.employeeId;

    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'No employee record linked to current user account.', code: 'NO_EMPLOYEE_LINK' });
    }

    const payslip = await PayrollFinalizationService.getPayslipById(id, companyId, {
      id: req.user?.id || '',
      role: req.user?.role || UserRole.EMPLOYEE,
      employeeId,
    });

    if (!payslip) {
      return res.status(404).json({ success: false, error: 'Payslip not found.', code: 'RECORD_NOT_FOUND' });
    }

    return res.json({ success: true, data: payslip });
  } catch (err: any) {
    if (err.message?.includes('FORBIDDEN_PAYSLIP_ACCESS')) {
      return res.status(403).json({ success: false, error: err.message, code: 'FORBIDDEN_PAYSLIP_ACCESS' });
    }
    next(err);
  }
});

// =========================================================================
// DASHBOARD & ADMINISTRATION
// =========================================================================
apiRouter.get('/dashboard/summary', async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.user?.activeCompanyId || 'comp-101';
  return res.json({
    success: true,
    data: {
      companyId,
      headcount: companyId === 'comp-102' ? 24 : 56,
      presentToday: companyId === 'comp-102' ? 22 : 48,
      absentToday: companyId === 'comp-102' ? 1 : 3,
      onLeaveToday: companyId === 'comp-102' ? 1 : 5,
      lateArrivalsToday: 2,
      newJoinersThisMonth: companyId === 'comp-102' ? 1 : 4,
      pendingApprovalsCount: companyId === 'comp-102' ? 3 : 7,
      noticePeriodCount: 1,
      asOfDate: new Date().toISOString(),
    },
  });
});

// ============================================================================
// PHASE 5: RECRUITMENT & ONBOARDING ENDPOINTS
// ============================================================================

// 1. Dashboard
apiRouter.get('/recruitment/dashboard', requirePermission(PermissionKey.RECRUITMENT_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const data = await RecruitmentService.getDashboardSummary(companyId);
  return res.json({ success: true, data });
});

// 2. Requisitions
apiRouter.get('/recruitment/requisitions', requirePermission(PermissionKey.RECRUITMENT_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const filter = {
    status: req.query.status as any,
    departmentId: req.query.departmentId as string,
    designationId: req.query.designationId as string,
    workLocationId: req.query.workLocationId as string,
    search: req.query.search as string,
  };
  const data = await RecruitmentService.getRequisitions(companyId, filter);
  return res.json({ success: true, data });
});

apiRouter.get('/recruitment/requisitions/:id', requirePermission(PermissionKey.RECRUITMENT_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const data = await RecruitmentService.getRequisitionById(req.params.id, companyId);
  return res.json({ success: true, data });
});

apiRouter.post('/recruitment/requisitions', requirePermission(PermissionKey.RECRUITMENT_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const data = await RecruitmentService.createRequisition(req.body, companyId, actor);
  return res.status(201).json({ success: true, data });
});

apiRouter.patch('/recruitment/requisitions/:id/status', requirePermission(PermissionKey.RECRUITMENT_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const data = await RecruitmentService.updateRequisitionStatus(req.params.id, companyId, req.body.status, actor);
  return res.json({ success: true, data });
});

// 3. Candidates
apiRouter.get('/recruitment/candidates', requirePermission(PermissionKey.RECRUITMENT_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const filter = {
    status: req.query.status as string,
    source: req.query.source as string,
    search: req.query.search as string,
  };
  const data = await RecruitmentService.getCandidates(companyId, filter);
  return res.json({ success: true, data });
});

apiRouter.get('/recruitment/candidates/:id', requirePermission(PermissionKey.RECRUITMENT_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const data = await RecruitmentService.getCandidateById(req.params.id, companyId);
  return res.json({ success: true, data });
});

apiRouter.post('/recruitment/candidates', requirePermission(PermissionKey.RECRUITMENT_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const result = await RecruitmentService.createCandidate(req.body, companyId, actor);
  return res.status(201).json({ success: true, data: result });
});

// 4. Applications & Pipeline
apiRouter.get('/recruitment/applications', requirePermission(PermissionKey.RECRUITMENT_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const filter = {
    requisitionId: req.query.requisitionId as string,
    candidateId: req.query.candidateId as string,
    stage: req.query.stage as any,
    status: req.query.status as any,
    search: req.query.search as string,
  };
  const data = await RecruitmentService.getApplications(companyId, filter);
  return res.json({ success: true, data });
});

apiRouter.get('/recruitment/applications/:id', requirePermission(PermissionKey.RECRUITMENT_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const data = await RecruitmentService.getApplicationById(req.params.id, companyId);
  return res.json({ success: true, data });
});

apiRouter.post('/recruitment/applications', requirePermission(PermissionKey.RECRUITMENT_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const data = await RecruitmentService.createApplication(req.body, companyId, actor);
  return res.status(201).json({ success: true, data });
});

apiRouter.patch('/recruitment/applications/:id/stage', requirePermission(PermissionKey.RECRUITMENT_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const { stage, status, reason } = req.body;
  const data = await RecruitmentService.updateApplicationStage(req.params.id, stage, status, reason, companyId, actor);
  return res.json({ success: true, data });
});

apiRouter.get('/recruitment/applications/:id/history', requirePermission(PermissionKey.RECRUITMENT_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const data = await RecruitmentService.getApplicationHistory(req.params.id, companyId);
  return res.json({ success: true, data });
});

// 5. Interviews & Scorecards
apiRouter.get('/recruitment/interviews', requirePermission(PermissionKey.RECRUITMENT_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const filter = {
    applicationId: req.query.applicationId as string,
    candidateId: req.query.candidateId as string,
    requisitionId: req.query.requisitionId as string,
    status: req.query.status as any,
    upcomingOnly: req.query.upcomingOnly === 'true',
  };
  const data = await RecruitmentService.getInterviews(companyId, filter);
  return res.json({ success: true, data });
});

apiRouter.post('/recruitment/interviews', requirePermission(PermissionKey.RECRUITMENT_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const data = await RecruitmentService.scheduleInterview(req.body, companyId, actor);
  return res.status(201).json({ success: true, data });
});

apiRouter.post('/recruitment/interviews/:id/feedback', requirePermission(PermissionKey.RECRUITMENT_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const data = await RecruitmentService.submitInterviewFeedback(req.params.id, req.body, companyId, actor);
  return res.json({ success: true, data });
});

// 6. Job Offers
apiRouter.get('/recruitment/offers', requirePermission(PermissionKey.RECRUITMENT_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const filter = {
    applicationId: req.query.applicationId as string,
    candidateId: req.query.candidateId as string,
    requisitionId: req.query.requisitionId as string,
    status: req.query.status as any,
    search: req.query.search as string,
  };
  const data = await RecruitmentService.getOffers(companyId, filter);
  return res.json({ success: true, data });
});

apiRouter.get('/recruitment/offers/:id', requirePermission(PermissionKey.RECRUITMENT_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const data = await RecruitmentService.getOfferById(req.params.id, companyId);
  return res.json({ success: true, data });
});

apiRouter.post('/recruitment/offers', requirePermission(PermissionKey.RECRUITMENT_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const data = await RecruitmentService.createOffer(req.body, companyId, actor);
  return res.status(201).json({ success: true, data });
});

apiRouter.patch('/recruitment/offers/:id/status', requirePermission(PermissionKey.RECRUITMENT_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const { status, reason } = req.body;
  const data = await RecruitmentService.updateOfferStatus(req.params.id, status, reason, companyId, actor);
  return res.json({ success: true, data });
});

// 7. Onboarding
apiRouter.get('/onboarding/templates', requirePermission(PermissionKey.ONBOARDING_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const data = await OnboardingService.getTemplates(companyId);
  return res.json({ success: true, data });
});

apiRouter.post('/onboarding/templates', requirePermission(PermissionKey.ONBOARDING_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const data = await OnboardingService.createTemplate(req.body, companyId, actor);
  return res.status(201).json({ success: true, data });
});

apiRouter.get('/onboarding', requirePermission(PermissionKey.ONBOARDING_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const filter = {
    status: req.query.status as any,
    departmentId: req.query.departmentId as string,
    search: req.query.search as string,
  };
  const data = await OnboardingService.getOnboardings(companyId, filter);
  return res.json({ success: true, data });
});

apiRouter.get('/onboarding/:id', requirePermission(PermissionKey.ONBOARDING_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const data = await OnboardingService.getOnboardingById(req.params.id, companyId);
  return res.json({ success: true, data });
});

apiRouter.post('/onboarding/start', requirePermission(PermissionKey.ONBOARDING_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const { offerId, templateId } = req.body;
  const data = await OnboardingService.startOnboardingFromOffer(offerId, templateId, companyId, actor);
  return res.status(201).json({ success: true, data });
});

apiRouter.patch('/onboarding/tasks/:id/status', requirePermission(PermissionKey.ONBOARDING_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const { status, notes } = req.body;
  const data = await OnboardingService.updateTaskStatus(req.params.id, status, notes, companyId, actor);
  return res.json({ success: true, data });
});

apiRouter.patch('/onboarding/documents/:id/status', requirePermission(PermissionKey.ONBOARDING_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const { status, fileUrl, rejectionReason } = req.body;
  const data = await OnboardingService.updateDocumentStatus(req.params.id, status, fileUrl, rejectionReason, companyId, actor);
  return res.json({ success: true, data });
});

apiRouter.patch('/onboarding/:id/joining-details', requirePermission(PermissionKey.ONBOARDING_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const data = await OnboardingService.updateJoiningDetails(req.params.id, req.body, companyId, actor);
  return res.json({ success: true, data });
});

apiRouter.post('/onboarding/:id/handoff-employee', requirePermission(PermissionKey.ONBOARDING_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const result = await OnboardingService.completeAndHandoffToEmployeeMaster(req.params.id, req.body, companyId, actor);
  return res.status(200).json({ success: true, data: result });
});

<<<<<<< HEAD
// ==========================================
// PHASE 6A: PERFORMANCE MANAGEMENT API ROUTES
// ==========================================

// Dashboard & Analytics
apiRouter.get('/performance/dashboard', requirePermission(PermissionKey.PERFORMANCE_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const data = await PerformanceService.getDashboardMetrics(companyId, actor);
  return res.json({ success: true, data });
});

// Performance Review Templates & Rating Scales
apiRouter.get('/performance/templates', requirePermission(PermissionKey.PERFORMANCE_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const activeOnly = req.query.activeOnly === 'true';
  const data = await PerformanceService.getTemplates(companyId, activeOnly);
  return res.json({ success: true, data });
});

apiRouter.get('/performance/templates/:id', requirePermission(PermissionKey.PERFORMANCE_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const data = await PerformanceService.getTemplateById(req.params.id, companyId);
  if (!data) return res.status(404).json({ success: false, error: 'Template not found' });
  return res.json({ success: true, data });
});

apiRouter.post('/performance/templates', requirePermission(PermissionKey.PERFORMANCE_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const data = await PerformanceService.createTemplate(req.body, companyId, actor);
  return res.status(201).json({ success: true, data });
});

apiRouter.patch('/performance/templates/:id', requirePermission(PermissionKey.PERFORMANCE_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const data = await PerformanceService.updateTemplate(req.params.id, req.body, companyId, actor);
  return res.json({ success: true, data });
});

// Goal Categories
apiRouter.get('/performance/goal-categories', requirePermission(PermissionKey.PERFORMANCE_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const data = await PerformanceService.getGoalCategories(companyId);
  return res.json({ success: true, data });
});

apiRouter.post('/performance/goal-categories', requirePermission(PermissionKey.PERFORMANCE_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const data = await PerformanceService.createGoalCategory(req.body, companyId);
  return res.status(201).json({ success: true, data });
});

// Performance Cycles
apiRouter.get('/performance/cycles', requirePermission(PermissionKey.PERFORMANCE_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const status = req.query.status as any;
  const data = await PerformanceService.getCycles(companyId, status);
  return res.json({ success: true, data });
});

apiRouter.get('/performance/cycles/:id', requirePermission(PermissionKey.PERFORMANCE_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const data = await PerformanceService.getCycleById(req.params.id, companyId);
  if (!data) return res.status(404).json({ success: false, error: 'Cycle not found' });
  return res.json({ success: true, data });
});

apiRouter.post('/performance/cycles', requirePermission(PermissionKey.PERFORMANCE_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const data = await PerformanceService.createCycle(req.body, companyId, actor);
  return res.status(201).json({ success: true, data });
});

apiRouter.patch('/performance/cycles/:id', requirePermission(PermissionKey.PERFORMANCE_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const data = await PerformanceService.updateCycle(req.params.id, req.body, companyId, actor);
  return res.json({ success: true, data });
});

apiRouter.post('/performance/cycles/:id/status', requirePermission(PermissionKey.PERFORMANCE_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const data = await PerformanceService.changeCycleStatus(req.params.id, req.body.status, companyId, actor);
  return res.json({ success: true, data });
});

apiRouter.post('/performance/cycles/:id/initialize', requirePermission(PermissionKey.PERFORMANCE_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const data = await PerformanceService.initializeCycleReviews(req.params.id, companyId, actor);
  return res.json({ success: true, data });
});

// Performance Goals / KRAs
apiRouter.get('/performance/goals', requirePermission(PermissionKey.PERFORMANCE_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const filter = {
    cycleId: req.query.cycleId as string | undefined,
    employeeId: req.query.employeeId as string | undefined,
    status: req.query.status as any,
    isManagerGoal: req.query.isManagerGoal !== undefined ? req.query.isManagerGoal === 'true' : undefined,
    category: req.query.category as string | undefined,
  };
  const data = await PerformanceService.getGoals(companyId, actor, filter);
  return res.json({ success: true, data });
});

apiRouter.get('/performance/goals/:id', requirePermission(PermissionKey.PERFORMANCE_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const data = await PerformanceService.getGoalById(req.params.id, companyId, actor);
  if (!data) return res.status(404).json({ success: false, error: 'Goal not found' });
  return res.json({ success: true, data });
});

apiRouter.post('/performance/goals', requirePermission(PermissionKey.PERFORMANCE_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const data = await PerformanceService.createGoal(req.body, companyId, actor);
  return res.status(201).json({ success: true, data });
});

apiRouter.patch('/performance/goals/:id', requirePermission(PermissionKey.PERFORMANCE_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const data = await PerformanceService.updateGoal(req.params.id, req.body, companyId, actor);
  return res.json({ success: true, data });
});

apiRouter.patch('/performance/goals/:id/progress', requirePermission(PermissionKey.PERFORMANCE_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const { currentValue, status } = req.body;
  const data = await PerformanceService.updateGoalProgress(req.params.id, currentValue, status, companyId, actor);
  return res.json({ success: true, data });
});

apiRouter.post('/performance/goals/:id/approve', requirePermission(PermissionKey.PERFORMANCE_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const data = await PerformanceService.approveGoal(req.params.id, companyId, actor);
  return res.json({ success: true, data });
});

apiRouter.delete('/performance/goals/:id', requirePermission(PermissionKey.PERFORMANCE_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const data = await PerformanceService.deleteGoal(req.params.id, companyId, actor);
  return res.json({ success: true, data });
});

// Performance Reviews & Appraisals
apiRouter.get('/performance/reviews', requirePermission(PermissionKey.PERFORMANCE_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const filter = {
    cycleId: req.query.cycleId as string | undefined,
    employeeId: req.query.employeeId as string | undefined,
    reviewerId: req.query.reviewerId as string | undefined,
    status: req.query.status as any,
    isFinalized: req.query.isFinalized !== undefined ? req.query.isFinalized === 'true' : undefined,
  };
  const data = await PerformanceService.getReviews(companyId, actor, filter);
  return res.json({ success: true, data });
});

apiRouter.get('/performance/reviews/:id', requirePermission(PermissionKey.PERFORMANCE_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const data = await PerformanceService.getReviewById(req.params.id, companyId, actor);
  if (!data) return res.status(404).json({ success: false, error: 'Review not found' });
  return res.json({ success: true, data });
});

apiRouter.post('/performance/reviews/:id/self-review', requirePermission(PermissionKey.PERFORMANCE_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const data = await PerformanceService.submitSelfReview(req.params.id, req.body, companyId, actor);
  return res.json({ success: true, data });
});

apiRouter.post('/performance/reviews/:id/manager-review', requirePermission(PermissionKey.PERFORMANCE_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const data = await PerformanceService.submitManagerReview(req.params.id, req.body, companyId, actor);
  return res.json({ success: true, data });
});

apiRouter.post('/performance/reviews/:id/finalize', requirePermission(PermissionKey.PERFORMANCE_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const data = await PerformanceService.finalizeReview(req.params.id, req.body, companyId, actor);
  return res.json({ success: true, data });
});

apiRouter.get('/performance/reviews/:id/history', requirePermission(PermissionKey.PERFORMANCE_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = req.user!;
  const data = await PerformanceService.getReviewHistory(req.params.id, companyId, actor);
  return res.json({ success: true, data });
});

// =============================================================================
// PHASE 6B: EXPENSES & ASSETS ROUTERS
// =============================================================================
apiRouter.use('/expenses', authMiddleware, expenseRouter);
apiRouter.use('/assets', authMiddleware, assetRouter);

// =============================================================================
// PHASE 6C: OFFBOARDING ROUTER
// =============================================================================
apiRouter.use('/offboarding', authMiddleware, offboardingRouter);

// =============================================================================
// PHASE 7: REPORTING SERVICE ENDPOINTS
// =============================================================================
apiRouter.get('/reports/catalog', authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  const catalog = ReportService.getReportCatalog();
  return res.json({ success: true, data: catalog });
});

apiRouter.post('/reports/execute', authMiddleware, requirePermission(PermissionKey.REPORTS_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const criteria = {
    ...req.body,
    companyId,
  };
  const actor = {
    id: req.user?.id || 'usr-1',
    name: req.user?.fullName || 'User',
    email: req.user?.email || 'user@hrms.enterprise.com',
  };

  const result = await ReportService.generateReport(criteria, actor);
  return res.json({ success: true, data: result });
});

apiRouter.post('/reports/export', authMiddleware, requirePermission(PermissionKey.REPORTS_EXPORT), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const criteria = {
    ...req.body,
    companyId,
    exportFormat: req.body.exportFormat || 'CSV',
  };
  const actor = {
    id: req.user?.id || 'usr-1',
    name: req.user?.fullName || 'User',
    email: req.user?.email || 'user@hrms.enterprise.com',
  };

  const result = await ReportService.generateReport(criteria, actor);
  return res.json({ success: true, data: result });
});

// =============================================================================
// PHASE 7: IN-APP NOTIFICATIONS ENDPOINTS
// =============================================================================
apiRouter.get('/notifications', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'usr-1';
  const companyId = req.companyId!;
  const filter = {
    isRead: req.query.isRead !== undefined ? req.query.isRead === 'true' : undefined,
    category: req.query.category as any,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
    offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
  };

  const data = await NotificationService.getUserNotifications(userId, companyId, filter);
  return res.json({ success: true, data });
});

apiRouter.get('/notifications/unread-count', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'usr-1';
  const companyId = req.companyId!;
  const count = await NotificationService.getUnreadCount(userId, companyId);
  return res.json({ success: true, data: { unreadCount: count } });
});

apiRouter.patch('/notifications/:id/read', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'usr-1';
  const updated = await NotificationService.markAsRead(req.params.id, userId);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Notification not found or unauthorized' });
  }
  return res.json({ success: true, data: updated });
});

apiRouter.post('/notifications/mark-all-read', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'usr-1';
  const companyId = req.companyId!;
  const updatedCount = await NotificationService.markAllAsRead(userId, companyId);
  return res.json({ success: true, data: { updatedCount } });
});

apiRouter.delete('/notifications/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'usr-1';
  const success = await NotificationService.deleteNotification(req.params.id, userId);
  return res.json({ success });
});

apiRouter.post('/notifications/send', authMiddleware, requirePermission(PermissionKey.ADMIN_USERS_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const notification = await NotificationService.createNotification({
    ...req.body,
    companyId,
  });
  return res.json({ success: true, data: notification });
});

// =============================================================================
// PHASE 7: ADMIN HARDENING & GOVERNANCE ENDPOINTS
// =============================================================================
apiRouter.get('/administration/users', authMiddleware, requirePermission(PermissionKey.ADMIN_USERS_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const search = req.query.search as string;
  const users = await AdminService.listUsers(companyId, search);
  return res.json({ success: true, data: users });
});

apiRouter.post('/administration/users', authMiddleware, requirePermission(PermissionKey.ADMIN_USERS_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = {
    id: req.user?.id || 'usr-1',
    name: req.user?.fullName || 'Administrator',
    email: req.user?.email || 'admin@hrms.enterprise.com',
    companyId,
  };
  const newUser = await AdminService.createUser(req.body, actor);
  return res.json({ success: true, data: newUser });
});

apiRouter.put('/administration/users/:id', authMiddleware, requirePermission(PermissionKey.ADMIN_USERS_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = {
    id: req.user?.id || 'usr-1',
    name: req.user?.fullName || 'Administrator',
    email: req.user?.email || 'admin@hrms.enterprise.com',
    companyId,
  };
  const updatedUser = await AdminService.updateUser(req.params.id, req.body, actor);
  return res.json({ success: true, data: updatedUser });
});

apiRouter.patch('/administration/users/:id/status', authMiddleware, requirePermission(PermissionKey.ADMIN_USERS_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = {
    id: req.user?.id || 'usr-1',
    name: req.user?.fullName || 'Administrator',
    email: req.user?.email || 'admin@hrms.enterprise.com',
    companyId,
  };
  const isActive = req.body.isActive === true;
  const updatedUser = await AdminService.toggleUserStatus(req.params.id, isActive, actor);
  return res.json({ success: true, data: updatedUser });
});

apiRouter.get('/administration/roles', authMiddleware, requirePermission(PermissionKey.ADMIN_USERS_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const roles = await AdminService.listRoles(companyId);
  return res.json({ success: true, data: roles });
});

apiRouter.post('/administration/roles', authMiddleware, requirePermission(PermissionKey.ADMIN_USERS_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = {
    id: req.user?.id || 'usr-1',
    name: req.user?.fullName || 'Administrator',
    email: req.user?.email || 'admin@hrms.enterprise.com',
    companyId,
  };
  const newRole = await AdminService.createRole(req.body, actor);
  return res.json({ success: true, data: newRole });
});

apiRouter.put('/administration/roles/:id', authMiddleware, requirePermission(PermissionKey.ADMIN_USERS_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = {
    id: req.user?.id || 'usr-1',
    name: req.user?.fullName || 'Administrator',
    email: req.user?.email || 'admin@hrms.enterprise.com',
    companyId,
  };
  const updatedRole = await AdminService.updateRole(req.params.id, req.body, actor);
  return res.json({ success: true, data: updatedRole });
});

apiRouter.get('/administration/permissions', authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  const catalog = AdminService.getGranularPermissionsCatalog();
  return res.json({ success: true, data: catalog });
});

apiRouter.get('/administration/settings', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const category = req.query.category as any;
  const settings = await AdminService.getSettings(companyId, category);
  return res.json({ success: true, data: settings });
});

apiRouter.put('/administration/settings', authMiddleware, requirePermission(PermissionKey.ADMIN_USERS_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const actor = {
    id: req.user?.id || 'usr-1',
    name: req.user?.fullName || 'Administrator',
    email: req.user?.email || 'admin@hrms.enterprise.com',
  };
  const settings = req.body.settings || [];
  const updated = await AdminService.batchUpdateSettings(companyId, settings, actor);
  return res.json({ success: true, data: updated });
});

apiRouter.get('/administration/audit', authMiddleware, requirePermission(PermissionKey.ADMIN_AUDIT_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.companyId!;
  const criteria = {
    companyId,
    actorId: req.query.actorId as string,
    targetModule: req.query.targetModule as string,
    search: req.query.search as string,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
    offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
  };
  const result = await AdminService.queryAuditLogs(criteria);
  return res.json({ success: true, data: result });
=======
apiRouter.get('/administration/users', requirePermission(PermissionKey.ADMIN_USERS_MANAGE), async (req: AuthenticatedRequest, res: Response) => {
  const users = await AuthService.getUsers();
  return res.json({ success: true, data: users });
});

apiRouter.get('/administration/audit', requirePermission(PermissionKey.ADMIN_AUDIT_VIEW), async (req: AuthenticatedRequest, res: Response) => {
  const isSuperAdmin = req.user?.role === UserRole.SUPER_ADMIN;
  const filterCompany = isSuperAdmin ? undefined : req.user?.activeCompanyId;
  const logs = await AuditService.getLogs(filterCompany);
  return res.json({ success: true, data: logs });
>>>>>>> 4a1448526a9835d6aa52ec14365c16a1afc6f77f
});

// Structured JSON Error Handling Middleware for apiRouter
apiRouter.use((err: any, req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
  console.error('[API Error]:', err);
  const statusCode = typeof err?.statusCode === 'number' ? err.statusCode : 500;
  return res.status(statusCode).json({
    success: false,
    error: err?.message || 'An unexpected internal error occurred.',
    code: err?.code || 'INTERNAL_ERROR',
    statusCode,
  });
});
