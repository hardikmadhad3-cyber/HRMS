import { EmployeeEmergencyContact } from '../../../src/types/employee.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class EmployeeEmergencyContactRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findByEmployeeId(employeeId: string): Promise<EmployeeEmergencyContact[]> {
    return Array.from(this.db.employeeEmergencyContacts.values()).filter((c) => c.employeeId === employeeId);
  }

  public static async create(contact: EmployeeEmergencyContact): Promise<EmployeeEmergencyContact> {
    this.db.employeeEmergencyContacts.set(contact.id, contact);
    return contact;
  }

  public static async deleteByEmployeeId(employeeId: string): Promise<void> {
    for (const [id, c] of this.db.employeeEmergencyContacts.entries()) {
      if (c.employeeId === employeeId) {
        this.db.employeeEmergencyContacts.delete(id);
      }
    }
  }

  public static async saveContacts(
    employeeId: string,
    contacts: EmployeeEmergencyContact[]
  ): Promise<EmployeeEmergencyContact[]> {
    await this.deleteByEmployeeId(employeeId);
    for (const c of contacts) {
      this.db.employeeEmergencyContacts.set(c.id, c);
    }
    return contacts;
  }
}
