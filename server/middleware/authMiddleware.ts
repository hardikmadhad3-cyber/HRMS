import { Request, Response, NextFunction } from 'express';
import { PermissionKey, UserRole, AuthUser } from '../../src/types/auth.js';
import { AuthService } from '../services/AuthService.js';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  companyId?: string;
  sessionId?: string;
  isDemoMode?: boolean;
}

/**
 * CONFIGURATION GUARD: DEMO_MODE
 * In development or when HRMS_DEMO_MODE=true, fallback context is enabled when no token is present.
 * When DEMO_MODE=false or in production, strict auth is strictly required.
 */
export const IS_DEMO_MODE =
  process.env.HRMS_DEMO_MODE !== 'false' && process.env.NODE_ENV !== 'production';

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Guarantee JSON Content-Type header on all API responses
  res.setHeader('Content-Type', 'application/json');

  const authHeader = req.headers.authorization;
  const companyHeader = req.headers['x-company-id'] as string;

  req.isDemoMode = IS_DEMO_MODE;

  // 1. Process Authorization Bearer Header if present
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      // Decode base64 JWT payload
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
      const userId = decoded.userId || decoded.id;
      const sessionId = decoded.sessionId;

      // Validate session if sessionId is present
      if (sessionId && !AuthService.isSessionValid(sessionId)) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: Session has been revoked or expired.',
          code: 'SESSION_REVOKED',
        });
      }

      // Authoritative lookup from database/AuthService
      let user: AuthUser | null = null;
      if (userId) {
        user = await AuthService.getUserById(userId);
      }

      if (!user) {
        // In demo mode with mock tokens without DB match, construct from claims or deny
        if (IS_DEMO_MODE && decoded.role) {
          user = {
            id: decoded.id || 'usr-1',
            username: decoded.username || 'admin',
            email: decoded.email || 'admin@hrms.enterprise.com',
            fullName: decoded.fullName || 'Admin User',
            avatarUrl: decoded.avatarUrl || '',
            employeeCode: decoded.employeeCode || 'EMP-001',
            role: decoded.role || UserRole.SUPER_ADMIN,
            permissions: decoded.role === UserRole.SUPER_ADMIN ? Object.values(PermissionKey) : (decoded.permissions || []),
            companyIds: decoded.companyIds || ['comp-101', 'comp-102'],
            activeCompanyId: decoded.activeCompanyId || 'comp-101',
            departmentId: decoded.departmentId || 'dept-1',
            designationId: decoded.designationId || 'desig-1',
            isActive: true,
          };
        } else {
          return res.status(401).json({
            success: false,
            error: 'Unauthorized: User account not found or deactivated.',
            code: 'USER_INACTIVE',
          });
        }
      }

      // Verify active user status
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: User account is deactivated.',
          code: 'ACCOUNT_DISABLED',
        });
      }

      const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;

      // MULTI-COMPANY ISOLATION CHECK
      let effectiveCompanyId = user.activeCompanyId;
      if (companyHeader) {
        if (!isSuperAdmin && !user.companyIds.includes(companyHeader)) {
          return res.status(403).json({
            success: false,
            error: `Security Violation: User is not authorized to access requested company context [${companyHeader}].`,
            code: 'COMPANY_ACCESS_DENIED',
          });
        }
        effectiveCompanyId = companyHeader;
      }

      req.sessionId = sessionId;
      req.companyId = effectiveCompanyId;
      req.user = {
        ...user,
        activeCompanyId: effectiveCompanyId,
      };

      return next();
    } catch {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid authentication token structure.',
        code: 'INVALID_TOKEN',
      });
    }
  }

  // 2. PRODUCTION OR STRICT MODE (When IS_DEMO_MODE is false or missing token)
  if (!IS_DEMO_MODE) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing or invalid Authorization Bearer header.',
      code: 'AUTH_REQUIRED',
    });
  }

  // 3. DEMO / DEVELOPMENT FALLBACK (Only when IS_DEMO_MODE is true and no Bearer was supplied)
  const defaultAdmin = await AuthService.getUserById('usr-1');
  if (defaultAdmin) {
    const fallbackCompany = companyHeader && defaultAdmin.companyIds.includes(companyHeader)
      ? companyHeader
      : defaultAdmin.activeCompanyId;
    req.companyId = fallbackCompany;
    req.user = {
      ...defaultAdmin,
      activeCompanyId: fallbackCompany,
    };
  }
  next();
}

export function requirePermission(permission: PermissionKey) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    res.setHeader('Content-Type', 'application/json');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Session authentication required.',
        code: 'UNAUTHORIZED',
      });
    }

    if (req.user.role === UserRole.SUPER_ADMIN || req.user.permissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Forbidden: Missing required permission [${permission}]. Access denied by server authorization policy.`,
      code: 'FORBIDDEN',
    });
  };
}

