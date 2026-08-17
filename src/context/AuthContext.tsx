/// <reference types="vite/client" />
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, UserRole, PermissionKey, AuthState } from '../types/auth.js';
import { apiClient } from '../services/apiClient.js';

interface AuthContextType extends AuthState {
  isDemoMode: boolean;
  login: (username: string, password?: string) => Promise<boolean>;
  logout: () => void;
  switchCompany: (companyId: string) => void;
  switchRoleForTesting: (role: UserRole) => void;
  hasPermission: (permission: PermissionKey) => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// DEMO_MODE configuration check for client environment
export const IS_CLIENT_DEMO_MODE =
  import.meta.env.VITE_DEMO_MODE !== 'false' && import.meta.env.MODE !== 'production';

const DEFAULT_USER: AuthUser = {
  id: 'usr-1',
  username: 'admin',
  email: 'admin@hrms.enterprise.com',
  fullName: 'Alexander Vance',
  avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
  employeeCode: 'EMP-001',
  role: UserRole.SUPER_ADMIN,
  permissions: Object.values(PermissionKey),
  companyIds: ['comp-101', 'comp-102'],
  activeCompanyId: 'comp-101',
  departmentId: 'dept-1',
  designationId: 'desig-1',
  isActive: true,
  lastLoginAt: new Date().toISOString(),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: DEFAULT_USER,
    token: localStorage.getItem('hrms_token') || 'simulated-jwt-token',
    isAuthenticated: true,
    isLoading: false,
    error: null,
    activeCompanyId: localStorage.getItem('hrms_active_company') || 'comp-101',
  });

  useEffect(() => {
    // Sync initial storage
    if (!localStorage.getItem('hrms_token')) {
      localStorage.setItem('hrms_token', 'simulated-jwt-token');
    }
    if (!localStorage.getItem('hrms_active_company')) {
      localStorage.setItem('hrms_active_company', 'comp-101');
    }
  }, []);

  const login = async (username: string, password?: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    const res = await apiClient.post<{ token: string; sessionId: string; user: AuthUser }>('/api/v1/auth/login', {
      username,
      password,
    });

    if (res.success && res.data) {
      const { token, user } = res.data;
      localStorage.setItem('hrms_token', token);
      localStorage.setItem('hrms_active_company', user.activeCompanyId);
      setState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        activeCompanyId: user.activeCompanyId,
      });
      return true;
    } else {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: res.error || 'Authentication failed.',
      }));
      return false;
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/api/v1/auth/logout', {});
    } catch {
      // Ignore network errors during client logout
    }
    localStorage.removeItem('hrms_token');
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      activeCompanyId: null,
    });
  };

  const switchCompany = (companyId: string) => {
    localStorage.setItem('hrms_active_company', companyId);
    setState((prev) => ({
      ...prev,
      activeCompanyId: companyId,
      user: prev.user ? { ...prev.user, activeCompanyId: companyId } : null,
    }));
  };

  const switchRoleForTesting = (role: UserRole) => {
    if (!IS_CLIENT_DEMO_MODE) {
      console.warn('Role Simulator is disabled in non-demo/production environments.');
      return;
    }
    if (!state.user) return;
    let permissions: PermissionKey[] = [];
    if (role === UserRole.SUPER_ADMIN) {
      permissions = Object.values(PermissionKey);
    } else if (role === UserRole.HR_ADMIN) {
      permissions = [
        PermissionKey.ORGANIZATION_VIEW,
        PermissionKey.ORGANIZATION_MANAGE,
        PermissionKey.EMPLOYEE_VIEW,
        PermissionKey.EMPLOYEE_MANAGE,
        PermissionKey.ATTENDANCE_VIEW,
        PermissionKey.ATTENDANCE_RECORD,
        PermissionKey.ATTENDANCE_APPROVE,
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
      ];
    } else if (role === UserRole.MANAGER) {
      permissions = [
        PermissionKey.ORGANIZATION_VIEW,
        PermissionKey.EMPLOYEE_VIEW,
        PermissionKey.ATTENDANCE_VIEW,
        PermissionKey.ATTENDANCE_RECORD,
        PermissionKey.ATTENDANCE_APPROVE,
        PermissionKey.LEAVE_VIEW,
        PermissionKey.LEAVE_APPLY,
        PermissionKey.LEAVE_APPROVE,
        PermissionKey.PERFORMANCE_VIEW,
        PermissionKey.EXPENSE_APPLY,
        PermissionKey.EXPENSE_APPROVE,
      ];
    } else if (role === UserRole.EMPLOYEE) {
      permissions = [
        PermissionKey.ATTENDANCE_VIEW,
        PermissionKey.ATTENDANCE_RECORD,
        PermissionKey.LEAVE_VIEW,
        PermissionKey.LEAVE_APPLY,
        PermissionKey.EXPENSE_APPLY,
        PermissionKey.PAYROLL_VIEW,
      ];
    }

    const updatedUser = {
      ...state.user,
      role,
      permissions,
      // For employee role in simulated demo, isolate to primary company
      companyIds: role === UserRole.EMPLOYEE ? ['comp-101'] : ['comp-101', 'comp-102'],
    };

    // Update simulated bearer token payload for downstream server requests
    const simulatedToken = btoa(JSON.stringify(updatedUser));
    localStorage.setItem('hrms_token', simulatedToken);

    setState((prev) => ({
      ...prev,
      token: simulatedToken,
      user: updatedUser,
    }));
  };

  const hasPermission = (permission: PermissionKey): boolean => {
    if (!state.user) return false;
    if (state.user.role === UserRole.SUPER_ADMIN) return true;
    return state.user.permissions.includes(permission);
  };

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!state.user) return false;
    return roles.includes(state.user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        isDemoMode: IS_CLIENT_DEMO_MODE,
        login,
        logout,
        switchCompany,
        switchRoleForTesting,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
