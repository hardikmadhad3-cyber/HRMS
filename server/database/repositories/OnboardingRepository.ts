import {
  OnboardingTemplate,
  EmployeeOnboarding,
  OnboardingTask,
  OnboardingDocument,
  OnboardingStatus,
  OnboardingTaskStatus,
  OnboardingDocStatus,
} from '../../../src/types/recruitment.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export interface OnboardingFilter {
  status?: OnboardingStatus;
  departmentId?: string;
  search?: string;
}

export class OnboardingRepository {
  private static db = RelationalDatabase.getInstance();

  // -------------------------------------------------------------------------
  // TEMPLATES
  // -------------------------------------------------------------------------
  public static async findTemplateById(id: string, companyId: string): Promise<OnboardingTemplate | null> {
    const tmpl = this.db.onboardingTemplates.get(id);
    if (!tmpl || tmpl.companyId !== companyId) return null;
    return { ...tmpl };
  }

  public static async findTemplates(companyId: string): Promise<OnboardingTemplate[]> {
    const results: OnboardingTemplate[] = [];
    for (const t of this.db.onboardingTemplates.values()) {
      if (t.companyId === companyId) {
        results.push({ ...t });
      }
    }
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public static async createTemplate(tmpl: OnboardingTemplate): Promise<OnboardingTemplate> {
    this.db.onboardingTemplates.set(tmpl.id, { ...tmpl });
    return { ...tmpl };
  }

  public static async updateTemplate(id: string, companyId: string, updates: Partial<OnboardingTemplate>): Promise<OnboardingTemplate | null> {
    const existing = await this.findTemplateById(id, companyId);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.db.onboardingTemplates.set(id, updated);
    return { ...updated };
  }

  // -------------------------------------------------------------------------
  // EMPLOYEE ONBOARDINGS
  // -------------------------------------------------------------------------
  public static async findById(id: string, companyId: string): Promise<EmployeeOnboarding | null> {
    const onb = this.db.employeeOnboardings.get(id);
    if (!onb || onb.companyId !== companyId) return null;

    // Attach tasks and documents
    const tasks = await this.findTasksByOnboardingId(id, companyId);
    const documents = await this.findDocumentsByOnboardingId(id, companyId);

    const completedTasks = tasks.filter((t) => t.status === OnboardingTaskStatus.COMPLETED || t.status === OnboardingTaskStatus.WAIVED).length;
    const verifiedDocs = documents.filter((d) => d.status === OnboardingDocStatus.VERIFIED).length;
    const totalItems = tasks.length + documents.length;
    const progress = totalItems > 0 ? Math.round(((completedTasks + verifiedDocs) / totalItems) * 100) : 0;

    return {
      ...onb,
      overallProgress: progress,
      tasksCompletedCount: completedTasks,
      tasksTotalCount: tasks.length,
      docsVerifiedCount: verifiedDocs,
      docsTotalCount: documents.length,
      tasks,
      documents,
    };
  }

  public static async findByCandidateId(candidateId: string, companyId: string): Promise<EmployeeOnboarding | null> {
    for (const onb of this.db.employeeOnboardings.values()) {
      if (onb.companyId === companyId && onb.candidateId === candidateId) {
        return this.findById(onb.id, companyId);
      }
    }
    return null;
  }

  public static async findByOfferId(offerId: string, companyId: string): Promise<EmployeeOnboarding | null> {
    for (const onb of this.db.employeeOnboardings.values()) {
      if (onb.companyId === companyId && onb.jobOfferId === offerId) {
        return this.findById(onb.id, companyId);
      }
    }
    return null;
  }

  public static async findAll(companyId: string, filter?: OnboardingFilter): Promise<EmployeeOnboarding[]> {
    const results: EmployeeOnboarding[] = [];
    const search = filter?.search?.toLowerCase();

    for (const onb of this.db.employeeOnboardings.values()) {
      if (onb.companyId !== companyId) continue;
      if (filter?.status && onb.status !== filter.status) continue;
      if (filter?.departmentId && onb.departmentId !== filter.departmentId) continue;

      if (search) {
        const matches =
          onb.fullName.toLowerCase().includes(search) ||
          onb.email.toLowerCase().includes(search) ||
          onb.onboardingNumber.toLowerCase().includes(search) ||
          onb.departmentName.toLowerCase().includes(search) ||
          onb.designationName.toLowerCase().includes(search);
        if (!matches) continue;
      }

      const fullOnb = await this.findById(onb.id, companyId);
      if (fullOnb) results.push(fullOnb);
    }

    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public static async create(onb: EmployeeOnboarding): Promise<EmployeeOnboarding> {
    this.db.employeeOnboardings.set(onb.id, { ...onb });
    return { ...onb };
  }

  public static async update(id: string, companyId: string, updates: Partial<EmployeeOnboarding>): Promise<EmployeeOnboarding | null> {
    const existing = this.db.employeeOnboardings.get(id);
    if (!existing || existing.companyId !== companyId) return null;
    const updated: EmployeeOnboarding = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.db.employeeOnboardings.set(id, updated);
    return this.findById(id, companyId);
  }

  // -------------------------------------------------------------------------
  // TASKS
  // -------------------------------------------------------------------------
  public static async findTasksByOnboardingId(onboardingId: string, companyId: string): Promise<OnboardingTask[]> {
    const results: OnboardingTask[] = [];
    for (const t of this.db.onboardingTasks.values()) {
      if (t.companyId === companyId && t.onboardingId === onboardingId) {
        results.push({ ...t });
      }
    }
    return results.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  public static async findTaskById(taskId: string, companyId: string): Promise<OnboardingTask | null> {
    const task = this.db.onboardingTasks.get(taskId);
    if (!task || task.companyId !== companyId) return null;
    return { ...task };
  }

  public static async createTask(task: OnboardingTask): Promise<OnboardingTask> {
    this.db.onboardingTasks.set(task.id, { ...task });
    return { ...task };
  }

  public static async updateTask(id: string, companyId: string, updates: Partial<OnboardingTask>): Promise<OnboardingTask | null> {
    const existing = await this.findTaskById(id, companyId);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.db.onboardingTasks.set(id, updated);
    return { ...updated };
  }

  // -------------------------------------------------------------------------
  // DOCUMENTS
  // -------------------------------------------------------------------------
  public static async findDocumentsByOnboardingId(onboardingId: string, companyId: string): Promise<OnboardingDocument[]> {
    const results: OnboardingDocument[] = [];
    for (const d of this.db.onboardingDocuments.values()) {
      if (d.companyId === companyId && d.onboardingId === onboardingId) {
        results.push({ ...d });
      }
    }
    return results.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public static async findDocumentById(docId: string, companyId: string): Promise<OnboardingDocument | null> {
    const doc = this.db.onboardingDocuments.get(docId);
    if (!doc || doc.companyId !== companyId) return null;
    return { ...doc };
  }

  public static async createDocument(doc: OnboardingDocument): Promise<OnboardingDocument> {
    this.db.onboardingDocuments.set(doc.id, { ...doc });
    return { ...doc };
  }

  public static async updateDocument(id: string, companyId: string, updates: Partial<OnboardingDocument>): Promise<OnboardingDocument | null> {
    const existing = await this.findDocumentById(id, companyId);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.db.onboardingDocuments.set(id, updated);
    return { ...updated };
  }
}
