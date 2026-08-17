import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { ShieldCheck, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

export function LoginPage() {
  const { login, isLoading, error } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(username, password);
    if (success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-xl bg-[#17365D] text-white flex items-center justify-center font-bold text-xl mx-auto shadow-md">
          HR
        </div>
        <h2 className="mt-4 text-2xl font-bold text-[#17365D] tracking-tight">
          Human Resource Management System
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Enterprise Multi-Company HR Portal — Secure Authentication
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl border border-slate-200 rounded-xl sm:px-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Username / Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                  placeholder="admin or user@acme.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-medium text-[#2F75B5] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:ring-1 focus:ring-[#2F75B5] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-xs text-xs font-bold text-white bg-[#2F75B5] hover:bg-[#17365D] focus:outline-none transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <span>Authenticating Credentials...</span>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Account Switcher Helper */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-xs">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 text-center">
              Quick Role Test Credentials
            </p>
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
              <button
                type="button"
                onClick={() => {
                  setUsername('admin');
                  setPassword('password');
                }}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded text-left hover:bg-slate-100"
              >
                <div className="font-bold text-slate-800">admin</div>
                <div className="text-slate-500 text-[9px]">Super Admin</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsername('hr_admin');
                  setPassword('password');
                }}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded text-left hover:bg-slate-100"
              >
                <div className="font-bold text-slate-800">hr_admin</div>
                <div className="text-slate-500 text-[9px]">HR Administrator</div>
              </button>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-500">
          HRMS Software Requirements Specification Document 1 & 5 Aligned
        </p>
      </div>
    </div>
  );
}
