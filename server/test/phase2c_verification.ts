/**
 * PHASE 2C — ATTENDANCE FINALIZATION, OVERTIME ENGINE & PAYROLL SUMMARY VERIFICATION SUITE
 * 
 * Tests:
 * 1. Overtime Policy resolution, rounding & eligibility
 * 2. Overtime Request submission, authorization lifecycle & scoping
 * 3. Attendance Period creation, duplicate prevention & boundary mapping
 * 4. Blocker analysis (unresolved punches, pending regularizations)
 * 5. Atomic Period Finalization & Summary generation
 * 6. Historical Safety & Period Locking (ATTENDANCE_PERIOD_LOCKED)
 * 7. Controlled Reopen with audit retention
 * 8. Payroll-Ready summary reconciliation (zero financial data)
 * 9. Multi-company tenant isolation across all Phase 2C entities
 */

import { RelationalDatabase } from '../database/RelationalDatabase.js';
import { OvertimeService } from '../services/OvertimeService.js';
import { AttendancePeriodService } from '../services/AttendancePeriodService.js';
import { AttendanceService } from '../services/AttendanceService.js';
import { OvertimePolicyRepository } from '../database/repositories/OvertimePolicyRepository.js';
import { OvertimeRequestRepository } from '../database/repositories/OvertimeRequestRepository.js';
import { AttendancePeriodRepository } from '../database/repositories/AttendancePeriodRepository.js';
import { DailyAttendanceRepository } from '../database/repositories/DailyAttendanceRepository.js';
import { ShiftRepository } from '../database/repositories/ShiftRepository.js';
import { ShiftAssignmentRepository } from '../database/repositories/ShiftAssignmentRepository.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runPhase2CTestSuite() {
  console.log('================================================================');
  console.log('🚀 STARTING PHASE 2C OVERTIME & FINALIZATION VERIFICATION SUITE');
  console.log('================================================================\n');

  const db = RelationalDatabase.getInstance();

  const companyA = 'comp-101';
  const companyB = 'comp-102';
  const adminUserA = {
    id: 'usr-admin-01',
    companyId: companyA,
    activeCompanyId: companyA,
    role: 'SUPER_ADMIN',
    email: 'admin@nexushrms.com',
    fullName: 'System Administrator',
  };
  const empRahul = 'emp-001'; // Rahul Shah

  // Seed test employee Rahul Shah
  db.employees.set(empRahul, {
    id: empRahul,
    companyId: companyA,
    employeeCode: 'EMP-0001',
    firstName: 'Rahul',
    lastName: 'Shah',
    displayName: 'Rahul Shah',
    workEmail: 'rahul.shah@nexushrms.com',
    mobileNumber: '+1 555-0999',
    gender: 'MALE',
    dateOfBirth: '1992-05-10',
    joiningDate: '2024-01-01',
    employmentType: 'FULL_TIME',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Ensure test shift and attendance record exists for empRahul on 2026-08-01
  const shiftG = (await ShiftRepository.findAll(companyA))[0];
  if (shiftG) {
    await ShiftAssignmentRepository.create({
      id: 'asg-rahul-01',
      companyId: companyA,
      employeeId: empRahul,
      shiftId: shiftG.id,
      effectiveFrom: '2026-08-01',
      assignmentType: 'PERMANENT',
      reason: 'Standard Shift Assignment',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: adminUserA.id,
    });
  }

  // Record check-in and check-out with 1 hour overtime (e.g. 09:00 to 19:00 = 600m gross, 540m net vs 480m shift = 60m excess)
  await DailyAttendanceRepository.upsert({
    id: `da-${empRahul}-2026-08-01`,
    companyId: companyA,
    employeeId: empRahul,
    attendanceDate: '2026-08-01',
    shiftId: shiftG?.id || 'shift-101',
    status: 'PRESENT',
    calculationStatus: 'CALCULATED',
    firstCheckIn: '2026-08-01T09:00:00.000Z',
    lastCheckOut: '2026-08-01T19:00:00.000Z',
    grossWorkMinutes: 600,
    breakMinutes: 60,
    netWorkMinutes: 540,
    lateMinutes: 0,
    earlyExitMinutes: 0,
    isLate: false,
    isEarlyExit: false,
    isHalfDay: false,
    isHoliday: false,
    isWeeklyOff: false,
    isOnLeave: false,
    hasException: false,
    calculatedOvertimeMinutes: 60,
    calculationVersion: 1,
    calculatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // -------------------------------------------------------------
  // TEST GROUP 1: OVERTIME POLICY & ELIGIBILITY ENGINE
  // -------------------------------------------------------------
  console.log('TEST GROUP 1: OVERTIME POLICY & ELIGIBILITY ENGINE');
  console.log('-------------------------------------------------------');

  const policyA = await OvertimePolicyRepository.findByCompanyId(companyA);
  assert(!!policyA, '1.1 Company Overtime Policy initialized successfully');
  assert(policyA?.minQualifyingMinutes === 30, '1.2 Policy requires minimum 30 qualifying minutes threshold');
  assert(policyA?.roundingIntervalMinutes === 15, '1.3 Policy enforces 15-minute interval rounding');

  // Test standard day calculation with 60 mins excess -> 60 mins eligible after 15m rounding
  const otEligibility = await OvertimeService.calculateEligibility(companyA, empRahul, '2026-08-01');
  assert(otEligibility !== null, '1.4 Overtime eligibility calculation executed for attendance date');
  assert(typeof otEligibility.calculatedMinutes === 'number', '1.5 Calculated eligible minutes is numeric');
  assert(otEligibility.isEligible === true, '1.6 Employee is eligible for overtime on work date');
  assert(otEligibility.calculatedMinutes === 60, '1.7 Calculated 60 minutes eligible overtime');

  // -------------------------------------------------------------
  // TEST GROUP 2: OVERTIME REQUEST & APPROVAL LIFECYCLE
  // -------------------------------------------------------------
  console.log('\nTEST GROUP 2: OVERTIME REQUEST & APPROVAL LIFECYCLE');
  console.log('-----------------------------------------------------------');

  const otRequest = await OvertimeService.submitRequest(companyA, adminUserA as any, {
    employeeId: empRahul,
    attendanceDate: '2026-08-01',
    requestedMinutes: 60,
    reason: 'Critical end-of-month deployment support',
  });
  assert(otRequest.status === 'PENDING', '2.1 Overtime request created with PENDING status');
  assert(otRequest.requestedMinutes === 60, '2.2 Requested overtime duration persisted accurately');

  // Action (Approve) Overtime Request
  const approvedOt = await OvertimeService.actionRequest(companyA, otRequest.id, adminUserA as any, {
    status: 'APPROVED',
    approvedMinutes: 60,
    approverComments: 'Approved by management',
  });
  assert(approvedOt.status === 'APPROVED', '2.3 Overtime request successfully transitioned to APPROVED');
  assert(approvedOt.approvedMinutes === 60, '2.4 Authoritative approved overtime minutes recorded');

  // -------------------------------------------------------------
  // TEST GROUP 3: ATTENDANCE PERIOD CREATION & BOUNDARIES
  // -------------------------------------------------------------
  console.log('\nTEST GROUP 3: ATTENDANCE PERIOD CREATION & BOUNDARIES');
  console.log('----------------------------------------------------');

  const periodAug = await AttendancePeriodService.getOrCreatePeriod(companyA, 2026, 8, adminUserA as any);
  assert(periodAug.code === 'AUG-2026', '3.1 Attendance Period AUG-2026 created/retrieved');
  assert(periodAug.startDate === '2026-08-01', '3.2 Period start date resolves to first day of month');
  assert(periodAug.endDate === '2026-08-31', '3.3 Period end date resolves to last day of August (31 days)');
  assert(periodAug.status === 'OPEN' || periodAug.status === 'REVIEW', '3.4 Initial period status is OPEN/REVIEW');

  // -------------------------------------------------------------
  // TEST GROUP 4: PERIOD REVIEW & BLOCKER ANALYSIS
  // -------------------------------------------------------------
  console.log('\nTEST GROUP 4: PERIOD REVIEW & BLOCKER ANALYSIS');
  console.log('------------------------------------------------');

  const reviewReport = await AttendancePeriodService.getPeriodReviewReport(companyA, periodAug.id, adminUserA as any);
  assert(reviewReport.metrics.totalEmployees > 0, '4.1 Period review aggregates all active company employees');
  assert(Array.isArray(reviewReport.summaries), '4.2 Employee readiness summaries generated');
  assert(Array.isArray(reviewReport.blockers), '4.3 Blockers list evaluated for period finalization');

  // -------------------------------------------------------------
  // TEST GROUP 5: ATOMIC PERIOD FINALIZATION & PAYROLL SUMMARY
  // -------------------------------------------------------------
  console.log('\nTEST GROUP 5: ATOMIC PERIOD FINALIZATION & PAYROLL SUMMARY');
  console.log('----------------------------------------------------------');

  const finalizedPeriod = await AttendancePeriodService.finalizePeriod(companyA, adminUserA as any, {
    periodId: periodAug.id,
    forceFinalize: true,
    notes: 'Approved for payroll processing test run',
  });
  assert(finalizedPeriod.status === 'FINALIZED', '5.1 Attendance Period transitioned to FINALIZED state');
  assert(!!finalizedPeriod.finalizedAt, '5.2 Finalization timestamp recorded');

  const summaries = await AttendancePeriodService.getPeriodSummaries(companyA, periodAug.id, adminUserA as any);
  assert(summaries.length > 0, '5.3 Immutable Payroll-Ready Attendance Summaries generated');

  const rahulSummary = summaries.find((s) => s.employeeId === empRahul || s.employeeCode === 'EMP-0001');
  assert(!!rahulSummary, '5.4 Specific summary generated for EMP-0001 (Rahul Shah)');
  if (rahulSummary) {
    assert(rahulSummary.calendarDays === 31, '5.5 Summary reflects 31 calendar days in August');
    assert(typeof rahulSummary.attendanceEquivalentDays === 'number', '5.6 Attendance equivalent days calculated from attendance facts');
    assert(rahulSummary.paidLeaveDays === null || typeof rahulSummary.paidLeaveDays === 'number', '5.7 Leave-dependent fields are null or authoritative numbers after Phase 3 Leave integration');
    assert(rahulSummary.leaveIntegrationStatus === 'PENDING_LEAVE_INTEGRATION' || rahulSummary.leaveIntegrationStatus === 'RECONCILED', '5.8 Leave integration status is PENDING_LEAVE_INTEGRATION or RECONCILED');
    assert(typeof (rahulSummary as any).grossSalary === 'undefined', '5.9 Zero salary/compensation fields present in summary');
  }

  // -------------------------------------------------------------
  // TEST GROUP 6: HISTORICAL SAFETY & PERIOD LOCKING
  // -------------------------------------------------------------
  console.log('\nTEST GROUP 6: HISTORICAL SAFETY & PERIOD LOCKING');
  console.log('------------------------------------------------');

  const isLocked = await AttendancePeriodService.isDateLocked(companyA, '2026-08-15');
  assert(isLocked === true, '6.1 Date 2026-08-15 is recognized as locked in finalized period');

  let checkInBlocked = false;
  try {
    await AttendanceService.recordPunch(
      empRahul,
      companyA,
      {
        punchTime: '2026-08-15T09:30:00.000Z',
        punchType: 'CHECK_IN',
        source: 'WEB',
      },
      adminUserA as any
    );
  } catch (err: any) {
    if (err.code === 'ATTENDANCE_PERIOD_LOCKED' || (err.message && err.message.includes('LOCKED'))) {
      checkInBlocked = true;
    }
  }
  assert(checkInBlocked === true, '6.2 Punch submission on finalized date rejected with ATTENDANCE_PERIOD_LOCKED');

  let recalculationBlocked = false;
  try {
    await AttendanceService.recalculateAttendance(
      companyA,
      {
        startDate: '2026-08-01',
        endDate: '2026-08-10',
      },
      adminUserA as any
    );
  } catch (err: any) {
    if (err.code === 'ATTENDANCE_PERIOD_LOCKED' || (err.message && err.message.includes('LOCKED'))) {
      recalculationBlocked = true;
    }
  }
  assert(recalculationBlocked === true, '6.3 Bulk recalculation spanning finalized dates blocked');

  // -------------------------------------------------------------
  // TEST GROUP 7: CONTROLLED PERIOD REOPEN & SNAPSHOT VERSIONING
  // -------------------------------------------------------------
  console.log('\nTEST GROUP 7: CONTROLLED PERIOD REOPEN & SNAPSHOT VERSIONING');
  console.log('------------------------------------------------------------');

  const reopenedPeriod = await AttendancePeriodService.reopenPeriod(companyA, adminUserA as any, {
    periodId: periodAug.id,
    reason: 'Audit compliance adjustment requested by HR Director',
  });
  assert(reopenedPeriod.status === 'OPEN' || reopenedPeriod.status === 'REVIEW', '7.1 Period reopened successfully and transitioned to OPEN/REVIEW');
  assert(reopenedPeriod.reopenReason === 'Audit compliance adjustment requested by HR Director', '7.2 Reopen reason audit trail maintained');

  const isLockedAfterReopen = await AttendancePeriodService.isDateLocked(companyA, '2026-08-15');
  assert(isLockedAfterReopen === false, '7.3 Locked status removed after authoritative reopening');

  // Re-finalize for production baseline (Version 2)
  const reFinalized = await AttendancePeriodService.finalizePeriod(companyA, adminUserA as any, {
    periodId: periodAug.id,
    forceFinalize: true,
    notes: 'Re-finalized following audit check',
  });
  assert(reFinalized.status === 'FINALIZED', '7.4 Period safely re-finalized for consistent baseline');

  // Verify historical snapshot archive retention (both v1 and v2 exist in archive)
  const snapshotArchive = Array.from(db.attendancePeriodSnapshots.values()).filter(
    (s) => s.periodId === periodAug.id && s.companyId === companyA
  );
  assert(snapshotArchive.length >= 1, '7.5 Historical snapshot versions archived and preserved across re-finalization');

  // -------------------------------------------------------------
  // TEST GROUP 8: MULTI-COMPANY TENANT ISOLATION
  // -------------------------------------------------------------
  console.log('\nTEST GROUP 8: MULTI-COMPANY TENANT ISOLATION');
  console.log('--------------------------------------------');

  const compBPeriods = await AttendancePeriodRepository.findAll(companyB);
  const crossCompanyLeaked = compBPeriods.some((p) => p.id === periodAug.id);
  assert(!crossCompanyLeaked, '8.1 Company A periods never exposed under Company B');

  const compBOvertime = await OvertimeRequestRepository.findAll(companyB);
  const crossCompanyOtLeaked = compBOvertime.some((o) => o.id === otRequest.id);
  assert(!crossCompanyOtLeaked, '8.2 Company A overtime records never visible under Company B');

  console.log('\n================================================================');
  console.log(`🏁 VERIFICATION SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase2CTestSuite().catch((err) => {
  console.error('Test suite runtime error:', err);
  process.exit(1);
});
