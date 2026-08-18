import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export function UnauthorizedPage() {
  const location = useLocation();
  const requiredPermission = (location.state as any)?.requiredPermission;

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-16 h-16 bg-red-100 text-red-700 rounded-2xl flex items-center justify-center mb-4">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-[#17365D]">403 — Access Denied</h1>
      <p className="text-xs text-slate-600 max-w-md mt-1.5 leading-relaxed">
        You do not possess the required RBAC permissions to access this HRMS module or action.
      </p>
      {requiredPermission && (
        <div className="mt-3 px-3 py-1 bg-red-50 border border-red-200 text-red-800 text-[11px] font-mono rounded">
          Required Permission: {requiredPermission}
        </div>
      )}
      <Link
        to="/dashboard"
        className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-[#2F75B5] hover:bg-[#17365D] text-white text-xs font-semibold rounded-md transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Dashboard
      </Link>
    </div>
  );
}
