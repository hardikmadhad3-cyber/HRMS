import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Search,
  Bell,
  ChevronDown,
  Sparkles,
  HelpCircle,
  Menu,
  LogOut,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { UserRole } from '../../types/auth.js';
import { apiClient } from '../../services/apiClient.js';
import { Company } from '../../types/organization.js';

interface TopBarProps {
  onToggleSidebar: () => void;
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  const { user, logout, switchCompany, switchRoleForTesting, isDemoMode, activeCompanyId } = useAuth();
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; code: string }>>([
    { id: 'comp-101', name: 'Acme Enterprise Solutions', code: 'ACME' },
    { id: 'comp-102', name: 'Nexus Tech Global', code: 'NEXUS' },
  ]);

  const companyMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  // Fetch real companies from backend
  useEffect(() => {
    async function loadCompanies() {
      const res = await apiClient.get<Company[]>('/api/v1/organization/companies');
      if (res.success && res.data && res.data.length > 0) {
        setCompanies(
          res.data.map((c) => ({
            id: c.id,
            name: c.name,
            code: c.code,
          }))
        );
      }
    }
    loadCompanies();
  }, []);

  // Click-outside listener to dismiss open dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (companyMenuRef.current && !companyMenuRef.current.contains(event.target as Node)) {
        setShowCompanyMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const availableCompanies =
    user?.role === UserRole.SUPER_ADMIN
      ? companies
      : companies.filter((c) => user?.companyIds?.includes(c.id));

  const currentCompany =
    availableCompanies.find((c) => c.id === activeCompanyId) ||
    availableCompanies[0] || { id: 'comp-101', name: 'Acme Enterprise Solutions', code: 'ACME' };

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between sticky top-0 z-50 shadow-2xs">
      {/* Left: Mobile Toggle + Brand Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 md:hidden cursor-pointer"
          aria-label="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#17365D] text-white flex items-center justify-center font-bold text-sm shadow-xs">
            HR
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-[#17365D] leading-none tracking-tight">
              Enterprise HRMS
            </h1>
            <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">
              Phase 1B Enterprise
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

        {/* Multi-Company Selector */}
        <div className="relative" ref={companyMenuRef}>
          <button
            onClick={() => {
              setShowCompanyMenu((prev) => !prev);
              setShowUserMenu(false);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5 text-[#2F75B5]" />
            <span className="max-w-[140px] sm:max-w-[200px] truncate">{currentCompany.name}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 text-slate-600 font-mono font-bold">
              {currentCompany.code}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showCompanyMenu && (
            <div className="absolute top-full left-0 mt-1.5 w-72 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Active Legal Entity
                </p>
                <span className="text-[10px] text-slate-400 font-medium">
                  {availableCompanies.length} available
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                {availableCompanies.map((comp) => {
                  const isSelected = comp.id === activeCompanyId;
                  return (
                    <button
                      key={comp.id}
                      onClick={() => {
                        switchCompany(comp.id);
                        setShowCompanyMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-blue-50/80 font-semibold text-[#17365D]' : 'text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#2F75B5] shrink-0" />}
                        <span className="truncate">{comp.name}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-mono shrink-0">
                        {comp.code}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center: Global Search */}
      <div className="hidden md:flex items-center max-w-xs w-full relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Global search (Employees, Codes, ID)..."
          className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2F75B5]"
        />
      </div>

      {/* Right: Role Simulator + Notifications + Profile */}
      <div className="flex items-center gap-2">
        {/* Role Switcher (Tester Simulator - DEVELOPMENT / DEMO ONLY) */}
        {isDemoMode && (
          <div className="hidden xl:flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md text-amber-900 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[11px] font-medium">Role Simulator:</span>
            <select
              value={user?.role}
              onChange={(e) => switchRoleForTesting(e.target.value as UserRole)}
              className="bg-white border border-amber-300 rounded text-[11px] font-semibold px-1.5 py-0.5 focus:outline-none"
            >
              <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
              <option value={UserRole.HR_ADMIN}>HR Admin</option>
              <option value={UserRole.MANAGER}>Manager</option>
              <option value={UserRole.EMPLOYEE}>Employee (ESS)</option>
            </select>
          </div>
        )}

        {/* Notifications */}
        <div className="relative" ref={notifMenuRef}>
          <button
            onClick={() => {
              setShowNotifications((prev) => !prev);
              setShowCompanyMenu(false);
              setShowUserMenu(false);
            }}
            className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 relative cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
          </button>

          {showNotifications && (
            <div className="absolute top-full right-0 mt-1.5 w-80 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3.5 py-1.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">In-App Notifications</span>
                <span className="text-[10px] bg-blue-100 text-[#17365D] font-bold px-1.5 py-0.5 rounded">
                  2 New
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                <div className="p-3 text-xs hover:bg-slate-50 cursor-pointer">
                  <p className="font-semibold text-slate-800">Company Profile Updated</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">Updated tax identification for Acme Corp.</p>
                  <span className="text-[10px] text-slate-400 mt-1 block">10 mins ago</span>
                </div>
                <div className="p-3 text-xs hover:bg-slate-50 cursor-pointer">
                  <p className="font-semibold text-slate-800">Phase 0 System Audit Logged</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">Login recorded for user Alexander Vance.</p>
                  <span className="text-[10px] text-slate-400 mt-1 block">1 hour ago</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <button className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 hidden sm:block">
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* User Profile Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => {
              setShowUserMenu((prev) => !prev);
              setShowCompanyMenu(false);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <img
              src={user?.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'}
              alt={user?.fullName}
              className="w-7 h-7 rounded-full object-cover border border-slate-300"
            />
            <div className="text-left hidden md:block">
              <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.fullName}</p>
              <p className="text-[10px] text-[#2F75B5] font-medium leading-none mt-0.5">{user?.role}</p>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute top-full right-0 mt-1.5 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-800">{user?.fullName}</p>
                <p className="text-[11px] text-slate-500">{user?.email}</p>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5">Code: {user?.employeeCode}</p>
              </div>

              <div className="py-1">
                <div className="px-3 py-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Active Role
                  </span>
                  <span className="text-xs font-semibold text-[#17365D]">{user?.role}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={logout}
                  className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
