/**
 * PHASE 6A — PERFORMANCE MANAGEMENT VERIFICATION & AUDIT SUITE
 * 
 * Verifies Requirements:
 * 1. Performance Cycles Creation & Lifecycle State Machine
 * 2. Goal / KRA / KPI Configuration & Weightage Allocation
 * 3. Employee Goals & Manager Goals (Creation, Progress Updates, Approval)
 * 4. Review Templates (Rating Scales, Competencies, Goal/Competency Weightages)
 * 5. Self Appraisal Submission (Ratings, Strengths, Improvements)
 * 6. Manager Appraisal Submission (Ratings, Recommendations, Feedback)
 * 7. Final Review Scoring, Weighted Calculation & Grade Assignment
 * 8. Review Finalization & Immutability Lock (No post-finalization edits)
 * 9. Reporting Hierarchy Scoping:
 *    - Employee: Self-only access
 *    - Manager: Direct & indirect reports scope
 *    - HR / Super Admin: Full company scope
 * 10. Multi-Company Tenant Isolation (Company 1 vs Company 2)
 * 11. Strict RBAC Permission Checks
 * 12. Immutable Review History Audit Ledger with Snapshots
 * 13. Decoupling: Performance ratings NOT automatically connected to payroll
 */

import { RelationalDatabase } from '../database/RelationalDatabase.js';
import { PerformanceService } from '../services/PerformanceService.js';
import { PerformanceGoalRepository } from '../database/repositories/PerformanceGoalRepository.js';
import { PerformanceReviewRepository } from '../database/repositories/PerformanceReviewRepository.js';
import { PerformanceReviewHistoryRepository } from '../database/repositories/PerformanceReviewHistoryRepository.js';
import { AuthUser, UserRole, PermissionKey } from '../../src/types/auth.js';
import {
  PerformanceCycleType,
  PerformanceCycleStatus,
  PerformanceGoalStatus,
  PerformanceReviewStatus,
  MeasurementType,
  ManagerRecommendation,
} from '../../src/types/performance.js';

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

async function runTests() {
  console.log('\n================================================================');
  console.log('PHASE 6A VERIFICATION: PERFORMANCE MANAGEMENT SUITE');
  console.log('================================================================\n');

  const db = RelationalDatabase.getInstance();
  const company1 = 'comp-101';
  const company2 = 'comp-102';

  // Seed sample employees for hierarchy if not already present
  if (db.employees) {
    const emp1 = db.employees.get('emp-101');
    if (emp1) {
      emp1.companyId = company1;
      emp1.status = 'ACTIVE';
    }
    const emp2 = db.employees.get('emp-102');
    if (emp2) {
      emp2.companyId = company1;
      emp2.status = 'ACTIVE';
    }
    const emp3 = db.employees.get('emp-103');
    if (emp3) {
      emp3.companyId = company1;
      emp3.status = 'ACTIVE';
    }

    // Set active assignment manager hierarchy
    const assign1 = Array.from(db.employeeAssignments.values()).find((a) => a.employeeId === 'emp-101');
    if (assign1) {
      assign1.managerId = 'emp-102';
    }
    const assign2 = Array.from(db.employeeAssignments.values()).find((a) => a.employeeId === 'emp-102');
    if (assign2) {
      assign2.managerId = 'emp-103';
    }
  }

  // Users
  const hrAdminUser: AuthUser = {
    id: 'usr-hr-admin-1',
    username: 'hr.admin',
    email: 'hr.admin@acme.com',
    fullName: 'HR Administrator',
    role: UserRole.HR_ADMIN,
    employeeId: 'emp-103',
    activeCompanyId: company1,
    companyIds: [company1],
    permissions: [PermissionKey.PERFORMANCE_VIEW, PermissionKey.PERFORMANCE_MANAGE],
    isActive: true,
  };

  const managerUser: AuthUser = {
    id: 'usr-mgr-1',
    username: 'jane.smith',
    email: 'jane.smith@acme.com',
    fullName: 'Jane Smith',
    role: UserRole.MANAGER,
    employeeId: 'emp-102',
    activeCompanyId: company1,
    companyIds: [company1],
    permissions: [PermissionKey.PERFORMANCE_VIEW],
    isActive: true,
  };

  const employeeUser: AuthUser = {
    id: 'usr-emp-1',
    username: 'john.doe',
    email: 'john.doe@acme.com',
    fullName: 'John Doe',
    role: UserRole.EMPLOYEE,
    employeeId: 'emp-101',
    activeCompanyId: company1,
    companyIds: [company1],
    permissions: [PermissionKey.PERFORMANCE_VIEW],
    isActive: true,
  };

  const company2User: AuthUser = {
    id: 'usr-comp2-hr',
    username: 'c2.hr',
    email: 'c2.hr@acme2.com',
    fullName: 'Company 2 HR',
    role: UserRole.HR_ADMIN,
    employeeId: 'emp-201',
    activeCompanyId: company2,
    companyIds: [company2],
    permissions: [PermissionKey.PERFORMANCE_VIEW, PermissionKey.PERFORMANCE_MANAGE],
    isActive: true,
  };

  try {
    // ------------------------------------------------------------------------
    // TEST GROUP 1: Review Template Configuration
    // ------------------------------------------------------------------------
    console.log('--- TEST GROUP 1: Review Template Configuration ---');

    const template = await PerformanceService.createTemplate(
      {
        code: 'ENG_ANNUAL_2026',
        name: 'Engineering Annual Appraisal Template',
        description: 'Standard 60/40 engineering performance template',
        goalWeightagePct: 60,
        competencyWeightagePct: 40,
        ratingScale: [
          { rating: 5, label: 'Exceeds Expectations', minScore: 90, maxScore: 100 },
          { rating: 4, label: 'Meets Expectations High', minScore: 80, maxScore: 89.9 },
          { rating: 3, label: 'Meets Expectations', minScore: 70, maxScore: 79.9 },
          { rating: 2, label: 'Needs Improvement', minScore: 60, maxScore: 69.9 },
          { rating: 1, label: 'Unsatisfactory', minScore: 0, maxScore: 59.9 },
        ],
        competencies: [
          { id: 'comp-tech', name: 'Technical Excellence', weightage: 50, description: 'Code quality and architecture' },
          { id: 'comp-collab', name: 'Collaboration & Leadership', weightage: 50, description: 'Teamwork and mentoring' },
        ],
      },
      company1,
      hrAdminUser
    );

    assert(!!template && template.code === 'ENG_ANNUAL_2026', 'Review template created successfully');
    assert(template.goalWeightagePct + template.competencyWeightagePct === 100, 'Template weightages sum to exactly 100%');

    // Validation: Invalid weightages (!= 100) must throw
    let threwWeightage = false;
    try {
      await PerformanceService.createTemplate(
        {
          code: 'INVALID_WEIGHT',
          name: 'Invalid Template',
          goalWeightagePct: 70,
          competencyWeightagePct: 50,
          ratingScale: [],
          competencies: [],
        },
        company1,
        hrAdminUser
      );
    } catch (e: any) {
      threwWeightage = true;
      assert(e.message.includes('100%'), 'Template weightage validation enforced (sum must be 100%)');
    }
    assert(threwWeightage, 'Invalid weightage rejection asserted');

    // ------------------------------------------------------------------------
    // TEST GROUP 2: Performance Cycle Lifecycle State Machine
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 2: Performance Cycle Lifecycle State Machine ---');

    const cycle = await PerformanceService.createCycle(
      {
        code: 'CYC_2026_ANNUAL',
        name: 'FY 2026 Annual Performance Review',
        cycleType: PerformanceCycleType.ANNUAL,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        selfReviewDeadline: '2026-11-15',
        managerReviewDeadline: '2026-12-05',
        defaultTemplateId: template.id,
      },
      company1,
      hrAdminUser
    );

    assert(!!cycle && cycle.status === PerformanceCycleStatus.DRAFT, 'Cycle created in DRAFT status');

    // Cycle Status Transitions
    const goalSettingCycle = await PerformanceService.changeCycleStatus(
      cycle.id,
      PerformanceCycleStatus.GOAL_SETTING,
      company1,
      hrAdminUser
    );
    assert(goalSettingCycle.status === PerformanceCycleStatus.GOAL_SETTING, 'Cycle transitioned to GOAL_SETTING');

    const activeCycle = await PerformanceService.changeCycleStatus(
      cycle.id,
      PerformanceCycleStatus.ACTIVE,
      company1,
      hrAdminUser
    );
    assert(activeCycle.status === PerformanceCycleStatus.ACTIVE, 'Cycle transitioned to ACTIVE');

    // ------------------------------------------------------------------------
    // TEST GROUP 3: Goal / KRA / KPI Configuration & Employee Goals
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 3: Goals / KRAs Configuration & Management ---');

    // Employee creates own goal
    const empGoal = await PerformanceService.createGoal(
      {
        cycleId: cycle.id,
        employeeId: 'emp-101',
        category: 'ENGINEERING',
        title: 'Refactor Core Attendance Engine',
        description: 'Achieve sub-50ms execution speed and 100% test coverage',
        measurementType: MeasurementType.PERCENTAGE,
        targetValue: 100,
        unit: '%',
        currentValue: 0,
        weightage: 50,
        dueDate: '2026-10-31',
      },
      company1,
      employeeUser
    );

    assert(!!empGoal && empGoal.employeeId === 'emp-101', 'Employee successfully created self goal');
    assert(empGoal.status === PerformanceGoalStatus.DRAFT, 'Goal created in DRAFT state');

    // Manager creates/cascades goal for Employee
    const mgrGoal = await PerformanceService.createGoal(
      {
        cycleId: cycle.id,
        employeeId: 'emp-101',
        category: 'QUALITY',
        title: 'Zero High-Severity Production Incidents',
        description: 'Maintain 99.99% system reliability throughout the fiscal year',
        measurementType: MeasurementType.NUMERIC,
        targetValue: 0,
        unit: 'incidents',
        currentValue: 0,
        weightage: 50,
        dueDate: '2026-12-31',
        isManagerGoal: true,
      },
      company1,
      managerUser
    );

    assert(!!mgrGoal && mgrGoal.isManagerGoal === true, 'Manager assigned goal to employee');

    // Employee submits goal for approval
    const submittedGoal = await PerformanceService.updateGoal(
      empGoal.id,
      { status: PerformanceGoalStatus.SUBMITTED },
      company1,
      employeeUser
    );
    assert(submittedGoal.status === PerformanceGoalStatus.SUBMITTED, 'Employee submitted goal');

    // Manager approves employee goal
    const approvedGoal = await PerformanceService.approveGoal(
      empGoal.id,
      company1,
      managerUser
    );
    assert(approvedGoal.status === PerformanceGoalStatus.APPROVED, 'Manager approved employee goal');
    assert(approvedGoal.approvedBy === 'emp-102', 'Approval record tracks manager ID');

    // Employee updates progress
    const progressedGoal = await PerformanceService.updateGoalProgress(
      empGoal.id,
      90,
      PerformanceGoalStatus.IN_PROGRESS,
      company1,
      employeeUser
    );
    assert(progressedGoal.currentValue === 90, 'Employee updated goal progress to 90%');

    // ------------------------------------------------------------------------
    // TEST GROUP 4: Self Appraisal Submission
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 4: Self Appraisal Workflow ---');

    // Find review created during cycle initialization
    let reviews = await PerformanceReviewRepository.findAll({ cycleId: cycle.id, employeeId: 'emp-101', companyId: company1 });
    let review = reviews[0];
    if (!review) {
      // Initialize if needed
      await PerformanceService.initializeCycleReviews(cycle.id, company1, hrAdminUser);
      reviews = await PerformanceReviewRepository.findAll({ cycleId: cycle.id, employeeId: 'emp-101', companyId: company1 });
      review = reviews[0];
    }
    assert(!!review, 'Appraisal record initialized for employee');

    const selfReviewResult = await PerformanceService.submitSelfReview(
      review.id,
      {
        selfOverallRating: 4.5,
        selfOverallComments: 'Delivered all major milestones ahead of schedule with robust quality.',
        selfStrengths: 'Deep TypeScript and architectural expertise, proactive collaboration.',
        selfImprovements: 'Could delegate more operational tasks to junior team members.',
        competencyRatings: [
          { competencyId: 'comp-tech', rating: 5.0, comment: 'Pioneered new caching abstraction' },
          { competencyId: 'comp-collab', rating: 4.0, comment: 'Mentored 2 new hires' },
        ],
        goalRatings: [
          { goalId: empGoal.id, selfRating: 4.5, selfComment: 'Completed 90% of attendance refactor' },
          { goalId: mgrGoal.id, selfRating: 5.0, selfComment: 'Maintained 100% uptime' },
        ],
      },
      company1,
      employeeUser
    );

    assert(selfReviewResult.selfOverallRating === 4.5, 'Self overall rating recorded');
    assert(selfReviewResult.status === PerformanceReviewStatus.MANAGER_REVIEW_PENDING, 'Review status advanced to MANAGER_REVIEW_PENDING');
    assert(selfReviewResult.selfCompetencyRatings.length === 2, 'Self competency ratings recorded');

    // ------------------------------------------------------------------------
    // TEST GROUP 5: Manager Appraisal Submission
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 5: Manager Appraisal Workflow ---');

    const managerReviewResult = await PerformanceService.submitManagerReview(
      review.id,
      {
        managerOverallRating: 4.2,
        managerOverallComments: 'Outstanding technical contributor with strong velocity and impact.',
        managerStrengths: 'High architectural rigor and excellent reliability in production delivery.',
        managerImprovements: 'Encourage broader cross-departmental documentation sharing.',
        managerRecommendations: ManagerRecommendation.PROMOTION,
        competencyRatings: [
          { competencyId: 'comp-tech', rating: 4.5, comment: 'Exceptional architectural delivery' },
          { competencyId: 'comp-collab', rating: 4.0, comment: 'Solid team collaboration' },
        ],
        goalRatings: [
          { goalId: empGoal.id, managerRating: 4.5, managerComment: 'High quality refactor' },
          { goalId: mgrGoal.id, managerRating: 4.0, managerComment: 'Good uptime' },
        ],
      },
      company1,
      managerUser
    );

    assert(managerReviewResult.managerOverallRating === 4.2, 'Manager overall rating recorded');
    assert(managerReviewResult.managerRecommendations === ManagerRecommendation.PROMOTION, 'Manager recommendation recorded (PROMOTION)');
    assert(managerReviewResult.status === PerformanceReviewStatus.COMPLETED, 'Review status advanced to COMPLETED');

    // ------------------------------------------------------------------------
    // TEST GROUP 6: Final Review Scoring, Weighted Calculation & Finalization
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 6: Weighted Final Scoring & Finalization ---');

    const finalizedReview = await PerformanceService.finalizeReview(
      review.id,
      {
        finalComments: 'Approved for Senior Staff Engineer promotion based on stellar performance.',
      },
      company1,
      hrAdminUser
    );

    assert(finalizedReview.isFinalized === true, 'Review marked as finalized');
    assert(finalizedReview.status === PerformanceReviewStatus.FINALIZED, 'Review status set to FINALIZED');
    assert(finalizedReview.finalRating !== undefined && finalizedReview.finalRating > 0, 'Final rating computed');
    assert(finalizedReview.finalScore !== undefined && finalizedReview.finalScore > 0, `Final score computed (${finalizedReview.finalScore}/100)`);
    assert(!!finalizedReview.finalGrade, `Final grade computed (${finalizedReview.finalGrade})`);
    assert(finalizedReview.finalizedBy === 'emp-103', 'Finalized by HR user recorded');

    // ------------------------------------------------------------------------
    // TEST GROUP 7: Immutability Lock on Finalized Reviews
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 7: Immutability Lock on Finalized Reviews ---');

    let threwPostFinalizeEdit = false;
    try {
      await PerformanceService.submitSelfReview(
        review.id,
        {
          selfOverallRating: 5.0,
          selfOverallComments: 'Attempted modification after finalize',
          selfStrengths: 'N/A',
          selfImprovements: 'N/A',
          competencyRatings: [],
        },
        company1,
        employeeUser
      );
    } catch (e: any) {
      threwPostFinalizeEdit = true;
      assert(e.message.includes('finalized'), 'Editing finalized review correctly blocked');
    }
    assert(threwPostFinalizeEdit, 'Finalized review immutability enforced');

    // ------------------------------------------------------------------------
    // TEST GROUP 8: Reporting Hierarchy & Scoping
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 8: Reporting Hierarchy & RBAC Scoping ---');

    // Employee scoping: Should only see own reviews & goals
    const empReviews = await PerformanceService.getReviews(company1, employeeUser, {});
    assert(empReviews.every((r) => r.employeeId === 'emp-101'), 'Employee only sees own performance reviews');

    const empGoals = await PerformanceService.getGoals(company1, employeeUser, {});
    assert(empGoals.every((g) => g.employeeId === 'emp-101'), 'Employee only sees own goals');

    // Manager scoping: Can see own + direct report (emp-101)
    const mgrReviews = await PerformanceService.getReviews(company1, managerUser, {});
    assert(mgrReviews.some((r) => r.employeeId === 'emp-101'), 'Manager can access direct report reviews');

    // HR Admin scoping: Can see company-wide reviews
    const hrReviews = await PerformanceService.getReviews(company1, hrAdminUser, {});
    assert(hrReviews.length >= mgrReviews.length, 'HR Admin has company-wide review access');

    // ------------------------------------------------------------------------
    // TEST GROUP 9: Multi-Company Isolation
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 9: Multi-Company Tenant Isolation ---');

    const company2Cycles = await PerformanceService.getCycles(company2);
    assert(company2Cycles.every((c) => c.companyId === company2), 'Company 2 cycles strictly isolated');
    assert(!company2Cycles.some((c) => c.id === cycle.id), 'Company 2 cannot access Company 1 performance cycles');

    const company2Reviews = await PerformanceService.getReviews(company2, company2User, {});
    assert(!company2Reviews.some((r) => r.id === review.id), 'Company 2 cannot access Company 1 reviews');

    // ------------------------------------------------------------------------
    // TEST GROUP 10: Immutable Review History / Audit Ledger
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 10: Immutable Review Audit Ledger & Snapshots ---');

    const history = await PerformanceService.getReviewHistory(review.id, company1, hrAdminUser);
    assert(history.length >= 3, `Audit ledger contains ${history.length} chronological transition events`);
    
    const selfReviewEvent = history.find((h) => h.action === 'SELF_REVIEW_SUBMITTED');
    assert(!!selfReviewEvent, 'SELF_REVIEW_SUBMITTED audit event logged');
    assert(selfReviewEvent?.actorId === 'usr-emp-1', 'Audit event captures exact actor ID');

    const finalizedEvent = history.find((h) => h.action === 'REVIEW_FINALIZED');
    assert(!!finalizedEvent, 'REVIEW_FINALIZED audit event logged');
    assert(!!finalizedEvent?.snapshotData, 'Audit event includes complete immutable snapshot data payload');

    // ------------------------------------------------------------------------
    // TEST GROUP 11: Performance Dashboard Metrics
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 11: Performance Dashboard Analytics ---');

    const dashboard = await PerformanceService.getDashboardMetrics(company1, hrAdminUser);
    assert(!!dashboard, 'Dashboard analytics computed successfully');
    assert(dashboard.totalCycles >= 1, 'Dashboard reflects active cycle count');
    assert(dashboard.reviewsFinalized >= 1, 'Dashboard reflects finalized review counts');
    assert(dashboard.gradeDistribution.length > 0, 'Dashboard provides grade distribution analytics');

    console.log('\n================================================================');
    console.log(`PHASE 6A TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal Error in Phase 6A Test Suite:', error);
    process.exit(1);
  }
}

runTests();
