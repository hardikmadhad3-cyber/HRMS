import { EmployeeDocument } from '../../../src/types/employee.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class EmployeeDocumentRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findById(id: string): Promise<EmployeeDocument | null> {
    return this.db.employeeDocuments.get(id) || null;
  }

  public static async findByEmployeeId(employeeId: string): Promise<EmployeeDocument[]> {
    const docs = Array.from(this.db.employeeDocuments.values()).filter(
      (d) => d.employeeId === employeeId
    );
    docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return docs;
  }

  public static async create(doc: EmployeeDocument): Promise<EmployeeDocument> {
    this.db.employeeDocuments.set(doc.id, doc);
    return doc;
  }

  public static async update(id: string, updates: Partial<EmployeeDocument>): Promise<EmployeeDocument | null> {
    const existing = this.db.employeeDocuments.get(id);
    if (!existing) return null;

    const updated: EmployeeDocument = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    this.db.employeeDocuments.set(id, updated);
    return updated;
  }

  public static async delete(id: string): Promise<boolean> {
    return this.db.employeeDocuments.delete(id);
  }
}
