import { RelationalDatabase } from '../database/RelationalDatabase.js';
import {
  InAppNotification,
  NotificationCategory,
  NotificationFilter,
  NotificationSeverity,
} from '../../src/types/platform.js';

export class NotificationService {
  private static db = RelationalDatabase.getInstance();

  /**
   * Dispatch a new in-app notification to a user
   */
  public static async createNotification(data: {
    companyId: string;
    recipientUserId: string;
    recipientEmployeeId?: string;
    category: NotificationCategory;
    eventType: string;
    title: string;
    message: string;
    linkUrl?: string;
    severity?: NotificationSeverity;
    metadata?: Record<string, unknown>;
  }): Promise<InAppNotification> {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const notification: InAppNotification = {
      id,
      companyId: data.companyId,
      recipientUserId: data.recipientUserId,
      recipientEmployeeId: data.recipientEmployeeId,
      category: data.category,
      eventType: data.eventType,
      title: data.title,
      message: data.message,
      linkUrl: data.linkUrl,
      severity: data.severity || 'INFO',
      isRead: false,
      metadata: data.metadata,
      createdAt: new Date().toISOString(),
    };

    NotificationService.db.inAppNotifications.set(id, notification);
    return notification;
  }

  /**
   * Retrieve in-app notifications for a user with tenant context and filtering
   */
  public static async getUserNotifications(
    userId: string,
    companyId: string,
    filter: NotificationFilter = {}
  ): Promise<{ notifications: InAppNotification[]; totalCount: number; unreadCount: number }> {
    const all = Array.from(NotificationService.db.inAppNotifications.values())
      .filter((n) => n.recipientUserId === userId && (n.companyId === companyId || n.companyId === 'ALL'))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const unreadCount = all.filter((n) => !n.isRead).length;

    let filtered = all;
    if (filter.isRead !== undefined) {
      filtered = filtered.filter((n) => n.isRead === filter.isRead);
    }
    if (filter.category) {
      filtered = filtered.filter((n) => n.category === filter.category);
    }

    const totalCount = filtered.length;
    const offset = filter.offset || 0;
    const limit = filter.limit || 50;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      notifications: paginated,
      totalCount,
      unreadCount,
    };
  }

  /**
   * Get unread count badge
   */
  public static async getUnreadCount(userId: string, companyId: string): Promise<number> {
    return Array.from(NotificationService.db.inAppNotifications.values()).filter(
      (n) => n.recipientUserId === userId && (n.companyId === companyId || n.companyId === 'ALL') && !n.isRead
    ).length;
  }

  /**
   * Mark single notification as read
   */
  public static async markAsRead(notificationId: string, userId: string): Promise<InAppNotification | null> {
    const notif = NotificationService.db.inAppNotifications.get(notificationId);
    if (!notif || notif.recipientUserId !== userId) {
      return null;
    }
    notif.isRead = true;
    notif.readAt = new Date().toISOString();
    NotificationService.db.inAppNotifications.set(notificationId, notif);
    return notif;
  }

  /**
   * Mark all notifications as read for a user
   */
  public static async markAllAsRead(userId: string, companyId: string): Promise<number> {
    let updated = 0;
    const now = new Date().toISOString();
    for (const [id, notif] of NotificationService.db.inAppNotifications.entries()) {
      if (notif.recipientUserId === userId && (notif.companyId === companyId || notif.companyId === 'ALL') && !notif.isRead) {
        notif.isRead = true;
        notif.readAt = now;
        NotificationService.db.inAppNotifications.set(id, notif);
        updated++;
      }
    }
    return updated;
  }

  /**
   * Delete single notification
   */
  public static async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const notif = NotificationService.db.inAppNotifications.get(notificationId);
    if (!notif || notif.recipientUserId !== userId) {
      return false;
    }
    return NotificationService.db.inAppNotifications.delete(notificationId);
  }

  // ==========================================
  // Domain Notification Dispatch Triggers
  // ==========================================

  public static async notifyApprovalRequest(params: {
    companyId: string;
    approverUserId: string;
    requestType: 'LEAVE' | 'EXPENSE' | 'ATTENDANCE_REGULARIZATION' | 'OVERTIME' | 'OFFBOARDING';
    requesterName: string;
    details: string;
    linkUrl: string;
  }) {
    return this.createNotification({
      companyId: params.companyId,
      recipientUserId: params.approverUserId,
      category: 'APPROVAL',
      eventType: `${params.requestType}_APPROVAL_REQUEST`,
      title: `Pending ${params.requestType.replace('_', ' ')} Approval`,
      message: `${params.requesterName} submitted a request: ${params.details}`,
      linkUrl: params.linkUrl,
      severity: 'WARNING',
    });
  }

  public static async notifyApprovalDecision(params: {
    companyId: string;
    recipientUserId: string;
    requestType: string;
    decision: 'APPROVED' | 'REJECTED' | 'RETURNED';
    approverName: string;
    comments?: string;
    linkUrl: string;
  }) {
    return this.createNotification({
      companyId: params.companyId,
      recipientUserId: params.recipientUserId,
      category: 'APPROVAL',
      eventType: `${params.requestType}_${params.decision}`,
      title: `Request ${params.decision}: ${params.requestType}`,
      message: `Your ${params.requestType.toLowerCase()} request was ${params.decision.toLowerCase()} by ${params.approverName}.${params.comments ? ` Note: ${params.comments}` : ''}`,
      linkUrl: params.linkUrl,
      severity: params.decision === 'APPROVED' ? 'SUCCESS' : 'CRITICAL',
    });
  }

  public static async notifyAttendanceException(params: {
    companyId: string;
    recipientUserId: string;
    employeeName: string;
    date: string;
    exceptionType: 'LATE_ARRIVAL' | 'EARLY_DEPARTURE' | 'MISSED_PUNCH' | 'ABSENCE';
    minutes?: number;
  }) {
    return this.createNotification({
      companyId: params.companyId,
      recipientUserId: params.recipientUserId,
      category: 'ATTENDANCE',
      eventType: `ATTENDANCE_${params.exceptionType}`,
      title: `Attendance Exception: ${params.exceptionType.replace('_', ' ')}`,
      message: `Attendance record on ${params.date} flagged for ${params.exceptionType.toLowerCase()}${params.minutes ? ` (${params.minutes} mins)` : ''}.`,
      linkUrl: '/attendance/regularizations',
      severity: 'WARNING',
    });
  }

  public static async notifyPayslipReady(params: {
    companyId: string;
    recipientUserId: string;
    periodName: string;
    netPay: number;
    currency: string;
    payslipId: string;
  }) {
    return this.createNotification({
      companyId: params.companyId,
      recipientUserId: params.recipientUserId,
      category: 'PAYROLL',
      eventType: 'PAYSLIP_GENERATED',
      title: `Payslip Available (${params.periodName})`,
      message: `Your payslip for ${params.periodName} has been published. Net Pay: ${params.currency} ${params.netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`,
      linkUrl: '/payroll/payslips',
      severity: 'SUCCESS',
      metadata: { payslipId: params.payslipId },
    });
  }

  public static async notifyRecruitmentUpdate(params: {
    companyId: string;
    recipientUserId: string;
    candidateName: string;
    jobTitle: string;
    action: string;
  }) {
    return this.createNotification({
      companyId: params.companyId,
      recipientUserId: params.recipientUserId,
      category: 'RECRUITMENT',
      eventType: 'CANDIDATE_STATUS_CHANGED',
      title: `Recruitment Update: ${params.jobTitle}`,
      message: `${params.candidateName} has been updated: ${params.action}.`,
      linkUrl: '/recruitment',
      severity: 'INFO',
    });
  }

  public static async notifyPerformanceMilestone(params: {
    companyId: string;
    recipientUserId: string;
    cycleTitle: string;
    actionRequired: string;
    dueDate?: string;
  }) {
    return this.createNotification({
      companyId: params.companyId,
      recipientUserId: params.recipientUserId,
      category: 'PERFORMANCE',
      eventType: 'PERFORMANCE_APPRAISAL_TASK',
      title: `Appraisal Task: ${params.cycleTitle}`,
      message: `Action required: ${params.actionRequired}${params.dueDate ? `. Due by: ${params.dueDate}` : ''}.`,
      linkUrl: '/performance',
      severity: 'INFO',
    });
  }

  public static async notifyOffboardingTask(params: {
    companyId: string;
    recipientUserId: string;
    employeeName: string;
    department: string;
    taskTitle: string;
  }) {
    return this.createNotification({
      companyId: params.companyId,
      recipientUserId: params.recipientUserId,
      category: 'OFFBOARDING',
      eventType: 'OFFBOARDING_CLEARANCE_DUE',
      title: `Separation Clearance Task: ${params.employeeName}`,
      message: `Clearance task '${params.taskTitle}' pending for ${params.employeeName} (${params.department}).`,
      linkUrl: '/offboarding',
      severity: 'WARNING',
    });
  }
}
