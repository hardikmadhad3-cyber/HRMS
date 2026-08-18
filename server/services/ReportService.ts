import { RelationalDatabase } from '../database/RelationalDatabase.js';
import {
  ReportCategoryKey,
  ReportFilterCriteria,
  ReportExecutionResult,
  ReportDefinition,
} from '../../src/types/platform.js';
import { PermissionKey } from '../../src/types/auth.js';
import { AuditService } from './AuditService.js';

export class ReportService {
  private static db = RelationalDatabase.getInstance();

  public static getReportCatalog(): ReportDefinition[] {
    return [
      {
        key: 'HEADCOUNT',
        title: 'Employee Headcount & Demographics',
        category: 'Core HR',
        description: 'Headcount distribution across departments, branches, designations and active status.',
        requiredPermission: PermissionKey.REPORTS_VIEW,
        supportedFormats: ['PREVIEW', 'CSV', 'JSON'],
      },
      {
        key: 'EMPLOYEE_DIRECTORY',
        title: 'Complete Employee Directory',
        category: 'Core HR',
        description: 'Comprehensive staff roster with contact details, assignments, reporting lines and status.',
        requiredPermission: PermissionKey.EMPLOYEE_VIEW,
        supportedFormats: ['PREVIEW', 'CSV', 'JSON'],
      },
      {
        key: 'ATTENDANCE',
        title: 'Daily & Monthly Attendance Ledger',
        category: 'Time & Attendance',
        description: 'Punches, presence duration, shifts, late marks and daily attendance statuses.',
        requiredPermission: PermissionKey.ATTENDANCE_VIEW,
        supportedFormats: ['PREVIEW', 'CSV', 'JSON'],
      },
      {
        key: 'LATE_EARLY',
        title: 'Late Arrivals & Early Departures Exception Report',
        category: 'Time & Attendance',
        description: 'Detailed punctuality deviation analysis, lost working minutes and regularization state.',
        requiredPermission: PermissionKey.ATTENDANCE_VIEW,
        supportedFormats: ['PREVIEW', 'CSV', 'JSON'],
      },
      {
        key: 'LEAVE_BALANCE',
        title: 'Leave Balances & Accrual Register',
        category: 'Leave Management',
        description: 'Opening, accrued, consumed, reserved and closing leave balances per employee.',
        requiredPermission: PermissionKey.LEAVE_VIEW,
        supportedFormats: ['PREVIEW', 'CSV', 'JSON'],
      },
      {
        key: 'LEAVE_TRANSACTIONS',
        title: 'Leave Applications & Transaction History',
        category: 'Leave Management',
        description: 'All submitted leave requests, approval audit trails, dates and reason categories.',
        requiredPermission: PermissionKey.LEAVE_VIEW,
        supportedFormats: ['PREVIEW', 'CSV', 'JSON'],
      },
      {
        key: 'OVERTIME',
        title: 'Overtime Authorization & Hours Log',
        category: 'Time & Attendance',
        description: 'Overtime hours logged, multipliers, manager approvals and payroll impact.',
        requiredPermission: PermissionKey.OVERTIME_VIEW,
        supportedFormats: ['PREVIEW', 'CSV', 'JSON'],
      },
      {
        key: 'PAYROLL_REGISTER',
        title: 'Salary Register & Payroll Ledger',
        category: 'Payroll',
        description: 'Gross-to-net salary component breakdowns, statutory deductions and payout register.',
        requiredPermission: PermissionKey.PAYROLL_VIEW,
        supportedFormats: ['PREVIEW', 'CSV', 'JSON'],
      },
      {
        key: 'RECRUITMENT',
        title: 'Recruitment Funnel & Pipeline Analytics',
        category: 'Talent Acquisition',
        description: 'Requisition statuses, candidate stages, interview evaluations and job offers.',
        requiredPermission: PermissionKey.RECRUITMENT_VIEW,
        supportedFormats: ['PREVIEW', 'CSV', 'JSON'],
      },
      {
        key: 'PERFORMANCE',
        title: 'Performance Appraisal & Review Summary',
        category: 'Talent Management',
        description: 'Cycle completion progress, performance rating bell curve and goal scores.',
        requiredPermission: PermissionKey.PERFORMANCE_VIEW,
        supportedFormats: ['PREVIEW', 'CSV', 'JSON'],
      },
      {
        key: 'EXPENSES',
        title: 'Expense Claims & Reimbursement Ledger',
        category: 'Finance & Claims',
        description: 'Expense claim categories, submitted amounts, multi-level approvals and payments.',
        requiredPermission: PermissionKey.REPORTS_VIEW,
        supportedFormats: ['PREVIEW', 'CSV', 'JSON'],
      },
      {
        key: 'ASSETS',
        title: 'Asset Inventory & Custody Allocation',
        category: 'Assets & IT',
        description: 'Hardware/software asset allocation registry, custody history and condition audits.',
        requiredPermission: PermissionKey.ASSET_VIEW,
        supportedFormats: ['PREVIEW', 'CSV', 'JSON'],
      },
      {
        key: 'OFFBOARDING',
        title: 'Separation, Clearance & Attrition Dossier',
        category: 'Offboarding',
        description: 'Resignation tracking, clearance completion rates, exit feedback and turnover stats.',
        requiredPermission: PermissionKey.OFFBOARDING_VIEW,
        supportedFormats: ['PREVIEW', 'CSV', 'JSON'],
      },
    ];
  }

  /**
   * Universal operational report generation engine
   */
  public static async generateReport(
    criteria: ReportFilterCriteria,
    actor: { id: string; name: string; email: string }
  ): Promise<ReportExecutionResult> {
    const startTime = Date.now();
    const db = ReportService.db;
    const { companyId, reportKey } = criteria;

    let result: ReportExecutionResult;

    switch (reportKey) {
      case 'HEADCOUNT':
        result = ReportService.generateHeadcountReport(criteria, actor);
        break;
      case 'EMPLOYEE_DIRECTORY':
        result = ReportService.generateDirectoryReport(criteria, actor);
        break;
      case 'ATTENDANCE':
        result = ReportService.generateAttendanceReport(criteria, actor);
        break;
      case 'LATE_EARLY':
        result = ReportService.generateLateEarlyReport(criteria, actor);
        break;
      case 'LEAVE_BALANCE':
        result = ReportService.generateLeaveBalanceReport(criteria, actor);
        break;
      case 'LEAVE_TRANSACTIONS':
        result = ReportService.generateLeaveTransactionsReport(criteria, actor);
        break;
      case 'OVERTIME':
        result = ReportService.generateOvertimeReport(criteria, actor);
        break;
      case 'PAYROLL_REGISTER':
        result = ReportService.generatePayrollRegisterReport(criteria, actor);
        break;
      case 'RECRUITMENT':
        result = ReportService.generateRecruitmentReport(criteria, actor);
        break;
      case 'PERFORMANCE':
        result = ReportService.generatePerformanceReport(criteria, actor);
        break;
      case 'EXPENSES':
        result = ReportService.generateExpensesReport(criteria, actor);
        break;
      case 'ASSETS':
        result = ReportService.generateAssetsReport(criteria, actor);
        break;
      case 'OFFBOARDING':
        result = ReportService.generateOffboardingReport(criteria, actor);
        break;
      default:
        throw new Error(`Unsupported report key: ${reportKey}`);
    }

    // Generate CSV Content if requested or as standard export option
    result.csvContent = ReportService.convertToCSV(result.columns, result.rows);

    // Audit log report execution
    await AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: `REPORT_EXECUTE_${reportKey}`,
      targetModule: 'Reporting',
      companyId,
      changesSummary: `Executed report '${result.title}' yielding ${result.totalRows} records (Format: ${criteria.exportFormat || 'PREVIEW'}). Execution took ${Date.now() - startTime}ms.`,
    });

    return result;
  }

  // ==========================================
  // Report Implementations
  // ==========================================

  private static generateHeadcountReport(
    criteria: ReportFilterCriteria,
    actor: { id: string; name: string }
  ): ReportExecutionResult {
    const db = ReportService.db;
    const employees = Array.from(db.employees.values()).filter((e) => e.companyId === criteria.companyId);
    const assignments = Array.from(db.employeeAssignments.values()).filter((a) => a.companyId === criteria.companyId);
    const depts = db.departments;
    const desigs = db.designations;
    const branches = db.branches;

    const rows: Record<string, unknown>[] = [];
    let activeCount = 0;
    let inactiveCount = 0;
    let probationCount = 0;

    for (const emp of employees) {
      if (emp.status === 'ACTIVE') activeCount++;
      else if (emp.status === 'INACTIVE' || emp.status === 'TERMINATED') inactiveCount++;
      else if (emp.status === 'PROBATION') probationCount++;

      const asg = assignments.find((a) => a.employeeId === emp.id && a.isPrimary) || assignments.find((a) => a.employeeId === emp.id);
      const deptName = asg?.departmentId ? depts.get(asg.departmentId)?.name || asg.departmentId : 'Unassigned';
      const desigName = asg?.designationId ? desigs.get(asg.designationId)?.title || asg.designationId : 'Unassigned';
      const branchName = asg?.branchId ? branches.get(asg.branchId)?.name || asg.branchId : 'Headquarters';

      if (criteria.departmentId && asg?.departmentId !== criteria.departmentId) continue;
      if (criteria.branchId && asg?.branchId !== criteria.branchId) continue;
      if (criteria.status && emp.status !== criteria.status) continue;

      rows.push({
        id: emp.id,
        employeeCode: emp.code,
        fullName: `${emp.firstName} ${emp.lastName}`,
        department: deptName,
        designation: desigName,
        branch: branchName,
        status: emp.status,
        joiningDate: emp.joiningDate || '—',
        gender: emp.gender || 'Not Specified',
        employmentType: emp.employmentType || 'FULL_TIME',
      });
    }

    const columns = [
      { key: 'employeeCode', label: 'Employee Code', type: 'badge' as const },
      { key: 'fullName', label: 'Full Name', type: 'string' as const },
      { key: 'department', label: 'Department', type: 'string' as const },
      { key: 'designation', label: 'Designation', type: 'string' as const },
      { key: 'branch', label: 'Branch', type: 'string' as const },
      { key: 'status', label: 'Employment Status', type: 'badge' as const },
      { key: 'employmentType', label: 'Type', type: 'string' as const },
      { key: 'joiningDate', label: 'Joining Date', type: 'date' as const },
    ];

    return {
      reportKey: 'HEADCOUNT',
      title: 'Employee Headcount & Demographics',
      companyId: criteria.companyId,
      generatedAt: new Date().toISOString(),
      generatedBy: actor.name,
      filters: criteria,
      summaryMetrics: {
        'Total Headcount': employees.length,
        'Active Employees': activeCount,
        'On Probation': probationCount,
        'Inactive / Separated': inactiveCount,
      },
      columns,
      rows,
      totalRows: rows.length,
      page: criteria.page || 1,
      pageSize: criteria.pageSize || 50,
      totalPages: Math.ceil(rows.length / (criteria.pageSize || 50)) || 1,
    };
  }

  private static generateDirectoryReport(
    criteria: ReportFilterCriteria,
    actor: { id: string; name: string }
  ): ReportExecutionResult {
    const db = ReportService.db;
    const employees = Array.from(db.employees.values()).filter((e) => e.companyId === criteria.companyId);
    const assignments = Array.from(db.employeeAssignments.values()).filter((a) => a.companyId === criteria.companyId);
    const depts = db.departments;
    const desigs = db.designations;
    const locations = db.workLocations;

    const rows: Record<string, unknown>[] = [];
    for (const emp of employees) {
      const asg = assignments.find((a) => a.employeeId === emp.id && a.isPrimary) || assignments.find((a) => a.employeeId === emp.id);
      const deptName = asg?.departmentId ? depts.get(asg.departmentId)?.name || '—' : '—';
      const desigName = asg?.designationId ? desigs.get(asg.designationId)?.title || '—' : '—';
      const locName = asg?.workLocationId ? locations.get(asg.workLocationId)?.name || 'Main Office' : 'Main Office';
      const manager = asg?.reportsToId ? db.employees.get(asg.reportsToId) : null;
      const managerName = manager ? `${manager.firstName} ${manager.lastName}` : 'Direct Head';

      if (criteria.departmentId && asg?.departmentId !== criteria.departmentId) continue;
      if (criteria.status && emp.status !== criteria.status) continue;

      rows.push({
        id: emp.id,
        employeeCode: emp.code,
        name: `${emp.firstName} ${emp.lastName}`,
        email: emp.workEmail || emp.personalEmail || '—',
        phone: emp.phone || '—',
        department: deptName,
        designation: desigName,
        workLocation: locName,
        manager: managerName,
        status: emp.status,
      });
    }

    const columns = [
      { key: 'employeeCode', label: 'Emp Code', type: 'badge' as const },
      { key: 'name', label: 'Name', type: 'string' as const },
      { key: 'email', label: 'Email Address', type: 'string' as const },
      { key: 'phone', label: 'Phone', type: 'string' as const },
      { key: 'department', label: 'Department', type: 'string' as const },
      { key: 'designation', label: 'Designation', type: 'string' as const },
      { key: 'manager', label: 'Reporting Manager', type: 'string' as const },
      { key: 'workLocation', label: 'Location', type: 'string' as const },
      { key: 'status', label: 'Status', type: 'badge' as const },
    ];

    return {
      reportKey: 'EMPLOYEE_DIRECTORY',
      title: 'Complete Employee Directory',
      companyId: criteria.companyId,
      generatedAt: new Date().toISOString(),
      generatedBy: actor.name,
      filters: criteria,
      summaryMetrics: {
        'Total Directory Records': rows.length,
        'Active Contacts': rows.filter((r) => r.status === 'ACTIVE').length,
      },
      columns,
      rows,
      totalRows: rows.length,
      page: criteria.page || 1,
      pageSize: criteria.pageSize || 50,
      totalPages: Math.ceil(rows.length / (criteria.pageSize || 50)) || 1,
    };
  }

  private static generateAttendanceReport(
    criteria: ReportFilterCriteria,
    actor: { id: string; name: string }
  ): ReportExecutionResult {
    const db = ReportService.db;
    const dailyRecords = Array.from(db.dailyAttendance.values()).filter(
      (d) => d.companyId === criteria.companyId
    );

    const rows: Record<string, unknown>[] = [];
    let presentDays = 0;
    let lateDays = 0;
    let totalWorkedHours = 0;

    for (const rec of dailyRecords) {
      if (criteria.startDate && rec.attendanceDate < criteria.startDate) continue;
      if (criteria.endDate && rec.attendanceDate > criteria.endDate) continue;
      if (criteria.employeeId && rec.employeeId !== criteria.employeeId) continue;
      if (criteria.status && rec.status !== criteria.status) continue;

      const emp = db.employees.get(rec.employeeId);
      if (rec.status === 'PRESENT') presentDays++;
      if (rec.isLateArrival) lateDays++;
      totalWorkedHours += rec.actualWorkedMinutes ? rec.actualWorkedMinutes / 60 : 0;

      rows.push({
        id: rec.id,
        date: rec.attendanceDate,
        employeeCode: emp?.code || '—',
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : rec.employeeId,
        status: rec.status,
        checkIn: rec.firstInTime ? rec.firstInTime.substring(11, 16) : '—',
        checkOut: rec.lastOutTime ? rec.lastOutTime.substring(11, 16) : '—',
        workedHours: rec.actualWorkedMinutes ? (rec.actualWorkedMinutes / 60).toFixed(1) + ' hrs' : '0.0 hrs',
        isLate: rec.isLateArrival ? `Yes (${rec.lateMinutes || 0}m)` : 'No',
        isEarly: rec.isEarlyDeparture ? `Yes (${rec.earlyMinutes || 0}m)` : 'No',
      });
    }

    const columns = [
      { key: 'date', label: 'Date', type: 'date' as const },
      { key: 'employeeCode', label: 'Emp Code', type: 'badge' as const },
      { key: 'employeeName', label: 'Employee Name', type: 'string' as const },
      { key: 'status', label: 'Attendance Status', type: 'badge' as const },
      { key: 'checkIn', label: 'First In', type: 'string' as const },
      { key: 'checkOut', label: 'Last Out', type: 'string' as const },
      { key: 'workedHours', label: 'Worked Hours', type: 'string' as const },
      { key: 'isLate', label: 'Late Arrival', type: 'string' as const },
      { key: 'isEarly', label: 'Early Departure', type: 'string' as const },
    ];

    return {
      reportKey: 'ATTENDANCE',
      title: 'Daily & Monthly Attendance Ledger',
      companyId: criteria.companyId,
      generatedAt: new Date().toISOString(),
      generatedBy: actor.name,
      filters: criteria,
      summaryMetrics: {
        'Total Logs': rows.length,
        'Present Instances': presentDays,
        'Late Arrivals': lateDays,
        'Total Cumulative Hours': totalWorkedHours.toFixed(1),
      },
      columns,
      rows,
      totalRows: rows.length,
      page: criteria.page || 1,
      pageSize: criteria.pageSize || 50,
      totalPages: Math.ceil(rows.length / (criteria.pageSize || 50)) || 1,
    };
  }

  private static generateLateEarlyReport(
    criteria: ReportFilterCriteria,
    actor: { id: string; name: string }
  ): ReportExecutionResult {
    const db = ReportService.db;
    const dailyRecords = Array.from(db.dailyAttendance.values()).filter(
      (d) => d.companyId === criteria.companyId && (d.isLateArrival || d.isEarlyDeparture)
    );

    const rows: Record<string, unknown>[] = [];
    let totalLostMinutes = 0;

    for (const rec of dailyRecords) {
      if (criteria.startDate && rec.attendanceDate < criteria.startDate) continue;
      if (criteria.endDate && rec.attendanceDate > criteria.endDate) continue;
      if (criteria.employeeId && rec.employeeId !== criteria.employeeId) continue;

      const emp = db.employees.get(rec.employeeId);
      const lostMins = (rec.lateMinutes || 0) + (rec.earlyMinutes || 0);
      totalLostMinutes += lostMins;

      rows.push({
        id: rec.id,
        date: rec.attendanceDate,
        employeeCode: emp?.code || '—',
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : rec.employeeId,
        lateMinutes: rec.lateMinutes || 0,
        earlyMinutes: rec.earlyMinutes || 0,
        totalLostMinutes: `${lostMins} mins`,
        checkIn: rec.firstInTime ? rec.firstInTime.substring(11, 16) : '—',
        checkOut: rec.lastOutTime ? rec.lastOutTime.substring(11, 16) : '—',
        regularized: rec.isRegularized ? 'Regularized' : 'Unregularized',
      });
    }

    const columns = [
      { key: 'date', label: 'Date', type: 'date' as const },
      { key: 'employeeCode', label: 'Emp Code', type: 'badge' as const },
      { key: 'employeeName', label: 'Employee Name', type: 'string' as const },
      { key: 'checkIn', label: 'Punch In', type: 'string' as const },
      { key: 'lateMinutes', label: 'Late (Mins)', type: 'number' as const },
      { key: 'checkOut', label: 'Punch Out', type: 'string' as const },
      { key: 'earlyMinutes', label: 'Early (Mins)', type: 'number' as const },
      { key: 'totalLostMinutes', label: 'Total Lost Time', type: 'string' as const },
      { key: 'regularized', label: 'Regularization Status', type: 'badge' as const },
    ];

    return {
      reportKey: 'LATE_EARLY',
      title: 'Late Arrivals & Early Departures Exception Report',
      companyId: criteria.companyId,
      generatedAt: new Date().toISOString(),
      generatedBy: actor.name,
      filters: criteria,
      summaryMetrics: {
        'Total Punctuality Exceptions': rows.length,
        'Total Lost Working Minutes': totalLostMinutes,
        'Lost Time in Hours': (totalLostMinutes / 60).toFixed(1),
      },
      columns,
      rows,
      totalRows: rows.length,
      page: criteria.page || 1,
      pageSize: criteria.pageSize || 50,
      totalPages: Math.ceil(rows.length / (criteria.pageSize || 50)) || 1,
    };
  }

  private static generateLeaveBalanceReport(
    criteria: ReportFilterCriteria,
    actor: { id: string; name: string }
  ): ReportExecutionResult {
    const db = ReportService.db;
    const balances = Array.from(db.leaveBalances.values()).filter(
      (b) => b.companyId === criteria.companyId
    );
    const leaveTypes = db.leaveTypes;

    const rows: Record<string, unknown>[] = [];
    let totalAvailed = 0;
    let totalClosing = 0;

    for (const bal of balances) {
      if (criteria.employeeId && bal.employeeId !== criteria.employeeId) continue;

      const emp = db.employees.get(bal.employeeId);
      const lt = leaveTypes.get(bal.leaveTypeId);

      totalAvailed += bal.usedBalance || 0;
      totalClosing += bal.closingBalance || 0;

      rows.push({
        id: bal.id,
        employeeCode: emp?.code || '—',
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : bal.employeeId,
        leaveType: lt?.name || bal.leaveTypeId,
        openingBalance: bal.openingBalance || 0,
        accruedBalance: bal.accruedBalance || 0,
        usedBalance: bal.usedBalance || 0,
        reservedBalance: bal.reservedBalance || 0,
        closingBalance: bal.closingBalance || 0,
      });
    }

    const columns = [
      { key: 'employeeCode', label: 'Emp Code', type: 'badge' as const },
      { key: 'employeeName', label: 'Employee Name', type: 'string' as const },
      { key: 'leaveType', label: 'Leave Type', type: 'string' as const },
      { key: 'openingBalance', label: 'Opening', type: 'number' as const },
      { key: 'accruedBalance', label: 'Accrued', type: 'number' as const },
      { key: 'usedBalance', label: 'Availed', type: 'number' as const },
      { key: 'reservedBalance', label: 'Pending', type: 'number' as const },
      { key: 'closingBalance', label: 'Closing Balance', type: 'number' as const },
    ];

    return {
      reportKey: 'LEAVE_BALANCE',
      title: 'Leave Balances & Accrual Register',
      companyId: criteria.companyId,
      generatedAt: new Date().toISOString(),
      generatedBy: actor.name,
      filters: criteria,
      summaryMetrics: {
        'Total Balance Records': rows.length,
        'Cumulative Days Availed': totalAvailed,
        'Cumulative Available Balance': totalClosing,
      },
      columns,
      rows,
      totalRows: rows.length,
      page: criteria.page || 1,
      pageSize: criteria.pageSize || 50,
      totalPages: Math.ceil(rows.length / (criteria.pageSize || 50)) || 1,
    };
  }

  private static generateLeaveTransactionsReport(
    criteria: ReportFilterCriteria,
    actor: { id: string; name: string }
  ): ReportExecutionResult {
    const db = ReportService.db;
    const requests = Array.from(db.leaveRequests.values()).filter(
      (r) => r.companyId === criteria.companyId
    );
    const leaveTypes = db.leaveTypes;

    const rows: Record<string, unknown>[] = [];
    for (const req of requests) {
      if (criteria.startDate && req.startDate < criteria.startDate) continue;
      if (criteria.endDate && req.endDate > criteria.endDate) continue;
      if (criteria.employeeId && req.employeeId !== criteria.employeeId) continue;
      if (criteria.status && req.status !== criteria.status) continue;

      const emp = db.employees.get(req.employeeId);
      const lt = leaveTypes.get(req.leaveTypeId);

      rows.push({
        id: req.id,
        requestCode: (req as any).requestCode || req.id,
        employeeCode: emp?.employeeCode || '—',
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : req.employeeId,
        leaveType: lt?.name || req.leaveTypeId,
        startDate: (req as any).fromDate || (req as any).startDate,
        endDate: (req as any).toDate || (req as any).endDate,
        totalDays: (req as any).requestedUnits || (req as any).chargeableUnits || 1,
        status: req.status,
        reason: req.reason || '—',
        appliedAt: req.createdAt ? req.createdAt.substring(0, 10) : '—',
      });
    }

    const columns = [
      { key: 'requestCode', label: 'Request #', type: 'badge' as const },
      { key: 'employeeName', label: 'Employee Name', type: 'string' as const },
      { key: 'leaveType', label: 'Leave Type', type: 'string' as const },
      { key: 'startDate', label: 'Start Date', type: 'date' as const },
      { key: 'endDate', label: 'End Date', type: 'date' as const },
      { key: 'totalDays', label: 'Days', type: 'number' as const },
      { key: 'status', label: 'Status', type: 'badge' as const },
      { key: 'reason', label: 'Reason', type: 'string' as const },
    ];

    return {
      reportKey: 'LEAVE_TRANSACTIONS',
      title: 'Leave Applications & Transaction History',
      companyId: criteria.companyId,
      generatedAt: new Date().toISOString(),
      generatedBy: actor.name,
      filters: criteria,
      summaryMetrics: {
        'Total Leave Requests': rows.length,
        'Approved Applications': rows.filter((r) => (r.status as string) === 'APPROVED').length,
        'Pending Review': rows.filter((r) => (r.status as string) === 'SUBMITTED' || (r.status as string) === 'PENDING').length,
      },
      columns,
      rows,
      totalRows: rows.length,
      page: criteria.page || 1,
      pageSize: criteria.pageSize || 50,
      totalPages: Math.ceil(rows.length / (criteria.pageSize || 50)) || 1,
    };
  }

  private static generateOvertimeReport(
    criteria: ReportFilterCriteria,
    actor: { id: string; name: string }
  ): ReportExecutionResult {
    const db = ReportService.db;
    const requests = Array.from(db.overtimeRequests.values()).filter(
      (o) => o.companyId === criteria.companyId
    );

    const rows: Record<string, unknown>[] = [];
    let totalOtMinutes = 0;

    for (const ot of requests) {
      if (criteria.startDate && ot.attendanceDate < criteria.startDate) continue;
      if (criteria.endDate && ot.attendanceDate > criteria.endDate) continue;
      if (criteria.employeeId && ot.employeeId !== criteria.employeeId) continue;
      if (criteria.status && ot.status !== criteria.status) continue;

      const emp = db.employees.get(ot.employeeId);
      const minutes = (ot as any).overtimeMinutes || (ot as any).approvedOvertimeMinutes || 0;
      totalOtMinutes += minutes;

      rows.push({
        id: ot.id,
        date: ot.attendanceDate,
        employeeCode: emp?.employeeCode || '—',
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : ot.employeeId,
        overtimeMinutes: minutes,
        overtimeHours: (minutes / 60).toFixed(1) + ' hrs',
        multiplier: (ot as any).rateMultiplier ? `${(ot as any).rateMultiplier}x` : '1.5x',
        status: ot.status,
        reason: ot.reason || 'Project Delivery Overtime',
      });
    }

    const columns = [
      { key: 'date', label: 'Date', type: 'date' as const },
      { key: 'employeeCode', label: 'Emp Code', type: 'badge' as const },
      { key: 'employeeName', label: 'Employee Name', type: 'string' as const },
      { key: 'overtimeHours', label: 'OT Hours', type: 'string' as const },
      { key: 'multiplier', label: 'Multiplier', type: 'string' as const },
      { key: 'status', label: 'Approval Status', type: 'badge' as const },
      { key: 'reason', label: 'Justification', type: 'string' as const },
    ];

    return {
      reportKey: 'OVERTIME',
      title: 'Overtime Authorization & Hours Log',
      companyId: criteria.companyId,
      generatedAt: new Date().toISOString(),
      generatedBy: actor.name,
      filters: criteria,
      summaryMetrics: {
        'Total Overtime Requests': rows.length,
        'Total Approved OT Hours': (totalOtMinutes / 60).toFixed(1),
      },
      columns,
      rows,
      totalRows: rows.length,
      page: criteria.page || 1,
      pageSize: criteria.pageSize || 50,
      totalPages: Math.ceil(rows.length / (criteria.pageSize || 50)) || 1,
    };
  }

  private static generatePayrollRegisterReport(
    criteria: ReportFilterCriteria,
    actor: { id: string; name: string }
  ): ReportExecutionResult {
    const db = ReportService.db;
    const runs = Array.from(db.payrollRuns.values()).filter((r) => r.companyId === criteria.companyId);
    const runEmployees = Array.from(db.payrollRunEmployees.values());

    const rows: Record<string, unknown>[] = [];
    let grossTotal = 0;
    let netTotal = 0;
    let totalDeductions = 0;

    for (const run of runs) {
      const empsInRun = runEmployees.filter((re) => re.payrollRunId === run.id);
      for (const item of empsInRun) {
        if (criteria.employeeId && item.employeeId !== criteria.employeeId) continue;
        if (criteria.status && item.status !== criteria.status) continue;

        const emp = db.employees.get(item.employeeId);
        const gross = item.grossEarnings || (item as any).grossPay || 0;
        const net = item.netPay || 0;
        const ded = item.deductionsTotal || (item as any).totalDeductions || 0;

        grossTotal += gross;
        netTotal += net;
        totalDeductions += ded;

        rows.push({
          id: item.id,
          runName: (run as any).runNumber || run.id,
          employeeCode: emp?.employeeCode || '—',
          employeeName: emp ? `${emp.firstName} ${emp.lastName}` : item.employeeId,
          grossPay: `${gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          totalDeductions: `${ded.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          netPay: `${net.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          status: item.status,
          paymentMethod: 'DIRECT_DEPOSIT',
        });
      }
    }

    const columns = [
      { key: 'runName', label: 'Payroll Run', type: 'string' as const },
      { key: 'employeeCode', label: 'Emp Code', type: 'badge' as const },
      { key: 'employeeName', label: 'Employee Name', type: 'string' as const },
      { key: 'grossPay', label: 'Gross Pay', type: 'currency' as const },
      { key: 'totalDeductions', label: 'Total Deductions', type: 'currency' as const },
      { key: 'netPay', label: 'Net Payout', type: 'currency' as const },
      { key: 'status', label: 'Status', type: 'badge' as const },
      { key: 'paymentMethod', label: 'Payment Mode', type: 'string' as const },
    ];

    return {
      reportKey: 'PAYROLL_REGISTER',
      title: 'Salary Register & Payroll Ledger',
      companyId: criteria.companyId,
      generatedAt: new Date().toISOString(),
      generatedBy: actor.name,
      filters: criteria,
      summaryMetrics: {
        'Total Payslip Records': rows.length,
        'Cumulative Gross Payroll': `${grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        'Cumulative Statutory Deductions': `${totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        'Total Net Payout': `${netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      },
      columns,
      rows,
      totalRows: rows.length,
      page: criteria.page || 1,
      pageSize: criteria.pageSize || 50,
      totalPages: Math.ceil(rows.length / (criteria.pageSize || 50)) || 1,
    };
  }

  private static generateRecruitmentReport(
    criteria: ReportFilterCriteria,
    actor: { id: string; name: string }
  ): ReportExecutionResult {
    const db = ReportService.db;
    const reqs = Array.from(db.jobRequisitions.values()).filter((r) => r.companyId === criteria.companyId);
    const candidates = Array.from(db.candidates.values()).filter((c) => c.companyId === criteria.companyId);
    const applications = Array.from(db.applications.values()).filter((a) => a.companyId === criteria.companyId);

    const rows: Record<string, unknown>[] = [];
    for (const app of applications) {
      const cand = candidates.find((c) => c.id === app.candidateId);
      const req = reqs.find((r) => r.id === app.requisitionId);

      rows.push({
        id: app.id,
        candidateName: cand ? `${cand.firstName} ${cand.lastName}` : 'Candidate',
        jobTitle: req?.title || 'Job Opening',
        requisitionCode: (req as any)?.jobCode || (req as any)?.requisitionNumber || (req as any)?.requisitionCode || 'REQ',
        stage: app.stage,
        status: app.status,
        source: cand?.source || 'LINKEDIN',
        appliedDate: app.createdAt ? app.createdAt.substring(0, 10) : '—',
      });
    }

    const columns = [
      { key: 'candidateName', label: 'Candidate Name', type: 'string' as const },
      { key: 'jobTitle', label: 'Job Title', type: 'string' as const },
      { key: 'requisitionCode', label: 'Requisition Code', type: 'badge' as const },
      { key: 'stage', label: 'Recruitment Stage', type: 'badge' as const },
      { key: 'status', label: 'Application Status', type: 'badge' as const },
      { key: 'source', label: 'Source', type: 'string' as const },
      { key: 'appliedDate', label: 'Applied Date', type: 'date' as const },
    ];

    return {
      reportKey: 'RECRUITMENT',
      title: 'Recruitment Funnel & Pipeline Analytics',
      companyId: criteria.companyId,
      generatedAt: new Date().toISOString(),
      generatedBy: actor.name,
      filters: criteria,
      summaryMetrics: {
        'Open Requisitions': reqs.filter((r) => (r.status as string) === 'OPEN' || (r.status as string) === 'APPROVED').length,
        'Active Candidates': candidates.length,
        'Applications In Pipeline': applications.length,
        'Offers Issued': applications.filter((a) => (a.stage as string) === 'OFFER').length,
      },
      columns,
      rows,
      totalRows: rows.length,
      page: criteria.page || 1,
      pageSize: criteria.pageSize || 50,
      totalPages: Math.ceil(rows.length / (criteria.pageSize || 50)) || 1,
    };
  }

  private static generatePerformanceReport(
    criteria: ReportFilterCriteria,
    actor: { id: string; name: string }
  ): ReportExecutionResult {
    const db = ReportService.db;
    const cycles = Array.from(db.performanceCycles.values()).filter((c) => c.companyId === criteria.companyId);
    const reviews = Array.from(db.performanceReviews.values()).filter((r) => r.companyId === criteria.companyId);
    const goals = Array.from(db.performanceGoals.values()).filter((g) => g.companyId === criteria.companyId);

    const rows: Record<string, unknown>[] = [];
    let completedReviews = 0;

    for (const rev of reviews) {
      const emp = db.employees.get(rev.employeeId);
      const cycle = cycles.find((c) => c.id === rev.cycleId);
      const empGoals = goals.filter((g) => g.employeeId === rev.employeeId && g.cycleId === rev.cycleId);
      const avgGoalProgress = empGoals.length
        ? Math.round(empGoals.reduce((sum, g) => sum + ((g as any).progressPercentage || (g as any).progress || 100), 0) / empGoals.length)
        : 100;

      if ((rev.status as string) === 'COMPLETED') completedReviews++;

      rows.push({
        id: rev.id,
        cycleName: cycle?.name || 'Review Cycle',
        employeeCode: emp?.employeeCode || '—',
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : rev.employeeId,
        status: rev.status,
        selfRating: (rev as any).selfRating ? `${(rev as any).selfRating} / 5.0` : '—',
        managerRating: (rev as any).managerRating ? `${(rev as any).managerRating} / 5.0` : '—',
        finalRating: (rev as any).finalRating ? `${(rev as any).finalRating} / 5.0` : ((rev as any).managerRating ? `${(rev as any).managerRating} / 5.0` : 'Pending'),
        goalAchievement: `${avgGoalProgress}%`,
        recommendation: (rev as any).recommendation || 'NO_CHANGE',
      });
    }

    const columns = [
      { key: 'cycleName', label: 'Performance Cycle', type: 'string' as const },
      { key: 'employeeCode', label: 'Emp Code', type: 'badge' as const },
      { key: 'employeeName', label: 'Employee Name', type: 'string' as const },
      { key: 'status', label: 'Review Stage', type: 'badge' as const },
      { key: 'selfRating', label: 'Self Rating', type: 'string' as const },
      { key: 'managerRating', label: 'Manager Rating', type: 'string' as const },
      { key: 'finalRating', label: 'Final Score', type: 'string' as const },
      { key: 'goalAchievement', label: 'Goal Progress', type: 'string' as const },
      { key: 'recommendation', label: 'Recommendation', type: 'badge' as const },
    ];

    return {
      reportKey: 'PERFORMANCE',
      title: 'Performance Appraisal & Review Summary',
      companyId: criteria.companyId,
      generatedAt: new Date().toISOString(),
      generatedBy: actor.name,
      filters: criteria,
      summaryMetrics: {
        'Total Reviews Assigned': reviews.length,
        'Completed Appraisals': completedReviews,
        'Goals Monitored': goals.length,
        'Cycle Completion Rate': reviews.length ? `${Math.round((completedReviews / reviews.length) * 100)}%` : '100%',
      },
      columns,
      rows,
      totalRows: rows.length,
      page: criteria.page || 1,
      pageSize: criteria.pageSize || 50,
      totalPages: Math.ceil(rows.length / (criteria.pageSize || 50)) || 1,
    };
  }

  private static generateExpensesReport(
    criteria: ReportFilterCriteria,
    actor: { id: string; name: string }
  ): ReportExecutionResult {
    const db = ReportService.db;
    const claims = Array.from(db.expenseClaims.values()).filter((c) => c.companyId === criteria.companyId);

    const rows: Record<string, unknown>[] = [];
    let totalClaimed = 0;
    let totalApproved = 0;

    for (const claim of claims) {
      if (criteria.employeeId && claim.employeeId !== criteria.employeeId) continue;
      if (criteria.status && claim.status !== criteria.status) continue;

      const emp = db.employees.get(claim.employeeId);
      totalClaimed += claim.totalAmount || 0;
      const approved = (claim as any).approvedAmount || claim.totalAmount || 0;
      if (claim.status === 'FINANCE_APPROVED' || claim.status === 'PAID') {
        totalApproved += approved;
      }

      rows.push({
        id: claim.id,
        claimNumber: claim.claimNumber,
        title: claim.title,
        employeeCode: emp?.employeeCode || '—',
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : claim.employeeId,
        currency: claim.currency,
        totalAmount: `${(claim.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        approvedAmount: (claim as any).approvedAmount ? `${approved.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—',
        status: claim.status,
        submittedAt: claim.submittedAt ? claim.submittedAt.substring(0, 10) : '—',
      });
    }

    const columns = [
      { key: 'claimNumber', label: 'Claim #', type: 'badge' as const },
      { key: 'title', label: 'Claim Description', type: 'string' as const },
      { key: 'employeeName', label: 'Employee Name', type: 'string' as const },
      { key: 'totalAmount', label: 'Claimed Amount', type: 'currency' as const },
      { key: 'approvedAmount', label: 'Approved Amount', type: 'currency' as const },
      { key: 'status', label: 'Status', type: 'badge' as const },
      { key: 'submittedAt', label: 'Date', type: 'date' as const },
    ];

    return {
      reportKey: 'EXPENSES',
      title: 'Expense Claims & Reimbursement Ledger',
      companyId: criteria.companyId,
      generatedAt: new Date().toISOString(),
      generatedBy: actor.name,
      filters: criteria,
      summaryMetrics: {
        'Total Claims Submitted': claims.length,
        'Cumulative Claimed Amount': `${totalClaimed.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        'Total Approved Reimbursements': `${totalApproved.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      },
      columns,
      rows,
      totalRows: rows.length,
      page: criteria.page || 1,
      pageSize: criteria.pageSize || 50,
      totalPages: Math.ceil(rows.length / (criteria.pageSize || 50)) || 1,
    };
  }

  private static generateAssetsReport(
    criteria: ReportFilterCriteria,
    actor: { id: string; name: string }
  ): ReportExecutionResult {
    const db = ReportService.db;
    const assets = Array.from(db.assetMaster.values()).filter((a) => a.companyId === criteria.companyId);
    const categories = db.assetCategories;
    const assignments = Array.from(db.assetAssignments.values()).filter((asg) => !asg.isReturned);

    const rows: Record<string, unknown>[] = [];
    let allocatedCount = 0;
    let availableCount = 0;

    for (const asset of assets) {
      const cat = categories.get(asset.categoryId);
      const activeAsg = assignments.find((asg) => asg.assetId === asset.id);
      const custodian = activeAsg ? db.employees.get(activeAsg.employeeId) : null;

      if (asset.status === 'ASSIGNED') allocatedCount++;
      if (asset.status === 'AVAILABLE') availableCount++;

      rows.push({
        id: asset.id,
        assetTag: asset.assetCode || (asset as any).assetTag || asset.id,
        name: asset.name,
        category: cat?.name || asset.categoryId,
        serialNumber: asset.serialNumber || '—',
        status: asset.status,
        custodian: custodian ? `${custodian.firstName} ${custodian.lastName} (${custodian.employeeCode})` : 'In Inventory Pool',
        condition: asset.condition,
        purchaseCost: asset.purchaseCost ? `${asset.purchaseCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—',
      });
    }

    const columns = [
      { key: 'assetTag', label: 'Asset Tag', type: 'badge' as const },
      { key: 'name', label: 'Asset Name', type: 'string' as const },
      { key: 'category', label: 'Category', type: 'string' as const },
      { key: 'serialNumber', label: 'Serial Number', type: 'string' as const },
      { key: 'status', label: 'Allocation Status', type: 'badge' as const },
      { key: 'custodian', label: 'Current Custodian', type: 'string' as const },
      { key: 'condition', label: 'Condition', type: 'badge' as const },
      { key: 'purchaseCost', label: 'Purchase Cost', type: 'currency' as const },
    ];

    return {
      reportKey: 'ASSETS',
      title: 'Asset Inventory & Custody Allocation',
      companyId: criteria.companyId,
      generatedAt: new Date().toISOString(),
      generatedBy: actor.name,
      filters: criteria,
      summaryMetrics: {
        'Total Registered Assets': assets.length,
        'Allocated to Staff': allocatedCount,
        'Available in Stock': availableCount,
        'Hardware Utilization': assets.length ? `${Math.round((allocatedCount / assets.length) * 100)}%` : '0%',
      },
      columns,
      rows,
      totalRows: rows.length,
      page: criteria.page || 1,
      pageSize: criteria.pageSize || 50,
      totalPages: Math.ceil(rows.length / (criteria.pageSize || 50)) || 1,
    };
  }

  private static generateOffboardingReport(
    criteria: ReportFilterCriteria,
    actor: { id: string; name: string }
  ): ReportExecutionResult {
    const db = ReportService.db;
    const requests = Array.from(db.offboardingRequests.values()).filter((r) => r.companyId === criteria.companyId);
    const tasks = Array.from(db.offboardingClearanceItems.values());

    const rows: Record<string, unknown>[] = [];
    for (const req of requests) {
      const emp = db.employees.get(req.employeeId);
      const reqTasks = tasks.filter((t) => (t as any).requestId === req.id || (t as any).offboardingRequestId === req.id);
      const completedTasks = reqTasks.filter((t) => (t.status as string) === 'COMPLETED' || (t.status as string) === 'APPROVED').length;
      const clearanceRate = reqTasks.length ? Math.round((completedTasks / reqTasks.length) * 100) : 100;

      rows.push({
        id: req.id,
        requestCode: (req as any).requestCode || req.id,
        employeeCode: emp?.employeeCode || '—',
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : req.employeeId,
        type: req.separationType || (req as any).type,
        resignationDate: req.resignationNoticeDate || (req as any).resignationDate,
        lastWorkingDate: req.lastWorkingDay || (req as any).lastWorkingDate,
        clearanceProgress: `${clearanceRate}% (${completedTasks}/${reqTasks.length})`,
        status: req.status,
        reasonCategory: req.reason || (req as any).reasonCategory || 'CAREER_GROWTH',
      });
    }

    const columns = [
      { key: 'requestCode', label: 'Separation #', type: 'badge' as const },
      { key: 'employeeName', label: 'Employee Name', type: 'string' as const },
      { key: 'type', label: 'Separation Type', type: 'badge' as const },
      { key: 'resignationDate', label: 'Resignation Date', type: 'date' as const },
      { key: 'lastWorkingDate', label: 'Last Working Day', type: 'date' as const },
      { key: 'clearanceProgress', label: 'Clearance Status', type: 'string' as const },
      { key: 'status', label: 'Workflow Status', type: 'badge' as const },
      { key: 'reasonCategory', label: 'Reason Category', type: 'string' as const },
    ];

    return {
      reportKey: 'OFFBOARDING',
      title: 'Separation, Clearance & Attrition Dossier',
      companyId: criteria.companyId,
      generatedAt: new Date().toISOString(),
      generatedBy: actor.name,
      filters: criteria,
      summaryMetrics: {
        'Total Separation Cases': requests.length,
        'Completed Separations': requests.filter((r) => (r.status as string) === 'COMPLETED').length,
        'In-Progress Clearances': requests.filter((r) => (r.status as string) !== 'COMPLETED' && (r.status as string) !== 'CANCELLED' && (r.status as string) !== 'WITHDRAWN').length,
      },
      columns,
      rows,
      totalRows: rows.length,
      page: criteria.page || 1,
      pageSize: criteria.pageSize || 50,
      totalPages: Math.ceil(rows.length / (criteria.pageSize || 50)) || 1,
    };
  }

  // ==========================================
  // CSV Export Helper
  // ==========================================
  private static convertToCSV(
    columns: Array<{ key: string; label: string }>,
    rows: Record<string, unknown>[]
  ): string {
    const headerLine = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',');
    const dataLines = rows.map((row) =>
      columns
        .map((c) => {
          const val = row[c.key];
          if (val === undefined || val === null) return '""';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',')
    );
    return [headerLine, ...dataLines].join('\n');
  }
}
