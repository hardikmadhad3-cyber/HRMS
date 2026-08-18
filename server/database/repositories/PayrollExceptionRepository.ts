import { PayrollException } from '../../../src/types/payroll.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class PayrollExceptionRepository {
  private static get db() {
    return RelationalDatabase.getInstance();
  }

  private static enrichException(exc: PayrollException): PayrollException {
    if (exc.employeeId) {
      const emp = this.db.employees.get(exc.employeeId);
      return {
        ...exc,
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : exc.employeeName,
        employeeCode: emp?.employeeCode || exc.employeeCode,
      };
    }
    return exc;
  }

  public static async findByRunId(payrollRunId: string, companyId: string): Promise<PayrollException[]> {
    return Array.from(this.db.payrollExceptions.values())
      .filter((e) => e.payrollRunId === payrollRunId && e.companyId === companyId)
      .map((e) => this.enrichException(e));
  }

  public static async findByRunEmployeeId(
    payrollRunEmployeeId: string,
    companyId: string
  ): Promise<PayrollException[]> {
    return Array.from(this.db.payrollExceptions.values())
      .filter((e) => e.payrollRunEmployeeId === payrollRunEmployeeId && e.companyId === companyId)
      .map((e) => this.enrichException(e));
  }

  public static async save(exception: PayrollException): Promise<PayrollException> {
    this.db.payrollExceptions.set(exception.id, { ...exception });
    return this.enrichException(exception);
  }

  public static async saveBatch(exceptions: PayrollException[]): Promise<PayrollException[]> {
    for (const exc of exceptions) {
      this.db.payrollExceptions.set(exc.id, { ...exc });
    }
    return exceptions.map((e) => this.enrichException(e));
  }

  public static async deleteByRunEmployeeId(
    payrollRunEmployeeId: string,
    companyId: string
  ): Promise<void> {
    for (const [id, exc] of this.db.payrollExceptions.entries()) {
      if (exc.payrollRunEmployeeId === payrollRunEmployeeId && exc.companyId === companyId) {
        this.db.payrollExceptions.delete(id);
      }
    }
  }

  public static async deleteByRunId(payrollRunId: string, companyId: string): Promise<void> {
    for (const [id, exc] of this.db.payrollExceptions.entries()) {
      if (exc.payrollRunId === payrollRunId && exc.companyId === companyId) {
        this.db.payrollExceptions.delete(id);
      }
    }
  }
}
