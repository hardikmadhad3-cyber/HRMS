import { PayrollRunEmployee } from '../../../src/types/payroll.js';
import { RelationalDatabase } from '../RelationalDatabase.js';
import { PayrollComponentResultRepository } from './PayrollComponentResultRepository.js';
import { PayrollExceptionRepository } from './PayrollExceptionRepository.js';

export class PayrollRunEmployeeRepository {
  private static get db() {
    return RelationalDatabase.getInstance();
  }

  private static async enrichRunEmployee(
    re: PayrollRunEmployee,
    includeDetails: boolean = true
  ): Promise<PayrollRunEmployee> {
    const emp = this.db.employees.get(re.employeeId);
    let deptName: string | undefined;
    let desigName: string | undefined;

    if (emp) {
      const assigns = Array.from(this.db.employeeAssignments.values()).filter(
        (asg) => asg.employeeId === re.employeeId
      );
      if (assigns.length > 0) {
        const activeAsg = assigns.find((asg) => !asg.effectiveTo) || assigns[0];
        const dept = activeAsg.departmentId ? this.db.departments.get(activeAsg.departmentId) : undefined;
        const desig = activeAsg.designationId ? this.db.designations.get(activeAsg.designationId) : undefined;
        deptName = dept?.name;
        desigName = desig?.name;
      }
    }

    let components = undefined;
    let exceptions = undefined;

    if (includeDetails) {
      components = await PayrollComponentResultRepository.findByRunEmployeeId(re.id, re.companyId);
      exceptions = await PayrollExceptionRepository.findByRunEmployeeId(re.id, re.companyId);
    }

    return {
      ...re,
      employeeName: emp ? `${emp.firstName} ${emp.lastName}` : undefined,
      employeeCode: emp?.employeeCode,
      departmentName: deptName,
      designationName: desigName,
      components,
      exceptions,
    };
  }

  public static async findById(
    id: string,
    companyId: string,
    includeDetails: boolean = true
  ): Promise<PayrollRunEmployee | null> {
    const re = this.db.payrollRunEmployees.get(id);
    if (!re || re.companyId !== companyId) return null;
    return this.enrichRunEmployee(re, includeDetails);
  }

  public static async findByRunId(
    payrollRunId: string,
    companyId: string,
    includeDetails: boolean = true
  ): Promise<PayrollRunEmployee[]> {
    const list = Array.from(this.db.payrollRunEmployees.values()).filter(
      (r) => r.payrollRunId === payrollRunId && r.companyId === companyId
    );

    const enriched = await Promise.all(
      list.map((item) => this.enrichRunEmployee(item, includeDetails))
    );

    return enriched.sort((a, b) => (a.employeeCode || '').localeCompare(b.employeeCode || ''));
  }

  public static async findByRunAndEmployee(
    payrollRunId: string,
    employeeId: string,
    companyId: string,
    includeDetails: boolean = true
  ): Promise<PayrollRunEmployee | null> {
    for (const re of this.db.payrollRunEmployees.values()) {
      if (
        re.payrollRunId === payrollRunId &&
        re.employeeId === employeeId &&
        re.companyId === companyId
      ) {
        return this.enrichRunEmployee(re, includeDetails);
      }
    }
    return null;
  }

  public static async findLatestByEmployee(
    employeeId: string,
    companyId: string,
    includeDetails: boolean = true
  ): Promise<PayrollRunEmployee | null> {
    const runs = Array.from(this.db.payrollRuns.values())
      .filter((r) => r.companyId === companyId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    for (const run of runs) {
      const runEmp = await this.findByRunAndEmployee(run.id, employeeId, companyId, includeDetails);
      if (runEmp) return runEmp;
    }
    return null;
  }

  public static async save(runEmployee: PayrollRunEmployee): Promise<PayrollRunEmployee> {
    this.db.payrollRunEmployees.set(runEmployee.id, { ...runEmployee });
    return this.enrichRunEmployee(runEmployee, false);
  }

  public static async saveBatch(
    items: PayrollRunEmployee[]
  ): Promise<PayrollRunEmployee[]> {
    for (const item of items) {
      this.db.payrollRunEmployees.set(item.id, { ...item });
    }
    return items;
  }

  public static async delete(id: string, companyId: string): Promise<boolean> {
    const existing = await this.findById(id, companyId, false);
    if (!existing) return false;

    await PayrollComponentResultRepository.deleteByRunEmployeeId(id, companyId);
    await PayrollExceptionRepository.deleteByRunEmployeeId(id, companyId);
    this.db.payrollRunEmployees.delete(id);
    return true;
  }

  public static async deleteByRunId(payrollRunId: string, companyId: string): Promise<void> {
    for (const [id, re] of this.db.payrollRunEmployees.entries()) {
      if (re.payrollRunId === payrollRunId && re.companyId === companyId) {
        await PayrollComponentResultRepository.deleteByRunEmployeeId(id, companyId);
        await PayrollExceptionRepository.deleteByRunEmployeeId(id, companyId);
        this.db.payrollRunEmployees.delete(id);
      }
    }
  }
}
