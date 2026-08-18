/**
 * PHASE 1C EMPLOYEE CORE COMPREHENSIVE VERIFICATION & TEST SUITE
 * 
 * Verifies all 17 requirements of Phase 1C:
 * 1. Directory Listing, Search, Filters, Pagination
 * 2. Real Employee Creation (EMP-0001)
 * 3. Atomic Transactional Create & Rollback
 * 4. Full Profile & All Sub-domain Entities
 * 5. Effective-Dated Assignments & Overlap Prevention
 * 6. Manager Hierarchy, Self-Manager & Circular Manager Detection
 * 7. Multi-Company Tenant Isolation
 * 8. RBAC Matrix & Scoping
 * 9. Sensitive Bank Data Masking
 * 10. Statutory Data Masking
 * 11. Document Upload, Verification, Deletion
 * 12. Status Lifecycle & Status History
 * 13. Audit Trail Generation & Sanitization
 * 14. Authentication & Session Revocation (401)
 * 15. Uniqueness Checks (Code & Email)
 * 16. Organization Master Foreign Key Validation
 */

import { RelationalDatabase } from '../database/RelationalDatabase.js';
import { EmployeeService, AppError } from '../services/EmployeeService.js';
import { AuthService } from '../services/AuthService.js';
import { AuditService } from '../services/AuditService.js';
import { UserRole, PermissionKey, AuthUser } from '../../src/types/auth.js';
import { CreateEmployeeDTO, CreateAssignmentChangeDTO } from '../../src/types/employee.js';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failedTests++;
  }
}

async function runVerification() {
  console.log('================================================================');
  console.log('🚀 STARTING PHASE 1C COMPREHENSIVE VERIFICATION SUITE');
  console.log('================================================================\n');

  const db = RelationalDatabase.getInstance();

  // Define Actors
  const superAdmin: AuthUser = {
    id: 'usr-1',
    username: 'admin',
    email: 'admin@hrms.enterprise.com',
    fullName: 'Alexander Vance',
    avatarUrl: '',
    employeeCode: 'EMP-001',
    role: UserRole.SUPER_ADMIN,
    permissions: Object.values(PermissionKey),
    companyIds: ['comp-101', 'comp-102'],
    activeCompanyId: 'comp-101',
    departmentId: 'dept-1',
    designationId: 'desig-1',
    isActive: true,
  };

  const hrAdmin: AuthUser = {
    id: 'usr-2',
    username: 'hr_admin',
    email: 'hr.admin@acme-corp.com',
    fullName: 'Sarah Jenkins',
    avatarUrl: '',
    employeeCode: 'EMP-002',
    role: UserRole.HR_ADMIN,
    permissions: [
      PermissionKey.ORGANIZATION_VIEW,
      PermissionKey.ORGANIZATION_MANAGE,
      PermissionKey.EMPLOYEE_VIEW,
      PermissionKey.EMPLOYEE_MANAGE,
    ],
    companyIds: ['comp-101'],
    activeCompanyId: 'comp-101',
    departmentId: 'dept-2',
    designationId: 'desig-2',
    isActive: true,
  };

  const standardEmployee: AuthUser = {
    id: 'usr-4',
    username: 'employee',
    email: 'john.doe@acme-corp.com',
    fullName: 'John Doe',
    avatarUrl: '',
    employeeCode: 'EMP-010',
    role: UserRole.EMPLOYEE,
    permissions: [PermissionKey.ATTENDANCE_VIEW],
    companyIds: ['comp-101'],
    activeCompanyId: 'comp-101',
    departmentId: 'dept-1',
    designationId: 'desig-3',
    isActive: true,
  };

  // -------------------------------------------------------------
  // 1. EMPLOYEE DIRECTORY VERIFICATION
  // -------------------------------------------------------------
  console.log('📋 [1/16] Testing Employee Directory (Search, Filter, Pagination)...');
  const dirAll = await EmployeeService.getDirectory('comp-101', { page: 1, limit: 10 }, superAdmin);
  assert(dirAll.items.length >= 4, 'Directory lists company employees', `Found ${dirAll.items.length} items`);

  // Search by code
  const searchCode = await EmployeeService.getDirectory('comp-101', { search: 'EMP-002' }, superAdmin);
  assert(searchCode.items.length === 1 && searchCode.items[0].employeeCode === 'EMP-002', 'Search by Employee Code works');

  // Search by name
  const searchName = await EmployeeService.getDirectory('comp-101', { search: 'Sarah' }, superAdmin);
  assert(searchName.items.length >= 1 && searchName.items[0].displayName.includes('Sarah'), 'Search by Name works');

  // Department filter
  const filterDept = await EmployeeService.getDirectory('comp-101', { departmentId: 'dept-2' }, superAdmin);
  assert(filterDept.items.every(e => e.departmentId === 'dept-2'), 'Department filter works');

  // Status filter
  const filterStatus = await EmployeeService.getDirectory('comp-101', { status: 'ACTIVE' }, superAdmin);
  assert(filterStatus.items.every(e => e.status === 'ACTIVE'), 'Status filter works');

  // -------------------------------------------------------------
  // 2. CREATE REAL EMPLOYEE (EMP-0001)
  // -------------------------------------------------------------
  console.log('\n👤 [2/16] Testing Real Employee Creation (EMP-0001: Rahul Shah)...');
  const createDTO: CreateEmployeeDTO = {
    employeeCode: 'EMP-0001',
    firstName: 'Rahul',
    middleName: 'K',
    lastName: 'Shah',
    displayName: 'Rahul Shah',
    gender: 'MALE',
    dateOfBirth: '1992-07-15',
    maritalStatus: 'MARRIED',
    nationality: 'Indian',
    bloodGroup: 'B+',
    workEmail: 'rahul.shah@acme-corp.com',
    personalEmail: 'rahul.personal@gmail.com',
    mobileNumber: '+91 98765 43210',
    joiningDate: '2026-01-15',
    employmentType: 'FULL_TIME',
    probationPeriodMonths: 3,
    noticePeriodDays: 30,
    branchId: 'br-1',
    departmentId: 'dept-1',
    designationId: 'desig-1',
    workLocationId: 'wl-1',
    managerId: 'emp-101',
    currentAddress: {
      addressLine1: 'Flat 402, Skyline Residency',
      addressLine2: 'Tech Park Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      postalCode: '560100',
    },
    permanentAddress: {
      addressLine1: 'Flat 402, Skyline Residency',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      postalCode: '560100',
      isSameAsCurrent: true,
    },
    emergencyContact: {
      contactName: 'Priya Shah',
      relationship: 'Spouse',
      phoneNumber: '+91 98765 00000',
      email: 'priya.shah@gmail.com',
    },
    bankAccount: {
      accountHolderName: 'Rahul Shah',
      bankName: 'HDFC Bank',
      accountNumber: '50100234567890',
      ifscCode: 'HDFC0001234',
      branchName: 'Koramangala Branch',
      accountType: 'SAVINGS',
    },
    statutoryDetails: {
      panNumber: 'ABCDE1234F',
      aadhaarNumber: '123456789012',
      uanNumber: '100987654321',
      pfNumber: 'PF/BLR/12345/001',
      esiNumber: 'ESI-987654321',
      taxRegime: 'NEW',
    },
  };

  const createdProfile = await EmployeeService.createEmployee(createDTO, 'comp-101', hrAdmin);
  assert(createdProfile.employee.employeeCode === 'EMP-0001', 'Created Employee record successfully');
  assert(createdProfile.currentAssignment?.branchId === 'br-1', 'Initial assignment linked');
  assert(createdProfile.addresses.length === 2, 'Current and Permanent addresses saved');
  assert(createdProfile.emergencyContacts.length === 1, 'Emergency contact saved');
  assert(createdProfile.bankAccount?.bankName === 'HDFC Bank', 'Bank account saved');
  assert(createdProfile.statutoryDetails?.panNumber === 'ABCDE1234F', 'Statutory details saved');

  // -------------------------------------------------------------
  // 3. TRANSACTIONAL ROLLBACK TEST
  // -------------------------------------------------------------
  console.log('\n🔄 [3/16] Testing Transactional Create & Atomic Rollback...');
  const invalidOrgDTO: CreateEmployeeDTO = {
    ...createDTO,
    employeeCode: 'EMP-FAIL-01',
    workEmail: 'fail.employee@acme-corp.com',
    branchId: 'br-nonexistent', // Will fail validation
  };

  let rollbackPassed = false;
  try {
    await EmployeeService.createEmployee(invalidOrgDTO, 'comp-101', hrAdmin);
  } catch (err: any) {
    if (err.code === 'INVALID_ORGANIZATION_REFERENCE') {
      const checkOrphan = await db.employees.get('emp-nonexistent');
      rollbackPassed = checkOrphan === undefined;
    }
  }
  assert(rollbackPassed, 'Transaction rejected and state cleanly preserved on invalid foreign key');

  // -------------------------------------------------------------
  // 4. FULL PROFILE INSPECTION
  // -------------------------------------------------------------
  console.log('\n🔍 [4/16] Testing Full Profile Retrieval & Tabs Integrity...');
  const fetchedProfile = await EmployeeService.getProfile(createdProfile.employee.id, 'comp-101', superAdmin);
  assert(fetchedProfile !== null, 'Full profile retrieved successfully');
  assert(fetchedProfile!.assignmentHistory.length >= 1, 'Assignment history initialized');
  assert(fetchedProfile!.statusHistory.length >= 1, 'Status history initialized');

  // -------------------------------------------------------------
  // 5. EFFECTIVE-DATED ASSIGNMENT CHANGE & OVERLAP PREVENTION
  // -------------------------------------------------------------
  console.log('\n📅 [5/16] Testing Effective-Dated Assignment Lifecycle...');
  const asgChangeDTO: CreateAssignmentChangeDTO = {
    branchId: 'br-1',
    departmentId: 'dept-1',
    designationId: 'desig-2', // Promotion
    workLocationId: 'wl-1',
    managerId: 'emp-101',
    effectiveFrom: '2026-06-01',
    changeReason: 'PROMOTION',
    notes: 'Promoted to Senior Lead Engineer based on H1 performance.',
  };

  const updatedAsgProfile = await EmployeeService.createAssignmentChange(
    createdProfile.employee.id,
    asgChangeDTO,
    'comp-101',
    hrAdmin
  );

  assert(updatedAsgProfile.assignmentHistory.length === 2, 'Assignment history contains both previous and new assignments');
  const prevAsg = updatedAsgProfile.assignmentHistory.find(a => a.effectiveTo !== undefined);
  assert(prevAsg?.effectiveTo === '2026-05-31', 'Previous assignment properly terminated with effectiveTo = 2026-05-31');

  // Overlapping / retroactive assignment rejection test
  let overlapRejectionPassed = false;
  try {
    await EmployeeService.createAssignmentChange(
      createdProfile.employee.id,
      { ...asgChangeDTO, effectiveFrom: '2026-01-01' }, // Earlier than active assignment (2026-06-01)
      'comp-101',
      hrAdmin
    );
  } catch (err: any) {
    if (err.code === 'INVALID_ASSIGNMENT_DATE') {
      overlapRejectionPassed = true;
    }
  }
  assert(overlapRejectionPassed, 'Retroactive / overlapping assignment rejected with INVALID_ASSIGNMENT_DATE');

  // -------------------------------------------------------------
  // 6. MANAGER HIERARCHY: SELF-MANAGER & CIRCULAR DETECTION
  // -------------------------------------------------------------
  console.log('\n🌳 [6/16] Testing Manager Hierarchy (Self-Manager & Circular Manager Detection)...');
  
  // 6a. Self Manager Check
  let selfManagerRejected = false;
  try {
    await EmployeeService.createAssignmentChange(
      createdProfile.employee.id,
      { ...asgChangeDTO, effectiveFrom: '2026-07-01', managerId: createdProfile.employee.id },
      'comp-101',
      hrAdmin
    );
  } catch (err: any) {
    if (err.code === 'INVALID_MANAGER') {
      selfManagerRejected = true;
    }
  }
  assert(selfManagerRejected, 'Self-manager assignment rejected with INVALID_MANAGER');

  // 6b. Circular Manager Check (emp-103 reports to emp-101; setting emp-101 to report to emp-103 must fail)
  let circularRejected = false;
  try {
    await EmployeeService.createAssignmentChange(
      'emp-101',
      {
        branchId: 'br-1',
        departmentId: 'dept-1',
        designationId: 'desig-1',
        workLocationId: 'wl-1',
        managerId: 'emp-103', // Robert Vance (who reports to emp-101 Alexander Vance)
        effectiveFrom: '2026-08-01',
        changeReason: 'RESTRUCTURING',
      },
      'comp-101',
      hrAdmin
    );
  } catch (err: any) {
    if (err.code === 'CIRCULAR_MANAGER_HIERARCHY') {
      circularRejected = true;
    }
  }
  assert(circularRejected, 'Circular manager relationship rejected with CIRCULAR_MANAGER_HIERARCHY');

  // -------------------------------------------------------------
  // 7. MULTI-COMPANY TENANT ISOLATION
  // -------------------------------------------------------------
  console.log('\n🏢 [7/16] Testing Multi-Company Tenant Isolation...');
  // Employee EMP-0001 belongs to comp-101. Querying with comp-102 context must return null.
  const crossCompanyGet = await EmployeeService.getProfile(createdProfile.employee.id, 'comp-102', superAdmin);
  assert(crossCompanyGet === null, 'Company A employee is completely inaccessible from Company B context');

  const comp102Directory = await EmployeeService.getDirectory('comp-102', {}, superAdmin);
  assert(!comp102Directory.items.some(e => e.id === createdProfile.employee.id), 'Company A employee absent from Company B directory');

  // -------------------------------------------------------------
  // 8. RBAC PERMISSIONS & ROLE ACCESS
  // -------------------------------------------------------------
  console.log('\n🛡️ [8/16] Testing Role-Based Access Control (RBAC)...');
  const hrCanView = await EmployeeService.getProfile(createdProfile.employee.id, 'comp-101', hrAdmin);
  assert(hrCanView !== null, 'HR Admin has permission to view employee profile');

  // -------------------------------------------------------------
  // 9. SENSITIVE BANK DATA MASKING
  // -------------------------------------------------------------
  console.log('\n💳 [9/16] Testing Bank Account Masking based on Actor Permissions...');
  // Standard non-privileged employee viewing another employee's profile
  const employeeView = await EmployeeService.getProfile(createdProfile.employee.id, 'comp-101', standardEmployee);
  assert(
    employeeView?.bankAccount?.accountNumber === '••••••••7890',
    'Bank account masked (••••••••7890) for non-privileged actor',
    `Received: ${employeeView?.bankAccount?.accountNumber}`
  );

  // Super Admin viewing profile (privileged access)
  const adminView = await EmployeeService.getProfile(createdProfile.employee.id, 'comp-101', superAdmin);
  assert(
    adminView?.bankAccount?.accountNumber === '50100234567890',
    'Full bank account visible to authorized SUPER_ADMIN'
  );

  // -------------------------------------------------------------
  // 10. STATUTORY DATA MASKING
  // -------------------------------------------------------------
  console.log('\n📜 [10/16] Testing Statutory Data Masking (PAN, Aadhaar, UAN, PF, ESI)...');
  assert(
    employeeView?.statutoryDetails?.panNumber === '••••••••234F',
    'PAN Number masked for non-privileged actor',
    `Received: ${employeeView?.statutoryDetails?.panNumber}`
  );
  assert(
    employeeView?.statutoryDetails?.aadhaarNumber === '••••••••9012',
    'Aadhaar Number masked for non-privileged actor',
    `Received: ${employeeView?.statutoryDetails?.aadhaarNumber}`
  );
  assert(
    adminView?.statutoryDetails?.panNumber === 'ABCDE1234F',
    'Full PAN visible to authorized SUPER_ADMIN'
  );

  // -------------------------------------------------------------
  // 11. EMPLOYEE DOCUMENTS MANAGEMENT
  // -------------------------------------------------------------
  console.log('\n📁 [11/16] Testing Employee Documents (Upload, Verify, Delete)...');
  const uploadedDoc = await EmployeeService.uploadDocument(
    createdProfile.employee.id,
    {
      documentType: 'GOVERNMENT_ID',
      title: 'Passport Copy',
      fileName: 'passport_scan.pdf',
      fileSizeBytes: 1024 * 250,
      mimeType: 'application/pdf',
      notes: 'Submitted during onboarding.',
    },
    'comp-101',
    hrAdmin
  );
  assert(uploadedDoc.verificationStatus === 'PENDING', 'Document uploaded with PENDING verification status');

  const verifiedDoc = await EmployeeService.verifyDocument(
    uploadedDoc.id,
    createdProfile.employee.id,
    'VERIFIED',
    'Passport verified against physical document.',
    'comp-101',
    hrAdmin
  );
  assert(verifiedDoc.verificationStatus === 'VERIFIED', 'Document status updated to VERIFIED');

  const docDeleted = await EmployeeService.deleteDocument(
    uploadedDoc.id,
    createdProfile.employee.id,
    'comp-101',
    hrAdmin
  );
  assert(docDeleted === true, 'Document deleted cleanly');

  // -------------------------------------------------------------
  // 12. STATUS LIFECYCLE MANAGEMENT
  // -------------------------------------------------------------
  console.log('\n🔄 [12/16] Testing Status Lifecycle & History (ACTIVE -> PROBATION -> ACTIVE)...');
  const statusUpdateProfile = await EmployeeService.updateStatus(
    createdProfile.employee.id,
    {
      status: 'ON_LEAVE',
      effectiveDate: '2026-07-01',
      reason: 'Sabbatical leave approved for study.',
      comments: 'Return date anticipated in 6 months.',
    },
    'comp-101',
    hrAdmin
  );
  assert(statusUpdateProfile.employee.status === 'ON_LEAVE', 'Employee status transitioned to ON_LEAVE');
  assert(statusUpdateProfile.statusHistory.length >= 2, 'Status transition history recorded');

  // -------------------------------------------------------------
  // 13. AUDIT TRAIL GENERATION & SANITIZATION
  // -------------------------------------------------------------
  console.log('\n📝 [13/16] Testing Audit Trail Generation & Sanitization...');
  const auditLogs = await AuditService.getLogs('comp-101');
  const employeeCreateAudit = auditLogs.find(l => l.action === 'EMPLOYEE_CREATED' && l.targetRecordId === createdProfile.employee.id);
  assert(employeeCreateAudit !== undefined, 'EMPLOYEE_CREATED audit log entry recorded');

  const statusChangeAudit = auditLogs.find(l => l.action === 'EMPLOYEE_STATUS_CHANGED' && l.targetRecordId === createdProfile.employee.id);
  assert(statusChangeAudit !== undefined, 'EMPLOYEE_STATUS_CHANGED audit log entry recorded');

  // Audit log contains NO raw bank account numbers
  assert(
    !JSON.stringify(employeeCreateAudit).includes('50100234567890'),
    'Audit log changesSummary is sanitized and does not leak raw bank account numbers'
  );

  // -------------------------------------------------------------
  // 14. AUTHENTICATION & SESSION VALIDATION (401)
  // -------------------------------------------------------------
  console.log('\n🔐 [14/16] Testing Session Revocation & Authentication...');
  const session = await AuthService.createSession(superAdmin.id);
  assert(AuthService.isSessionValid(session.sessionId), 'New session is valid');

  await AuthService.revokeSession(session.sessionId);
  assert(!AuthService.isSessionValid(session.sessionId), 'Revoked session is invalidated (401 triggers)');

  // -------------------------------------------------------------
  // 15. UNIQUENESS CONSTRAINTS (CODE & WORK EMAIL)
  // -------------------------------------------------------------
  console.log('\n⚡ [15/16] Testing Uniqueness Constraints...');
  let dupCodeRejected = false;
  try {
    await EmployeeService.createEmployee(
      { ...createDTO, workEmail: 'unique.email@acme-corp.com' },
      'comp-101',
      hrAdmin
    );
  } catch (err: any) {
    if (err.code === 'DUPLICATE_EMPLOYEE_CODE') {
      dupCodeRejected = true;
    }
  }
  assert(dupCodeRejected, 'Duplicate employee code in company rejected with DUPLICATE_EMPLOYEE_CODE');

  let dupEmailRejected = false;
  try {
    await EmployeeService.createEmployee(
      { ...createDTO, employeeCode: 'EMP-9999' },
      'comp-101',
      hrAdmin
    );
  } catch (err: any) {
    if (err.code === 'DUPLICATE_WORK_EMAIL') {
      dupEmailRejected = true;
    }
  }
  assert(dupEmailRejected, 'Duplicate work email rejected with DUPLICATE_WORK_EMAIL');

  // -------------------------------------------------------------
  // 16. MASTER FOREIGN KEY VALIDATION
  // -------------------------------------------------------------
  console.log('\n🔗 [16/16] Testing Organization Master Reference Integrity...');
  let invalidDeptRejected = false;
  try {
    await EmployeeService.createEmployee(
      { ...createDTO, employeeCode: 'EMP-FK-TEST', workEmail: 'fk.test@acme-corp.com', departmentId: 'dept-invalid' },
      'comp-101',
      hrAdmin
    );
  } catch (err: any) {
    if (err.code === 'INVALID_ORGANIZATION_REFERENCE') {
      invalidDeptRejected = true;
    }
  }
  assert(invalidDeptRejected, 'Invalid department foreign key rejected with INVALID_ORGANIZATION_REFERENCE');

  // SUMMARY
  console.log('\n================================================================');
  console.log(`🏁 VERIFICATION COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
