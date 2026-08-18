import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-16 h-16 bg-slate-200 text-slate-600 rounded-2xl flex items-center justify-center mb-4">
        <FileQuestion className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-[#17365D]">404 — Page Not Found</h1>
      <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
        The requested HRMS URL or resource could not be found. Please verify the route address or return to the main dashboard.
      </p>
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
