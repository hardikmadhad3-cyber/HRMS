import { Employee, EmployeeDirectoryItem, EmployeeFilterOptions } from '../../../src/types/employee.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class EmployeeRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findById(id: string, companyId?: string): Promise<Employee | null> {
    const emp = this.db.employees.get(id);
    if (!emp) return null;
    if (companyId && emp.companyId !== companyId) return null;
    return emp;
  }

  public static async findByCode(companyId: string, employeeCode: string): Promise<Employee | null> {
    const normalized = employeeCode.trim().toUpperCase();
    for (const emp of this.db.employees.values()) {
      if (emp.companyId === companyId && emp.employeeCode.toUpperCase() === normalized) {
        return emp;
      }
    }
    return null;
  }

  public static async findByWorkEmail(workEmail: string): Promise<Employee | null> {
    const normalized = workEmail.trim().toLowerCase();
    for (const emp of this.db.employees.values()) {
      if (emp.workEmail.toLowerCase() === normalized) {
        return emp;
      }
    }
    return null;
  }

  public static async create(employee: Employee): Promise<Employee> {
    this.db.employees.set(employee.id, employee);
    return employee;
  }

  public static async update(id: string, updates: Partial<Employee>): Promise<Employee | null> {
    const existing = this.db.employees.get(id);
    if (!existing) return null;

    const updated: Employee = {
      ...existing,
      ...updates,
      id, // Immutable ID
      companyId: existing.companyId, // Immutable company ID
      employeeCode: existing.employeeCode, // Immutable employee code
      updatedAt: new Date().toISOString(),
    };

    this.db.employees.set(id, updated);
    return updated;
  }

  public static async delete(id: string): Promise<boolean> {
    return this.db.employees.delete(id);
  }

  public static async findAllByCompany(companyId: string): Promise<Employee[]> {
    return Array.from(this.db.employees.values()).filter((e) => e.companyId === companyId);
  }

  public static async findAll(companyId: string, filter?: { status?: string }): Promise<Employee[]> {
    const list = await this.findAllByCompany(companyId);
    if (filter?.status) {
      return list.filter((e) => e.status === filter.status);
    }
    return list;
  }

  public static async findDirectory(
    companyId: string,
    filters?: EmployeeFilterOptions,
    managerScopeEmployeeIds?: string[]
  ): Promise<{ items: EmployeeDirectoryItem[]; total: number }> {
    let all = Array.from(this.db.employees.values()).filter((e) => e.companyId === companyId);

    // If restricted by manager scope
    if (managerScopeEmployeeIds && managerScopeEmployeeIds.length > 0) {
      const allowedSet = new Set(managerScopeEmployeeIds);
      all = all.filter((e) => allowedSet.has(e.id));
    }

    // Join current assignment for each employee
    const directoryItems: EmployeeDirectoryItem[] = all.map((emp) => {
      // Find active assignment (effectiveTo is null or in future)
      const assignments = Array.from(this.db.employeeAssignments.values()).filter(
        (a) => a.employeeId === emp.id
      );
      // Sort by effectiveFrom desc
      assignments.sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
      const currentAssign = assignments.find((a) => !a.effectiveTo) || assignments[0];

      let branchName: string | undefined;
      let departmentName: string | undefined;
      let designationName: string | undefined;
      let workLocationName: string | undefined;
      let managerName: string | undefined;
      let managerCode: string | undefined;

      if (currentAssign) {
        branchName = this.db.branches.get(currentAssign.branchId)?.name;
        departmentName = this.db.departments.get(currentAssign.departmentId)?.name;
        designationName = this.db.designations.get(currentAssign.designationId)?.name;
        workLocationName = this.db.workLocations.get(currentAssign.workLocationId)?.name;
        if (currentAssign.managerId) {
          const mgr = this.db.employees.get(currentAssign.managerId);
          if (mgr) {
            managerName = mgr.displayName;
            managerCode = mgr.employeeCode;
          }
        }
      }

      return {
        id: emp.id,
        companyId: emp.companyId,
        employeeCode: emp.employeeCode,
        firstName: emp.firstName,
        lastName: emp.lastName,
        displayName: emp.displayName,
        workEmail: emp.workEmail,
        mobileNumber: emp.mobileNumber,
        avatarUrl: emp.avatarUrl,
        joiningDate: emp.joiningDate,
        employmentType: emp.employmentType,
        status: emp.status,
        branchId: currentAssign?.branchId,
        branchName,
        departmentId: currentAssign?.departmentId,
        departmentName,
        designationId: currentAssign?.designationId,
        designationName,
        workLocationId: currentAssign?.workLocationId,
        workLocationName,
        managerId: currentAssign?.managerId,
        managerName,
        managerCode,
      };
    });

    // Apply filters
    let filtered = directoryItems;

    if (filters?.search) {
      const q = filters.search.trim().toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.employeeCode.toLowerCase().includes(q) ||
          item.displayName.toLowerCase().includes(q) ||
          item.workEmail.toLowerCase().includes(q) ||
          (item.departmentName && item.departmentName.toLowerCase().includes(q)) ||
          (item.designationName && item.designationName.toLowerCase().includes(q)) ||
          (item.branchName && item.branchName.toLowerCase().includes(q))
      );
    }

    if (filters?.branchId) {
      filtered = filtered.filter((i) => i.branchId === filters.branchId);
    }

    if (filters?.departmentId) {
      filtered = filtered.filter((i) => i.departmentId === filters.departmentId);
    }

    if (filters?.designationId) {
      filtered = filtered.filter((i) => i.designationId === filters.designationId);
    }

    if (filters?.workLocationId) {
      filtered = filtered.filter((i) => i.workLocationId === filters.workLocationId);
    }

    if (filters?.employmentType) {
      filtered = filtered.filter((i) => i.employmentType === filters.employmentType);
    }

    if (filters?.status) {
      filtered = filtered.filter((i) => i.status === filters.status);
    }

    if (filters?.managerId) {
      filtered = filtered.filter((i) => i.managerId === filters.managerId);
    }

    // Sort
    const sortBy = filters?.sortBy || 'employeeCode';
    const sortOrder = filters?.sortOrder || 'asc';
    filtered.sort((a: any, b: any) => {
      const valA = a[sortBy] ?? '';
      const valB = b[sortBy] ?? '';
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const total = filtered.length;

    // Pagination
    const page = filters?.page && filters.page > 0 ? filters.page : 1;
    const limit = filters?.limit && filters.limit > 0 ? filters.limit : 50;
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    return { items: paginated, total };
  }
}
