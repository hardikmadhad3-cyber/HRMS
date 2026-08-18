import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  DollarSign,
  FileText,
  Eye,
  ShieldCheck,
  Building2,
  UserCheck,
  AlertTriangle,
  UploadCloud,
  Check,
  X,
  CreditCard,
  Layers,
} from 'lucide-react';
import {
  ExpenseClaim,
  ExpenseClaimStatus,
  ExpenseCategory,
  ExpenseDashboardMetrics,
  ExpenseClaimItem,
  ExpenseClaimHistory,
  CreateExpenseClaimDTO,
} from '../../types/expenses.js';
import { expenseApi } from '../../services/expenseApi.js';
import { useAuth } from '../../context/AuthContext.js';
import { PermissionKey, UserRole } from '../../types/auth.js';

export function ExpensesHubPage() {
  const { user, hasPermission } = useAuth();
  const activeCompanyId = user?.activeCompanyId || 'comp-101';

  const canApprove =
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.HR_ADMIN ||
    user?.role === UserRole.PAYROLL_MANAGER ||
    hasPermission(PermissionKey.EXPENSE_APPROVE);

  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'team' | 'categories'>('all');
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [metrics, setMetrics] = useState<ExpenseDashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);
  const [claimHistory, setClaimHistory] = useState<ExpenseClaimHistory[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [actionModal, setActionModal] = useState<{
    claim: ExpenseClaim;
    action: 'APPROVE' | 'REJECT' | 'RETURN' | 'PAY';
  } | null>(null);
  const [actionRemarks, setActionRemarks] = useState('');
  const [actionPaymentRef, setActionPaymentRef] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // New Category Form
  const [newCatCode, setNewCatCode] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatLimit, setNewCatLimit] = useState('');
  const [newCatReceipt, setNewCatReceipt] = useState(true);

  // New Claim Form
  const [newClaimTitle, setNewClaimTitle] = useState('');
  const [newClaimDesc, setNewClaimDesc] = useState('');
  const [newClaimCurrency, setNewClaimCurrency] = useState('USD');
  const [claimItems, setClaimItems] = useState<
    Array<{
      categoryId: string;
      expenseDate: string;
      amount: number;
      taxAmount: number;
      description: string;
      merchantName: string;
      receiptFileName?: string;
    }>
  >([]);

  // Item row input
  const [itemCat, setItemCat] = useState('');
  const [itemDate, setItemDate] = useState(new Date().toISOString().slice(0, 10));
  const [itemAmount, setItemAmount] = useState('');
  const [itemTax, setItemTax] = useState('0');
  const [itemDesc, setItemDesc] = useState('');
  const [itemMerchant, setItemMerchant] = useState('');
  const [itemReceiptName, setItemReceiptName] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [metricsRes, catRes, claimsRes] = await Promise.all([
        expenseApi.getDashboard(activeCompanyId),
        expenseApi.getCategories(false, activeCompanyId),
        expenseApi.getClaims(
          {
            scope: activeTab === 'my' ? 'my' : activeTab === 'team' ? 'team' : 'all',
            status: statusFilter !== 'ALL' ? (statusFilter as ExpenseClaimStatus) : undefined,
          },
          activeCompanyId
        ),
      ]);

      if (metricsRes.success && metricsRes.data) setMetrics(metricsRes.data);
      if (catRes.success && catRes.data) {
        setCategories(catRes.data);
        if (catRes.data.length > 0 && !itemCat) {
          setItemCat(catRes.data[0].id);
        }
      }
      if (claimsRes.success && claimsRes.data) setClaims(claimsRes.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load expense records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, statusFilter, activeCompanyId]);

  const handleAddItemRow = () => {
    if (!itemCat || !itemAmount || Number(itemAmount) <= 0 || !itemDesc) {
      alert('Please fill Category, valid Amount, and Description for the expense item.');
      return;
    }

    const selectedCategory = categories.find((c) => c.id === itemCat);
    if (selectedCategory?.maxLimitPerClaim && Number(itemAmount) > selectedCategory.maxLimitPerClaim) {
      alert(`Amount $${itemAmount} exceeds maximum category limit of $${selectedCategory.maxLimitPerClaim}.`);
      return;
    }

    setClaimItems((prev) => [
      ...prev,
      {
        categoryId: itemCat,
        expenseDate: itemDate,
        amount: Number(itemAmount),
        taxAmount: Number(itemTax) || 0,
        description: itemDesc,
        merchantName: itemMerchant,
        receiptFileName: itemReceiptName || undefined,
      },
    ]);

    setItemAmount('');
    setItemTax('0');
    setItemDesc('');
    setItemMerchant('');
    setItemReceiptName('');
  };

  const handleRemoveItemRow = (index: number) => {
    setClaimItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateClaim = async (submitDirectly: boolean) => {
    if (!newClaimTitle.trim()) {
      alert('Please specify a title for the expense claim.');
      return;
    }
    if (claimItems.length === 0) {
      alert('Please add at least one expense item to the claim.');
      return;
    }

    try {
      const payload: CreateExpenseClaimDTO = {
        title: newClaimTitle,
        description: newClaimDesc,
        currency: newClaimCurrency,
        items: claimItems,
      };

      const res = await expenseApi.createClaim(payload, activeCompanyId);
      if (res.success && res.data) {
        if (submitDirectly) {
          await expenseApi.submitClaim(res.data.id, activeCompanyId);
        }
        setIsCreateModalOpen(false);
        setNewClaimTitle('');
        setNewClaimDesc('');
        setClaimItems([]);
        await loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create claim');
    }
  };

  const handleProcessAction = async () => {
    if (!actionModal) return;
    if ((actionModal.action === 'REJECT' || actionModal.action === 'RETURN') && !actionRemarks.trim()) {
      alert('A reason is mandatory for rejection or return.');
      return;
    }

    try {
      await expenseApi.processAction(
        actionModal.claim.id,
        {
          action: actionModal.action,
          remarks: actionRemarks,
          paymentReference: actionPaymentRef,
          paymentDate: actionPaymentRef ? new Date().toISOString().slice(0, 10) : undefined,
        },
        activeCompanyId
      );

      setActionModal(null);
      setActionRemarks('');
      setActionPaymentRef('');
      setSelectedClaim(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Approval action failed');
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatCode || !newCatName) {
      alert('Please enter Category Code and Name.');
      return;
    }

    try {
      await expenseApi.createCategory(
        {
          code: newCatCode,
          name: newCatName,
          description: newCatDesc,
          maxLimitPerClaim: newCatLimit ? Number(newCatLimit) : undefined,
          requiresReceipt: newCatReceipt,
          isActive: true,
        },
        activeCompanyId
      );

      setIsCategoryModalOpen(false);
      setNewCatCode('');
      setNewCatName('');
      setNewCatDesc('');
      setNewCatLimit('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create category');
    }
  };

  const handleViewHistory = async (claim: ExpenseClaim) => {
    try {
      const res = await expenseApi.getHistory(claim.id, activeCompanyId);
      if (res.success && res.data) {
        setClaimHistory(res.data);
        setSelectedClaim(claim);
        setIsHistoryOpen(true);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to load history');
    }
  };

  const filteredClaims = claims.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.claimNumber.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      (c.employeeName && c.employeeName.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (status: ExpenseClaimStatus) => {
    switch (status) {
      case ExpenseClaimStatus.DRAFT:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">Draft</span>;
      case ExpenseClaimStatus.SUBMITTED:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Pending Mgr</span>;
      case ExpenseClaimStatus.MANAGER_APPROVED:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Pending Finance</span>;
      case ExpenseClaimStatus.FINANCE_APPROVED:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Approved</span>;
      case ExpenseClaimStatus.PAID:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">Paid / Settled</span>;
      case ExpenseClaimStatus.RETURNED:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">Returned</span>;
      case ExpenseClaimStatus.REJECTED:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">Rejected</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-[#2F75B5]" />
            Expenses & Reimbursements
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enterprise travel, subsistence, and project claim processing with multi-level approval audit.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canApprove && (
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Layers className="w-4 h-4 text-slate-500" />
              Manage Categories
            </button>
          )}
          <button
            onClick={() => {
              setClaimItems([]);
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2 rounded-lg bg-[#2F75B5] text-white text-sm font-medium hover:bg-[#1f5588] transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Expense Claim
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-xs font-medium text-slate-500">Total Claims</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{metrics.totalClaimsCount}</div>
            <div className="text-xs text-slate-400 mt-1">${metrics.totalClaimedAmount.toLocaleString()} total</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-xs font-medium text-amber-600">Pending Mgr</div>
            <div className="text-2xl font-bold text-amber-700 mt-1">{metrics.pendingManagerCount}</div>
            <div className="text-xs text-amber-600/80 mt-1">Direct reports</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-xs font-medium text-blue-600">Pending Finance</div>
            <div className="text-2xl font-bold text-blue-700 mt-1">{metrics.pendingFinanceCount}</div>
            <div className="text-xs text-blue-600/80 mt-1">Finance review</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-xs font-medium text-emerald-600">Approved</div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">{metrics.approvedCount}</div>
            <div className="text-xs text-emerald-600/80 mt-1">${metrics.totalApprovedAmount.toLocaleString()} approved</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-xs font-medium text-green-600">Disbursed / Paid</div>
            <div className="text-2xl font-bold text-green-700 mt-1">{metrics.paidCount}</div>
            <div className="text-xs text-green-600/80 mt-1">${metrics.totalPaidAmount.toLocaleString()} settled</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-xs font-medium text-red-600">Rejected / Ret.</div>
            <div className="text-2xl font-bold text-red-700 mt-1">{metrics.rejectedCount + metrics.returnedCount}</div>
            <div className="text-xs text-red-600/80 mt-1">{metrics.returnedCount} returned</div>
          </div>
        </div>
      )}

      {/* Tabs & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Claims
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'my' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Claims
          </button>
          {canApprove && (
            <button
              onClick={() => setActiveTab('team')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'team' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Team Approvals
            </button>
          )}
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'categories' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Policy & Categories
          </button>
        </div>

        {activeTab !== 'categories' && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search claims..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#2F75B5] w-56"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-[#2F75B5]"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Pending Manager</option>
              <option value="MANAGER_APPROVED">Pending Finance</option>
              <option value="FINANCE_APPROVED">Finance Approved</option>
              <option value="PAID">Paid</option>
              <option value="RETURNED">Returned</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab === 'categories' ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-semibold text-sm text-slate-800">Expense Policy Categories & Thresholds</h3>
            <span className="text-xs text-slate-500">{categories.length} Active Categories</span>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Code</th>
                <th className="p-3.5">Category Name</th>
                <th className="p-3.5">Description</th>
                <th className="p-3.5">Limit Per Claim</th>
                <th className="p-3.5">Receipt Mandatory</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50/80">
                  <td className="p-3.5 font-semibold text-slate-900">{cat.code}</td>
                  <td className="p-3.5 font-medium text-slate-800">{cat.name}</td>
                  <td className="p-3.5 text-slate-500 max-w-xs truncate">{cat.description || '—'}</td>
                  <td className="p-3.5 font-medium text-slate-900">
                    {cat.maxLimitPerClaim ? `$${cat.maxLimitPerClaim.toLocaleString()}` : 'No Limit'}
                  </td>
                  <td className="p-3.5">
                    {cat.requiresReceipt ? (
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-2xs font-medium">Required</span>
                    ) : (
                      <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-2xs font-medium">Optional</span>
                    )}
                  </td>
                  <td className="p-3.5">
                    {cat.isActive ? (
                      <span className="text-green-700 font-medium">Active</span>
                    ) : (
                      <span className="text-slate-400">Disabled</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading expense claims...</div>
          ) : filteredClaims.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800">No expense claims found</h3>
              <p className="text-xs text-slate-500 mt-1">Submit a new reimbursement claim to get started.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Claim Number</th>
                  <th className="p-3.5">Employee</th>
                  <th className="p-3.5">Claim Title</th>
                  <th className="p-3.5">Items / Receipts</th>
                  <th className="p-3.5">Total Amount</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Submitted Date</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-semibold text-slate-900">{claim.claimNumber}</td>
                    <td className="p-3.5">
                      <div className="font-medium text-slate-900">{claim.employeeName}</div>
                      <div className="text-2xs text-slate-400">{claim.employeeCode}</div>
                    </td>
                    <td className="p-3.5 font-medium text-slate-800">{claim.title}</td>
                    <td className="p-3.5 text-slate-600">
                      {claim.items?.length || 0} items • {claim.receiptsCount} receipts
                    </td>
                    <td className="p-3.5 font-bold text-slate-900">
                      ${Number(claim.totalAmount).toFixed(2)} {claim.currency}
                    </td>
                    <td className="p-3.5">{getStatusBadge(claim.status)}</td>
                    <td className="p-3.5 text-slate-500">
                      {claim.submittedAt ? new Date(claim.submittedAt).toLocaleDateString() : 'Draft'}
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => setSelectedClaim(claim)}
                        className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium cursor-pointer"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleViewHistory(claim)}
                        className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium cursor-pointer"
                      >
                        Audit
                      </button>
                      {canApprove &&
                        (claim.status === ExpenseClaimStatus.SUBMITTED ||
                          claim.status === ExpenseClaimStatus.MANAGER_APPROVED) && (
                          <button
                            onClick={() =>
                              setActionModal({
                                claim,
                                action: 'APPROVE',
                              })
                            }
                            className="px-2.5 py-1 rounded bg-[#2F75B5] text-white hover:bg-[#1f5588] font-medium cursor-pointer"
                          >
                            Review
                          </button>
                        )}
                      {canApprove && claim.status === ExpenseClaimStatus.FINANCE_APPROVED && (
                        <button
                          onClick={() =>
                            setActionModal({
                              claim,
                              action: 'PAY',
                            })
                          }
                          className="px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 font-medium cursor-pointer"
                        >
                          Disburse
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Claim Details Modal */}
      {selectedClaim && !isHistoryOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs font-semibold text-blue-600">{selectedClaim.claimNumber}</span>
                <h3 className="text-lg font-bold text-slate-900">{selectedClaim.title}</h3>
              </div>
              <button
                onClick={() => setSelectedClaim(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400">Employee:</span>
                <div className="font-semibold text-slate-900">{selectedClaim.employeeName}</div>
              </div>
              <div>
                <span className="text-slate-400">Total Claim Amount:</span>
                <div className="font-bold text-base text-slate-900">
                  ${Number(selectedClaim.totalAmount).toFixed(2)} {selectedClaim.currency}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Status:</span>
                <div className="mt-1">{getStatusBadge(selectedClaim.status)}</div>
              </div>
              <div>
                <span className="text-slate-400">Description:</span>
                <div className="text-slate-700">{selectedClaim.description || 'No description provided.'}</div>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Itemized Expenses</h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Description & Merchant</th>
                      <th className="p-2.5">Amount</th>
                      <th className="p-2.5">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedClaim.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="p-2.5 text-slate-600">{item.expenseDate}</td>
                        <td className="p-2.5 font-medium text-slate-800">{item.categoryName}</td>
                        <td className="p-2.5">
                          <div className="text-slate-900 font-medium">{item.description}</div>
                          {item.merchantName && <div className="text-2xs text-slate-400">{item.merchantName}</div>}
                        </td>
                        <td className="p-2.5 font-semibold text-slate-900">${Number(item.amount).toFixed(2)}</td>
                        <td className="p-2.5">
                          {item.receiptFileName || item.receiptAttachmentUrl ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-2xs font-medium flex items-center gap-1 w-max">
                              <CheckCircle2 className="w-3 h-3" /> Attached
                            </span>
                          ) : (
                            <span className="text-slate-400 text-2xs">None</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rejection / Return remarks */}
            {selectedClaim.rejectionReason && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                <strong>Rejection Reason:</strong> {selectedClaim.rejectionReason}
              </div>
            )}
            {selectedClaim.returnReason && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-800">
                <strong>Correction Requested:</strong> {selectedClaim.returnReason}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => setSelectedClaim(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              {canApprove &&
                (selectedClaim.status === ExpenseClaimStatus.SUBMITTED ||
                  selectedClaim.status === ExpenseClaimStatus.MANAGER_APPROVED) && (
                  <button
                    onClick={() => {
                      setActionModal({ claim: selectedClaim, action: 'APPROVE' });
                    }}
                    className="px-4 py-2 bg-[#2F75B5] text-white rounded-lg text-xs font-medium hover:bg-[#1f5588] cursor-pointer"
                  >
                    Approve / Action
                  </button>
                )}
            </div>
          </div>
        </div>
      )}

      {/* History Audit Modal */}
      {isHistoryOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                Claim Audit Ledger: {selectedClaim?.claimNumber}
              </h3>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {claimHistory.map((hist) => (
                <div key={hist.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span>{hist.action}</span>
                    <span className="text-slate-400 text-2xs">{new Date(hist.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="text-slate-600">
                    By <span className="font-medium text-slate-900">{hist.actorName}</span> ({hist.actorRole})
                  </div>
                  {hist.remarks && <div className="text-slate-500 italic mt-1">"{hist.remarks}"</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action Modal (Approve / Reject / Return / Pay) */}
      {actionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {actionModal.action === 'APPROVE'
                ? 'Approve Expense Claim'
                : actionModal.action === 'REJECT'
                ? 'Reject Expense Claim'
                : actionModal.action === 'RETURN'
                ? 'Return Claim for Revisions'
                : 'Confirm Disbursement Payment'}
            </h3>
            <p className="text-xs text-slate-500">
              Claim: <span className="font-semibold text-slate-800">{actionModal.claim.claimNumber}</span> — $
              {actionModal.claim.totalAmount.toFixed(2)}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setActionModal({ ...actionModal, action: 'APPROVE' })}
                className={`flex-1 py-1.5 text-xs font-semibold rounded ${
                  actionModal.action === 'APPROVE' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Approve
              </button>
              <button
                onClick={() => setActionModal({ ...actionModal, action: 'RETURN' })}
                className={`flex-1 py-1.5 text-xs font-semibold rounded ${
                  actionModal.action === 'RETURN' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Return
              </button>
              <button
                onClick={() => setActionModal({ ...actionModal, action: 'REJECT' })}
                className={`flex-1 py-1.5 text-xs font-semibold rounded ${
                  actionModal.action === 'REJECT' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Reject
              </button>
            </div>

            {actionModal.action === 'PAY' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Disbursement Ref / Check #</label>
                <input
                  type="text"
                  placeholder="e.g. ACH-2026-09871"
                  value={actionPaymentRef}
                  onChange={(e) => setActionPaymentRef(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {actionModal.action === 'APPROVE' ? 'Approval Remarks (Optional)' : 'Reason / Instructions *'}
              </label>
              <textarea
                rows={3}
                placeholder="Add audit notes..."
                value={actionRemarks}
                onChange={(e) => setActionRemarks(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setActionModal(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessAction}
                className="px-4 py-2 bg-[#2F75B5] text-white rounded-lg text-xs font-medium hover:bg-[#1f5588]"
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Claim Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">New Expense Reimbursement Claim</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Claim Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Q1 Client Meeting & Travel SFO"
                  value={newClaimTitle}
                  onChange={(e) => setNewClaimTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#2F75B5]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Currency</label>
                <select
                  value={newClaimCurrency}
                  onChange={(e) => setNewClaimCurrency(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD ($)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Business Purpose / Description</label>
                <textarea
                  rows={2}
                  placeholder="Detailed justification for reimbursement..."
                  value={newClaimDesc}
                  onChange={(e) => setNewClaimDesc(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>
            </div>

            {/* Item Entry Section */}
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Add Itemized Receipt</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-2xs font-medium text-slate-600 mb-1">Category *</label>
                  <select
                    value={itemCat}
                    onChange={(e) => setItemCat(e.target.value)}
                    className="w-full border border-slate-300 rounded p-1.5 text-xs bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.maxLimitPerClaim ? `(Max $${c.maxLimitPerClaim})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-2xs font-medium text-slate-600 mb-1">Expense Date *</label>
                  <input
                    type="date"
                    value={itemDate}
                    onChange={(e) => setItemDate(e.target.value)}
                    className="w-full border border-slate-300 rounded p-1.5 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-medium text-slate-600 mb-1">Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={itemAmount}
                    onChange={(e) => setItemAmount(e.target.value)}
                    className="w-full border border-slate-300 rounded p-1.5 text-xs bg-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-medium text-slate-600 mb-1">Merchant / Vendor</label>
                  <input
                    type="text"
                    placeholder="e.g. United Airlines, Hilton"
                    value={itemMerchant}
                    onChange={(e) => setItemMerchant(e.target.value)}
                    className="w-full border border-slate-300 rounded p-1.5 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-medium text-slate-600 mb-1">Item Description *</label>
                  <input
                    type="text"
                    placeholder="e.g. Flight ticket SFO roundtrip"
                    value={itemDesc}
                    onChange={(e) => setItemDesc(e.target.value)}
                    className="w-full border border-slate-300 rounded p-1.5 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-medium text-slate-600 mb-1">Receipt Attachment Name</label>
                  <input
                    type="text"
                    placeholder="e.g. flight_receipt_001.pdf"
                    value={itemReceiptName}
                    onChange={(e) => setItemReceiptName(e.target.value)}
                    className="w-full border border-slate-300 rounded p-1.5 text-xs bg-white"
                  />
                </div>
                <div className="sm:col-span-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-3.5 py-1.5 bg-slate-800 text-white rounded text-xs font-semibold hover:bg-slate-700 cursor-pointer"
                  >
                    + Add Item to Claim
                  </button>
                </div>
              </div>

              {/* Items List */}
              {claimItems.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5">Amount</th>
                        <th className="p-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {claimItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 text-slate-600">{item.expenseDate}</td>
                          <td className="p-2.5 font-medium text-slate-800">
                            {categories.find((c) => c.id === item.categoryId)?.name || item.categoryId}
                          </td>
                          <td className="p-2.5">{item.description}</td>
                          <td className="p-2.5 font-bold text-slate-900">${item.amount.toFixed(2)}</td>
                          <td className="p-2.5 text-right">
                            <button
                              onClick={() => handleRemoveItemRow(idx)}
                              className="text-red-600 hover:text-red-800 text-xs font-medium cursor-pointer"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between font-bold text-xs">
                    <span>Total Claim:</span>
                    <span>${claimItems.reduce((s, i) => s + i.amount, 0).toFixed(2)} USD</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleCreateClaim(false)}
                className="px-4 py-2 border border-[#2F75B5] text-[#2F75B5] rounded-lg text-xs font-medium hover:bg-blue-50"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => handleCreateClaim(true)}
                className="px-4 py-2 bg-[#2F75B5] text-white rounded-lg text-xs font-medium hover:bg-[#1f5588]"
              >
                Submit for Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Create Expense Category</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Code (Uppercase) *</label>
                <input
                  type="text"
                  placeholder="e.g. MEALS, LODGING"
                  value={newCatCode}
                  onChange={(e) => setNewCatCode(e.target.value.toUpperCase())}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Client Entertainment & Meals"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Policy rules and coverage..."
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Maximum Limit Per Claim ($)</label>
                <input
                  type="number"
                  placeholder="e.g. 500 (Leave blank for no limit)"
                  value={newCatLimit}
                  onChange={(e) => setNewCatLimit(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="catReceipt"
                  checked={newCatReceipt}
                  onChange={(e) => setNewCatReceipt(e.target.checked)}
                  className="rounded text-[#2F75B5]"
                />
                <label htmlFor="catReceipt" className="text-xs text-slate-700 font-medium">
                  Require receipt attachment for claims in this category
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCategory}
                className="px-4 py-2 bg-[#2F75B5] text-white rounded-lg text-xs font-medium hover:bg-[#1f5588]"
              >
                Save Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
