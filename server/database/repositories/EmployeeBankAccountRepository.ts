import { EmployeeBankAccount } from '../../../src/types/employee.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class EmployeeBankAccountRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findByEmployeeId(employeeId: string): Promise<EmployeeBankAccount | null> {
    const accounts = Array.from(this.db.employeeBankAccounts.values()).filter(
      (b) => b.employeeId === employeeId
    );
    if (accounts.length === 0) return null;
    return accounts.find((b) => b.isPrimary) || accounts[0];
  }

  public static async create(account: EmployeeBankAccount): Promise<EmployeeBankAccount> {
    this.db.employeeBankAccounts.set(account.id, account);
    return account;
  }

  public static async update(id: string, updates: Partial<EmployeeBankAccount>): Promise<EmployeeBankAccount | null> {
    const existing = this.db.employeeBankAccounts.get(id);
    if (!existing) return null;

    const updated: EmployeeBankAccount = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    this.db.employeeBankAccounts.set(id, updated);
    return updated;
  }

  public static async saveForEmployee(
    employeeId: string,
    account: EmployeeBankAccount
  ): Promise<EmployeeBankAccount> {
    // Delete existing bank accounts for simplicity or update
    for (const [id, b] of this.db.employeeBankAccounts.entries()) {
      if (b.employeeId === employeeId) {
        this.db.employeeBankAccounts.delete(id);
      }
    }
    this.db.employeeBankAccounts.set(account.id, account);
    return account;
  }

  public static maskAccountNumber(rawNumber: string): string {
    if (!rawNumber) return '';
    const clean = rawNumber.trim();
    if (clean.length <= 4) return clean;
    const last4 = clean.slice(-4);
    const maskedPart = '•'.repeat(Math.min(clean.length - 4, 8));
    return `${maskedPart}${last4}`;
  }
}
