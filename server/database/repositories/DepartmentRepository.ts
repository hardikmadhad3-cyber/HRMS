import { Department } from '../../../src/types/organization.js';
import { RelationalDatabase, TenantScopedFilter } from '../RelationalDatabase.js';

export class DepartmentRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findAll(filter: TenantScopedFilter): Promise<Department[]> {
    let result = Array.from(this.db.departments.values()).filter((d) => d.companyId === filter.companyId);

    if (filter.status) {
      result = result.filter((d) => d.status === filter.status);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.code.toLowerCase().includes(q) ||
          (d.departmentHeadName && d.departmentHeadName.toLowerCase().includes(q))
      );
    }

    // Populate parent department names
    return result.map((dept) => {
      if (dept.parentDepartmentId) {
        const parent = this.db.departments.get(dept.parentDepartmentId);
        return {
          ...dept,
          parentDepartmentName: parent ? `${parent.name} (${parent.code})` : undefined,
        };
      }
      return dept;
    });
  }

  public static async findById(id: string, companyId?: string): Promise<Department | null> {
    const dept = this.db.departments.get(id);
    if (!dept) return null;
    if (companyId && dept.companyId !== companyId) return null;

    if (dept.parentDepartmentId) {
      const parent = this.db.departments.get(dept.parentDepartmentId);
      return {
        ...dept,
        parentDepartmentName: parent ? `${parent.name} (${parent.code})` : undefined,
      };
    }
    return dept;
  }

  public static async findByCode(companyId: string, code: string): Promise<Department | null> {
    const normalized = code.trim().toUpperCase();
    for (const dept of this.db.departments.values()) {
      if (dept.companyId === companyId && dept.code.toUpperCase() === normalized) {
        return dept;
      }
    }
    return null;
  }

  public static async create(dept: Department): Promise<Department> {
    this.db.departments.set(dept.id, dept);
    return dept;
  }

  public static async update(id: string, companyId: string, updates: Partial<Department>): Promise<Department | null> {
    const existing = this.db.departments.get(id);
    if (!existing || existing.companyId !== companyId) return null;
    const updated: Department = {
      ...existing,
      ...updates,
      id,
      companyId, // Immutable company assignment
      updatedAt: new Date().toISOString(),
    };
    this.db.departments.set(id, updated);
    return updated;
  }

  /**
   * Prevents circular hierarchy: Department A -> Parent B -> Parent A
   */
  public static isCircular(deptId: string, targetParentId: string): boolean {
    if (deptId === targetParentId) return true;
    let currentParentId: string | undefined = targetParentId;
    const visited = new Set<string>();

    while (currentParentId) {
      if (currentParentId === deptId) {
        return true;
      }
      if (visited.has(currentParentId)) {
        return true; // Cycle detected
      }
      visited.add(currentParentId);
      const parentDept = this.db.departments.get(currentParentId);
      currentParentId = parentDept?.parentDepartmentId;
    }
    return false;
  }

  public static async hasChildDepartments(deptId: string): Promise<boolean> {
    for (const d of this.db.departments.values()) {
      if (d.parentDepartmentId === deptId && d.status === 'ACTIVE') {
        return true;
      }
    }
    return false;
  }
}
