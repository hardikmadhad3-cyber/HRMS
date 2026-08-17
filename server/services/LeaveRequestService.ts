import {
  LeaveRequest,
  LeaveRequestStatus,
  CreateLeaveRequestDTO,
  ActionLeaveRequestDTO,
  CancelLeaveRequestDTO,
  LeaveBalanceReservation,
  LeaveLedgerEntry,
  LeaveCalendarEvent,
} from '../../src/types/leave.js';
import { AuthUser, PermissionKey, UserRole } from '../../src/types/auth.js';
import { LeaveRequestRepository, LeaveRequestFilter } from '../database/repositories/LeaveRequestRepository.js';
import { LeaveReservationRepository } from '../database/repositories/LeaveReservationRepository.js';
import { LeaveLedgerRepository } from '../database/repositories/LeaveLedgerRepository.js';
import { LeaveBalanceRepository } from '../database/repositories/LeaveBalanceRepository.js';
import { LeaveTypeRepository } from '../database/repositories/LeaveTypeRepository.js';
import { LeaveYearRepository } from '../database/repositories/LeaveYearRepository.js';
import { EmployeeRepository } from '../database/repositories/EmployeeRepository.js';
import { RelationalDatabase } from '../database/RelationalDatabase.js';
import { LeaveCalculationService } from './LeaveCalculationService.js';
import { LeaveLedgerService } from './LeaveLedgerService.js';
import { AuditService } from './AuditService.js';

export class LeaveRequestService {
  private static db = RelationalDatabase.getInstance();

  /**
   * 1. SUBMIT LEAVE REQUEST (Atomic Validation, Calculation & Balance Reservation)
   */
  public static async createRequest(
    companyId: string,
    actor: AuthUser,
    dto: CreateLeaveRequestDTO
  ): Promise<LeaveRequest> {
    // 1. Determine Target Employee
    let targetEmployeeId = dto.employeeId;
    if (!targetEmployeeId) {
      targetEmployeeId = actor.employeeId || actor.id;
    }

    // Security Check: If actor is EMPLOYEE, they can only submit for themselves
    if (
      actor.role === UserRole.EMPLOYEE &&
      targetEmployeeId !== actor.id &&
      targetEmployeeId !== actor.employeeId
    ) {
      const err = new Error('Employees are only permitted to submit leave applications on their own behalf.') as any;
      err.code = 'FORBIDDEN_EMPLOYEE_SUBMISSION';
      err.statusCode = 403;
      throw err;
    }

    if (!dto.leaveTypeId || !dto.fromDate || !dto.toDate || !dto.reason?.trim()) {
      const err = new Error('leaveTypeId, fromDate, toDate, and reason are required.') as any;
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 400;
      throw err;
    }

    const emp = await EmployeeRepository.findById(targetEmployeeId, companyId);
    if (!emp) {
      const err = new Error(`Employee '${targetEmployeeId}' not found in active company.`) as any;
      err.code = 'EMPLOYEE_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    const leaveType = await LeaveTypeRepository.findById(dto.leaveTypeId, companyId);
    if (!leaveType) {
      const err = new Error(`Leave type '${dto.leaveTypeId}' not found in active company.`) as any;
      err.code = 'LEAVE_TYPE_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    if (leaveType.status !== 'ACTIVE') {
      const err = new Error(`Leave type '${leaveType.code}' is inactive.`) as any;
      err.code = 'INACTIVE_LEAVE_TYPE';
      err.statusCode = 400;
      throw err;
    }

    // 2. Resolve Leave Year covering fromDate
    const leaveYear = await LeaveYearRepository.findByDate(dto.fromDate, companyId);
    if (!leaveYear) {
      const err = new Error(`No leave year covers application start date '${dto.fromDate}'.`) as any;
      err.code = 'LEAVE_YEAR_NOT_FOUND';
      err.statusCode = 400;
      throw err;
    }

    // 3. Overlap Check: Prevent double-booking on same dates
    const overlaps = await LeaveRequestRepository.findOverlappingRequests(
      targetEmployeeId,
      dto.fromDate,
      dto.toDate,
      companyId
    );
    if (overlaps.length > 0) {
      const err = new Error(`An overlapping leave request (${overlaps[0].id}, ${overlaps[0].fromDate} to ${overlaps[0].toDate}, status: ${overlaps[0].status}) already exists.`) as any;
      err.code = 'OVERLAPPING_LEAVE_REQUEST';
      err.statusCode = 409;
      throw err;
    }

    // 4. Calculate Leave Duration, Breakdown & Sandwich Rule
    const calcResult = await LeaveCalculationService.calculateLeave(companyId, {
      employeeId: targetEmployeeId,
      leaveTypeId: dto.leaveTypeId,
      fromDate: dto.fromDate,
      toDate: dto.toDate,
      unit: dto.unit || 'FULL_DAY',
      halfDayPeriod: dto.halfDayPeriod,
    });

    if (!calcResult.eligible) {
      const err = new Error(`Leave eligibility validation failed: ${calcResult.ineligibilityReasons.join('; ')}`) as any;
      err.code = 'INELIGIBLE_LEAVE_APPLICATION';
      err.statusCode = 400;
      throw err;
    }

    if (calcResult.chargeableUnits <= 0) {
      const err = new Error('The selected date range does not contain any chargeable working days under policy rules.') as any;
      err.code = 'ZERO_CHARGEABLE_DAYS';
      err.statusCode = 400;
      throw err;
    }

    const ruleSnapshot = calcResult.policyRuleSnapshot;

    // 5. Attachment Validation
    if (ruleSnapshot && ruleSnapshot.requiresAttachment) {
      const threshold = ruleSnapshot.attachmentThresholdDays || 1;
      if (calcResult.chargeableUnits >= threshold) {
        if (!dto.attachments || dto.attachments.length === 0) {
          const err = new Error(`Medical/Supporting document attachment is mandatory for ${leaveType.name} requests of ${threshold} or more day(s).`) as any;
          err.code = 'ATTACHMENT_REQUIRED';
          err.statusCode = 400;
          throw err;
        }
      }
    }

    // 6. Available Balance & Negative Balance Rules
    let balance = await LeaveBalanceRepository.findByEmployeeAndType(
      targetEmployeeId,
      dto.leaveTypeId,
      leaveYear.id,
      companyId
    );
    if (!balance) {
      balance = await LeaveLedgerService.rebuildEmployeeLeaveBalance(
        targetEmployeeId,
        dto.leaveTypeId,
        leaveYear.id,
        companyId
      );
    }

    const available = balance.availableBalance;
    const requested = calcResult.chargeableUnits;
    const projectedAvailable = Number((available - requested).toFixed(2));

    if (projectedAvailable < 0) {
      const allowNegative = ruleSnapshot?.allowNegativeBalance ?? false;
      const negativeLimit = ruleSnapshot?.negativeBalanceLimit || 0;

      if (!allowNegative) {
        const err = new Error(`Insufficient leave balance. Available: ${available} day(s), Requested: ${requested} day(s). Negative balance is disabled for this policy.`) as any;
        err.code = 'INSUFFICIENT_LEAVE_BALANCE';
        err.statusCode = 400;
        throw err;
      }

      if (Math.abs(projectedAvailable) > negativeLimit) {
        const err = new Error(`Negative balance limit exceeded. Limit: -${negativeLimit} day(s), Projected balance: ${projectedAvailable} day(s).`) as any;
        err.code = 'NEGATIVE_BALANCE_LIMIT_EXCEEDED';
        err.statusCode = 400;
        throw err;
      }
    }

    // 7. Resolve Approver Hierarchy
    const todayStr = new Date().toISOString().split('T')[0];
    const orgAsg = Array.from(this.db.employeeAssignments.values()).find(
      (a) => a.employeeId === targetEmployeeId && (!a.effectiveTo || a.effectiveTo >= todayStr)
    );
    const reportsTo = orgAsg?.managerId;

    const requestId = `lr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const requestRecord: LeaveRequest = {
      id: requestId,
      companyId,
      employeeId: targetEmployeeId,
      leaveTypeId: dto.leaveTypeId,
      leaveYearId: leaveYear.id,
      fromDate: dto.fromDate,
      toDate: dto.toDate,
      unit: dto.unit || 'FULL_DAY',
      halfDayPeriod: dto.halfDayPeriod || (dto.unit === 'HALF_DAY' ? 'FIRST_HALF' : 'NONE'),
      requestedUnits: requested,
      approvedUnits: null,
      chargeableDays: requested,
      sandwichDays: calcResult.sandwichDaysCount,
      reason: dto.reason.trim(),
      status: 'PENDING',
      currentApproverId: reportsTo || null,
      submittedAt: now,
      leavePolicyId: ruleSnapshot?.leavePolicyId,
      leavePolicyRuleId: ruleSnapshot?.id,
      calculationBreakdown: calcResult.dateBreakdown,
      attachments: dto.attachments || [],
      createdAt: now,
      updatedAt: now,
      createdBy: actor.id,
    };

    const createdRequest = await LeaveRequestRepository.create(requestRecord);

    // 8. Place Balance Reservation Lock
    const reservationId = `res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const reservation: LeaveBalanceReservation = {
      id: reservationId,
      companyId,
      employeeId: targetEmployeeId,
      leaveTypeId: dto.leaveTypeId,
      leaveYearId: leaveYear.id,
      leaveRequestId: createdRequest.id,
      quantity: requested,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };
    await LeaveReservationRepository.create(reservation);

    // 9. Rebuild Balance Read Model
    await LeaveLedgerService.rebuildEmployeeLeaveBalance(
      targetEmployeeId,
      dto.leaveTypeId,
      leaveYear.id,
      companyId
    );

    // 10. Audit Trail
    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: 'LEAVE_REQUEST_SUBMITTED',
      targetModule: 'Leave Management',
      targetRecordId: createdRequest.id,
      companyId,
      changesSummary: `Submitted leave request for ${emp.displayName} (${emp.employeeCode}) on ${leaveType.name} from ${dto.fromDate} to ${dto.toDate} (${requested} chargeable days). Reserved ${requested} days.`,
    });

    return createdRequest;
  }

  /**
   * 2. ACTION LEAVE REQUEST (Approve / Reject / Return)
   */
  public static async actionRequest(
    requestId: string,
    companyId: string,
    actor: AuthUser,
    dto: ActionLeaveRequestDTO
  ): Promise<LeaveRequest> {
    const req = await LeaveRequestRepository.findById(requestId, companyId);
    if (!req) {
      const err = new Error(`Leave request '${requestId}' not found in company.`) as any;
      err.code = 'LEAVE_REQUEST_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    if (req.status !== 'PENDING' && req.status !== 'SUBMITTED') {
      const err = new Error(`Cannot action leave request with status '${req.status}'. Only PENDING requests can be actioned.`) as any;
      err.code = 'INVALID_REQUEST_STATUS';
      err.statusCode = 400;
      throw err;
    }

    // Approver Security Verification
    const isSuperAdmin = actor.role === UserRole.SUPER_ADMIN;
    const isHrAdmin = actor.role === UserRole.HR_ADMIN;
    const isDirectApprover = req.currentApproverId === actor.id || req.currentApproverId === actor.employeeId;

    if (!isSuperAdmin && !isHrAdmin && !isDirectApprover) {
      // Check reporting hierarchy
      const todayStr = new Date().toISOString().split('T')[0];
      const orgAsg = Array.from(this.db.employeeAssignments.values()).find(
        (a) => a.employeeId === req.employeeId && (!a.effectiveTo || a.effectiveTo >= todayStr)
      );
      if (orgAsg?.managerId !== actor.id && orgAsg?.managerId !== actor.employeeId) {
        const err = new Error('You do not have approval authority for this leave request.') as any;
        err.code = 'UNAUTHORIZED_APPROVER';
        err.statusCode = 403;
        throw err;
      }
    }

    const now = new Date().toISOString();

    if (dto.action === 'APPROVE') {
      // 1. Update reservation to CONSUMED
      await LeaveReservationRepository.updateStatus(req.id, 'CONSUMED', companyId);

      // 2. Post Authoritative LEAVE_CONSUMPTION Ledger Debit Entry
      const ledgerId = `led-con-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const ledgerEntry: LeaveLedgerEntry = {
        id: ledgerId,
        companyId,
        employeeId: req.employeeId,
        leaveTypeId: req.leaveTypeId,
        leaveYearId: req.leaveYearId,
        transactionType: 'LEAVE_CONSUMPTION',
        quantity: -Math.abs(req.chargeableDays), // Negative quantity for consumption debit
        effectiveDate: req.fromDate,
        referenceType: 'LEAVE_REQUEST',
        referenceId: req.id,
        policyRuleId: req.leavePolicyRuleId,
        remarks: dto.remarks || `Approved leave from ${req.fromDate} to ${req.toDate}`,
        createdBy: actor.id,
        createdAt: now,
      };
      await LeaveLedgerRepository.create(ledgerEntry);

      // 3. Update Request Status
      req.status = 'APPROVED';
      req.approvedUnits = req.chargeableDays;
      req.actionedAt = now;
      req.actionedBy = actor.id;
      req.approverRemarks = dto.remarks?.trim() || null;
      req.updatedAt = now;

      await LeaveRequestRepository.update(req);

      // 4. Rebuild Balance Projection
      await LeaveLedgerService.rebuildEmployeeLeaveBalance(
        req.employeeId,
        req.leaveTypeId,
        req.leaveYearId,
        companyId
      );

      await AuditService.log({
        actorId: actor.id,
        actorName: actor.fullName,
        actorEmail: actor.email,
        action: 'LEAVE_REQUEST_APPROVED',
        targetModule: 'Leave Management',
        targetRecordId: req.id,
        companyId,
        changesSummary: `Approved leave request ${req.id} for employee ${req.employeeName || req.employeeId} (${req.chargeableDays} days). Posted LEAVE_CONSUMPTION ledger debit.`,
      });

      return req;
    } else if (dto.action === 'REJECT') {
      // 1. Release active reservation
      await LeaveReservationRepository.updateStatus(req.id, 'RELEASED', companyId);

      // 2. Update Request Status
      req.status = 'REJECTED';
      req.actionedAt = now;
      req.actionedBy = actor.id;
      req.approverRemarks = dto.remarks?.trim() || null;
      req.updatedAt = now;

      await LeaveRequestRepository.update(req);

      // 3. Rebuild Balance Projection
      await LeaveLedgerService.rebuildEmployeeLeaveBalance(
        req.employeeId,
        req.leaveTypeId,
        req.leaveYearId,
        companyId
      );

      await AuditService.log({
        actorId: actor.id,
        actorName: actor.fullName,
        actorEmail: actor.email,
        action: 'LEAVE_REQUEST_REJECTED',
        targetModule: 'Leave Management',
        targetRecordId: req.id,
        companyId,
        changesSummary: `Rejected leave request ${req.id} for employee ${req.employeeName || req.employeeId}. Released balance reservation. Reason: ${dto.remarks || 'N/A'}`,
      });

      return req;
    } else if (dto.action === 'RETURN') {
      // 1. Release active reservation
      await LeaveReservationRepository.updateStatus(req.id, 'RELEASED', companyId);

      // 2. Update Request Status
      req.status = 'RETURNED';
      req.actionedAt = now;
      req.actionedBy = actor.id;
      req.approverRemarks = dto.remarks?.trim() || null;
      req.updatedAt = now;

      await LeaveRequestRepository.update(req);

      // 3. Rebuild Balance Projection
      await LeaveLedgerService.rebuildEmployeeLeaveBalance(
        req.employeeId,
        req.leaveTypeId,
        req.leaveYearId,
        companyId
      );

      await AuditService.log({
        actorId: actor.id,
        actorName: actor.fullName,
        actorEmail: actor.email,
        action: 'LEAVE_REQUEST_RETURNED',
        targetModule: 'Leave Management',
        targetRecordId: req.id,
        companyId,
        changesSummary: `Returned leave request ${req.id} to employee for clarification. Reason: ${dto.remarks || 'N/A'}`,
      });

      return req;
    } else {
      const err = new Error(`Unsupported action '${dto.action}'. Must be APPROVE, REJECT, or RETURN.`) as any;
      err.code = 'INVALID_ACTION';
      err.statusCode = 400;
      throw err;
    }
  }

  /**
   * 3. CANCEL LEAVE REQUEST (Pending or Approved)
   */
  public static async cancelRequest(
    requestId: string,
    companyId: string,
    actor: AuthUser,
    dto: CancelLeaveRequestDTO
  ): Promise<LeaveRequest> {
    const req = await LeaveRequestRepository.findById(requestId, companyId);
    if (!req) {
      const err = new Error(`Leave request '${requestId}' not found.`) as any;
      err.code = 'LEAVE_REQUEST_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    if (req.status === 'CANCELLED' || req.status === 'REJECTED') {
      const err = new Error(`Leave request is already in '${req.status}' state.`) as any;
      err.code = 'INVALID_REQUEST_STATUS';
      err.statusCode = 400;
      throw err;
    }

    // Security Check: Must be request owner or HR_ADMIN / SUPER_ADMIN
    const isOwner = req.employeeId === actor.id || req.employeeId === actor.employeeId;
    const isHrOrAdmin = actor.role === UserRole.SUPER_ADMIN || actor.role === UserRole.HR_ADMIN || actor.permissions?.includes(PermissionKey.LEAVE_MANAGE);

    if (!isOwner && !isHrOrAdmin) {
      const err = new Error('You are not authorized to cancel this leave request.') as any;
      err.code = 'FORBIDDEN_CANCELLATION';
      err.statusCode = 403;
      throw err;
    }

    const now = new Date().toISOString();

    if (req.status === 'PENDING' || req.status === 'SUBMITTED') {
      // 1. Release active reservation
      await LeaveReservationRepository.updateStatus(req.id, 'RELEASED', companyId);

      // 2. Update Request Status
      req.status = 'CANCELLED';
      req.cancelledAt = now;
      req.cancelledBy = actor.id;
      req.cancellationReason = dto.cancellationReason?.trim() || 'Cancelled by employee';
      req.updatedAt = now;

      await LeaveRequestRepository.update(req);

      // 3. Rebuild Balance Projection
      await LeaveLedgerService.rebuildEmployeeLeaveBalance(
        req.employeeId,
        req.leaveTypeId,
        req.leaveYearId,
        companyId
      );

      await AuditService.log({
        actorId: actor.id,
        actorName: actor.fullName,
        actorEmail: actor.email,
        action: 'LEAVE_REQUEST_CANCELLED',
        targetModule: 'Leave Management',
        targetRecordId: req.id,
        companyId,
        changesSummary: `Cancelled pending leave request ${req.id}. Released ${req.chargeableDays} days reservation. Reason: ${dto.cancellationReason}`,
      });

      return req;
    } else if (req.status === 'APPROVED') {
      // Approved Leave Cancellation: MUST POST LEAVE_REVERSAL LEDGER CREDIT
      const ledgerId = `led-rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const ledgerEntry: LeaveLedgerEntry = {
        id: ledgerId,
        companyId,
        employeeId: req.employeeId,
        leaveTypeId: req.leaveTypeId,
        leaveYearId: req.leaveYearId,
        transactionType: 'LEAVE_REVERSAL',
        quantity: Math.abs(req.chargeableDays), // Positive quantity to reverse the consumption debit
        effectiveDate: req.fromDate,
        referenceType: 'LEAVE_CANCELLATION',
        referenceId: req.id,
        policyRuleId: req.leavePolicyRuleId,
        remarks: dto.cancellationReason?.trim() || 'Approved leave cancelled and refunded',
        createdBy: actor.id,
        createdAt: now,
      };

      await LeaveLedgerRepository.create(ledgerEntry);

      // Update Request Status
      req.status = 'CANCELLED';
      req.cancelledAt = now;
      req.cancelledBy = actor.id;
      req.cancellationReason = dto.cancellationReason?.trim() || 'Approved leave cancelled';
      req.updatedAt = now;

      await LeaveRequestRepository.update(req);

      // Rebuild Balance Projection
      await LeaveLedgerService.rebuildEmployeeLeaveBalance(
        req.employeeId,
        req.leaveTypeId,
        req.leaveYearId,
        companyId
      );

      await AuditService.log({
        actorId: actor.id,
        actorName: actor.fullName,
        actorEmail: actor.email,
        action: 'LEAVE_REQUEST_APPROVED_CANCELLED',
        targetModule: 'Leave Management',
        targetRecordId: req.id,
        companyId,
        changesSummary: `Cancelled approved leave request ${req.id} for employee ${req.employeeName || req.employeeId}. Posted LEAVE_REVERSAL credit (+${req.chargeableDays} days). Reason: ${dto.cancellationReason}`,
      });

      return req;
    } else {
      const err = new Error(`Cannot cancel leave request in status '${req.status}'.`) as any;
      err.code = 'INVALID_REQUEST_STATUS';
      err.statusCode = 400;
      throw err;
    }
  }

  /**
   * 4. GET LEAVE REQUESTS WITH ROLE-BASED SCOPING
   */
  public static async getRequests(
    companyId: string,
    actor: AuthUser,
    filter?: LeaveRequestFilter & { scope?: 'me' | 'team' | 'company' }
  ): Promise<LeaveRequest[]> {
    const isSuperAdmin = actor.role === UserRole.SUPER_ADMIN;
    const isHrAdmin = actor.role === UserRole.HR_ADMIN || actor.permissions?.includes(PermissionKey.LEAVE_MANAGE);
    const isManager = actor.role === UserRole.MANAGER || actor.permissions?.includes(PermissionKey.LEAVE_APPROVE);

    let scopedFilter: LeaveRequestFilter = { ...filter };

    if (filter?.scope === 'me' || (!isSuperAdmin && !isHrAdmin && !isManager)) {
      // Strict Self Scoping
      scopedFilter.employeeId = actor.employeeId || actor.id;
    } else if (filter?.scope === 'team' || (isManager && !isSuperAdmin && !isHrAdmin)) {
      // Manager Team Scoping
      const managerEmpId = actor.employeeId || actor.id;
      const todayStr = new Date().toISOString().split('T')[0];
      const subordinates = Array.from(this.db.employeeAssignments.values())
        .filter((a) => a.companyId === companyId && a.managerId === managerEmpId && (!a.effectiveTo || a.effectiveTo >= todayStr))
        .map((a) => a.employeeId);

      const combinedIds = Array.from(new Set([managerEmpId, ...subordinates]));
      scopedFilter.employeeIds = combinedIds;
    }

    return LeaveRequestRepository.findAll(companyId, scopedFilter);
  }

  /**
   * 5. GET TEAM LEAVE CALENDAR (Anonymized / Safe from Attachment Leakage)
   */
  public static async getTeamCalendar(
    companyId: string,
    actor: AuthUser,
    startDate: string,
    endDate: string,
    departmentId?: string
  ): Promise<LeaveCalendarEvent[]> {
    const filter: LeaveRequestFilter = {
      fromDate: startDate,
      toDate: endDate,
      status: ['APPROVED', 'PENDING'],
    };

    const requests = await this.getRequests(companyId, actor, filter);
    const events: LeaveCalendarEvent[] = [];

    for (const req of requests) {
      if (departmentId && req.departmentName !== departmentId) continue;

      events.push({
        id: `cal-${req.id}`,
        requestId: req.id,
        employeeId: req.employeeId,
        employeeName: req.employeeName || 'Employee',
        employeeCode: req.employeeCode || 'EMP',
        departmentName: req.departmentName,
        leaveTypeId: req.leaveTypeId,
        leaveTypeCode: req.leaveTypeCode || 'LEAVE',
        leaveTypeName: req.leaveTypeName || 'Leave',
        color: req.color || '#3B82F6',
        fromDate: req.fromDate,
        toDate: req.toDate,
        unit: req.unit,
        chargeableUnits: req.chargeableDays,
        status: req.status,
      });
    }

    return events;
  }
}
