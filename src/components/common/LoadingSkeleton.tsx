import React from 'react';

export function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4 bg-white border border-slate-200 rounded-lg animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-1/4 mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-3 bg-slate-200 rounded w-1/6" />
          <div className="h-3 bg-slate-200 rounded w-2/6" />
          <div className="h-3 bg-slate-200 rounded w-1/6" />
          <div className="h-3 bg-slate-200 rounded w-1/6 ml-auto" />
        </div>
      ))}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 flex items-center justify-between gap-3">
      <div>
        <p className="font-semibold">System Communication Error</p>
        <p className="mt-0.5 text-red-700">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-medium rounded shadow-2xs transition-colors shrink-0"
        >
          Retry Request
        </button>
      )}
    </div>
  );
}
