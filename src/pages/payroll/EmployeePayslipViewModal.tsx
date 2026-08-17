import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Download,
  Building2,
  Calendar,
  User,
  CreditCard,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Payslip, PayslipStatus } from '../../types/payroll.js';

interface EmployeePayslipViewModalProps {
  payslipId?: string;
  payslipData?: Payslip;
  isOpen: boolean;
  onClose: () => void;
}

export function EmployeePayslipViewModal({
  payslipId,
  payslipData,
  isOpen,
  onClose,
}: EmployeePayslipViewModalProps) {
  const [payslip, setPayslip] = useState<Payslip | null>(payslipData || null);
  const [loading, setLoading] = useState<boolean>(!payslipData && !!payslipId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (payslipData) {
      setPayslip(payslipData);
      setLoading(false);
      return;
    }

    if (isOpen && payslipId) {
      const fetchPayslip = async () => {
        try {
          setLoading(true);
          setError(null);
          const res = await fetch(`/api/payroll/payslips/${payslipId}`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
            },
          });
          const json = await res.json();
          if (!res.ok || !json.success) {
            throw new Error(json.error || 'Failed to load payslip');
          }
          setPayslip(json.data);
        } catch (err: any) {
          setError(err.message || 'Error fetching payslip');
        } finally {
          setLoading(false);
        }
      };
      fetchPayslip();
    }
  }, [isOpen, payslipId, payslipData]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyTokenLink = () => {
    if (!payslip?.downloadToken) return;
    const url = `${window.location.origin}/api/payroll/payslips/download/${payslip.downloadToken}`;
    navigator.clipboard.writeText(url);
    alert('Secure download link copied to clipboard.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header with actions */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <span className="font-semibold text-sm">Official Employee Payslip</span>
            {payslip && (
              <span className="text-xs text-slate-400 font-mono">
                ({payslip.payslipNumber})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium transition-colors border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / PDF
            </button>
            {payslip?.downloadToken && (
              <button
                type="button"
                onClick={handleCopyTokenLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium transition-colors"
                title="Copy secure public verification link"
              >
                <Download className="w-3.5 h-3.5" />
                Share Link
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Payslip Body / Printable Content */}
        <div className="p-8 overflow-y-auto space-y-6 print-container" id="printable-payslip">
          {loading ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3" />
              Loading itemized payslip...
            </div>
          ) : error ? (
            <div className="p-6 bg-rose-50 text-rose-700 rounded-lg text-sm text-center border border-rose-200">
              {error}
            </div>
          ) : payslip ? (
            <div className="space-y-6 font-sans">
              {/* Organization Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">
                    {payslip.organizationSnapshot.legalName || payslip.organizationSnapshot.companyName}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {payslip.organizationSnapshot.address}, {payslip.organizationSnapshot.city}, {payslip.organizationSnapshot.country}
                  </p>
                  <p className="text-xs text-slate-500">
                    Tax ID: <span className="font-mono">{payslip.organizationSnapshot.taxIdentifier}</span> | Reg: <span className="font-mono">{payslip.organizationSnapshot.registrationNumber}</span>
                  </p>
                </div>
                <div className="text-right">
                  <div className="inline-block bg-slate-100 text-slate-900 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">
                    Payslip for {payslip.periodName}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 font-mono">
                    Issue Date: {payslip.issueDate}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    Pay Date: {payslip.payDate}
                  </div>
                </div>
              </div>

              {/* Employee & Period Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Employee Name:</span>
                    <span className="font-bold text-slate-900">{payslip.employeeSnapshot.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Employee Code:</span>
                    <span className="font-semibold text-slate-800 font-mono">{payslip.employeeSnapshot.employeeCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Department:</span>
                    <span className="font-medium text-slate-800">{payslip.employeeSnapshot.departmentName || 'General'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Designation:</span>
                    <span className="font-medium text-slate-800">{payslip.employeeSnapshot.designationName || 'Staff'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Joining Date:</span>
                    <span className="font-medium text-slate-800">{payslip.employeeSnapshot.joiningDate || '—'}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bank Account:</span>
                    <span className="font-medium text-slate-800 font-mono">
                      {payslip.employeeSnapshot.bankName} ({payslip.employeeSnapshot.accountNumberMasked})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">IFSC / Routing:</span>
                    <span className="font-mono text-slate-800">{payslip.employeeSnapshot.ifscOrRouting || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">PAN / Tax ID:</span>
                    <span className="font-mono text-slate-800">{payslip.employeeSnapshot.panNumber || payslip.employeeSnapshot.taxIdentifier || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payable / Calendar Days:</span>
                    <span className="font-semibold text-slate-900">
                      {payslip.payableDays} / {payslip.calendarDays} days
                      {payslip.lossOfPayDays > 0 && ` (${payslip.lossOfPayDays} LOP)`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Approved Overtime:</span>
                    <span className="font-semibold text-emerald-700">
                      {payslip.approvedOtHours > 0 ? `${payslip.approvedOtHours} hrs` : '0.00 hrs'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Earnings vs Deductions Split Table */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Earnings Box */}
                <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="bg-emerald-50 text-emerald-900 px-4 py-2 text-xs font-bold uppercase tracking-wider border-b border-emerald-100 flex justify-between">
                      <span>Earnings</span>
                      <span>Amount ({payslip.currency})</span>
                    </div>
                    <table className="w-full text-xs">
                      <tbody>
                        {payslip.earningsBreakdown.map((item, idx) => (
                          <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                            <td className="py-2.5 px-4 text-slate-700 font-medium">
                              <div>{item.componentName}</div>
                              {item.formulaDerivation && (
                                <div className="text-[10px] text-slate-400 font-mono">{item.formulaDerivation}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right font-semibold text-slate-900 font-mono">
                              ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-900 uppercase">Gross Earnings</span>
                    <span className="text-emerald-700 font-mono text-sm">
                      ${payslip.grossEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Deductions Box */}
                <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="bg-rose-50 text-rose-900 px-4 py-2 text-xs font-bold uppercase tracking-wider border-b border-rose-100 flex justify-between">
                      <span>Deductions</span>
                      <span>Amount ({payslip.currency})</span>
                    </div>
                    <table className="w-full text-xs">
                      <tbody>
                        {payslip.deductionsBreakdown.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="py-4 px-4 text-center text-slate-400">
                              No deductions for this period
                            </td>
                          </tr>
                        ) : (
                          payslip.deductionsBreakdown.map((item, idx) => (
                            <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                              <td className="py-2.5 px-4 text-slate-700 font-medium">
                                <div>{item.componentName}</div>
                                {item.formulaDerivation && (
                                  <div className="text-[10px] text-slate-400 font-mono">{item.formulaDerivation}</div>
                                )}
                              </td>
                              <td className="py-2.5 px-4 text-right font-semibold text-rose-700 font-mono">
                                ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-900 uppercase">Gross Deductions</span>
                    <span className="text-rose-700 font-mono text-sm">
                      ${payslip.grossDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Net Pay Banner */}
              <div className="bg-indigo-900 text-white p-5 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wider font-semibold text-indigo-300">
                    Net Take-Home Pay
                  </div>
                  <div className="text-xs text-indigo-200 mt-1 italic">
                    {payslip.netPayInWords}
                  </div>
                </div>
                <div className="text-3xl font-extrabold tracking-tight font-mono text-emerald-300">
                  ${payslip.netPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Year-To-Date (YTD) Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs">
                <div className="font-semibold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Financial Year-To-Date (YTD) Summary
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-500 block">YTD Gross Earnings:</span>
                    <span className="font-bold text-slate-900 font-mono">${payslip.ytdGrossEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">YTD Gross Deductions:</span>
                    <span className="font-bold text-rose-600 font-mono">${payslip.ytdGrossDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">YTD Tax Deducted:</span>
                    <span className="font-bold text-slate-900 font-mono">${payslip.ytdTaxDeducted.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">YTD Net Payout:</span>
                    <span className="font-bold text-indigo-700 font-mono">${payslip.ytdNetPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Footer / Disclaimer */}
              <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
                <span>
                  This is a computer-generated payslip and does not require a physical signature.
                </span>
                <span className="font-mono">
                  Verification Token: {payslip.downloadToken.slice(0, 16)}...
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
