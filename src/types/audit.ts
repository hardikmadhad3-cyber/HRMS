/**
 * HRMS Audit Trail Types
 * Aligned with HRMS SRS Section 12 & Document 5 Section 21
 */

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  action: string;
  targetModule: string;
  targetRecordId?: string;
  companyId: string;
  companyName?: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  changesSummary?: string;
}
