import React from 'react';
import { PageHeader } from '../../components/shell/PageHeader.js';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

export function ApprovalInboxPage() {
  const pendingRequests = [
    {
      id: 'req-1',
      employee: 'Sarah Jenkins',
      type: 'Leave Application',
      details: 'Annual Leave — 3 Days (18 Aug - 20 Aug)',
      date: '2026-08-12',
    },
    {
      id: 'req-2',
      employee: 'John Doe',
      type: 'Attendance Regularization',
      details: 'Missed Punch Out on 10 Aug 2026',
      date: '2026-08-11',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Approval Inbox"
        subtitle="Consolidated queue for pending leave, attendance and expense approvals"
        breadcrumbs={[{ label: 'HRMS Portal', path: '/dashboard' }, { label: 'Approval Inbox' }]}
      />

      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <h3 className="font-bold text-[#17365D] text-sm mb-3">Pending Action Items ({pendingRequests.length})</h3>
          <div className="space-y-3 text-xs">
            {pendingRequests.map((req) => (
              <div key={req.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-4">
                <div>
                  <span className="px-2 py-0.5 bg-blue-100 text-[#17365D] font-bold rounded text-[10px]">
                    {req.type}
                  </span>
                  <p className="font-semibold text-slate-800 mt-1">{req.employee}</p>
                  <p className="text-slate-500 text-[11px]">{req.details}</p>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Requested on {req.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 font-semibold text-xs flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                  <button className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 font-semibold text-xs flex items-center gap-1 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
