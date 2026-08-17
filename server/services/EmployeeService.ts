import {
  Employee,
  EmployeeFullProfile,
  EmployeeDirectoryItem,
  CreateEmployeeDTO,
  UpdateEmployeeDTO,
  CreateAssignmentChangeDTO,
  UpdateEmployeeStatusDTO,
  EmployeeFilterOptions,
  EmployeeAssignment,
  EmployeeAddress,
  EmployeeEmergencyContact,
  EmployeeBankAccount,
  EmployeeStatutoryDetails,
  EmployeeDocument,
  EmployeeStatusHistory,
} from '../../src/types/employee.js';
import { AuthUser, PermissionKey, UserRole } from '../../src/types/auth.js';
import { RelationalDatabase } from '../database/RelationalDatabase.js';
import { EmployeeRepository } from '../database/repositories/EmployeeRepository.js';
import { EmployeeAssignmentRepository } from '../database/repositories/EmployeeAssignmentRepository.js';
import { EmployeeAddressRepository } from '../database/repositories/EmployeeAddressRepository.js';
import { EmployeeEmergencyContactRepository } from '../database/repositories/EmployeeEmergencyContactRepository.js';
import { EmployeeBankAccountRepository } from '../database/repositories/EmployeeBankAccountRepository.js';
import { EmployeeStatutoryRepository } from '../database/repositories/EmployeeStatutoryRepository.js';
import { EmployeeDocumentRepository } from '../database/repositories/EmployeeDocumentRepository.js';
import { EmployeeStatusHistoryRepository } from '../database/repositories/EmployeeStatusHistoryRepository.js';
import { BranchRepository } from '../database/repositories/BranchRepository.js';
import { DepartmentRepository } from '../database/repositories/DepartmentRepository.js';
import { DesignationRepository } from '../database/repositories/DesignationRepository.js';
import { WorkLocationRepository } from '../database/repositories/WorkLocationRepository.js';
import { CompanyRepository } from '../database/repositories/CompanyRepository.js';
import { AuditService } from './AuditService.js';

export class AppError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, code: string = 'VALIDATION_ERROR', statusCode: number = 400) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class EmployeeService {
  /**
   * 1. Get Paginated Directory Listing with Security Scoping
   */
  public static async getDirectory(
    companyId: string,
    filters: EmployeeFilterOptions,
    actor: AuthUser
  ): Promise<{ items: EmployeeDirectoryItem[]; total: number }> {
    let managerScopeIds: string[] | undefined = undefined;

    // If actor is MANAGER without global HR/Admin employee management permission
    if (
      actor.role === UserRole.MANAGER &&
      !actor.permissions.includes(PermissionKey.EMPLOYEE_MANAGE)
    ) {
      if (actor.employeeCode) {
        const emp = await EmployeeRepository.findByCode(companyId, actor.employeeCode);
        if (emp) {
          const subordinates = await EmployeeAssignmentRepository.getAllSubordinateIds(emp.id);
          managerScopeIds = [emp.id, ...subordinates];
        }
      }
    }

    return EmployeeRepository.findDirectory(companyId, filters, managerScopeIds);
  }

  /**
   * 2. Get Comprehensive Full Profile with Sensitive Data Protection
   */
  public static async getProfile(
    id: string,
    companyId: string,
    actor: AuthUser
  ): Promise<EmployeeFullProfile | null> {
    const employee = await EmployeeRepository.findById(id, companyId);
    if (!employee) return null;

    const currentAssignment = await EmployeeAssignmentRepository.findCurrentAssignment(id);
    const assignmentHistory = await EmployeeAssignmentRepository.findHistory(id);
    const addresses = await EmployeeAddressRepository.findByEmployeeId(id);
    const emergencyContacts = await EmployeeEmergencyContactRepository.findByEmployeeId(id);
    const rawBank = await EmployeeBankAccountRepository.findByEmployeeId(id);
    const rawStatutory = await EmployeeStatutoryRepository.findByEmployeeId(id);
    const documents = await EmployeeDocumentRepository.findByEmployeeId(id);
    const statusHistory = await EmployeeStatusHistoryRepository.findByEmployeeId(id);

    // Permission check for sensitive fields
    const hasSensitiveAccess =
      actor.role === UserRole.SUPER_ADMIN ||
      actor.role === UserRole.HR_ADMIN ||
      actor.role === UserRole.PAYROLL_MANAGER ||
      actor.permissions.includes(PermissionKey.EMPLOYEE_SENSITIVE_VIEW) ||
      (actor.employeeCode && actor.employeeCode === employee.employeeCode);

    // Mask bank and statutory details if actor lacks sensitive access
    let bankAccount: EmployeeBankAccount | null = null;
    if (rawBank) {
      bankAccount = hasSensitiveAccess
        ? rawBank
        : {
            ...rawBank,
            accountNumber: EmployeeBankAccountRepository.maskAccountNumber(rawBank.accountNumber),
          };
    }

    let statutoryDetails: EmployeeStatutoryDetails | null = null;
    if (rawStatutory) {
      statutoryDetails = hasSensitiveAccess
        ? rawStatutory
        : {
            ...rawStatutory,
            panNumber: EmployeeStatutoryRepository.maskValue(rawStatutory.panNumber),
            aadhaarNumber: EmployeeStatutoryRepository.maskValue(rawStatutory.aadhaarNumber),
            uanNumber: EmployeeStatutoryRepository.maskValue(rawStatutory.uanNumber),
            pfNumber: EmployeeStatutoryRepository.maskValue(rawStatutory.pfNumber),
            esiNumber: EmployeeStatutoryRepository.maskValue(rawStatutory.esiNumber),
          };
    }

    return {
      employee,
      currentAssignment,
      assignmentHistory,
      addresses,
      emergencyContacts,
      bankAccount,
      statutoryDetails,
      documents,
      statusHistory,
      hasSensitiveAccess,
    };
  }

  /**
   * 3. Transactional Add Employee Creation Wizard
   */
  public static async createEmployee(
    dto: CreateEmployeeDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<EmployeeFullProfile> {
    // 1. Mandatory validations
    if (!dto.employeeCode?.trim()) throw new AppError('Employee Code is required.', 'VALIDATION_ERROR', 400);
    if (!dto.firstName?.trim()) throw new AppError('First Name is required.', 'VALIDATION_ERROR', 400);
    if (!dto.lastName?.trim()) throw new AppError('Last Name is required.', 'VALIDATION_ERROR', 400);
    if (!dto.gender) throw new AppError('Gender is required.', 'VALIDATION_ERROR', 400);
    if (!dto.dateOfBirth) throw new AppError('Date of Birth is required.', 'VALIDATION_ERROR', 400);
    if (!dto.joiningDate) throw new AppError('Joining Date is required.', 'VALIDATION_ERROR', 400);
    if (!dto.workEmail?.trim()) throw new AppError('Work Email is required.', 'VALIDATION_ERROR', 400);
    if (!dto.mobileNumber?.trim()) throw new AppError('Mobile Number is required.', 'VALIDATION_ERROR', 400);
    if (!dto.branchId) throw new AppError('Branch is required.', 'VALIDATION_ERROR', 400);
    if (!dto.departmentId) throw new AppError('Department is required.', 'VALIDATION_ERROR', 400);
    if (!dto.designationId) throw new AppError('Designation is required.', 'VALIDATION_ERROR', 400);
    if (!dto.workLocationId) throw new AppError('Work Location is required.', 'VALIDATION_ERROR', 400);

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(dto.workEmail)) {
      throw new AppError('Invalid work email address format.', 'VALIDATION_ERROR', 400);
    }
    if (dto.personalEmail && !emailRegex.test(dto.personalEmail)) {
      throw new AppError('Invalid personal email address format.', 'VALIDATION_ERROR', 400);
    }

    // 2. Uniqueness check: Employee Code in Company
    const existingCode = await EmployeeRepository.findByCode(companyId, dto.employeeCode);
    if (existingCode) {
      throw new AppError(`Employee Code '${dto.employeeCode}' already exists in this company.`, 'DUPLICATE_EMPLOYEE_CODE', 400);
    }

    // 3. Uniqueness check: Work Email
    const existingEmail = await EmployeeRepository.findByWorkEmail(dto.workEmail);
    if (existingEmail) {
      throw new AppError(`Work email '${dto.workEmail}' is already registered with another employee.`, 'DUPLICATE_WORK_EMAIL', 400);
    }

    // 4. Validate Organization Master references belong to company
    const branch = await BranchRepository.findById(dto.branchId);
    if (!branch || branch.companyId !== companyId) {
      throw new AppError('Selected Branch is invalid or does not belong to this company.', 'INVALID_ORGANIZATION_REFERENCE', 400);
    }

    const dept = await DepartmentRepository.findById(dto.departmentId);
    if (!dept || dept.companyId !== companyId) {
      throw new AppError('Selected Department is invalid or does not belong to this company.', 'INVALID_ORGANIZATION_REFERENCE', 400);
    }

    const desig = await DesignationRepository.findById(dto.designationId);
    if (!desig || desig.companyId !== companyId) {
      throw new AppError('Selected Designation is invalid or does not belong to this company.', 'INVALID_ORGANIZATION_REFERENCE', 400);
    }

    const workLoc = await WorkLocationRepository.findById(dto.workLocationId);
    if (!workLoc || workLoc.companyId !== companyId) {
      throw new AppError('Selected Work Location is invalid or does not belong to this company.', 'INVALID_ORGANIZATION_REFERENCE', 400);
    }

    // 5. Validate Manager if specified
    if (dto.managerId) {
      const manager = await EmployeeRepository.findById(dto.managerId, companyId);
      if (!manager) {
        throw new AppError('Selected Reporting Manager does not exist in this company.', 'INVALID_MANAGER', 400);
      }
    }

    const employeeId = `emp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const displayName = dto.displayName?.trim() || `${dto.firstName.trim()}${dto.middleName ? ' ' + dto.middleName.trim() : ''} ${dto.lastName.trim()}`;

    try {
      const newEmployee: Employee = {
        id: employeeId,
        companyId,
        employeeCode: dto.employeeCode.trim().toUpperCase(),
        firstName: dto.firstName.trim(),
        middleName: dto.middleName?.trim() || undefined,
        lastName: dto.lastName.trim(),
        displayName,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth,
        maritalStatus: dto.maritalStatus,
        nationality: dto.nationality?.trim() || 'Indian',
        bloodGroup: dto.bloodGroup?.trim() || undefined,
        personalEmail: dto.personalEmail?.trim() || undefined,
        workEmail: dto.workEmail.trim().toLowerCase(),
        mobileNumber: dto.mobileNumber.trim(),
        joiningDate: dto.joiningDate,
        probationPeriodMonths: dto.probationPeriodMonths ?? 3,
        noticePeriodDays: dto.noticePeriodDays ?? 30,
        employmentType: dto.employmentType || 'FULL_TIME',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: actor.id,
        updatedBy: actor.id,
      };

      // Save Employee Master
      await EmployeeRepository.create(newEmployee);

      // Initial Assignment
      const initialAssignment: EmployeeAssignment = {
        id: `asg-${Date.now()}-1`,
        employeeId,
        companyId,
        branchId: dto.branchId,
        departmentId: dto.departmentId,
        designationId: dto.designationId,
        workLocationId: dto.workLocationId,
        managerId: dto.managerId || undefined,
        effectiveFrom: dto.joiningDate,
        effectiveTo: undefined,
        changeReason: 'INITIAL_JOINING',
        notes: 'Initial assignment upon employee onboarding.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: actor.id,
      };
      await EmployeeAssignmentRepository.create(initialAssignment);

      // Addresses
      const addressesToSave: EmployeeAddress[] = [];
      if (dto.currentAddress && dto.currentAddress.addressLine1) {
        addressesToSave.push({
          id: `addr-${Date.now()}-cur`,
          employeeId,
          type: 'CURRENT',
          addressLine1: dto.currentAddress.addressLine1.trim(),
          addressLine2: dto.currentAddress.addressLine2?.trim(),
          city: dto.currentAddress.city.trim(),
          state: dto.currentAddress.state.trim(),
          country: dto.currentAddress.country?.trim() || 'India',
          postalCode: dto.currentAddress.postalCode.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      if (dto.permanentAddress && dto.permanentAddress.addressLine1) {
        addressesToSave.push({
          id: `addr-${Date.now()}-perm`,
          employeeId,
          type: 'PERMANENT',
          addressLine1: dto.permanentAddress.addressLine1.trim(),
          addressLine2: dto.permanentAddress.addressLine2?.trim(),
          city: dto.permanentAddress.city.trim(),
          state: dto.permanentAddress.state.trim(),
          country: dto.permanentAddress.country?.trim() || 'India',
          postalCode: dto.permanentAddress.postalCode.trim(),
          isSameAsCurrent: dto.permanentAddress.isSameAsCurrent,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      if (addressesToSave.length > 0) {
        await EmployeeAddressRepository.saveAddresses(employeeId, addressesToSave);
      }

      // Emergency Contact
      if (dto.emergencyContact && dto.emergencyContact.contactName) {
        await EmployeeEmergencyContactRepository.create({
          id: `emg-${Date.now()}`,
          employeeId,
          contactName: dto.emergencyContact.contactName.trim(),
          relationship: dto.emergencyContact.relationship.trim(),
          phoneNumber: dto.emergencyContact.phoneNumber.trim(),
          alternatePhone: dto.emergencyContact.alternatePhone?.trim(),
          email: dto.emergencyContact.email?.trim(),
          isPrimary: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      // Bank Account
      if (dto.bankAccount && dto.bankAccount.accountNumber) {
        await EmployeeBankAccountRepository.create({
          id: `bnk-${Date.now()}`,
          employeeId,
          accountHolderName: dto.bankAccount.accountHolderName?.trim() || displayName,
          bankName: dto.bankAccount.bankName.trim(),
          accountNumber: dto.bankAccount.accountNumber.trim(),
          ifscCode: dto.bankAccount.ifscCode.trim().toUpperCase(),
          branchName: dto.bankAccount.branchName?.trim(),
          accountType: dto.bankAccount.accountType || 'SAVINGS',
          isPrimary: true,
          isVerified: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: actor.id,
        });
      }

      // Statutory Details
      if (dto.statutoryDetails && (dto.statutoryDetails.panNumber || dto.statutoryDetails.aadhaarNumber || dto.statutoryDetails.uanNumber)) {
        await EmployeeStatutoryRepository.create({
          id: `stat-${Date.now()}`,
          employeeId,
          panNumber: dto.statutoryDetails.panNumber?.trim().toUpperCase(),
          aadhaarNumber: dto.statutoryDetails.aadhaarNumber?.trim(),
          uanNumber: dto.statutoryDetails.uanNumber?.trim(),
          pfNumber: dto.statutoryDetails.pfNumber?.trim(),
          esiNumber: dto.statutoryDetails.esiNumber?.trim(),
          taxRegime: dto.statutoryDetails.taxRegime || 'NEW',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: actor.id,
        });
      }

      // Documents
      if (dto.documents && dto.documents.length > 0) {
        for (let i = 0; i < dto.documents.length; i++) {
          const d = dto.documents[i];
          await EmployeeDocumentRepository.create({
            id: `doc-${Date.now()}-${i}`,
            employeeId,
            companyId,
            documentType: d.documentType,
            title: d.title.trim(),
            fileName: d.fileName.trim(),
            fileSizeBytes: d.fileSizeBytes || 1024,
            mimeType: d.mimeType || 'application/pdf',
            storagePath: d.storagePath || `/uploads/${companyId}/${employeeId}/${d.fileName}`,
            issueDate: d.issueDate,
            expiryDate: d.expiryDate,
            verificationStatus: 'PENDING',
            notes: d.notes?.trim(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: actor.id,
          });
        }
      }

      // Status History
      await EmployeeStatusHistoryRepository.create({
        id: `sth-${Date.now()}`,
        employeeId,
        previousStatus: 'ACTIVE',
        newStatus: 'ACTIVE',
        effectiveDate: dto.joiningDate,
        reason: 'NEW_HIRE_ONBOARDING',
        comments: 'Initial employee master creation.',
        createdAt: new Date().toISOString(),
        createdBy: actor.id,
      });

      // Audit Log
      const company = await CompanyRepository.findById(companyId);
      await AuditService.log({
        actorId: actor.id,
        actorName: actor.fullName,
        actorEmail: actor.email,
        action: 'EMPLOYEE_CREATED',
        targetModule: 'Employee Core',
        targetRecordId: employeeId,
        companyId,
        companyName: company?.name || companyId,
        ipAddress: '127.0.0.1',
        changesSummary: `Created employee [${newEmployee.employeeCode}] ${newEmployee.displayName} with initial assignment.`,
      });

      const profile = await this.getProfile(employeeId, companyId, actor);
      return profile!;
    } catch (err: any) {
      // Perform complete atomic transactional rollback
      RelationalDatabase.getInstance().rollbackEmployee(employeeId);
      if (err instanceof AppError) {
        throw err;
      }
      throw new AppError(err?.message || 'Failed to create employee transactionally.', 'TRANSACTION_FAILED', 400);
    }
  }

  /**
   * 4. Update Employee Master & Linked Profile Details
   */
  public static async updateEmployee(
    id: string,
    dto: UpdateEmployeeDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<EmployeeFullProfile> {
    const existing = await EmployeeRepository.findById(id, companyId);
    if (!existing) {
      throw new Error(`Employee with ID '${id}' not found in this company.`);
    }

    // If work email changes, verify uniqueness
    if (dto.workEmail && dto.workEmail.toLowerCase() !== existing.workEmail.toLowerCase()) {
      const emailCheck = await EmployeeRepository.findByWorkEmail(dto.workEmail);
      if (emailCheck && emailCheck.id !== id) {
        throw new Error(`Work email '${dto.workEmail}' is already registered with another employee.`);
      }
    }

    let displayName = existing.displayName;
    if (dto.firstName || dto.lastName || dto.middleName !== undefined) {
      const fName = dto.firstName?.trim() || existing.firstName;
      const mName = dto.middleName !== undefined ? dto.middleName?.trim() : existing.middleName;
      const lName = dto.lastName?.trim() || existing.lastName;
      displayName = dto.displayName?.trim() || `${fName}${mName ? ' ' + mName : ''} ${lName}`;
    }

    const employeeUpdates: Partial<Employee> = {
      ...(dto.firstName && { firstName: dto.firstName.trim() }),
      ...(dto.middleName !== undefined && { middleName: dto.middleName?.trim() || undefined }),
      ...(dto.lastName && { lastName: dto.lastName.trim() }),
      displayName,
      ...(dto.gender && { gender: dto.gender }),
      ...(dto.dateOfBirth && { dateOfBirth: dto.dateOfBirth }),
      ...(dto.maritalStatus && { maritalStatus: dto.maritalStatus }),
      ...(dto.nationality && { nationality: dto.nationality.trim() }),
      ...(dto.bloodGroup !== undefined && { bloodGroup: dto.bloodGroup?.trim() || undefined }),
      ...(dto.personalEmail !== undefined && { personalEmail: dto.personalEmail?.trim() || undefined }),
      ...(dto.workEmail && { workEmail: dto.workEmail.trim().toLowerCase() }),
      ...(dto.mobileNumber && { mobileNumber: dto.mobileNumber.trim() }),
      ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      ...(dto.joiningDate && { joiningDate: dto.joiningDate }),
      ...(dto.confirmationDate !== undefined && { confirmationDate: dto.confirmationDate }),
      ...(dto.probationPeriodMonths !== undefined && { probationPeriodMonths: dto.probationPeriodMonths }),
      ...(dto.noticePeriodDays !== undefined && { noticePeriodDays: dto.noticePeriodDays }),
      ...(dto.employmentType && { employmentType: dto.employmentType }),
      updatedBy: actor.id,
    };

    await EmployeeRepository.update(id, employeeUpdates);

    // Update Addresses if provided
    if (dto.addresses && dto.addresses.length > 0) {
      const addressEntities: EmployeeAddress[] = dto.addresses.map((a, i) => ({
        id: `addr-${Date.now()}-${i}`,
        employeeId: id,
        type: a.type,
        addressLine1: a.addressLine1.trim(),
        addressLine2: a.addressLine2?.trim(),
        city: a.city.trim(),
        state: a.state.trim(),
        country: a.country?.trim() || 'India',
        postalCode: a.postalCode.trim(),
        isSameAsCurrent: a.isSameAsCurrent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      await EmployeeAddressRepository.saveAddresses(id, addressEntities);
    }

    // Update Emergency Contacts if provided
    if (dto.emergencyContacts && dto.emergencyContacts.length > 0) {
      const contactEntities: EmployeeEmergencyContact[] = dto.emergencyContacts.map((c, i) => ({
        id: `emg-${Date.now()}-${i}`,
        employeeId: id,
        contactName: c.contactName.trim(),
        relationship: c.relationship.trim(),
        phoneNumber: c.phoneNumber.trim(),
        alternatePhone: c.alternatePhone?.trim(),
        email: c.email?.trim(),
        isPrimary: c.isPrimary ?? i === 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      await EmployeeEmergencyContactRepository.saveContacts(id, contactEntities);
    }

    // Update Bank Account if provided (and actor has permission)
    if (dto.bankAccount) {
      const hasBankPerm =
        actor.role === UserRole.SUPER_ADMIN ||
        actor.role === UserRole.HR_ADMIN ||
        actor.role === UserRole.PAYROLL_MANAGER ||
        actor.permissions.includes(PermissionKey.EMPLOYEE_MANAGE);

      if (!hasBankPerm) {
        throw new Error('Unauthorized to modify employee bank account details.');
      }

      await EmployeeBankAccountRepository.saveForEmployee(id, {
        id: `bnk-${Date.now()}`,
        employeeId: id,
        accountHolderName: dto.bankAccount.accountHolderName.trim(),
        bankName: dto.bankAccount.bankName.trim(),
        accountNumber: dto.bankAccount.accountNumber.trim(),
        ifscCode: dto.bankAccount.ifscCode.trim().toUpperCase(),
        branchName: dto.bankAccount.branchName?.trim(),
        accountType: dto.bankAccount.accountType || 'SAVINGS',
        isPrimary: true,
        isVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: actor.id,
      });
    }

    // Update Statutory Details if provided
    if (dto.statutoryDetails) {
      const hasStatPerm =
        actor.role === UserRole.SUPER_ADMIN ||
        actor.role === UserRole.HR_ADMIN ||
        actor.role === UserRole.PAYROLL_MANAGER ||
        actor.permissions.includes(PermissionKey.EMPLOYEE_MANAGE);

      if (!hasStatPerm) {
        throw new Error('Unauthorized to modify employee statutory details.');
      }

      await EmployeeStatutoryRepository.saveForEmployee(id, {
        id: `stat-${Date.now()}`,
        employeeId: id,
        panNumber: dto.statutoryDetails.panNumber?.trim().toUpperCase(),
        aadhaarNumber: dto.statutoryDetails.aadhaarNumber?.trim(),
        uanNumber: dto.statutoryDetails.uanNumber?.trim(),
        pfNumber: dto.statutoryDetails.pfNumber?.trim(),
        esiNumber: dto.statutoryDetails.esiNumber?.trim(),
        taxRegime: dto.statutoryDetails.taxRegime || 'NEW',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: actor.id,
      });
    }

    // Audit Log
    const company = await CompanyRepository.findById(companyId);
    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: 'EMPLOYEE_UPDATED',
      targetModule: 'Employee Core',
      targetRecordId: id,
      companyId,
      companyName: company?.name || companyId,
      ipAddress: '127.0.0.1',
      changesSummary: `Updated profile details for employee [${existing.employeeCode}] ${displayName}.`,
    });

    const updatedProfile = await this.getProfile(id, companyId, actor);
    return updatedProfile!;
  }

  /**
   * 5. Effective-Dated Organization Assignment Change (Promotions, Transfers, Reporting Hierarchy)
   */
  public static async createAssignmentChange(
    employeeId: string,
    dto: CreateAssignmentChangeDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<EmployeeFullProfile> {
    const employee = await EmployeeRepository.findById(employeeId, companyId);
    if (!employee) {
      throw new Error(`Employee with ID '${employeeId}' not found.`);
    }

    if (!dto.effectiveFrom) throw new Error('Effective From date is required.');
    if (!dto.changeReason?.trim()) throw new Error('Change Reason is required.');
    if (!dto.branchId) throw new Error('Branch is required.');
    if (!dto.departmentId) throw new Error('Department is required.');
    if (!dto.designationId) throw new Error('Designation is required.');
    if (!dto.workLocationId) throw new Error('Work Location is required.');

    // Validate foreign references
    const branch = await BranchRepository.findById(dto.branchId);
    if (!branch || branch.companyId !== companyId) {
      throw new Error('Selected Branch does not belong to this company.');
    }

    const dept = await DepartmentRepository.findById(dto.departmentId);
    if (!dept || dept.companyId !== companyId) {
      throw new Error('Selected Department does not belong to this company.');
    }

    const desig = await DesignationRepository.findById(dto.designationId);
    if (!desig || desig.companyId !== companyId) {
      throw new Error('Selected Designation does not belong to this company.');
    }

    const workLoc = await WorkLocationRepository.findById(dto.workLocationId);
    if (!workLoc || workLoc.companyId !== companyId) {
      throw new Error('Selected Work Location does not belong to this company.');
    }

    // Manager Circularity Check
    if (dto.managerId) {
      if (dto.managerId === employeeId) {
        throw new AppError('An employee cannot be assigned as their own reporting manager.', 'INVALID_MANAGER', 400);
      }
      const manager = await EmployeeRepository.findById(dto.managerId, companyId);
      if (!manager) {
        throw new AppError('Selected Reporting Manager does not belong to this company.', 'INVALID_MANAGER', 400);
      }

      const isCircular = await EmployeeAssignmentRepository.isCircularManager(employeeId, dto.managerId);
      if (isCircular) {
        throw new AppError(
          `Circular manager relationship detected: '${manager.displayName}' currently reports to this employee directly or indirectly.`,
          'CIRCULAR_MANAGER_HIERARCHY',
          400
        );
      }
    }

    // Terminate current assignment's effectiveTo date and check date sequencing
    const currentAssign = await EmployeeAssignmentRepository.findCurrentAssignment(employeeId);
    if (currentAssign) {
      if (new Date(dto.effectiveFrom) <= new Date(currentAssign.effectiveFrom)) {
        throw new AppError(
          `Effective date '${dto.effectiveFrom}' must be strictly after current assignment start date '${currentAssign.effectiveFrom}'. Overlapping or retroactive active assignments are not permitted.`,
          'INVALID_ASSIGNMENT_DATE',
          400
        );
      }

      // Calculate previous date for effectiveTo
      const prevEffectiveDate = new Date(dto.effectiveFrom);
      prevEffectiveDate.setDate(prevEffectiveDate.getDate() - 1);
      const effectiveToDateStr = prevEffectiveDate.toISOString().slice(0, 10);

      await EmployeeAssignmentRepository.update(currentAssign.id, {
        effectiveTo: effectiveToDateStr,
      });
    }

    // Create new active assignment
    const newAssignment: EmployeeAssignment = {
      id: `asg-${Date.now()}`,
      employeeId,
      companyId,
      branchId: dto.branchId,
      departmentId: dto.departmentId,
      designationId: dto.designationId,
      workLocationId: dto.workLocationId,
      managerId: dto.managerId || undefined,
      effectiveFrom: dto.effectiveFrom,
      effectiveTo: undefined, // active
      changeReason: dto.changeReason.trim(),
      notes: dto.notes?.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: actor.id,
    };

    await EmployeeAssignmentRepository.create(newAssignment);

    // Audit Log
    const company = await CompanyRepository.findById(companyId);
    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: 'EMPLOYEE_ASSIGNMENT_CHANGED',
      targetModule: 'Employee Core',
      targetRecordId: employeeId,
      companyId,
      companyName: company?.name || companyId,
      ipAddress: '127.0.0.1',
      changesSummary: `Assignment updated for employee [${employee.employeeCode}]. Reason: ${dto.changeReason}. Effective: ${dto.effectiveFrom}.`,
    });

    const updatedProfile = await this.getProfile(employeeId, companyId, actor);
    return updatedProfile!;
  }

  /**
   * 6. Controlled Status Lifecycle Update (Probation, Active, Leave, Notice Period, Resigned, Suspended)
   */
  public static async updateStatus(
    employeeId: string,
    dto: UpdateEmployeeStatusDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<EmployeeFullProfile> {
    const employee = await EmployeeRepository.findById(employeeId, companyId);
    if (!employee) {
      throw new Error(`Employee with ID '${employeeId}' not found.`);
    }

    if (!dto.status) throw new Error('New status is required.');
    if (!dto.effectiveDate) throw new Error('Effective date is required.');
    if (!dto.reason?.trim()) throw new Error('Reason for status change is required.');

    const prevStatus = employee.status;
    const newStatus = dto.status;

    // Update Employee Status
    await EmployeeRepository.update(employeeId, {
      status: newStatus,
      updatedBy: actor.id,
    });

    // Record Status History
    await EmployeeStatusHistoryRepository.create({
      id: `sth-${Date.now()}`,
      employeeId,
      previousStatus: prevStatus,
      newStatus,
      effectiveDate: dto.effectiveDate,
      reason: dto.reason.trim(),
      comments: dto.comments?.trim(),
      createdAt: new Date().toISOString(),
      createdBy: actor.id,
    });

    // Audit Log
    const company = await CompanyRepository.findById(companyId);
    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: 'EMPLOYEE_STATUS_CHANGED',
      targetModule: 'Employee Core',
      targetRecordId: employeeId,
      companyId,
      companyName: company?.name || companyId,
      ipAddress: '127.0.0.1',
      changesSummary: `Status changed from ${prevStatus} to ${newStatus} for employee [${employee.employeeCode}]. Reason: ${dto.reason}.`,
    });

    const profile = await this.getProfile(employeeId, companyId, actor);
    return profile!;
  }

  /**
   * 7. Document Management
   */
  public static async uploadDocument(
    employeeId: string,
    docData: {
      documentType: any;
      title: string;
      fileName: string;
      fileSizeBytes: number;
      mimeType: string;
      storagePath?: string;
      issueDate?: string;
      expiryDate?: string;
      notes?: string;
    },
    companyId: string,
    actor: AuthUser
  ): Promise<EmployeeDocument> {
    const employee = await EmployeeRepository.findById(employeeId, companyId);
    if (!employee) throw new Error('Employee not found.');

    if (!docData.title?.trim()) throw new Error('Document Title is required.');
    if (!docData.fileName?.trim()) throw new Error('File name is required.');

    const newDoc: EmployeeDocument = {
      id: `doc-${Date.now()}`,
      employeeId,
      companyId,
      documentType: docData.documentType || 'OTHER',
      title: docData.title.trim(),
      fileName: docData.fileName.trim(),
      fileSizeBytes: docData.fileSizeBytes || 1024,
      mimeType: docData.mimeType || 'application/pdf',
      storagePath: docData.storagePath || `/uploads/${companyId}/${employeeId}/${docData.fileName}`,
      issueDate: docData.issueDate,
      expiryDate: docData.expiryDate,
      verificationStatus: 'PENDING',
      notes: docData.notes?.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: actor.id,
    };

    await EmployeeDocumentRepository.create(newDoc);

    const company = await CompanyRepository.findById(companyId);
    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: 'EMPLOYEE_DOCUMENT_UPLOADED',
      targetModule: 'Employee Core',
      targetRecordId: employeeId,
      companyId,
      companyName: company?.name || companyId,
      ipAddress: '127.0.0.1',
      changesSummary: `Uploaded document '${newDoc.title}' (${newDoc.documentType}) for employee [${employee.employeeCode}].`,
    });

    return newDoc;
  }

  public static async verifyDocument(
    docId: string,
    employeeId: string,
    status: 'VERIFIED' | 'REJECTED',
    notes: string | undefined,
    companyId: string,
    actor: AuthUser
  ): Promise<EmployeeDocument> {
    const doc = await EmployeeDocumentRepository.findById(docId);
    if (!doc || doc.employeeId !== employeeId || doc.companyId !== companyId) {
      throw new Error('Document not found.');
    }

    const updated = await EmployeeDocumentRepository.update(docId, {
      verificationStatus: status,
      verifiedBy: actor.id,
      verifiedAt: new Date().toISOString(),
      ...(notes && { notes }),
    });

    const company = await CompanyRepository.findById(companyId);
    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: 'EMPLOYEE_DOCUMENT_VERIFIED',
      targetModule: 'Employee Core',
      targetRecordId: employeeId,
      companyId,
      companyName: company?.name || companyId,
      ipAddress: '127.0.0.1',
      changesSummary: `Document '${doc.title}' verification status marked as ${status} by ${actor.fullName}.`,
    });

    return updated!;
  }

  public static async deleteDocument(
    docId: string,
    employeeId: string,
    companyId: string,
    actor: AuthUser
  ): Promise<boolean> {
    const doc = await EmployeeDocumentRepository.findById(docId);
    if (!doc || doc.employeeId !== employeeId || doc.companyId !== companyId) {
      throw new Error('Document not found.');
    }

    await EmployeeDocumentRepository.delete(docId);

    const company = await CompanyRepository.findById(companyId);
    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: 'EMPLOYEE_DOCUMENT_DELETED',
      targetModule: 'Employee Core',
      targetRecordId: employeeId,
      companyId,
      companyName: company?.name || companyId,
      ipAddress: '127.0.0.1',
      changesSummary: `Deleted document '${doc.title}' (${doc.documentType}) for employee ID ${employeeId}.`,
    });

    return true;
  }

  /**
   * 8. Reporting Manager Candidate Options
   */
  public static async getManagerOptions(
    companyId: string,
    excludeEmployeeId?: string
  ): Promise<Array<{ id: string; employeeCode: string; displayName: string; designationName?: string }>> {
    const employees = await EmployeeRepository.findAllByCompany(companyId);
    const active = employees.filter(
      (e) => e.status === 'ACTIVE' && (!excludeEmployeeId || e.id !== excludeEmployeeId)
    );

    const result = [];
    for (const emp of active) {
      const currentAssign = await EmployeeAssignmentRepository.findCurrentAssignment(emp.id);
      result.push({
        id: emp.id,
        employeeCode: emp.employeeCode,
        displayName: emp.displayName,
        designationName: currentAssign?.designationName,
      });
    }

    result.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return result;
  }
}
