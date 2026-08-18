import {
  EmployeeLeaveBalance,
  LeaveLedgerEntry,
  LeaveTransactionType,
  PostOpeningBalanceDTO,
  PostManualAdjustmentDTO,
} from '../../src/types/leave.js';
import { AuthUser } from '../../src/types/auth.js';
import { LeaveLedgerRepository, LeaveLedgerFilter } from '../database/repositories/LeaveLedgerRepository.js';
import { LeaveBalanceRepository } from '../database/repositories/LeaveBalanceRepository.js';
import { LeaveReservationRepository } from '../database/repositories/LeaveReservationRepository.js';
import { LeaveYearRepository } from '../database/repositories/LeaveYearRepository.js';
import { LeaveTypeRepository } from '../database/repositories/LeaveTypeRepository.js';
import { EmployeeRepository } from '../database/repositories/EmployeeRepository.js';
import { LeaveEligibilityService } from './LeaveEligibilityService.js';
import { AuditService } from './AuditService.js';

export class LeaveLedgerService {
  /**
   * 1. REBUILD BALANCE READ-MODEL FROM AUTHORITATIVE LEDGER & ACTIVE RESERVATIONS
   */
  public static async rebuildEmployeeLeaveBalance(
    employeeId: string,
    leaveTypeId: string,
    leaveYearId: string,
    companyId: string
  ): Promise<EmployeeLeaveBalance> {
    const entries = await LeaveLedgerRepository.findByEmployeeAndType(
      employeeId,
      leaveTypeId,
      leaveYearId,
      companyId
    );

    let openingBalance = 0;
    let accruedBalance = 0;
    let carryForwardBalance = 0;
    let adjustmentCredit = 0;
    let adjustmentDebit = 0;
    let consumedBalance = 0;
    let reversedBalance = 0;
    let expiredBalance = 0;
    let encashedBalance = 0;

    for (const e of entries) {
      const q = Math.abs(e.quantity);
      switch (e.transactionType) {
        case 'OPENING':
          openingBalance += q;
          break;
        case 'ACCRUAL':
          accruedBalance += q;
          break;
        case 'CARRY_FORWARD':
          carryForwardBalance += q;
          break;
        case 'ADJUSTMENT_CREDIT':
          adjustmentCredit += q;
          break;
        case 'ADJUSTMENT_DEBIT':
          adjustmentDebit += q;
          break;
        case 'LEAVE_CONSUMPTION':
          consumedBalance += q;
          break;
        case 'LEAVE_REVERSAL':
          reversedBalance += q;
          break;
        case 'EXPIRY':
          expiredBalance += q;
          break;
        case 'ENCASHMENT_DEBIT':
          encashedBalance += q;
          break;
      }
    }

    // Credits add, debits subtract
    const totalCredits = openingBalance + accruedBalance + carryForwardBalance + adjustmentCredit + reversedBalance;
    const totalDebits = adjustmentDebit + consumedBalance + expiredBalance + encashedBalance;
    const postedBalance = Number((totalCredits - totalDebits).toFixed(2));

    // Active pending reservations
    const reservedBalance = await LeaveReservationRepository.getActiveReservedQuantity(
      employeeId,
      leaveTypeId,
      leaveYearId,
      companyId
    );

    const availableBalance = Number((postedBalance - reservedBalance).toFixed(2));

    const now = new Date().toISOString();
    const balanceId = `bal-${companyId}-${employeeId}-${leaveTypeId}-${leaveYearId}`;

    const balanceRecord: EmployeeLeaveBalance = {
      id: balanceId,
      companyId,
      employeeId,
      leaveTypeId,
      leaveYearId,
      openingBalance: Number(openingBalance.toFixed(2)),
      accruedBalance: Number(accruedBalance.toFixed(2)),
      carryForwardBalance: Number(carryForwardBalance.toFixed(2)),
      adjustmentCredit: Number(adjustmentCredit.toFixed(2)),
      adjustmentDebit: Number(adjustmentDebit.toFixed(2)),
      consumedBalance: Number(consumedBalance.toFixed(2)),
      reversedBalance: Number(reversedBalance.toFixed(2)),
      expiredBalance: Number(expiredBalance.toFixed(2)),
      encashedBalance: Number(encashedBalance.toFixed(2)),
      postedBalance,
      reservedBalance: Number(reservedBalance.toFixed(2)),
      availableBalance,
      lastRebuiltAt: now,
      updatedAt: now,
    };

    return LeaveBalanceRepository.save(balanceRecord);
  }

  /**
   * 2. POST OPENING BALANCE
   */
  public static async postOpeningBalance(
    companyId: string,
    actor: AuthUser,
    dto: PostOpeningBalanceDTO
  ): Promise<{ ledgerEntry: LeaveLedgerEntry; balance: EmployeeLeaveBalance }> {
    if (!dto.employeeId || !dto.leaveTypeId || dto.quantity === undefined || dto.quantity === null) {
      const err = new Error('employeeId, leaveTypeId, and quantity are required to post an opening balance.') as any;
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 400;
      throw err;
    }

    if (dto.quantity < 0) {
      const err = new Error('Opening balance quantity must be greater than or equal to 0.') as any;
      err.code = 'INVALID_QUANTITY';
      err.statusCode = 400;
      throw err;
    }

    const emp = await EmployeeRepository.findById(dto.employeeId, companyId);
    if (!emp) {
      const err = new Error(`Employee '${dto.employeeId}' not found in active company.`) as any;
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

    // Resolve leave year
    let leaveYearId = dto.leaveYearId;
    if (!leaveYearId) {
      const activeYear = await LeaveYearRepository.findActiveYear(companyId);
      if (!activeYear) {
        const err = new Error('No active leave year found for company.') as any;
        err.code = 'NO_ACTIVE_LEAVE_YEAR';
        err.statusCode = 400;
        throw err;
      }
      leaveYearId = activeYear.id;
    }

    const leaveYear = await LeaveYearRepository.findById(leaveYearId, companyId);
    if (!leaveYear) {
      const err = new Error(`Leave year '${leaveYearId}' not found.`) as any;
      err.code = 'LEAVE_YEAR_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    // Prevent duplicate OPENING balance for same employee + leave type + leave year
    const existingEntries = await LeaveLedgerRepository.findByEmployeeAndType(
      dto.employeeId,
      dto.leaveTypeId,
      leaveYearId,
      companyId
    );
    const hasOpening = existingEntries.some((e) => e.transactionType === 'OPENING');
    if (hasOpening) {
      const err = new Error(`Opening balance has already been posted for employee ${emp.displayName} on leave type ${leaveType.code} in leave year ${leaveYear.code}.`) as any;
      err.code = 'DUPLICATE_OPENING_BALANCE';
      err.statusCode = 409;
      throw err;
    }

    const effectiveDate = dto.effectiveDate || leaveYear.startDate;
    const ledgerId = `led-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const entry: LeaveLedgerEntry = {
      id: ledgerId,
      companyId,
      employeeId: dto.employeeId,
      leaveTypeId: dto.leaveTypeId,
      leaveYearId,
      transactionType: 'OPENING',
      quantity: Number(dto.quantity.toFixed(2)),
      effectiveDate,
      referenceType: 'OPENING_POSTING',
      referenceId: `OPENING-${leaveYear.code}-${dto.employeeId}`,
      remarks: dto.remarks || `Initial opening balance for ${leaveYear.code}`,
      createdBy: actor.id,
      createdAt: now,
    };

    const createdLedger = await LeaveLedgerRepository.create(entry);
    const balance = await this.rebuildEmployeeLeaveBalance(dto.employeeId, dto.leaveTypeId, leaveYearId, companyId);

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: 'LEAVE_OPENING_BALANCE_POSTED',
      targetModule: 'Leave Management',
      targetRecordId: createdLedger.id,
      companyId,
      changesSummary: `Posted opening balance of ${dto.quantity} days for ${emp.displayName} (${emp.employeeCode}) on leave type ${leaveType.code} in year ${leaveYear.code}.`,
    });

    return { ledgerEntry: createdLedger, balance };
  }

  /**
   * 3. POST MANUAL ADJUSTMENT (Credit or Debit)
   */
  public static async postManualAdjustment(
    companyId: string,
    actor: AuthUser,
    dto: PostManualAdjustmentDTO
  ): Promise<{ ledgerEntry: LeaveLedgerEntry; balance: EmployeeLeaveBalance }> {
    if (!dto.employeeId || !dto.leaveTypeId || !dto.adjustmentType || !dto.quantity || !dto.effectiveDate || !dto.remarks) {
      const err = new Error('employeeId, leaveTypeId, adjustmentType, quantity, effectiveDate, and remarks are required.') as any;
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 400;
      throw err;
    }

    if (dto.quantity <= 0) {
      const err = new Error('Adjustment quantity must be greater than 0.') as any;
      err.code = 'INVALID_QUANTITY';
      err.statusCode = 400;
      throw err;
    }

    const emp = await EmployeeRepository.findById(dto.employeeId, companyId);
    if (!emp) {
      const err = new Error(`Employee '${dto.employeeId}' not found.`) as any;
      err.code = 'EMPLOYEE_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    const leaveType = await LeaveTypeRepository.findById(dto.leaveTypeId, companyId);
    if (!leaveType) {
      const err = new Error(`Leave type '${dto.leaveTypeId}' not found.`) as any;
      err.code = 'LEAVE_TYPE_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    // Resolve leave year
    let leaveYearId = dto.leaveYearId;
    if (!leaveYearId) {
      const leaveYear = await LeaveYearRepository.findByDate(dto.effectiveDate, companyId);
      if (!leaveYear) {
        const err = new Error(`No leave year covering effective date '${dto.effectiveDate}'.`) as any;
        err.code = 'LEAVE_YEAR_NOT_FOUND';
        err.statusCode = 400;
        throw err;
      }
      leaveYearId = leaveYear.id;
    }

    const transactionType: LeaveTransactionType =
      dto.adjustmentType === 'CREDIT' ? 'ADJUSTMENT_CREDIT' : 'ADJUSTMENT_DEBIT';
    const signedQuantity =
      dto.adjustmentType === 'CREDIT' ? Math.abs(dto.quantity) : -Math.abs(dto.quantity);

    const ledgerId = `led-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const entry: LeaveLedgerEntry = {
      id: ledgerId,
      companyId,
      employeeId: dto.employeeId,
      leaveTypeId: dto.leaveTypeId,
      leaveYearId,
      transactionType,
      quantity: Number(signedQuantity.toFixed(2)),
      effectiveDate: dto.effectiveDate,
      referenceType: 'MANUAL_ADJUSTMENT',
      referenceId: `ADJ-${Date.now()}`,
      remarks: dto.remarks.trim(),
      createdBy: actor.id,
      createdAt: now,
    };

    const createdLedger = await LeaveLedgerRepository.create(entry);
    const balance = await this.rebuildEmployeeLeaveBalance(dto.employeeId, dto.leaveTypeId, leaveYearId, companyId);

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: 'LEAVE_BALANCE_ADJUSTED',
      targetModule: 'Leave Management',
      targetRecordId: createdLedger.id,
      companyId,
      changesSummary: `Manual ${dto.adjustmentType} adjustment of ${dto.quantity} days posted for ${emp.displayName} (${emp.employeeCode}) on leave type ${leaveType.code}. Reason: ${dto.remarks}`,
    });

    return { ledgerEntry: createdLedger, balance };
  }

  /**
   * 4. GET EMPLOYEE LEAVE BALANCES (Enriched with active policy rules)
   */
  public static async getEmployeeBalances(
    employeeId: string,
    companyId: string,
    leaveYearId?: string
  ): Promise<EmployeeLeaveBalance[]> {
    let yearId = leaveYearId;
    if (!yearId) {
      const activeYear = await LeaveYearRepository.findActiveYear(companyId);
      if (!activeYear) return [];
      yearId = activeYear.id;
    }

    const leaveYear = await LeaveYearRepository.findById(yearId, companyId);
    if (!leaveYear) return [];

    // Get all active leave types for company
    const leaveTypes = (await LeaveTypeRepository.findAll(companyId)).filter((lt) => lt.status === 'ACTIVE');
    const balances: EmployeeLeaveBalance[] = [];

    // Evaluate policy rules for employee
    const evalResult = await LeaveEligibilityService.evaluateEligibility(
      employeeId,
      companyId,
      new Date().toISOString().slice(0, 10)
    );
    const ruleMap = new Map(evalResult.rules.map((r) => [r.leaveTypeId, r]));

    for (const lt of leaveTypes) {
      let bal = await LeaveBalanceRepository.findByEmployeeAndType(
        employeeId,
        lt.id,
        yearId,
        companyId
      );

      if (!bal) {
        // Rebuild or create zero balance projection
        bal = await this.rebuildEmployeeLeaveBalance(employeeId, lt.id, yearId, companyId);
      }

      const policyRule = ruleMap.get(lt.id);

      balances.push({
        ...bal,
        leaveTypeCode: lt.code,
        leaveTypeName: lt.name,
        leaveCategory: lt.category,
        paidType: lt.paidType,
        unit: lt.unit,
        color: lt.color,
        annualEntitlement: policyRule?.annualEntitlement || 0,
        accrualFrequency: policyRule?.accrualFrequency,
        allowNegativeBalance: policyRule?.allowNegativeBalance ?? false,
        negativeBalanceLimit: policyRule?.negativeBalanceLimit || 0,
      });
    }

    return balances;
  }

  /**
   * 5. GET LEDGER HISTORY WITH FILTERS
   */
  public static async getLedgerHistory(
    companyId: string,
    filter?: LeaveLedgerFilter
  ): Promise<LeaveLedgerEntry[]> {
    return LeaveLedgerRepository.findAll(companyId, filter);
  }
}
