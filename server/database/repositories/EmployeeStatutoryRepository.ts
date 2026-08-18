import { EmployeeStatutoryDetails } from '../../../src/types/employee.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class EmployeeStatutoryRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findByEmployeeId(employeeId: string): Promise<EmployeeStatutoryDetails | null> {
    for (const stat of this.db.employeeStatutoryDetails.values()) {
      if (stat.employeeId === employeeId) {
        return stat;
      }
    }
    return null;
  }

  public static async create(statutory: EmployeeStatutoryDetails): Promise<EmployeeStatutoryDetails> {
    this.db.employeeStatutoryDetails.set(statutory.id, statutory);
    return statutory;
  }

  public static async update(
    id: string,
    updates: Partial<EmployeeStatutoryDetails>
  ): Promise<EmployeeStatutoryDetails | null> {
    const existing = this.db.employeeStatutoryDetails.get(id);
    if (!existing) return null;

    const updated: EmployeeStatutoryDetails = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    this.db.employeeStatutoryDetails.set(id, updated);
    return updated;
  }

  public static async saveForEmployee(
    employeeId: string,
    statutory: EmployeeStatutoryDetails
  ): Promise<EmployeeStatutoryDetails> {
    for (const [id, s] of this.db.employeeStatutoryDetails.entries()) {
      if (s.employeeId === employeeId) {
        this.db.employeeStatutoryDetails.delete(id);
      }
    }
    this.db.employeeStatutoryDetails.set(statutory.id, statutory);
    return statutory;
  }

  public static maskValue(rawVal?: string): string | undefined {
    if (!rawVal) return undefined;
    const clean = rawVal.trim();
    if (clean.length <= 4) return '••••';
    const last4 = clean.slice(-4);
    return `••••••••${last4}`;
  }
}
