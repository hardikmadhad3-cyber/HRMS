/**
 * Phase 6B: Expense Claim & Reimbursement Types
 * Strict Multi-Company Isolation & Approval Workflow
 */

export enum ExpenseClaimStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  MANAGER_APPROVED = 'MANAGER_APPROVED',
  FINANCE_APPROVED = 'FINANCE_APPROVED',
  REJECTED = 'REJECTED',
  RETURNED = 'RETURNED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export interface ExpenseCategory {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  maxLimitPerClaim?: number;
  requiresReceipt: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseClaimItem {
  id: string;
  claimId: string;
  companyId: string;
  categoryId: string;
  categoryName?: string;
  expenseDate: string;
  amount: number;
  currency: string;
  taxAmount?: number;
  description: string;
  merchantName?: string;
  receiptAttachmentUrl?: string;
  receiptFileName?: string;
  receiptFileSize?: number;
  receiptMimeType?: string;
  isReceiptVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseClaim {
  id: string;
  companyId: string;
  claimNumber: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  title: string;
  description?: string;
  currency: string;
  totalAmount: number;
  status: ExpenseClaimStatus;
  submittedAt?: string;
  managerId?: string;
  managerName?: string;
  managerApprovedAt?: string;
  managerApprovedBy?: string;
  managerRemarks?: string;
  financeApprovedAt?: string;
  financeApprovedBy?: string;
  financeRemarks?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  returnedAt?: string;
  returnedBy?: string;
  returnReason?: string;
  paymentDate?: string;
  paymentReference?: string;
  receiptsCount: number;
  items?: ExpenseClaimItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseClaimHistory {
  id: string;
  claimId: string;
  companyId: string;
  action: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  fromStatus?: ExpenseClaimStatus;
  toStatus?: ExpenseClaimStatus;
  remarks?: string;
  snapshotData?: any;
  timestamp: string;
}

export interface CreateExpenseClaimDTO {
  employeeId?: string;
  title: string;
  description?: string;
  currency?: string;
  items?: CreateExpenseClaimItemDTO[];
}

export interface UpdateExpenseClaimDTO {
  title?: string;
  description?: string;
  currency?: string;
}

export interface CreateExpenseClaimItemDTO {
  categoryId: string;
  expenseDate: string;
  amount: number;
  currency?: string;
  taxAmount?: number;
  description: string;
  merchantName?: string;
  receiptAttachmentUrl?: string;
  receiptFileName?: string;
  receiptFileSize?: number;
  receiptMimeType?: string;
}

export interface ExpenseApprovalActionDTO {
  action: 'APPROVE' | 'REJECT' | 'RETURN' | 'PAY';
  remarks?: string;
  paymentDate?: string;
  paymentReference?: string;
}

export interface CreateExpenseCategoryDTO {
  code: string;
  name: string;
  description?: string;
  maxLimitPerClaim?: number;
  requiresReceipt?: boolean;
  isActive?: boolean;
}

export interface UpdateExpenseCategoryDTO {
  name?: string;
  description?: string;
  maxLimitPerClaim?: number;
  requiresReceipt?: boolean;
  isActive?: boolean;
}

export interface ExpenseDashboardMetrics {
  totalClaimsCount: number;
  pendingManagerCount: number;
  pendingFinanceCount: number;
  approvedCount: number;
  paidCount: number;
  rejectedCount: number;
  returnedCount: number;
  totalClaimedAmount: number;
  totalApprovedAmount: number;
  totalPaidAmount: number;
  categoryBreakdown: { categoryName: string; count: number; totalAmount: number }[];
}
