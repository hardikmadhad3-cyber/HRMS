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
<<<<<<< HEAD
  targetEntityId?: string;
=======
>>>>>>> 4a1448526a9835d6aa52ec14365c16a1afc6f77f
  companyId: string;
  companyName?: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  changesSummary?: string;
<<<<<<< HEAD
  previousState?: any;
  newState?: any;
=======
>>>>>>> 4a1448526a9835d6aa52ec14365c16a1afc6f77f
}
