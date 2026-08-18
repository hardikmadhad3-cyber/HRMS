import { EmployeeAddress } from '../../../src/types/employee.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class EmployeeAddressRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findByEmployeeId(employeeId: string): Promise<EmployeeAddress[]> {
    return Array.from(this.db.employeeAddresses.values()).filter((a) => a.employeeId === employeeId);
  }

  public static async create(address: EmployeeAddress): Promise<EmployeeAddress> {
    this.db.employeeAddresses.set(address.id, address);
    return address;
  }

  public static async deleteByEmployeeId(employeeId: string): Promise<void> {
    for (const [id, addr] of this.db.employeeAddresses.entries()) {
      if (addr.employeeId === employeeId) {
        this.db.employeeAddresses.delete(id);
      }
    }
  }

  public static async saveAddresses(employeeId: string, addresses: EmployeeAddress[]): Promise<EmployeeAddress[]> {
    await this.deleteByEmployeeId(employeeId);
    for (const addr of addresses) {
      this.db.employeeAddresses.set(addr.id, addr);
    }
    return addresses;
  }
}
