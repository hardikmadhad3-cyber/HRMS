import { LeaveBalanceReservation, ReservationStatus } from '../../../src/types/leave.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class LeaveReservationRepository {
  private static db = RelationalDatabase.getInstance();

  public static async create(res: LeaveBalanceReservation): Promise<LeaveBalanceReservation> {
    this.db.leaveReservations.set(res.id, { ...res });
    return { ...res };
  }

  public static async findById(id: string, companyId?: string): Promise<LeaveBalanceReservation | null> {
    const res = this.db.leaveReservations.get(id);
    if (!res) return null;
    if (companyId && res.companyId !== companyId) return null;
    return { ...res };
  }

  public static async findByRequestId(requestId: string): Promise<LeaveBalanceReservation | null> {
    const res = Array.from(this.db.leaveReservations.values()).find(
      (r) => r.leaveRequestId === requestId
    );
    return res ? { ...res } : null;
  }

  public static async getActiveReservedQuantity(
    employeeId: string,
    leaveTypeId: string,
    leaveYearId: string,
    companyId: string
  ): Promise<number> {
    const activeReservations = Array.from(this.db.leaveReservations.values()).filter(
      (r) =>
        r.companyId === companyId &&
        r.employeeId === employeeId &&
        r.leaveTypeId === leaveTypeId &&
        r.leaveYearId === leaveYearId &&
        r.status === 'ACTIVE'
    );

    return activeReservations.reduce((sum, r) => sum + r.quantity, 0);
  }

  public static async updateStatus(
    requestId: string,
    status: ReservationStatus,
    companyId: string
  ): Promise<LeaveBalanceReservation | null> {
    const res = Array.from(this.db.leaveReservations.values()).find(
      (r) => r.leaveRequestId === requestId && r.companyId === companyId
    );
    if (!res) return null;

    res.status = status;
    res.updatedAt = new Date().toISOString();
    this.db.leaveReservations.set(res.id, { ...res });
    return { ...res };
  }
}
