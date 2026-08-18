import { EmployeeStatusHistory } from '../../../src/types/employee.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class EmployeeStatusHistoryRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findByEmployeeId(employeeId: string): Promise<EmployeeStatusHistory[]> {
    const list = Array.from(this.db.employeeStatusHistory.values()).filter(
      (h) => h.employeeId === employeeId
    );
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }

  public static async create(history: EmployeeStatusHistory): Promise<EmployeeStatusHistory> {
    this.db.employeeStatusHistory.set(history.id, history);
    return history;
  }
}
