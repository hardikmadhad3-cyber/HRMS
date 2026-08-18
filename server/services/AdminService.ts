import { RelationalDatabase } from '../database/RelationalDatabase.js';
import { AuthService } from './AuthService.js';
import { AuditService } from './AuditService.js';
import {
  CustomRoleDefinition,
  SystemSetting,
  UserCompanyAccessEntry,
} from '../../src/types/platform.js';
import { AuthUser, PermissionKey, UserRole } from '../../src/types/auth.js';
import { AuditLogEntry } from '../../src/types/audit.js';

export class AdminService {
  private static db = RelationalDatabase.getInstance();

  // ==========================================
  // 1. User Management
  // ==========================================

  public static async listUsers(
    companyId: string,
    search?: string
  ): Promise<Array<AuthUser & { assignedCompanies: UserCompanyAccessEntry[] }>> {
    const allUsers = AuthService.getAllUsers();
    const companyAccess = Array.from(AdminService.db.userCompanyAccess.values());

    let filtered = allUsers.filter((u) => {
      // User must have access to this company or have global access
      const userAccess = companyAccess.filter((uca) => uca.userId === u.id);
      return (
        u.companyIds.includes(companyId) ||
        u.companyIds.includes('ALL') ||
        userAccess.some((a) => a.companyId === companyId)
      );
    });

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q)
      );
    }

    return filtered.map((u) => ({
      ...u,
      assignedCompanies: companyAccess.filter((uca) => uca.userId === u.id),
    }));
  }

  public static async createUser(
    userData: {
      email: string;
      name: string;
      role: UserRole | string;
      companyIds: string[];
      employeeId?: string;
      departmentId?: string;
      designationId?: string;
      isActive?: boolean;
    },
    actor: { id: string; name?: string; fullName?: string; email: string; companyId: string }
  ): Promise<AuthUser> {
    const id = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const roleKey = userData.role as UserRole;
    const permissions = AuthService.getPermissionsForRole(roleKey);
    const actorDisplayName = actor.fullName || actor.name || 'Admin';

    const newUser: AuthUser = {
      id,
      username: userData.email.split('@')[0],
      email: userData.email.toLowerCase().trim(),
      fullName: userData.name.trim(),
      role: roleKey,
      permissions,
      companyIds: userData.companyIds && userData.companyIds.length ? userData.companyIds : [actor.companyId],
      activeCompanyId: userData.companyIds && userData.companyIds.length ? userData.companyIds[0] : actor.companyId,
      employeeId: userData.employeeId,
      departmentId: userData.departmentId,
      designationId: userData.designationId,
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      lastLoginAt: undefined,
    };

    // Save to AuthService in-memory repository
    AuthService.saveUser(newUser);

    // Save company access records
    for (const compId of newUser.companyIds) {
      const comp = AdminService.db.companies.get(compId);
      const uca: UserCompanyAccessEntry = {
        id: `uca-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        userId: newUser.id,
        companyId: compId,
        companyName: comp?.name || 'Company',
        companyCode: comp?.code || 'COMP',
        isDefault: compId === newUser.companyIds[0],
        grantedAt: new Date().toISOString(),
        grantedBy: actor.id,
      };
      AdminService.db.userCompanyAccess.set(uca.id, uca);
    }

    await AuditService.log({
      actorId: actor.id,
      actorName: actorDisplayName,
      actorEmail: actor.email,
      action: 'USER_CREATE',
      targetModule: 'Administration',
      targetRecordId: newUser.id,
      companyId: actor.companyId,
      changesSummary: `Created system user account for '${newUser.fullName}' (${newUser.email}) with role '${newUser.role}' and access to ${newUser.companyIds.length} companies.`,
    });

    return newUser;
  }

  public static async updateUser(
    userId: string,
    updateData: {
      name?: string;
      role?: UserRole | string;
      companyIds?: string[];
      employeeId?: string;
      departmentId?: string;
      designationId?: string;
      isActive?: boolean;
      permissions?: PermissionKey[];
    },
    actor: { id: string; name?: string; fullName?: string; email: string; companyId: string }
  ): Promise<AuthUser> {
    const existing = AuthService.findUserById(userId);
    if (!existing) {
      throw new Error(`User ${userId} not found`);
    }

    const roleKey = (updateData.role as UserRole) || existing.role;
    const permissions =
      updateData.permissions || AuthService.getPermissionsForRole(roleKey);
    const actorDisplayName = actor.fullName || actor.name || 'Admin';

    const updated: AuthUser = {
      id: existing.id,
      username: existing.username,
      email: existing.email,
      fullName: updateData.name !== undefined ? updateData.name : existing.fullName,
      avatarUrl: existing.avatarUrl,
      employeeCode: existing.employeeCode,
      role: roleKey,
      permissions,
      companyIds: updateData.companyIds || existing.companyIds,
      activeCompanyId: existing.activeCompanyId,
      departmentId: updateData.departmentId !== undefined ? updateData.departmentId : existing.departmentId,
      designationId: updateData.designationId !== undefined ? updateData.designationId : existing.designationId,
      isActive: updateData.isActive !== undefined ? updateData.isActive : existing.isActive,
      lastLoginAt: existing.lastLoginAt,
    };

    AuthService.saveUser(updated);

    // Update company access entries
    if (updateData.companyIds) {
      // Remove old access entries
      for (const [id, uca] of AdminService.db.userCompanyAccess.entries()) {
        if (uca.userId === userId) {
          AdminService.db.userCompanyAccess.delete(id);
        }
      }
      // Re-grant new ones
      for (const compId of updateData.companyIds) {
        const comp = AdminService.db.companies.get(compId);
        const uca: UserCompanyAccessEntry = {
          id: `uca-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          userId: updated.id,
          companyId: compId,
          companyName: comp?.name || 'Company',
          companyCode: comp?.code || 'COMP',
          isDefault: compId === updateData.companyIds[0],
          grantedAt: new Date().toISOString(),
          grantedBy: actor.id,
        };
        AdminService.db.userCompanyAccess.set(uca.id, uca);
      }
    }

    await AuditService.log({
      actorId: actor.id,
      actorName: actorDisplayName,
      actorEmail: actor.email,
      action: 'USER_UPDATE',
      targetModule: 'Administration',
      targetRecordId: userId,
      companyId: actor.companyId,
      changesSummary: `Updated user profile for '${updated.fullName}' (${updated.email}). Role: ${updated.role}, Active: ${updated.isActive}.`,
    });

    return updated;
  }

  public static async toggleUserStatus(
    userId: string,
    isActive: boolean,
    actor: { id: string; name?: string; fullName?: string; email: string; companyId: string }
  ): Promise<AuthUser> {
    const existing = AuthService.findUserById(userId);
    if (!existing) {
      throw new Error(`User ${userId} not found`);
    }

    existing.isActive = isActive;
    AuthService.saveUser(existing);
    const actorDisplayName = actor.fullName || actor.name || 'Admin';

    await AuditService.log({
      actorId: actor.id,
      actorName: actorDisplayName,
      actorEmail: actor.email,
      action: isActive ? 'USER_ACTIVATE' : 'USER_DEACTIVATE',
      targetModule: 'Administration',
      targetRecordId: userId,
      companyId: actor.companyId,
      changesSummary: `${isActive ? 'Activated' : 'Deactivated'} user account for '${existing.fullName}' (${existing.email}).`,
    });

    return AuthService.toAuthUser(existing);
  }

  // ==========================================
  // 2. Roles & Permissions Management
  // ==========================================

  public static async listRoles(companyId: string): Promise<CustomRoleDefinition[]> {
    const customRoles = Array.from(AdminService.db.customRoles.values()).filter(
      (r) => r.companyId === companyId || r.isSystemRole || r.isSystem
    );
    const allUsers = AuthService.getAllUsers();

    return customRoles.map((role) => ({
      ...role,
      userCount: allUsers.filter((u) => u.role === (role.roleKey || role.code)).length,
    }));
  }

  public static async createRole(
    roleData: {
      roleKey: string;
      name: string;
      description: string;
      permissions: PermissionKey[];
    },
    actor: { id: string; name?: string; fullName?: string; email: string; companyId: string }
  ): Promise<CustomRoleDefinition> {
    const id = `role-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const formattedKey = roleData.roleKey.toUpperCase().replace(/\s+/g, '_');

    const newRole: CustomRoleDefinition = {
      id,
      companyId: actor.companyId,
      code: formattedKey,
      roleKey: formattedKey,
      name: roleData.name,
      description: roleData.description,
      isSystemRole: false,
      isSystem: false,
      permissions: roleData.permissions,
      userCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    AdminService.db.customRoles.set(id, newRole);

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName || actor.name || 'Admin',
      actorEmail: actor.email,
      action: 'ROLE_CREATE',
      targetModule: 'Administration',
      targetRecordId: id,
      companyId: actor.companyId,
      changesSummary: `Created custom RBAC role '${newRole.name}' (${newRole.code}) with ${newRole.permissions.length} granular permissions.`,
    });

    return newRole;
  }

  public static async updateRole(
    roleId: string,
    roleData: {
      name?: string;
      description?: string;
      permissions?: PermissionKey[];
    },
    actor: { id: string; name?: string; fullName?: string; email: string; companyId: string }
  ): Promise<CustomRoleDefinition> {
    let role = AdminService.db.customRoles.get(roleId);
    if (!role) {
      // Look up by roleKey
      role = Array.from(AdminService.db.customRoles.values()).find((r) => r.roleKey === roleId || r.code === roleId);
    }
    if (!role) {
      throw new Error(`Role ${roleId} not found`);
    }

    if (roleData.name) role.name = roleData.name;
    if (roleData.description) role.description = roleData.description;
    if (roleData.permissions) role.permissions = roleData.permissions;
    role.updatedAt = new Date().toISOString();

    AdminService.db.customRoles.set(role.id, role);

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName || actor.name || 'Admin',
      actorEmail: actor.email,
      action: 'ROLE_UPDATE',
      targetModule: 'Administration',
      targetRecordId: role.id,
      companyId: actor.companyId,
      changesSummary: `Updated permissions for role '${role.name}' (${role.code || role.roleKey}). Granted permissions count: ${role.permissions.length}.`,
    });

    return role;
  }

  public static getGranularPermissionsCatalog(): Array<{
    category: string;
    description: string;
    permissions: Array<{ key: PermissionKey; label: string; description: string }>;
  }> {
    return [
      {
        category: 'Organization & Core Structure',
        description: 'Company hierarchies, business units, branches, departments, grades and designations.',
        permissions: [
          { key: PermissionKey.ORGANIZATION_VIEW, label: 'View Organization Structure', description: 'Read-only access to organizational hierarchy.' },
          { key: PermissionKey.ORGANIZATION_MANAGE, label: 'Manage Organization Master Data', description: 'Create and update departments, branches and grades.' },
        ],
      },
      {
        category: 'Employee Lifecycle & Master Data',
        description: 'Staff demographics, assignments, statutory details, bank accounts and history.',
        permissions: [
          { key: PermissionKey.EMPLOYEE_VIEW, label: 'View Employee Profiles', description: 'Browse and inspect staff master profiles.' },
          { key: PermissionKey.EMPLOYEE_MANAGE, label: 'Manage Employee Master Data', description: 'Create, update and transition employee records.' },
        ],
      },
      {
        category: 'Time, Attendance & Shifts',
        description: 'Clock-in/out, biometric sync, anomaly regularizations, shift scheduling and periods.',
        permissions: [
          { key: PermissionKey.ATTENDANCE_VIEW, label: 'View Attendance Records', description: 'Inspect daily attendance and attendance logs.' },
          { key: PermissionKey.ATTENDANCE_RECORD, label: 'Record Personal Attendance', description: 'Self-service web punch and biometric clock-in.' },
          { key: PermissionKey.ATTENDANCE_APPROVE, label: 'Approve Attendance Regularization', description: 'Authorize punctuality correction requests.' },
          { key: PermissionKey.ATTENDANCE_MANAGE, label: 'Manage Attendance Settings & Logs', description: 'Directly modify attendance registers and policies.' },
          { key: PermissionKey.SHIFT_VIEW, label: 'View Shift Roster', description: 'Inspect department and employee shift assignments.' },
          { key: PermissionKey.SHIFT_MANAGE, label: 'Manage Shift Definitions', description: 'Create and configure shift timings and grace periods.' },
          { key: PermissionKey.SHIFT_ASSIGN, label: 'Assign Shifts to Employees', description: 'Publish monthly shift schedules to employees.' },
          { key: PermissionKey.OVERTIME_VIEW, label: 'View Overtime Requests', description: 'Inspect overtime claims and logs.' },
          { key: PermissionKey.OVERTIME_APPLY, label: 'Submit Overtime Request', description: 'Self-service application for overtime compensation.' },
          { key: PermissionKey.OVERTIME_APPROVE, label: 'Approve Overtime Claims', description: 'Authorize manager approval for overtime pay.' },
          { key: PermissionKey.OVERTIME_MANAGE, label: 'Manage Overtime Policies', description: 'Configure multipliers and rate tiers.' },
          { key: PermissionKey.ATTENDANCE_PERIOD_VIEW, label: 'View Attendance Periods', description: 'Inspect monthly attendance lock periods.' },
          { key: PermissionKey.ATTENDANCE_PERIOD_MANAGE, label: 'Manage Attendance Periods', description: 'Generate and configure period boundaries.' },
          { key: PermissionKey.ATTENDANCE_PERIOD_FINALIZE, label: 'Finalize & Lock Attendance Period', description: 'Freeze monthly summaries for payroll handoff.' },
          { key: PermissionKey.ATTENDANCE_PERIOD_REOPEN, label: 'Reopen Finalized Attendance Period', description: 'Unlock finalized periods for emergency corrections.' },
        ],
      },
      {
        category: 'Leave Management & Balances',
        description: 'Leave policies, accruals, carry-forward, applications and approval workflows.',
        permissions: [
          { key: PermissionKey.LEAVE_VIEW, label: 'View Leave Balances & Requests', description: 'Inspect employee leave records.' },
          { key: PermissionKey.LEAVE_APPLY, label: 'Apply for Leave', description: 'Self-service leave application portal.' },
          { key: PermissionKey.LEAVE_APPROVE, label: 'Approve Leave Applications', description: 'Authorize manager and HR leave approvals.' },
        ],
      },
      {
        category: 'Payroll & Compensation',
        description: 'Salary structures, compensation assignments, payroll runs, payslips and statutory tax.',
        permissions: [
          { key: PermissionKey.PAYROLL_VIEW, label: 'View Full Company Payroll', description: 'Inspect company-wide payroll runs and registers.' },
          { key: PermissionKey.PAYROLL_MANAGE, label: 'Execute & Manage Payroll Runs', description: 'Draft, calculate, finalize and cancel payroll cycles.' },
          { key: PermissionKey.PAYROLL_PAYSLIP_SELF_VIEW, label: 'View Personal Payslips', description: 'Self-service access to employee payslip PDFs and breakdowns.' },
        ],
      },
      {
        category: 'Talent Acquisition & Recruitment',
        description: 'Job requisitions, candidate pipeline, interviews, scorecards and offers.',
        permissions: [
          { key: PermissionKey.RECRUITMENT_VIEW, label: 'View Recruitment Funnel', description: 'Inspect job openings and candidate resumes.' },
          { key: PermissionKey.RECRUITMENT_MANAGE, label: 'Manage Requisitions & Hiring Stages', description: 'Create openings, schedule interviews and issue offers.' },
          { key: PermissionKey.ONBOARDING_MANAGE, label: 'Manage Employee Onboarding', description: 'Coordinate onboarding checklists and orientation.' },
        ],
      },
      {
        category: 'Performance Management',
        description: 'Appraisal cycles, OKRs, goals, self-reviews, manager ratings and 9-box analytics.',
        permissions: [
          { key: PermissionKey.PERFORMANCE_VIEW, label: 'View Performance Appraisals', description: 'Inspect employee goals and evaluation reviews.' },
          { key: PermissionKey.PERFORMANCE_MANAGE, label: 'Manage Review Cycles & Goals', description: 'Create appraisal cycles and assign objectives.' },
        ],
      },
      {
        category: 'Expenses, Assets & Separation',
        description: 'Reimbursements, hardware asset custody register and employee offboarding clearances.',
        permissions: [
          { key: PermissionKey.EXPENSE_APPLY, label: 'Submit Expense Claims', description: 'Self-service expense receipt submissions.' },
          { key: PermissionKey.EXPENSE_APPROVE, label: 'Approve Expense Reimbursements', description: 'Authorize manager & finance reimbursement.' },
          { key: PermissionKey.ASSET_VIEW, label: 'View Asset Register', description: 'Browse company hardware/software assets.' },
          { key: PermissionKey.ASSET_MANAGE, label: 'Manage Asset Master & Custody', description: 'Allocate and recover hardware from staff.' },
          { key: PermissionKey.OFFBOARDING_VIEW, label: 'View Offboarding Cases', description: 'Inspect resignations and clearance progress.' },
          { key: PermissionKey.OFFBOARDING_MANAGE, label: 'Manage Separation & Clearances', description: 'Initiate offboarding and complete department handoffs.' },
        ],
      },
      {
        category: 'Reporting, Auditing & System Governance',
        description: 'Operational BI analytics, export pipelines, security audit trails and user access.',
        permissions: [
          { key: PermissionKey.REPORTS_VIEW, label: 'Access Report Center', description: 'Run all 13 enterprise operational reports.' },
          { key: PermissionKey.REPORTS_EXPORT, label: 'Export Reports to CSV / JSON', description: 'Download sensitive business intelligence extracts.' },
          { key: PermissionKey.ADMIN_USERS_MANAGE, label: 'Manage User Accounts & Access', description: 'Create, update and assign user security credentials.' },
          { key: PermissionKey.ADMIN_AUDIT_VIEW, label: 'Inspect System Audit Logs', description: 'Full immutable compliance audit trail access.' },
        ],
      },
    ];
  }

  // ==========================================
  // 3. System Settings
  // ==========================================

  public static async getSettings(
    companyId: string,
    category?: SystemSetting['category']
  ): Promise<SystemSetting[]> {
    let settings = Array.from(AdminService.db.systemSettings.values()).filter(
      (s) => s.companyId === companyId
    );

    if (category) {
      settings = settings.filter((s) => s.category === category);
    }

    return settings;
  }

  public static async updateSetting(
    companyId: string,
    settingKey: string,
    settingValue: string,
    actor: { id: string; name: string; email: string }
  ): Promise<SystemSetting> {
    let existing = Array.from(AdminService.db.systemSettings.values()).find(
      (s) => s.companyId === companyId && s.settingKey === settingKey
    );

    if (existing) {
      existing.settingValue = settingValue;
      existing.value = settingValue;
      existing.updatedAt = new Date().toISOString();
      existing.updatedBy = actor.id;
      AdminService.db.systemSettings.set(existing.id, existing);
    } else {
      const id = `sett-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
      existing = {
        id,
        companyId,
        key: settingKey,
        settingKey,
        value: settingValue,
        settingValue,
        category: settingKey.split('.')[0].toUpperCase() as SystemSetting['category'],
        updatedAt: new Date().toISOString(),
        updatedBy: actor.id,
      };
      AdminService.db.systemSettings.set(id, existing);
    }

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'SETTING_UPDATE',
      targetModule: 'Administration',
      targetRecordId: existing.id,
      companyId,
      changesSummary: `Updated system configuration '${settingKey}' to '${settingValue}'.`,
    });

    return existing;
  }

  public static async batchUpdateSettings(
    companyId: string,
    settings: Array<{ key: string; value: string; category?: SystemSetting['category']; description?: string }>,
    actor: { id: string; name: string; email: string }
  ): Promise<SystemSetting[]> {
    const updatedList: SystemSetting[] = [];

    for (const item of settings) {
      let existing = Array.from(AdminService.db.systemSettings.values()).find(
        (s) => s.companyId === companyId && (s.settingKey === item.key || s.key === item.key)
      );

      if (existing) {
        existing.settingValue = item.value;
        existing.value = item.value;
        if (item.category) existing.category = item.category;
        if (item.description) existing.description = item.description;
        existing.updatedAt = new Date().toISOString();
        existing.updatedBy = actor.id;
        AdminService.db.systemSettings.set(existing.id, existing);
        updatedList.push(existing);
      } else {
        const id = `sett-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
        const newSetting: SystemSetting = {
          id,
          companyId,
          key: item.key,
          settingKey: item.key,
          value: item.value,
          settingValue: item.value,
          category: item.category || 'GENERAL',
          description: item.description,
          updatedAt: new Date().toISOString(),
          updatedBy: actor.id,
        };
        AdminService.db.systemSettings.set(id, newSetting);
        updatedList.push(newSetting);
      }
    }

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'SYSTEM_SETTINGS_BATCH_UPDATE',
      targetModule: 'Administration',
      companyId,
      changesSummary: `Batch updated ${updatedList.length} platform parameters for company ${companyId}.`,
    });

    return updatedList;
  }

  // ==========================================
  // 4. Audit Trail Querying
  // ==========================================

  public static async queryAuditLogs(criteria: {
    companyId: string;
    actorId?: string;
    targetModule?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLogEntry[]; totalCount: number }> {
    let logs = AuditService.getLogsForCompany(criteria.companyId);

    if (criteria.actorId) {
      logs = logs.filter((l) => l.actorId === criteria.actorId);
    }
    if (criteria.targetModule) {
      logs = logs.filter((l) => l.targetModule.toLowerCase() === criteria.targetModule!.toLowerCase());
    }
    if (criteria.startDate) {
      logs = logs.filter((l) => l.timestamp >= criteria.startDate!);
    }
    if (criteria.endDate) {
      logs = logs.filter((l) => l.timestamp <= criteria.endDate!);
    }
    if (criteria.search) {
      const q = criteria.search.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.action.toLowerCase().includes(q) ||
          l.actorName.toLowerCase().includes(q) ||
          (l.changesSummary && l.changesSummary.toLowerCase().includes(q))
      );
    }

    const totalCount = logs.length;
    const offset = criteria.offset || 0;
    const limit = criteria.limit || 50;
    const paginated = logs.slice(offset, offset + limit);

    return {
      logs: paginated,
      totalCount,
    };
  }
}
