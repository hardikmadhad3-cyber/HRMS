import { AuditLogEntry } from '../../src/types/audit.js';

export class AuditService {
  private static logs: AuditLogEntry[] = [
    {
      id: 'aud-101',
      actorId: 'usr-1',
      actorName: 'System Administrator',
      actorEmail: 'admin@acme-corp.com',
      action: 'LOGIN_SUCCESS',
      targetModule: 'Authentication',
      companyId: 'comp-101',
      companyName: 'Acme Enterprise Solutions',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      ipAddress: '127.0.0.1',
      changesSummary: 'User session established with SUPER_ADMIN role.',
    },
    {
      id: 'aud-102',
      actorId: 'usr-2',
      actorName: 'Sarah Jenkins',
      actorEmail: 'sarah.j@acme-corp.com',
      action: 'COMPANY_UPDATE',
      targetModule: 'Organization',
      targetRecordId: 'comp-101',
      companyId: 'comp-101',
      companyName: 'Acme Enterprise Solutions',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      ipAddress: '192.168.1.45',
      changesSummary: 'Updated company contact email and statutory identifier.',
    },
  ];

  public static async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
    const newLog: AuditLogEntry = {
      ...entry,
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    AuditService.logs.unshift(newLog);
    return newLog;
  }

  public static getLogsForCompany(companyId?: string): AuditLogEntry[] {
    if (companyId && companyId !== 'ALL') {
      return AuditService.logs.filter((l) => l.companyId === companyId || l.companyId === 'ALL');
    }
    return AuditService.logs;
  }

  public static async getLogs(companyId?: string): Promise<AuditLogEntry[]> {
    return AuditService.getLogsForCompany(companyId);
  }
}
