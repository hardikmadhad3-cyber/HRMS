import { EmployeeLeaveBalance } from '../../../src/types/leave.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export interface LeaveBalanceFilter {
  employeeId?: string;
  leaveTypeId?: string;
  leaveYearId?: string;
  departmentId?: string;
}

export class LeaveBalanceRepository {
  private static db = RelationalDatabase.getInstance();

  public static async save(balance: EmployeeLeaveBalance): Promise<EmployeeLeaveBalance> {
    this.db.leaveBalances.set(balance.id, { ...balance });
    return this.enrich(balance);
  }

  public static async findById(id: string, companyId?: string): Promise<EmployeeLeaveBalance | null> {
    const balance = this.db.leaveBalances.get(id);
    if (!balance) return null;
    if (companyId && balance.companyId !== companyId) return null;
    return this.enrich(balance);
  }

  public static async findByEmployeeAndType(
    employeeId: string,
    leaveTypeId: string,
    leaveYearId: string,
    companyId: string
  ): Promise<EmployeeLeaveBalance | null> {
    const found = Array.from(this.db.leaveBalances.values()).find(
      (b) =>
        b.companyId === companyId &&
        b.employeeId === employeeId &&
        b.leaveTypeId === leaveTypeId &&
        b.leaveYearId === leaveYearId
    );
    return found ? this.enrich(found) : null;
  }

  public static async findAllByEmployee(
    employeeId: string,
    leaveYearId: string,
    companyId: string
  ): Promise<EmployeeLeaveBalance[]> {
    const list = Array.from(this.db.leaveBalances.values()).filter(
      (b) =>
        b.companyId === companyId &&
        b.employeeId === employeeId &&
        b.leaveYearId === leaveYearId
    );
    return list.map((b) => this.enrich(b));
  }

  public static async findAll(companyId: string, filter?: LeaveBalanceFilter): Promise<EmployeeLeaveBalance[]> {
    let list = Array.from(this.db.leaveBalances.values()).filter((b) => b.companyId === companyId);

    if (filter) {
      if (filter.employeeId) {
        list = list.filter((b) => b.employeeId === filter.employeeId);
      }
      if (filter.leaveTypeId) {
        list = list.filter((b) => b.leaveTypeId === filter.leaveTypeId);
      }
      if (filter.leaveYearId) {
        list = list.filter((b) => b.leaveYearId === filter.leaveYearId);
      }
    }

    return list.map((b) => this.enrich(b));
  }

  public static async delete(id: string, companyId: string): Promise<boolean> {
    const balance = this.db.leaveBalances.get(id);
    if (!balance || balance.companyId !== companyId) return false;
    return this.db.leaveBalances.delete(id);
  }

  private static enrich(balance: EmployeeLeaveBalance): EmployeeLeaveBalance {
    const lt = this.db.leaveTypes.get(balance.leaveTypeId);
    const emp = this.db.employees.get(balance.employeeId);
    
    // Find department if possible
    const todayStr = new Date().toISOString().split('T')[0];
    const orgAsg = Array.from(this.db.employeeAssignments.values()).find(
      (a) => a.employeeId === balance.employeeId && (!a.effectiveTo || a.effectiveTo >= todayStr)
    );
    const dept = orgAsg?.departmentId ? this.db.departments.get(orgAsg.departmentId) : undefined;

    return {
      ...balance,
      leaveTypeCode: lt?.code,
      leaveTypeName: lt?.name,
      leaveCategory: lt?.category,
      paidType: lt?.paidType,
      unit: lt?.unit,
      color: lt?.color,
      employeeName: emp?.displayName || `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim(),
      employeeCode: emp?.employeeCode,
      departmentName: dept?.name,
    };
  }
}
