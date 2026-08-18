import { AuthUser, UserRole, PermissionKey } from '../../src/types/auth.js';

export interface UserSession {
  sessionId: string;
  userId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface StoredUser {
  id: string;
  username: string;
  email: string;
  passwordHash?: string;
  fullName: string;
  avatarUrl: string;
  employeeCode: string;
  role: UserRole;
  companyIds: string[];
  activeCompanyId: string;
  departmentId: string;
  designationId: string;
  isActive: boolean;
  lastLoginAt?: string;
}

export class AuthService {
  // Authoritative role permission mapping (relational auth_role_permissions)
  private static rolePermissionsMap: Record<UserRole, PermissionKey[]> = {
    [UserRole.SUPER_ADMIN]: Object.values(PermissionKey),
    [UserRole.HR_ADMIN]: [
      PermissionKey.ORGANIZATION_VIEW,
      PermissionKey.ORGANIZATION_MANAGE,
      PermissionKey.EMPLOYEE_VIEW,
      PermissionKey.EMPLOYEE_MANAGE,
      PermissionKey.ATTENDANCE_VIEW,
      PermissionKey.ATTENDANCE_RECORD,
      PermissionKey.ATTENDANCE_APPROVE,
      PermissionKey.ATTENDANCE_MANAGE,
      PermissionKey.SHIFT_VIEW,
      PermissionKey.SHIFT_MANAGE,
      PermissionKey.SHIFT_ASSIGN,
      PermissionKey.OVERTIME_VIEW,
      PermissionKey.OVERTIME_APPLY,
      PermissionKey.OVERTIME_APPROVE,
      PermissionKey.OVERTIME_MANAGE,
      PermissionKey.ATTENDANCE_PERIOD_VIEW,
      PermissionKey.ATTENDANCE_PERIOD_MANAGE,
      PermissionKey.ATTENDANCE_PERIOD_FINALIZE,
      PermissionKey.ATTENDANCE_PERIOD_REOPEN,
      PermissionKey.LEAVE_VIEW,
      PermissionKey.LEAVE_APPLY,
      PermissionKey.LEAVE_APPROVE,
      PermissionKey.RECRUITMENT_VIEW,
      PermissionKey.RECRUITMENT_MANAGE,
      PermissionKey.ONBOARDING_MANAGE,
      PermissionKey.PERFORMANCE_VIEW,
      PermissionKey.PERFORMANCE_MANAGE,
      PermissionKey.ASSET_VIEW,
      PermissionKey.ASSET_MANAGE,
      PermissionKey.OFFBOARDING_VIEW,
      PermissionKey.OFFBOARDING_MANAGE,
      PermissionKey.REPORTS_VIEW,
      PermissionKey.PAYROLL_PAYSLIP_SELF_VIEW,
    ],
    [UserRole.MANAGER]: [
      PermissionKey.ORGANIZATION_VIEW,
      PermissionKey.EMPLOYEE_VIEW,
      PermissionKey.ATTENDANCE_VIEW,
      PermissionKey.ATTENDANCE_RECORD,
      PermissionKey.ATTENDANCE_APPROVE,
      PermissionKey.SHIFT_VIEW,
      PermissionKey.OVERTIME_VIEW,
      PermissionKey.OVERTIME_APPLY,
      PermissionKey.OVERTIME_APPROVE,
      PermissionKey.ATTENDANCE_PERIOD_VIEW,
      PermissionKey.LEAVE_VIEW,
      PermissionKey.LEAVE_APPLY,
      PermissionKey.LEAVE_APPROVE,
      PermissionKey.PERFORMANCE_VIEW,
      PermissionKey.EXPENSE_APPLY,
      PermissionKey.EXPENSE_APPROVE,
      PermissionKey.ASSET_VIEW,
      PermissionKey.OFFBOARDING_VIEW,
      PermissionKey.OFFBOARDING_MANAGE,
      PermissionKey.PAYROLL_PAYSLIP_SELF_VIEW,
    ],
    [UserRole.PAYROLL_MANAGER]: [
      PermissionKey.ORGANIZATION_VIEW,
      PermissionKey.EMPLOYEE_VIEW,
      PermissionKey.ATTENDANCE_PERIOD_VIEW,
      PermissionKey.ATTENDANCE_PERIOD_FINALIZE,
      PermissionKey.OVERTIME_VIEW,
      PermissionKey.PAYROLL_VIEW,
      PermissionKey.PAYROLL_COMPENSATION_VIEW,
      PermissionKey.PAYROLL_MANAGE,
      PermissionKey.PAYROLL_FINALIZE,
      PermissionKey.PAYROLL_PAYSLIP_SELF_VIEW,
      PermissionKey.EXPENSE_APPROVE,
      PermissionKey.ASSET_VIEW,
      PermissionKey.REPORTS_VIEW,
    ],
    [UserRole.RECRUITER]: [
      PermissionKey.ORGANIZATION_VIEW,
      PermissionKey.RECRUITMENT_VIEW,
      PermissionKey.RECRUITMENT_MANAGE,
      PermissionKey.ONBOARDING_MANAGE,
      PermissionKey.PAYROLL_PAYSLIP_SELF_VIEW,
    ],
    [UserRole.EMPLOYEE]: [
      PermissionKey.ATTENDANCE_VIEW,
      PermissionKey.ATTENDANCE_RECORD,
      PermissionKey.OVERTIME_VIEW,
      PermissionKey.OVERTIME_APPLY,
      PermissionKey.LEAVE_VIEW,
      PermissionKey.LEAVE_APPLY,
      PermissionKey.EXPENSE_APPLY,
      PermissionKey.ASSET_VIEW,
      PermissionKey.OFFBOARDING_VIEW,
      PermissionKey.PAYROLL_VIEW,
      PermissionKey.PAYROLL_PAYSLIP_SELF_VIEW,
    ],
  };

  // Authoritative user records (relational auth_users & auth_user_roles)
  private static users: StoredUser[] = [
    {
      id: 'usr-1',
      username: 'admin',
      email: 'admin@hrms.enterprise.com',
      fullName: 'Alexander Vance',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      employeeCode: 'EMP-001',
      role: UserRole.SUPER_ADMIN,
      companyIds: ['comp-101', 'comp-102'],
      activeCompanyId: 'comp-101',
      departmentId: 'dept-1',
      designationId: 'desig-1',
      isActive: true,
      lastLoginAt: new Date().toISOString(),
    },
    {
      id: 'usr-2',
      username: 'hr_admin',
      email: 'hr.admin@acme-corp.com',
      fullName: 'Sarah Jenkins',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      employeeCode: 'EMP-002',
      role: UserRole.HR_ADMIN,
      companyIds: ['comp-101'],
      activeCompanyId: 'comp-101',
      departmentId: 'dept-2',
      designationId: 'desig-2',
      isActive: true,
      lastLoginAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'usr-3',
      username: 'manager',
      email: 'manager@acme-corp.com',
      fullName: 'Robert Vance',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      employeeCode: 'EMP-003',
      role: UserRole.MANAGER,
      companyIds: ['comp-101'],
      activeCompanyId: 'comp-101',
      departmentId: 'dept-1',
      designationId: 'desig-1',
      isActive: true,
      lastLoginAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'usr-4',
      username: 'employee',
      email: 'john.doe@acme-corp.com',
      fullName: 'John Doe',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      employeeCode: 'EMP-010',
      role: UserRole.EMPLOYEE,
      companyIds: ['comp-101'],
      activeCompanyId: 'comp-101',
      departmentId: 'dept-1',
      designationId: 'desig-1',
      isActive: true,
      lastLoginAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  // Server-managed active sessions registry
  private static sessions: Map<string, UserSession> = new Map();

  /**
   * Resolves full AuthUser with authoritative permissions dynamically calculated
   */
  public static toAuthUser(stored: StoredUser): AuthUser {
    const permissions = AuthService.rolePermissionsMap[stored.role] || [];
    return {
      id: stored.id,
      username: stored.username,
      email: stored.email,
      fullName: stored.fullName,
      avatarUrl: stored.avatarUrl,
      employeeCode: stored.employeeCode,
      role: stored.role,
      permissions,
      companyIds: [...stored.companyIds],
      activeCompanyId: stored.activeCompanyId,
      departmentId: stored.departmentId,
      designationId: stored.designationId,
      isActive: stored.isActive,
      lastLoginAt: stored.lastLoginAt,
    };
  }

  /**
   * Authoritative lookup by user ID
   */
  public static async getUserById(userId: string): Promise<AuthUser | null> {
    const stored = this.users.find((u) => u.id === userId);
    if (!stored || !stored.isActive) return null;
    return this.toAuthUser(stored);
  }

  /**
   * Authenticate user with credentials
   */
  public static async authenticate(username: string, _password?: string): Promise<AuthUser | null> {
    const stored = this.users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === username.toLowerCase()
    );
    if (!stored || !stored.isActive) return null;

    stored.lastLoginAt = new Date().toISOString();
    return this.toAuthUser(stored);
  }

  /**
   * Create and register server-managed session
   */
  public static async createSession(
    userId: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<{ sessionId: string; token: string }> {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const payload = {
      sessionId,
      userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    };

    const token = Buffer.from(JSON.stringify(payload)).toString('base64');

    const session: UserSession = {
      sessionId,
      userId,
      token,
      createdAt,
      expiresAt,
      revoked: false,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    };

    this.sessions.set(sessionId, session);
    return { sessionId, token };
  }

  /**
   * Revoke session on logout
   */
  public static async revokeSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.revoked = true;
      this.sessions.set(sessionId, session);
      return true;
    }
    return false;
  }

  /**
   * Validate session state
   */
  public static isSessionValid(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    if (session.revoked) return false;
    if (new Date(session.expiresAt).getTime() < Date.now()) return false;
    return true;
  }

  public static getPermissionsForRole(role: UserRole | string): PermissionKey[] {
    return this.rolePermissionsMap[role as UserRole] || [
      PermissionKey.ATTENDANCE_VIEW,
      PermissionKey.LEAVE_VIEW,
      PermissionKey.PAYROLL_PAYSLIP_SELF_VIEW,
    ];
  }

  public static getAllUsers(): AuthUser[] {
    return this.users.map((u) => this.toAuthUser(u));
  }

  public static findUserById(id: string): StoredUser | null {
    return this.users.find((u) => u.id === id) || null;
  }

  public static saveUser(userData: Partial<StoredUser> & { id: string; email: string; fullName?: string; name?: string; role: UserRole }): StoredUser {
    const existingIndex = this.users.findIndex((u) => u.id === userData.id);
    const fullName = userData.fullName || userData.name || 'User';
    const username = userData.username || userData.email.split('@')[0];

    if (existingIndex >= 0) {
      const existing = this.users[existingIndex];
      const updated: StoredUser = {
        ...existing,
        ...userData,
        fullName,
        username,
        role: userData.role || existing.role,
        companyIds: userData.companyIds || existing.companyIds,
      };
      this.users[existingIndex] = updated;
      return updated;
    } else {
      const newUser: StoredUser = {
        id: userData.id,
        username,
        email: userData.email,
        fullName,
        avatarUrl: userData.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        employeeCode: userData.employeeCode || `EMP-${Math.floor(100 + Math.random() * 900)}`,
        role: userData.role,
        companyIds: userData.companyIds || ['comp-101'],
        activeCompanyId: userData.activeCompanyId || userData.companyIds?.[0] || 'comp-101',
        departmentId: userData.departmentId || 'dept-1',
        designationId: userData.designationId || 'desig-1',
        isActive: userData.isActive !== undefined ? userData.isActive : true,
        lastLoginAt: userData.lastLoginAt,
      };
      this.users.push(newUser);
      return newUser;
    }
  }

  public static async getUsers(): Promise<AuthUser[]> {
    return this.users.map((u) => this.toAuthUser(u));
  }
}

