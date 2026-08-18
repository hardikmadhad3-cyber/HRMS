import { RelationalDatabase } from '../database/RelationalDatabase.js';
import { ExpenseService } from '../services/ExpenseService.js';
import { AssetService } from '../services/AssetService.js';
import { OffboardingService } from '../services/OffboardingService.js';
import { AuthUser, UserRole, PermissionKey } from '../../src/types/auth.js';
import { ExpenseClaimStatus } from '../../src/types/expenses.js';
import { AssetStatus, AssetCondition } from '../../src/types/assets.js';
import {
  SeparationType,
  OffboardingStatus,
  ClearanceDepartment,
  ClearanceItemStatus,
} from '../../src/types/offboarding.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: any) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`, detail || '');
    failed++;
  }
}

async function runPhase6bcTests() {
  console.log('\n================================================================');
  console.log('PHASE 6B & 6C AUTOMATED VERIFICATION SUITE');
  console.log('Expenses, Asset Master & Offboarding End-to-End Execution');
  console.log('================================================================\n');

  const db = RelationalDatabase.getInstance();
  const company1 = 'comp-101';
  const company2 = 'comp-102';

  // Seed sample employees and hierarchy
  if (db.employees) {
    const emp1 = db.employees.get('emp-101') || {
      id: 'emp-101',
      companyId: company1,
      employeeCode: 'EMP001',
      firstName: 'Alice',
      lastName: 'Smith',
      displayName: 'Alice Smith',
      workEmail: 'alice@acme.com',
      mobileNumber: '+15550001',
      joiningDate: '2023-01-15',
      employmentType: 'FULL_TIME' as any,
      status: 'ACTIVE' as any,
      gender: 'FEMALE' as any,
      dateOfBirth: '1990-05-12',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.employees.set(emp1.id, emp1);

    const emp2 = db.employees.get('emp-102') || {
      id: 'emp-102',
      companyId: company1,
      employeeCode: 'EMP002',
      firstName: 'Bob',
      lastName: 'Manager',
      displayName: 'Bob Manager',
      workEmail: 'bob@acme.com',
      mobileNumber: '+15550002',
      joiningDate: '2022-01-15',
      employmentType: 'FULL_TIME' as any,
      status: 'ACTIVE' as any,
      gender: 'MALE' as any,
      dateOfBirth: '1985-03-22',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.employees.set(emp2.id, emp2);

    // Set assignment for Alice reporting to Bob
    db.employeeAssignments.set('asg-101', {
      id: 'asg-101',
      employeeId: 'emp-101',
      companyId: company1,
      branchId: 'br-1',
      departmentId: 'dept-eng',
      designationId: 'des-swe',
      workLocationId: 'loc-1',
      managerId: 'emp-102',
      effectiveFrom: '2023-01-15',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Users
  const employeeUser: AuthUser = {
    id: 'usr-alice',
    username: 'alice.smith',
    email: 'alice@acme.com',
    fullName: 'Alice Smith',
    role: UserRole.EMPLOYEE,
    activeCompanyId: company1,
    companyIds: [company1],
    isActive: true,
    employeeId: 'emp-101',
    permissions: [PermissionKey.EXPENSE_APPLY, PermissionKey.ASSET_VIEW, PermissionKey.OFFBOARDING_VIEW],
  };

  const managerUser: AuthUser = {
    id: 'usr-bob',
    username: 'bob.manager',
    email: 'bob@acme.com',
    fullName: 'Bob Manager',
    role: UserRole.MANAGER,
    activeCompanyId: company1,
    companyIds: [company1],
    isActive: true,
    employeeId: 'emp-102',
    permissions: [
      PermissionKey.EXPENSE_APPLY,
      PermissionKey.EXPENSE_APPROVE,
      PermissionKey.ASSET_VIEW,
      PermissionKey.OFFBOARDING_VIEW,
      PermissionKey.OFFBOARDING_MANAGE,
    ],
  };

  const hrAdminUser: AuthUser = {
    id: 'usr-hr',
    username: 'hr.admin',
    email: 'hr@acme.com',
    fullName: 'HR Administrator',
    role: UserRole.HR_ADMIN,
    activeCompanyId: company1,
    companyIds: [company1],
    isActive: true,
    employeeId: 'emp-103',
    permissions: [
      PermissionKey.EXPENSE_APPROVE,
      PermissionKey.ASSET_MANAGE,
      PermissionKey.ASSET_VIEW,
      PermissionKey.OFFBOARDING_MANAGE,
      PermissionKey.OFFBOARDING_VIEW,
    ],
  };

  const otherCompanyUser: AuthUser = {
    id: 'usr-other',
    username: 'other.tenant',
    email: 'other@corp.com',
    fullName: 'Other Corp Admin',
    role: UserRole.SUPER_ADMIN,
    activeCompanyId: company2,
    companyIds: [company2],
    isActive: true,
    permissions: [PermissionKey.EXPENSE_APPLY, PermissionKey.ASSET_MANAGE],
  };

  console.log('--- TEST GROUP 1: EXPENSES & MULTI-STAGE APPROVAL WORKFLOW ---');
  // 1.1 Create Category
  const testCatCode = `TRV_${Date.now().toString().slice(-4)}`;
  const travelCategory = await ExpenseService.createCategory(
    {
      code: testCatCode,
      name: 'Business Travel & Lodging',
      description: 'Flights, hotels, per diem',
      maxLimitPerClaim: 5000,
      requiresReceipt: true,
    },
    company1,
    hrAdminUser
  );
  assert(travelCategory.id.length > 0 && travelCategory.code === testCatCode, 'Create Expense Category in Company 1');

  // 1.2 Employee drafts claim and adds items
  const claim = await ExpenseService.createClaim(
    {
      title: 'Q1 Client Onsite Visit',
      description: 'Client visit flights and accommodation',
      currency: 'USD',
      items: [
        {
          categoryId: travelCategory.id,
          expenseDate: '2026-02-10',
          amount: 450.0,
          currency: 'USD',
          merchantName: 'Delta Airlines',
          description: 'Roundtrip Flight',
          receiptAttachmentUrl: 'https://storage.local/receipts/delta.pdf',
          receiptFileName: 'delta.pdf',
        },
        {
          categoryId: travelCategory.id,
          expenseDate: '2026-02-11',
          amount: 220.0,
          currency: 'USD',
          merchantName: 'Marriott Downtown',
          description: '1 Night Hotel Stay',
          receiptAttachmentUrl: 'https://storage.local/receipts/hotel.pdf',
          receiptFileName: 'hotel.pdf',
        },
      ],
    },
    company1,
    employeeUser
  );
  assert(claim.status === ExpenseClaimStatus.DRAFT, 'Expense Claim created in DRAFT state');
  assert(claim.totalAmount === 670.0, 'Expense Claim total correctly computed ($670.00)');

  // 1.3 Employee submits claim
  const submittedClaim = await ExpenseService.submitClaim(claim.id, company1, employeeUser);
  assert(
    submittedClaim.status === ExpenseClaimStatus.SUBMITTED,
    'Expense Claim submitted -> status SUBMITTED / PENDING_MANAGER'
  );

  // 1.4 Manager approves claim
  const managerApprovedClaim = await ExpenseService.processApprovalAction(
    submittedClaim.id,
    {
      action: 'APPROVE',
      remarks: 'Approved for client travel.',
    },
    company1,
    managerUser
  );
  assert(
    managerApprovedClaim.status === ExpenseClaimStatus.MANAGER_APPROVED,
    'Manager approves claim -> status MANAGER_APPROVED'
  );

  // 1.5 Finance/HR approves and marks paid
  const financeApprovedClaim = await ExpenseService.processApprovalAction(
    managerApprovedClaim.id,
    {
      action: 'APPROVE',
      remarks: 'Finance processed for reimbursement.',
    },
    company1,
    hrAdminUser
  );
  assert(
    financeApprovedClaim.status === ExpenseClaimStatus.FINANCE_APPROVED,
    'Finance finalizes approval -> status FINANCE_APPROVED'
  );

  // 1.6 Tenant isolation check for expenses
  let isolatedExpenseBlocked = false;
  try {
    await ExpenseService.getClaimById(claim.id, company2, otherCompanyUser);
  } catch {
    isolatedExpenseBlocked = true;
  }
  assert(isolatedExpenseBlocked, 'Tenant Isolation: Company 2 cannot access Company 1 Expense Claims');

  console.log('\n--- TEST GROUP 2: ASSET MASTER & CUSTODY LIFECYCLE ---');
  // 2.1 Create Asset Category
  const testAssetCatCode = `LAP_${Date.now().toString().slice(-4)}`;
  const laptopCategory = await AssetService.createCategory(
    {
      code: testAssetCatCode,
      name: 'Engineering Laptops',
      description: 'High performance MacBook & Dell workstations',
      depreciationYears: 3,
    },
    company1,
    hrAdminUser
  );
  assert(laptopCategory.code === testAssetCatCode, 'Create Asset Category');

  // 2.2 Register Asset into Master
  const testAssetCode = `AST-LAP-${Date.now().toString().slice(-4)}`;
  const asset = await AssetService.createAsset(
    {
      assetCode: testAssetCode,
      name: 'MacBook Pro 16 M3 Max',
      categoryId: laptopCategory.id,
      serialNumber: `C02G${Date.now().toString().slice(-6)}`,
      manufacturer: 'Apple',
      modelNumber: 'A2991',
      purchaseCost: 3499.0,
      currency: 'USD',
      purchaseDate: '2026-01-10',
      condition: AssetCondition.NEW,
    },
    company1,
    hrAdminUser
  );
  assert(asset.status === AssetStatus.AVAILABLE, 'Registered Asset starts in AVAILABLE status');

  // 2.3 Assign Asset to Alice
  const assigned = await AssetService.assignAsset(
    asset.id,
    {
      employeeId: 'emp-101',
      assignedDate: '2026-01-15',
      condition: AssetCondition.NEW,
      notes: 'Issued with 140W USB-C charger and sleeve',
    },
    company1,
    hrAdminUser
  );
  const assignedAssetMaster = await AssetService.getAssetById(asset.id, company1, hrAdminUser);
  assert(
    assigned.employeeId === 'emp-101' && assignedAssetMaster.status === AssetStatus.ASSIGNED,
    'Asset assigned to Employee (emp-101) with active custody'
  );

  // 2.4 Verify History Audit
  const history = await AssetService.getAssetHistory(asset.id, company1, hrAdminUser);
  assert(history.length >= 2, 'Asset Custody Audit History logs registration and assignment');

  // 2.5 Return Asset Custody
  const returned = await AssetService.returnAsset(
    asset.id,
    {
      returnDate: '2026-02-15',
      returnCondition: AssetCondition.EXCELLENT,
      notes: 'Returned in pristine condition during team transition',
      targetStatus: AssetStatus.AVAILABLE,
    },
    company1,
    hrAdminUser
  );
  const returnedAssetMaster = await AssetService.getAssetById(asset.id, company1, hrAdminUser);
  assert(
    returned.isReturned && returnedAssetMaster.status === AssetStatus.AVAILABLE && !returnedAssetMaster.currentEmployeeId,
    'Asset returned back into inventory pool with condition audit'
  );

  console.log('\n--- TEST GROUP 3: OFFBOARDING & SEPARATION WORKFLOW ---');
  // 3.1 Alice submits resignation
  const resignation = await OffboardingService.initiateResignation(
    {
      reason: 'Relocating to another city',
      proposedLastWorkingDate: '2026-03-31',
      noticePeriodDays: 30,
      remarks: 'Transition documentation prepared in repo',
    },
    company1,
    employeeUser
  );
  assert(
    resignation.status === OffboardingStatus.INITIATED && resignation.requestNumber.startsWith('OFF-'),
    'Resignation initiated with official request tracking number'
  );

  // 3.2 HR Approves separation & initializes departmental clearances
  const approvedOffboarding = await OffboardingService.approveOffboarding(
    resignation.id,
    {
      officialLastWorkingDate: '2026-03-31',
      remarks: 'Approved notice period schedule.',
    },
    company1,
    hrAdminUser
  );
  assert(
    approvedOffboarding.status === OffboardingStatus.CLEARANCE_IN_PROGRESS ||
      approvedOffboarding.status === OffboardingStatus.APPROVED,
    'Offboarding approved and clearance tasks populated'
  );

  // 3.3 Complete all departmental clearance items
  const offboardingDetails = await OffboardingService.getOffboardingById(resignation.id, company1, hrAdminUser);
  const clearanceList = offboardingDetails.clearanceItems || [];
  assert(clearanceList.length > 0, `Clearance checklist generated (${clearanceList.length} items across IT, HR, Manager, Finance)`);

  for (const item of clearanceList) {
    await OffboardingService.updateClearanceItem(
      item.id,
      {
        status: ClearanceItemStatus.CLEARED,
        remarks: 'All items verified and accounted for.',
      },
      company1,
      hrAdminUser
    );
  }

  // 3.4 Record Exit Interview
  const interview = await OffboardingService.saveExitInterview(
    resignation.id,
    {
      primaryReasonForLeaving: 'Relocation & personal reasons',
      overallExperienceRating: 5,
      managerFeedbackRating: 5,
      companyCultureRating: 5,
      compensationFeedback: 'Fair and competitive market rates.',
      suggestionsForImprovement: 'Keep up the great engineering standards!',
      wouldRecommendCompany: true,
    },
    company1,
    hrAdminUser
  );
  assert(interview.overallExperienceRating === 5, 'Exit Interview recorded and linked to separation dossier');

  // 3.5 Complete Final Separation
  const completedOffboarding = await OffboardingService.completeOffboarding(
    resignation.id,
    { remarks: 'Full and final separation concluded.' },
    company1,
    hrAdminUser
  );
  assert(
    completedOffboarding.status === OffboardingStatus.COMPLETED,
    'Offboarding completed and employee record archived/transitioned'
  );

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase6bcTests().catch((err) => {
  console.error('Test run failed with unhandled error:', err);
  process.exit(1);
});
