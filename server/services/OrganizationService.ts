import { Company, Branch, Department, Designation, WorkLocation, Holiday } from '../../src/types/organization.js';
import { CompanyRepository } from '../database/repositories/CompanyRepository.js';
import { BranchRepository } from '../database/repositories/BranchRepository.js';
import { DepartmentRepository } from '../database/repositories/DepartmentRepository.js';
import { DesignationRepository } from '../database/repositories/DesignationRepository.js';
import { WorkLocationRepository } from '../database/repositories/WorkLocationRepository.js';
import { HolidayRepository } from '../database/repositories/HolidayRepository.js';
import { AuditService } from './AuditService.js';

export interface ServiceActor {
  id: string;
  name: string;
  email: string;
  role: string;
  ipAddress?: string;
}

export class OrganizationService {
  // ==========================================
  // 1. COMPANIES
  // ==========================================
  public static async getCompanies(): Promise<Company[]> {
    return CompanyRepository.findAll();
  }

  public static async getCompanyById(id: string): Promise<Company | null> {
    return CompanyRepository.findById(id);
  }

  public static async createCompany(
    data: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>,
    actor: ServiceActor
  ): Promise<Company> {
    if (!data.code || !data.name || !data.contactEmail || !data.address) {
      const error: any = new Error('Missing required company fields (code, name, contactEmail, address).');
      error.code = 'VALIDATION_ERROR';
      error.statusCode = 422;
      throw error;
    }

    const existingCode = await CompanyRepository.findByCode(data.code);
    if (existingCode) {
      const error: any = new Error(`Company code '${data.code.toUpperCase()}' is already registered.`);
      error.code = 'DUPLICATE_CODE';
      error.statusCode = 409;
      throw error;
    }

    const now = new Date().toISOString();
    const newCompany: Company = {
      ...data,
      id: `comp-${Date.now()}`,
      code: data.code.trim().toUpperCase(),
      status: data.status || 'ACTIVE',
      currency: data.currency || 'USD',
      locale: data.locale || 'en-US',
      timezone: data.timezone || 'America/New_York',
      createdAt: now,
      updatedAt: now,
      createdBy: actor.id,
    };

    const saved = await CompanyRepository.create(newCompany);

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'COMPANY_CREATED',
      targetModule: 'Organization',
      targetRecordId: saved.id,
      companyId: saved.id,
      companyName: saved.name,
      ipAddress: actor.ipAddress || '127.0.0.1',
      changesSummary: `Created new legal entity [${saved.code}] ${saved.name}.`,
    });

    return saved;
  }

  public static async updateCompany(
    id: string,
    data: Partial<Company>,
    actor: ServiceActor
  ): Promise<Company> {
    const existing = await CompanyRepository.findById(id);
    if (!existing) {
      const error: any = new Error(`Company with id '${id}' not found.`);
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    if (data.code && data.code.toUpperCase() !== existing.code.toUpperCase()) {
      const duplicate = await CompanyRepository.findByCode(data.code);
      if (duplicate && duplicate.id !== id) {
        const error: any = new Error(`Company code '${data.code.toUpperCase()}' is already in use.`);
        error.code = 'DUPLICATE_CODE';
        error.statusCode = 409;
        throw error;
      }
    }

    const updated = await CompanyRepository.update(id, {
      ...data,
      code: data.code ? data.code.trim().toUpperCase() : undefined,
      updatedBy: actor.id,
    });

    if (!updated) {
      const error: any = new Error('Failed to update company record.');
      error.code = 'INTERNAL_ERROR';
      error.statusCode = 500;
      throw error;
    }

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: data.status === 'INACTIVE' && existing.status === 'ACTIVE' ? 'COMPANY_DEACTIVATED' : 'COMPANY_UPDATED',
      targetModule: 'Organization',
      targetRecordId: updated.id,
      companyId: updated.id,
      companyName: updated.name,
      ipAddress: actor.ipAddress || '127.0.0.1',
      changesSummary: `Updated company details for [${updated.code}] ${updated.name}.`,
    });

    return updated;
  }

  public static async toggleCompanyStatus(
    id: string,
    status: 'ACTIVE' | 'INACTIVE',
    actor: ServiceActor
  ): Promise<Company> {
    const existing = await CompanyRepository.findById(id);
    if (!existing) {
      const error: any = new Error(`Company with id '${id}' not found.`);
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    if (status === 'INACTIVE') {
      const { hasDependencies, reason } = await CompanyRepository.hasDependentData(id);
      if (hasDependencies) {
        const error: any = new Error(`Cannot deactivate company: ${reason} Deactivate dependent records first.`);
        error.code = 'DEPENDENCY_EXISTS';
        error.statusCode = 409;
        throw error;
      }
    }

    return this.updateCompany(id, { status }, actor);
  }

  // ==========================================
  // 2. BRANCHES
  // ==========================================
  public static async getBranches(companyId: string, search?: string, status?: 'ACTIVE' | 'INACTIVE'): Promise<Branch[]> {
    return BranchRepository.findAll({ companyId, search, status });
  }

  public static async getBranchById(id: string, companyId: string): Promise<Branch | null> {
    return BranchRepository.findById(id, companyId);
  }

  public static async createBranch(
    data: Omit<Branch, 'id' | 'createdAt' | 'updatedAt'>,
    companyId: string,
    actor: ServiceActor
  ): Promise<Branch> {
    if (!data.code || !data.name || !data.address) {
      const error: any = new Error('Missing required branch fields (code, name, address).');
      error.code = 'VALIDATION_ERROR';
      error.statusCode = 422;
      throw error;
    }

    const company = await CompanyRepository.findById(companyId);
    if (!company) {
      const error: any = new Error(`Company with id '${companyId}' not found.`);
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    if (company.status === 'INACTIVE') {
      const error: any = new Error('Cannot create branch for an inactive company.');
      error.code = 'COMPANY_INACTIVE';
      error.statusCode = 400;
      throw error;
    }

    const duplicate = await BranchRepository.findByCode(companyId, data.code);
    if (duplicate) {
      const error: any = new Error(`Branch code '${data.code.toUpperCase()}' already exists in this company.`);
      error.code = 'DUPLICATE_CODE';
      error.statusCode = 409;
      throw error;
    }

    const now = new Date().toISOString();
    const newBranch: Branch = {
      ...data,
      id: `br-${Date.now()}`,
      companyId, // Strictly authoritative tenant context
      code: data.code.trim().toUpperCase(),
      status: data.status || 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: actor.id,
    };

    const saved = await BranchRepository.create(newBranch);

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'BRANCH_CREATED',
      targetModule: 'Organization',
      targetRecordId: saved.id,
      companyId,
      companyName: company.name,
      ipAddress: actor.ipAddress || '127.0.0.1',
      changesSummary: `Created branch [${saved.code}] ${saved.name}.`,
    });

    return saved;
  }

  public static async updateBranch(
    id: string,
    data: Partial<Branch>,
    companyId: string,
    actor: ServiceActor
  ): Promise<Branch> {
    const existing = await BranchRepository.findById(id, companyId);
    if (!existing) {
      const error: any = new Error(`Branch '${id}' not found in the current company context.`);
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    if (data.code && data.code.toUpperCase() !== existing.code.toUpperCase()) {
      const duplicate = await BranchRepository.findByCode(companyId, data.code);
      if (duplicate && duplicate.id !== id) {
        const error: any = new Error(`Branch code '${data.code.toUpperCase()}' is already in use in this company.`);
        error.code = 'DUPLICATE_CODE';
        error.statusCode = 409;
        throw error;
      }
    }

    const updated = await BranchRepository.update(id, companyId, {
      ...data,
      code: data.code ? data.code.trim().toUpperCase() : undefined,
      updatedBy: actor.id,
    });

    if (!updated) {
      const error: any = new Error('Failed to update branch.');
      error.code = 'INTERNAL_ERROR';
      error.statusCode = 500;
      throw error;
    }

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: data.status === 'INACTIVE' && existing.status === 'ACTIVE' ? 'BRANCH_DEACTIVATED' : 'BRANCH_UPDATED',
      targetModule: 'Organization',
      targetRecordId: updated.id,
      companyId,
      ipAddress: actor.ipAddress || '127.0.0.1',
      changesSummary: `Updated branch [${updated.code}] ${updated.name}.`,
    });

    return updated;
  }

  public static async toggleBranchStatus(
    id: string,
    status: 'ACTIVE' | 'INACTIVE',
    companyId: string,
    actor: ServiceActor
  ): Promise<Branch> {
    if (status === 'INACTIVE') {
      const { hasDependencies, reason } = await BranchRepository.hasDependentData(id);
      if (hasDependencies) {
        const error: any = new Error(`Cannot deactivate branch: ${reason}`);
        error.code = 'DEPENDENCY_EXISTS';
        error.statusCode = 409;
        throw error;
      }
    }
    return this.updateBranch(id, { status }, companyId, actor);
  }

  // ==========================================
  // 3. DEPARTMENTS
  // ==========================================
  public static async getDepartments(companyId: string, search?: string, status?: 'ACTIVE' | 'INACTIVE'): Promise<Department[]> {
    return DepartmentRepository.findAll({ companyId, search, status });
  }

  public static async getDepartmentById(id: string, companyId: string): Promise<Department | null> {
    return DepartmentRepository.findById(id, companyId);
  }

  public static async createDepartment(
    data: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>,
    companyId: string,
    actor: ServiceActor
  ): Promise<Department> {
    if (!data.code || !data.name) {
      const error: any = new Error('Missing required department fields (code, name).');
      error.code = 'VALIDATION_ERROR';
      error.statusCode = 422;
      throw error;
    }

    const duplicate = await DepartmentRepository.findByCode(companyId, data.code);
    if (duplicate) {
      const error: any = new Error(`Department code '${data.code.toUpperCase()}' already exists in this company.`);
      error.code = 'DUPLICATE_CODE';
      error.statusCode = 409;
      throw error;
    }

    if (data.parentDepartmentId) {
      const parent = await DepartmentRepository.findById(data.parentDepartmentId, companyId);
      if (!parent) {
        const error: any = new Error('Parent department must belong to the same active company.');
        error.code = 'INVALID_PARENT_DEPARTMENT';
        error.statusCode = 400;
        throw error;
      }
    }

    const now = new Date().toISOString();
    const newDept: Department = {
      ...data,
      id: `dept-${Date.now()}`,
      companyId, // Authoritative tenant context
      code: data.code.trim().toUpperCase(),
      status: data.status || 'ACTIVE',
      employeeCount: data.employeeCount || 0,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.id,
    };

    const saved = await DepartmentRepository.create(newDept);

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'DEPARTMENT_CREATED',
      targetModule: 'Organization',
      targetRecordId: saved.id,
      companyId,
      ipAddress: actor.ipAddress || '127.0.0.1',
      changesSummary: `Created department [${saved.code}] ${saved.name}.`,
    });

    return saved;
  }

  public static async updateDepartment(
    id: string,
    data: Partial<Department>,
    companyId: string,
    actor: ServiceActor
  ): Promise<Department> {
    const existing = await DepartmentRepository.findById(id, companyId);
    if (!existing) {
      const error: any = new Error(`Department '${id}' not found in the current company.`);
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    if (data.code && data.code.toUpperCase() !== existing.code.toUpperCase()) {
      const duplicate = await DepartmentRepository.findByCode(companyId, data.code);
      if (duplicate && duplicate.id !== id) {
        const error: any = new Error(`Department code '${data.code.toUpperCase()}' is already in use in this company.`);
        error.code = 'DUPLICATE_CODE';
        error.statusCode = 409;
        throw error;
      }
    }

    if (data.parentDepartmentId) {
      if (data.parentDepartmentId === id) {
        const error: any = new Error('A department cannot be its own parent.');
        error.code = 'CIRCULAR_HIERARCHY';
        error.statusCode = 400;
        throw error;
      }

      const parent = await DepartmentRepository.findById(data.parentDepartmentId, companyId);
      if (!parent) {
        const error: any = new Error('Parent department must exist within the same company context.');
        error.code = 'INVALID_PARENT_DEPARTMENT';
        error.statusCode = 400;
        throw error;
      }

      if (DepartmentRepository.isCircular(id, data.parentDepartmentId)) {
        const error: any = new Error('Circular department hierarchy detected (e.g. Dept A -> Parent B -> Parent A).');
        error.code = 'CIRCULAR_HIERARCHY';
        error.statusCode = 400;
        throw error;
      }
    }

    const updated = await DepartmentRepository.update(id, companyId, {
      ...data,
      code: data.code ? data.code.trim().toUpperCase() : undefined,
      updatedBy: actor.id,
    });

    if (!updated) {
      const error: any = new Error('Failed to update department.');
      error.code = 'INTERNAL_ERROR';
      error.statusCode = 500;
      throw error;
    }

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: data.status === 'INACTIVE' && existing.status === 'ACTIVE' ? 'DEPARTMENT_DEACTIVATED' : 'DEPARTMENT_UPDATED',
      targetModule: 'Organization',
      targetRecordId: updated.id,
      companyId,
      ipAddress: actor.ipAddress || '127.0.0.1',
      changesSummary: `Updated department [${updated.code}] ${updated.name}.`,
    });

    return updated;
  }

  public static async toggleDepartmentStatus(
    id: string,
    status: 'ACTIVE' | 'INACTIVE',
    companyId: string,
    actor: ServiceActor
  ): Promise<Department> {
    if (status === 'INACTIVE') {
      const hasChildren = await DepartmentRepository.hasChildDepartments(id);
      if (hasChildren) {
        const error: any = new Error('Cannot deactivate department that has active sub-departments. Reassign or deactivate child departments first.');
        error.code = 'DEPENDENCY_EXISTS';
        error.statusCode = 409;
        throw error;
      }
    }
    return this.updateDepartment(id, { status }, companyId, actor);
  }

  // ==========================================
  // 4. DESIGNATIONS
  // ==========================================
  public static async getDesignations(companyId: string, search?: string, status?: 'ACTIVE' | 'INACTIVE'): Promise<Designation[]> {
    return DesignationRepository.findAll({ companyId, search, status });
  }

  public static async getDesignationById(id: string, companyId: string): Promise<Designation | null> {
    return DesignationRepository.findById(id, companyId);
  }

  public static async createDesignation(
    data: Omit<Designation, 'id' | 'createdAt' | 'updatedAt'>,
    companyId: string,
    actor: ServiceActor
  ): Promise<Designation> {
    if (!data.code || !data.name) {
      const error: any = new Error('Missing required designation fields (code, name).');
      error.code = 'VALIDATION_ERROR';
      error.statusCode = 422;
      throw error;
    }

    const duplicate = await DesignationRepository.findByCode(companyId, data.code);
    if (duplicate) {
      const error: any = new Error(`Designation code '${data.code.toUpperCase()}' already exists in this company.`);
      error.code = 'DUPLICATE_CODE';
      error.statusCode = 409;
      throw error;
    }

    const now = new Date().toISOString();
    const newDesig: Designation = {
      ...data,
      id: `desig-${Date.now()}`,
      companyId,
      code: data.code.trim().toUpperCase(),
      status: data.status || 'ACTIVE',
      employeeCount: data.employeeCount || 0,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.id,
    };

    const saved = await DesignationRepository.create(newDesig);

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'DESIGNATION_CREATED',
      targetModule: 'Organization',
      targetRecordId: saved.id,
      companyId,
      ipAddress: actor.ipAddress || '127.0.0.1',
      changesSummary: `Created designation [${saved.code}] ${saved.name}.`,
    });

    return saved;
  }

  public static async updateDesignation(
    id: string,
    data: Partial<Designation>,
    companyId: string,
    actor: ServiceActor
  ): Promise<Designation> {
    const existing = await DesignationRepository.findById(id, companyId);
    if (!existing) {
      const error: any = new Error(`Designation '${id}' not found in the current company.`);
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    if (data.code && data.code.toUpperCase() !== existing.code.toUpperCase()) {
      const duplicate = await DesignationRepository.findByCode(companyId, data.code);
      if (duplicate && duplicate.id !== id) {
        const error: any = new Error(`Designation code '${data.code.toUpperCase()}' is already in use in this company.`);
        error.code = 'DUPLICATE_CODE';
        error.statusCode = 409;
        throw error;
      }
    }

    const updated = await DesignationRepository.update(id, companyId, {
      ...data,
      code: data.code ? data.code.trim().toUpperCase() : undefined,
      updatedBy: actor.id,
    });

    if (!updated) {
      const error: any = new Error('Failed to update designation.');
      error.code = 'INTERNAL_ERROR';
      error.statusCode = 500;
      throw error;
    }

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: data.status === 'INACTIVE' && existing.status === 'ACTIVE' ? 'DESIGNATION_DEACTIVATED' : 'DESIGNATION_UPDATED',
      targetModule: 'Organization',
      targetRecordId: updated.id,
      companyId,
      ipAddress: actor.ipAddress || '127.0.0.1',
      changesSummary: `Updated designation [${updated.code}] ${updated.name}.`,
    });

    return updated;
  }

  // ==========================================
  // 5. WORK LOCATIONS
  // ==========================================
  public static async getWorkLocations(
    companyId: string,
    search?: string,
    status?: 'ACTIVE' | 'INACTIVE',
    branchId?: string
  ): Promise<WorkLocation[]> {
    return WorkLocationRepository.findAll({ companyId, search, status, branchId });
  }

  public static async getWorkLocationById(id: string, companyId: string): Promise<WorkLocation | null> {
    return WorkLocationRepository.findById(id, companyId);
  }

  public static async createWorkLocation(
    data: Omit<WorkLocation, 'id' | 'createdAt' | 'updatedAt'>,
    companyId: string,
    actor: ServiceActor
  ): Promise<WorkLocation> {
    if (!data.code || !data.name || !data.address || !data.city || !data.country) {
      const error: any = new Error('Missing required work location fields (code, name, address, city, country).');
      error.code = 'VALIDATION_ERROR';
      error.statusCode = 422;
      throw error;
    }

    const duplicate = await WorkLocationRepository.findByCode(companyId, data.code);
    if (duplicate) {
      const error: any = new Error(`Work location code '${data.code.toUpperCase()}' already exists in this company.`);
      error.code = 'DUPLICATE_CODE';
      error.statusCode = 409;
      throw error;
    }

    if (data.branchId) {
      const branch = await BranchRepository.findById(data.branchId, companyId);
      if (!branch) {
        const error: any = new Error('Selected branch does not belong to the active company.');
        error.code = 'INVALID_BRANCH';
        error.statusCode = 400;
        throw error;
      }
    }

    const now = new Date().toISOString();
    const newLoc: WorkLocation = {
      ...data,
      id: `wl-${Date.now()}`,
      companyId,
      code: data.code.trim().toUpperCase(),
      status: data.status || 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: actor.id,
    };

    const saved = await WorkLocationRepository.create(newLoc);

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'WORK_LOCATION_CREATED',
      targetModule: 'Organization',
      targetRecordId: saved.id,
      companyId,
      ipAddress: actor.ipAddress || '127.0.0.1',
      changesSummary: `Created work location [${saved.code}] ${saved.name}.`,
    });

    return saved;
  }

  public static async updateWorkLocation(
    id: string,
    data: Partial<WorkLocation>,
    companyId: string,
    actor: ServiceActor
  ): Promise<WorkLocation> {
    const existing = await WorkLocationRepository.findById(id, companyId);
    if (!existing) {
      const error: any = new Error(`Work location '${id}' not found in the current company.`);
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    if (data.code && data.code.toUpperCase() !== existing.code.toUpperCase()) {
      const duplicate = await WorkLocationRepository.findByCode(companyId, data.code);
      if (duplicate && duplicate.id !== id) {
        const error: any = new Error(`Work location code '${data.code.toUpperCase()}' is already in use in this company.`);
        error.code = 'DUPLICATE_CODE';
        error.statusCode = 409;
        throw error;
      }
    }

    if (data.branchId) {
      const branch = await BranchRepository.findById(data.branchId, companyId);
      if (!branch) {
        const error: any = new Error('Selected branch does not belong to the active company.');
        error.code = 'INVALID_BRANCH';
        error.statusCode = 400;
        throw error;
      }
    }

    const updated = await WorkLocationRepository.update(id, companyId, {
      ...data,
      code: data.code ? data.code.trim().toUpperCase() : undefined,
      updatedBy: actor.id,
    });

    if (!updated) {
      const error: any = new Error('Failed to update work location.');
      error.code = 'INTERNAL_ERROR';
      error.statusCode = 500;
      throw error;
    }

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: data.status === 'INACTIVE' && existing.status === 'ACTIVE' ? 'WORK_LOCATION_DEACTIVATED' : 'WORK_LOCATION_UPDATED',
      targetModule: 'Organization',
      targetRecordId: updated.id,
      companyId,
      ipAddress: actor.ipAddress || '127.0.0.1',
      changesSummary: `Updated work location [${updated.code}] ${updated.name}.`,
    });

    return updated;
  }

  // ==========================================
  // 6. HOLIDAYS
  // ==========================================
  public static async getHolidays(
    companyId: string,
    year?: number,
    workLocationId?: string,
    search?: string,
    status?: 'ACTIVE' | 'INACTIVE'
  ): Promise<Holiday[]> {
    return HolidayRepository.findAll({ companyId, year, workLocationId, search, status });
  }

  public static async getHolidayById(id: string, companyId: string): Promise<Holiday | null> {
    return HolidayRepository.findById(id, companyId);
  }

  public static async createHoliday(
    data: Omit<Holiday, 'id' | 'createdAt' | 'updatedAt'>,
    companyId: string,
    actor: ServiceActor
  ): Promise<Holiday> {
    if (!data.name || !data.date || !data.type) {
      const error: any = new Error('Missing required holiday fields (name, date, type).');
      error.code = 'VALIDATION_ERROR';
      error.statusCode = 422;
      throw error;
    }

    if (data.workLocationId) {
      const loc = await WorkLocationRepository.findById(data.workLocationId, companyId);
      if (!loc) {
        const error: any = new Error('Selected work location does not belong to the active company.');
        error.code = 'INVALID_WORK_LOCATION';
        error.statusCode = 400;
        throw error;
      }
    }

    const duplicate = await HolidayRepository.findDuplicate(companyId, data.date, data.name);
    if (duplicate) {
      const error: any = new Error(`Holiday '${data.name}' is already configured for date ${data.date} in this company.`);
      error.code = 'DUPLICATE_HOLIDAY';
      error.statusCode = 409;
      throw error;
    }

    const now = new Date().toISOString();
    const newHoliday: Holiday = {
      ...data,
      id: `hol-${Date.now()}`,
      companyId,
      status: data.status || 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: actor.id,
    };

    const saved = await HolidayRepository.create(newHoliday);

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'HOLIDAY_CREATED',
      targetModule: 'Organization',
      targetRecordId: saved.id,
      companyId,
      ipAddress: actor.ipAddress || '127.0.0.1',
      changesSummary: `Added ${saved.type} holiday '${saved.name}' on ${saved.date}.`,
    });

    return saved;
  }

  public static async updateHoliday(
    id: string,
    data: Partial<Holiday>,
    companyId: string,
    actor: ServiceActor
  ): Promise<Holiday> {
    const existing = await HolidayRepository.findById(id, companyId);
    if (!existing) {
      const error: any = new Error(`Holiday '${id}' not found in the current company.`);
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    if (data.date || data.name) {
      const checkDate = data.date || existing.date;
      const checkName = data.name || existing.name;
      const duplicate = await HolidayRepository.findDuplicate(companyId, checkDate, checkName, id);
      if (duplicate) {
        const error: any = new Error(`Holiday '${checkName}' is already configured for date ${checkDate}.`);
        error.code = 'DUPLICATE_HOLIDAY';
        error.statusCode = 409;
        throw error;
      }
    }

    if (data.workLocationId) {
      const loc = await WorkLocationRepository.findById(data.workLocationId, companyId);
      if (!loc) {
        const error: any = new Error('Selected work location does not belong to the active company.');
        error.code = 'INVALID_WORK_LOCATION';
        error.statusCode = 400;
        throw error;
      }
    }

    const updated = await HolidayRepository.update(id, companyId, {
      ...data,
      updatedBy: actor.id,
    });

    if (!updated) {
      const error: any = new Error('Failed to update holiday.');
      error.code = 'INTERNAL_ERROR';
      error.statusCode = 500;
      throw error;
    }

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'HOLIDAY_UPDATED',
      targetModule: 'Organization',
      targetRecordId: updated.id,
      companyId,
      ipAddress: actor.ipAddress || '127.0.0.1',
      changesSummary: `Updated holiday '${updated.name}' (${updated.date}).`,
    });

    return updated;
  }

  public static async deleteHoliday(id: string, companyId: string, actor: ServiceActor): Promise<boolean> {
    const existing = await HolidayRepository.findById(id, companyId);
    if (!existing) {
      const error: any = new Error(`Holiday '${id}' not found in current company.`);
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    const deleted = await HolidayRepository.delete(id, companyId);
    if (deleted) {
      await AuditService.log({
        actorId: actor.id,
        actorName: actor.name,
        actorEmail: actor.email,
        action: 'HOLIDAY_DELETED',
        targetModule: 'Organization',
        targetRecordId: id,
        companyId,
        ipAddress: actor.ipAddress || '127.0.0.1',
        changesSummary: `Removed holiday '${existing.name}' on ${existing.date}.`,
      });
    }
    return deleted;
  }
}
