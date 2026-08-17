import {
  SalaryComponent,
  SalaryStructure,
  SalaryStructureComponent,
  PayrollCalendar,
  PayrollPeriod,
  PayrollPeriodStatus,
  ComponentType,
} from '../../src/types/payroll.js';
import { SalaryComponentRepository } from '../database/repositories/SalaryComponentRepository.js';
import { SalaryStructureRepository } from '../database/repositories/SalaryStructureRepository.js';
import { PayrollCalendarRepository } from '../database/repositories/PayrollCalendarRepository.js';
import { AuditService } from './AuditService.js';
import { ServiceActor } from './OrganizationService.js';

export class PayrollConfigService {
  // -------------------------------------------------------------
  // SALARY COMPONENTS MASTER
  // -------------------------------------------------------------

  public static async getSalaryComponents(
    companyId: string,
    filters?: { type?: ComponentType; isActive?: boolean; search?: string }
  ): Promise<SalaryComponent[]> {
    return SalaryComponentRepository.findAll(companyId, filters);
  }

  public static async getSalaryComponentById(
    id: string,
    companyId: string
  ): Promise<SalaryComponent | null> {
    return SalaryComponentRepository.findById(id, companyId);
  }

  public static async createSalaryComponent(
    companyId: string,
    data: Omit<SalaryComponent, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    actor: ServiceActor
  ): Promise<SalaryComponent> {
    const existing = await SalaryComponentRepository.findByCode(data.code, companyId);
    if (existing) {
      throw new Error(`SALARY_COMPONENT_CODE_EXISTS: Salary component with code '${data.code}' already exists.`);
    }

    const id = `sc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const created = await SalaryComponentRepository.create({
      ...data,
      id,
      companyId,
      createdBy: actor.id,
    });

    await AuditService.log({
      companyId,
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'SALARY_COMPONENT_CREATED',
      targetModule: 'PayrollConfig',
      targetRecordId: created.id,
      changesSummary: `Created salary component ${created.code} (${created.name}, ${created.type})`,
      ipAddress: actor.ipAddress,
    });

    return created;
  }

  public static async updateSalaryComponent(
    id: string,
    companyId: string,
    data: Partial<Omit<SalaryComponent, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>>,
    actor: ServiceActor
  ): Promise<SalaryComponent> {
    const existing = await SalaryComponentRepository.findById(id, companyId);
    if (!existing) {
      throw new Error('SALARY_COMPONENT_NOT_FOUND: Salary component not found.');
    }

    if (data.code && data.code.trim().toUpperCase() !== existing.code.toUpperCase()) {
      const duplicate = await SalaryComponentRepository.findByCode(data.code, companyId);
      if (duplicate && duplicate.id !== id) {
        throw new Error(`SALARY_COMPONENT_CODE_EXISTS: Salary component with code '${data.code}' already exists.`);
      }
    }

    const updated = await SalaryComponentRepository.update(id, companyId, data);
    if (!updated) {
      throw new Error('Failed to update salary component.');
    }

    await AuditService.log({
      companyId,
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'SALARY_COMPONENT_UPDATED',
      targetModule: 'PayrollConfig',
      targetRecordId: id,
      changesSummary: `Updated salary component ${id}`,
      ipAddress: actor.ipAddress,
    });

    return updated;
  }

  public static async deleteSalaryComponent(
    id: string,
    companyId: string,
    actor: ServiceActor
  ): Promise<boolean> {
    const existing = await SalaryComponentRepository.findById(id, companyId);
    if (!existing) {
      throw new Error('SALARY_COMPONENT_NOT_FOUND: Salary component not found.');
    }

    const isReferenced = await SalaryComponentRepository.isReferencedInStructures(id, companyId);
    if (isReferenced) {
      throw new Error('COMPONENT_IN_USE: Cannot delete salary component referenced in salary structures. Deactivate instead.');
    }

    const success = await SalaryComponentRepository.delete(id, companyId);
    if (success) {
      await AuditService.log({
        companyId,
        actorId: actor.id,
        actorName: actor.name,
        actorEmail: actor.email,
        action: 'SALARY_COMPONENT_DELETED',
        targetModule: 'PayrollConfig',
        targetRecordId: id,
        changesSummary: `Deleted salary component ${existing.code} (${existing.name})`,
        ipAddress: actor.ipAddress,
      });
    }

    return success;
  }

  // -------------------------------------------------------------
  // SALARY STRUCTURES MASTER
  // -------------------------------------------------------------

  public static async getSalaryStructures(
    companyId: string,
    filters?: { isActive?: boolean; search?: string }
  ): Promise<SalaryStructure[]> {
    return SalaryStructureRepository.findAll(companyId, filters);
  }

  public static async getSalaryStructureById(
    id: string,
    companyId: string
  ): Promise<SalaryStructure | null> {
    return SalaryStructureRepository.findById(id, companyId);
  }

  public static async createSalaryStructure(
    companyId: string,
    structureData: Omit<SalaryStructure, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'components'>,
    componentsData: Array<Omit<SalaryStructureComponent, 'id' | 'salaryStructureId' | 'companyId' | 'createdAt' | 'updatedAt'>>,
    actor: ServiceActor
  ): Promise<SalaryStructure> {
    const existing = await SalaryStructureRepository.findByCode(structureData.code, companyId);
    if (existing) {
      throw new Error(`SALARY_STRUCTURE_CODE_EXISTS: Salary structure with code '${structureData.code}' already exists.`);
    }

    const id = `ss-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const created = await SalaryStructureRepository.create(
      {
        ...structureData,
        id,
        companyId,
        createdBy: actor.id,
      },
      componentsData
    );

    await AuditService.log({
      companyId,
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'SALARY_STRUCTURE_CREATED',
      targetModule: 'PayrollConfig',
      targetRecordId: created.id,
      changesSummary: `Created salary structure ${created.code} (${created.name}) with ${componentsData.length} components`,
      ipAddress: actor.ipAddress,
    });

    return created;
  }

  public static async updateSalaryStructure(
    id: string,
    companyId: string,
    structureData: Partial<Omit<SalaryStructure, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'components'>>,
    componentsData?: Array<Omit<SalaryStructureComponent, 'id' | 'salaryStructureId' | 'companyId' | 'createdAt' | 'updatedAt'>>,
    actor?: ServiceActor
  ): Promise<SalaryStructure> {
    const existing = await SalaryStructureRepository.findById(id, companyId);
    if (!existing) {
      throw new Error('SALARY_STRUCTURE_NOT_FOUND: Salary structure not found.');
    }

    if (structureData.code && structureData.code.trim().toUpperCase() !== existing.code.toUpperCase()) {
      const duplicate = await SalaryStructureRepository.findByCode(structureData.code, companyId);
      if (duplicate && duplicate.id !== id) {
        throw new Error(`SALARY_STRUCTURE_CODE_EXISTS: Salary structure with code '${structureData.code}' already exists.`);
      }
    }

    const updated = await SalaryStructureRepository.update(id, companyId, structureData, componentsData);
    if (!updated) {
      throw new Error('Failed to update salary structure.');
    }

    if (actor) {
      await AuditService.log({
        companyId,
        actorId: actor.id,
        actorName: actor.name,
        actorEmail: actor.email,
        action: 'SALARY_STRUCTURE_UPDATED',
        targetModule: 'PayrollConfig',
        targetRecordId: id,
        changesSummary: `Updated salary structure ${id}`,
        ipAddress: actor.ipAddress,
      });
    }

    return updated;
  }

  public static async deleteSalaryStructure(
    id: string,
    companyId: string,
    actor: ServiceActor
  ): Promise<boolean> {
    const existing = await SalaryStructureRepository.findById(id, companyId);
    if (!existing) {
      throw new Error('SALARY_STRUCTURE_NOT_FOUND: Salary structure not found.');
    }

    const inUse = await SalaryStructureRepository.isReferencedInAssignments(id, companyId);
    if (inUse) {
      throw new Error('STRUCTURE_IN_USE: Cannot delete salary structure actively assigned to employees.');
    }

    const success = await SalaryStructureRepository.delete(id, companyId);
    if (success) {
      await AuditService.log({
        companyId,
        actorId: actor.id,
        actorName: actor.name,
        actorEmail: actor.email,
        action: 'SALARY_STRUCTURE_DELETED',
        targetModule: 'PayrollConfig',
        targetRecordId: id,
        changesSummary: `Deleted salary structure ${existing.code} (${existing.name})`,
        ipAddress: actor.ipAddress,
      });
    }

    return success;
  }

  // -------------------------------------------------------------
  // PAYROLL CALENDARS & PERIODS
  // -------------------------------------------------------------

  public static async getPayrollCalendars(
    companyId: string,
    filters?: { year?: number; isActive?: boolean; search?: string }
  ): Promise<PayrollCalendar[]> {
    return PayrollCalendarRepository.findAll(companyId, filters);
  }

  public static async getPayrollCalendarById(
    id: string,
    companyId: string
  ): Promise<PayrollCalendar | null> {
    return PayrollCalendarRepository.findById(id, companyId);
  }

  public static async createPayrollCalendar(
    companyId: string,
    calendarData: Omit<PayrollCalendar, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'periods'>,
    customPeriods: PayrollPeriod[] | undefined,
    actor: ServiceActor
  ): Promise<PayrollCalendar> {
    const existing = await PayrollCalendarRepository.findByCode(calendarData.code, companyId);
    if (existing) {
      throw new Error(`PAYROLL_CALENDAR_CODE_EXISTS: Payroll calendar with code '${calendarData.code}' already exists.`);
    }

    const id = `pc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const created = await PayrollCalendarRepository.create(
      {
        ...calendarData,
        id,
        companyId,
        createdBy: actor.id,
      },
      customPeriods
    );

    await AuditService.log({
      companyId,
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'PAYROLL_CALENDAR_CREATED',
      targetModule: 'PayrollConfig',
      targetRecordId: created.id,
      changesSummary: `Created payroll calendar ${created.code} (${created.name}, Year ${created.year})`,
      ipAddress: actor.ipAddress,
    });

    return created;
  }

  public static async updatePeriodStatus(
    periodId: string,
    companyId: string,
    status: PayrollPeriodStatus,
    actor: ServiceActor
  ): Promise<PayrollPeriod> {
    const updated = await PayrollCalendarRepository.updatePeriodStatus(periodId, companyId, status);
    if (!updated) {
      throw new Error('PAYROLL_PERIOD_NOT_FOUND: Payroll period not found.');
    }

    await AuditService.log({
      companyId,
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'PAYROLL_PERIOD_STATUS_UPDATED',
      targetModule: 'PayrollConfig',
      targetRecordId: periodId,
      changesSummary: `Updated period status for ${updated.periodCode} to ${status}`,
      ipAddress: actor.ipAddress,
    });

    return updated;
  }
}
