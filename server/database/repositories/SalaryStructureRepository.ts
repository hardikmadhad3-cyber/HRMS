import { SalaryStructure, SalaryStructureComponent } from '../../../src/types/payroll.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class SalaryStructureRepository {
  private static get db() {
    return RelationalDatabase.getInstance();
  }

  private static enrichComponent(sc: SalaryStructureComponent): SalaryStructureComponent {
    const comp = this.db.salaryComponents.get(sc.salaryComponentId);
    return {
      ...sc,
      component: comp ? { ...comp } : undefined,
    };
  }

  private static enrichStructure(st: SalaryStructure): SalaryStructure {
    const components = Array.from(this.db.salaryStructureComponents.values())
      .filter((sc) => sc.salaryStructureId === st.id && sc.companyId === st.companyId)
      .map((sc) => this.enrichComponent(sc))
      .sort((a, b) => a.displayOrder - b.displayOrder);

    return {
      ...st,
      components,
    };
  }

  public static async findAll(
    companyId: string,
    filters?: { isActive?: boolean; search?: string }
  ): Promise<SalaryStructure[]> {
    let items = Array.from(this.db.salaryStructures.values()).filter((st) => st.companyId === companyId);

    if (filters?.isActive !== undefined) {
      items = items.filter((st) => st.isActive === filters.isActive);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      items = items.filter(
        (st) =>
          st.name.toLowerCase().includes(q) ||
          st.code.toLowerCase().includes(q) ||
          (st.description && st.description.toLowerCase().includes(q))
      );
    }

    return items
      .map((st) => this.enrichStructure(st))
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  public static async findById(id: string, companyId: string): Promise<SalaryStructure | null> {
    const item = this.db.salaryStructures.get(id);
    if (!item || item.companyId !== companyId) return null;
    return this.enrichStructure(item);
  }

  public static async findByCode(code: string, companyId: string): Promise<SalaryStructure | null> {
    const q = code.trim().toLowerCase();
    for (const item of this.db.salaryStructures.values()) {
      if (item.companyId === companyId && item.code.toLowerCase() === q) {
        return this.enrichStructure(item);
      }
    }
    return null;
  }

  public static async isReferencedInAssignments(id: string, companyId: string): Promise<boolean> {
    for (const ca of this.db.employeeCompensationAssignments.values()) {
      if (ca.companyId === companyId && ca.salaryStructureId === id && ca.status === 'ACTIVE') {
        return true;
      }
    }
    return false;
  }

  /**
   * Atomic creation of Salary Structure and child components with transactional rollback
   */
  public static async create(
    data: Omit<SalaryStructure, 'createdAt' | 'updatedAt'>,
    componentsData: Array<Omit<SalaryStructureComponent, 'id' | 'salaryStructureId' | 'companyId' | 'createdAt' | 'updatedAt'>> = []
  ): Promise<SalaryStructure> {
    const newStructure: SalaryStructure = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store structure
    this.db.salaryStructures.set(newStructure.id, newStructure);

    try {
      // Validate and store child components
      const insertedComponents: SalaryStructureComponent[] = [];
      const seenComponentIds = new Set<string>();

      for (let i = 0; i < componentsData.length; i++) {
        const compDto = componentsData[i];
        
        // Verify component existence and company boundary
        const comp = this.db.salaryComponents.get(compDto.salaryComponentId);
        if (!comp || comp.companyId !== newStructure.companyId) {
          throw new Error(`Salary component ${compDto.salaryComponentId} not found in company.`);
        }

        if (seenComponentIds.has(compDto.salaryComponentId)) {
          throw new Error(`Duplicate salary component ${comp.code} in structure.`);
        }
        seenComponentIds.add(compDto.salaryComponentId);

        if (compDto.baseComponentId) {
          const baseComp = this.db.salaryComponents.get(compDto.baseComponentId);
          if (!baseComp || baseComp.companyId !== newStructure.companyId) {
            throw new Error(`Base salary component ${compDto.baseComponentId} not found in company.`);
          }
        }

        const childId = `ssc-${newStructure.id}-${i + 1}`;
        const childItem: SalaryStructureComponent = {
          id: childId,
          salaryStructureId: newStructure.id,
          companyId: newStructure.companyId,
          salaryComponentId: compDto.salaryComponentId,
          calculationType: compDto.calculationType,
          factorValue: compDto.factorValue,
          formulaExpression: compDto.formulaExpression,
          baseComponentId: compDto.baseComponentId,
          isMandatory: compDto.isMandatory !== undefined ? compDto.isMandatory : true,
          allowOverride: compDto.allowOverride !== undefined ? compDto.allowOverride : false,
          displayOrder: compDto.displayOrder !== undefined ? compDto.displayOrder : i + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        this.db.salaryStructureComponents.set(childItem.id, childItem);
        insertedComponents.push(childItem);
      }

      return this.enrichStructure(newStructure);
    } catch (error) {
      // Transaction rollback
      this.db.salaryStructures.delete(newStructure.id);
      for (const [id, sc] of this.db.salaryStructureComponents.entries()) {
        if (sc.salaryStructureId === newStructure.id) {
          this.db.salaryStructureComponents.delete(id);
        }
      }
      throw error;
    }
  }

  public static async update(
    id: string,
    companyId: string,
    data: Partial<Omit<SalaryStructure, 'id' | 'companyId' | 'createdAt'>>,
    componentsData?: Array<Omit<SalaryStructureComponent, 'id' | 'salaryStructureId' | 'companyId' | 'createdAt' | 'updatedAt'>>
  ): Promise<SalaryStructure | null> {
    const existing = this.db.salaryStructures.get(id);
    if (!existing || existing.companyId !== companyId) return null;

    const updated: SalaryStructure = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.db.salaryStructures.set(id, updated);

    if (componentsData !== undefined) {
      // Backup previous child items for atomic rollback if needed
      const previousComponents = Array.from(this.db.salaryStructureComponents.values()).filter(
        (sc) => sc.salaryStructureId === id
      );

      // Remove existing child components
      for (const sc of previousComponents) {
        this.db.salaryStructureComponents.delete(sc.id);
      }

      try {
        const seen = new Set<string>();
        for (let i = 0; i < componentsData.length; i++) {
          const compDto = componentsData[i];
          const comp = this.db.salaryComponents.get(compDto.salaryComponentId);
          if (!comp || comp.companyId !== companyId) {
            throw new Error(`Salary component ${compDto.salaryComponentId} not found in company.`);
          }
          if (seen.has(compDto.salaryComponentId)) {
            throw new Error(`Duplicate salary component ${comp.code} in structure.`);
          }
          seen.add(compDto.salaryComponentId);

          const childId = `ssc-${id}-${i + 1}`;
          const childItem: SalaryStructureComponent = {
            id: childId,
            salaryStructureId: id,
            companyId: companyId,
            salaryComponentId: compDto.salaryComponentId,
            calculationType: compDto.calculationType,
            factorValue: compDto.factorValue,
            formulaExpression: compDto.formulaExpression,
            baseComponentId: compDto.baseComponentId,
            isMandatory: compDto.isMandatory !== undefined ? compDto.isMandatory : true,
            allowOverride: compDto.allowOverride !== undefined ? compDto.allowOverride : false,
            displayOrder: compDto.displayOrder !== undefined ? compDto.displayOrder : i + 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          this.db.salaryStructureComponents.set(childItem.id, childItem);
        }
      } catch (err) {
        // Restore previous components
        for (const sc of previousComponents) {
          this.db.salaryStructureComponents.set(sc.id, sc);
        }
        throw err;
      }
    }

    return this.enrichStructure(updated);
  }

  public static async delete(id: string, companyId: string): Promise<boolean> {
    const existing = this.db.salaryStructures.get(id);
    if (!existing || existing.companyId !== companyId) return false;

    // Delete child components
    for (const [scId, sc] of this.db.salaryStructureComponents.entries()) {
      if (sc.salaryStructureId === id) {
        this.db.salaryStructureComponents.delete(scId);
      }
    }

    return this.db.salaryStructures.delete(id);
  }
}
