import { LeaveType, LeaveTypeStatus } from '../../src/types/leave.js';
import { AuthUser } from '../../src/types/auth.js';
import { LeaveTypeRepository } from '../database/repositories/LeaveTypeRepository.js';
import { AuditService } from './AuditService.js';

export interface CreateLeaveTypeDTO {
  code: string;
  name: string;
  description?: string;
  category: LeaveType['category'];
  paidType: LeaveType['paidType'];
  unit: LeaveType['unit'];
  color?: string;
  requiresReason?: boolean;
  requiresAttachment?: boolean;
  attachmentThresholdDays?: number;
  status?: LeaveTypeStatus;
}

export interface UpdateLeaveTypeDTO {
  code?: string;
  name?: string;
  description?: string;
  category?: LeaveType['category'];
  paidType?: LeaveType['paidType'];
  unit?: LeaveType['unit'];
  color?: string;
  requiresReason?: boolean;
  requiresAttachment?: boolean;
  attachmentThresholdDays?: number;
  status?: LeaveTypeStatus;
}

export class LeaveTypeService {
  public static async getLeaveTypes(
    companyId: string,
    filters?: { status?: LeaveTypeStatus; category?: string; search?: string }
  ): Promise<LeaveType[]> {
    return LeaveTypeRepository.findAll(companyId, filters);
  }

  public static async getLeaveTypeById(id: string, companyId: string): Promise<LeaveType | null> {
    return LeaveTypeRepository.findById(id, companyId);
  }

  public static async createLeaveType(
    companyId: string,
    actor: AuthUser,
    dto: CreateLeaveTypeDTO
  ): Promise<LeaveType> {
    if (!dto.code || !dto.name || !dto.category) {
      throw new Error('LEAVE_TYPE_VALIDATION_ERROR: Code, name, and category are required.');
    }

    const cleanCode = dto.code.trim().toUpperCase();
    const existing = await LeaveTypeRepository.findByCode(cleanCode, companyId);
    if (existing) {
      throw new Error(`LEAVE_TYPE_CODE_EXISTS: A leave type with code "${cleanCode}" already exists for this company.`);
    }

    const id = `lt-${companyId.replace('comp-', '')}-${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now() % 10000}`;

    const created = await LeaveTypeRepository.create({
      id,
      companyId,
      code: cleanCode,
      name: dto.name.trim(),
      description: dto.description?.trim(),
      category: dto.category,
      paidType: dto.paidType || 'PAID',
      unit: dto.unit || 'FULL_DAY',
      color: dto.color || '#3B82F6',
      requiresReason: dto.requiresReason !== false,
      requiresAttachment: Boolean(dto.requiresAttachment),
      attachmentThresholdDays: dto.attachmentThresholdDays,
      status: dto.status || 'ACTIVE',
      createdBy: actor.id,
    });

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: 'LEAVE_TYPE_CREATED',
      targetModule: 'LEAVE',
      targetRecordId: created.id,
      companyId,
      changesSummary: `Created Leave Type ${created.code} (${created.name}) - ${created.category} / ${created.paidType}`,
    });

    return created;
  }

  public static async updateLeaveType(
    id: string,
    companyId: string,
    actor: AuthUser,
    dto: UpdateLeaveTypeDTO
  ): Promise<LeaveType> {
    const existing = await LeaveTypeRepository.findById(id, companyId);
    if (!existing) {
      throw new Error(`LEAVE_TYPE_NOT_FOUND: Leave type "${id}" was not found.`);
    }

    if (dto.code && dto.code.trim().toUpperCase() !== existing.code) {
      const cleanCode = dto.code.trim().toUpperCase();
      const codeCheck = await LeaveTypeRepository.findByCode(cleanCode, companyId);
      if (codeCheck && codeCheck.id !== id) {
        throw new Error(`LEAVE_TYPE_CODE_EXISTS: Leave type code "${cleanCode}" is already taken.`);
      }
    }

    const updated = await LeaveTypeRepository.update(id, companyId, {
      ...(dto.code ? { code: dto.code.trim().toUpperCase() } : {}),
      ...(dto.name ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined ? { description: dto.description?.trim() } : {}),
      ...(dto.category ? { category: dto.category } : {}),
      ...(dto.paidType ? { paidType: dto.paidType } : {}),
      ...(dto.unit ? { unit: dto.unit } : {}),
      ...(dto.color ? { color: dto.color } : {}),
      ...(dto.requiresReason !== undefined ? { requiresReason: dto.requiresReason } : {}),
      ...(dto.requiresAttachment !== undefined ? { requiresAttachment: dto.requiresAttachment } : {}),
      ...(dto.attachmentThresholdDays !== undefined ? { attachmentThresholdDays: dto.attachmentThresholdDays } : {}),
      ...(dto.status ? { status: dto.status } : {}),
    });

    if (!updated) {
      throw new Error(`LEAVE_TYPE_UPDATE_FAILED: Failed to update leave type "${id}".`);
    }

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: 'LEAVE_TYPE_UPDATED',
      targetModule: 'LEAVE',
      targetRecordId: updated.id,
      companyId,
      changesSummary: `Updated Leave Type ${updated.code} (${updated.name})`,
    });

    return updated;
  }

  public static async setLeaveTypeStatus(
    id: string,
    companyId: string,
    actor: AuthUser,
    status: LeaveTypeStatus
  ): Promise<LeaveType> {
    const existing = await LeaveTypeRepository.findById(id, companyId);
    if (!existing) {
      throw new Error(`LEAVE_TYPE_NOT_FOUND: Leave type "${id}" was not found.`);
    }

    const updated = await LeaveTypeRepository.setStatus(id, companyId, status);
    if (!updated) {
      throw new Error(`LEAVE_TYPE_STATUS_UPDATE_FAILED: Could not change status for "${id}".`);
    }

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: status === 'ACTIVE' ? 'LEAVE_TYPE_ACTIVATED' : 'LEAVE_TYPE_DEACTIVATED',
      targetModule: 'LEAVE',
      targetRecordId: updated.id,
      companyId,
      changesSummary: `Changed Leave Type ${updated.code} status to ${status}`,
    });

    return updated;
  }
}
