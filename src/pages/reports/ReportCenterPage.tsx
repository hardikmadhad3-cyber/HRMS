import React from 'react';
import { PageHeader } from '../../components/shell/PageHeader.js';
import { FileBarChart2, Download, FileSpreadsheet } from 'lucide-react';

export function ReportCenterPage() {
  const reports = [
    { title: 'Employee Headcount & Turnover', category: 'Core HR', desc: 'Active headcount distribution by department and branch.' },
    { title: 'Monthly Attendance Summary', category: 'Time & Attendance', desc: 'Detailed presence, late arrival, and working hours report.' },
    { title: 'Leave Utilization & Balance Ledger', category: 'Leave Management', desc: 'Employee leave balance consumption and balances.' },
    { title: 'Salary Register & Payroll Ledger', category: 'Payroll', desc: 'Gross-to-net salary breakdown by department.' },
  ];

  return (
    <div>
      <PageHeader
        title="Report Center & Catalog"
        subtitle="Standard and regulatory HRMS operational reports catalog"
        breadcrumbs={[{ label: 'HRMS Portal', path: '/dashboard' }, { label: 'Report Center' }]}
      />

      <div className="p-6 max-w-6xl mx-auto space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {reports.map((rpt, idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 font-bold rounded text-[10px] border border-purple-200">
                  {rpt.category}
                </span>
                <FileBarChart2 className="w-4 h-4 text-purple-600" />
              </div>
              <h3 className="font-bold text-[#17365D] text-sm">{rpt.title}</h3>
              <p className="text-slate-500 text-[11px]">{rpt.desc}</p>
              <div className="pt-2 flex items-center gap-2">
                <button className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-[11px] flex items-center gap-1">
                  <Download className="w-3 h-3" />
                  PDF Export
                </button>
                <button className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded text-[11px] flex items-center gap-1 border border-emerald-200">
                  <FileSpreadsheet className="w-3 h-3" />
                  Excel Export
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
