import { PayrollCalendar, PayrollPeriod, PayrollPeriodStatus, PayFrequency } from '../../../src/types/payroll.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class PayrollCalendarRepository {
  private static get db() {
    return RelationalDatabase.getInstance();
  }

  private static enrichCalendar(cal: PayrollCalendar): PayrollCalendar {
    const periods = Array.from(this.db.payrollPeriods.values())
      .filter((p) => p.payrollCalendarId === cal.id && p.companyId === cal.companyId)
      .sort((a, b) => a.periodNumber - b.periodNumber || a.startDate.localeCompare(b.startDate));

    return {
      ...cal,
      periods,
    };
  }

  public static async findAll(
    companyId: string,
    filters?: { year?: number; isActive?: boolean; search?: string }
  ): Promise<PayrollCalendar[]> {
    let items = Array.from(this.db.payrollCalendars.values()).filter((c) => c.companyId === companyId);

    if (filters?.year) {
      items = items.filter((c) => c.year === filters.year);
    }

    if (filters?.isActive !== undefined) {
      items = items.filter((c) => c.isActive === filters.isActive);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      items = items.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q)
      );
    }

    return items
      .map((c) => this.enrichCalendar(c))
      .sort((a, b) => b.year - a.year || a.code.localeCompare(b.code));
  }

  public static async findById(id: string, companyId: string): Promise<PayrollCalendar | null> {
    const item = this.db.payrollCalendars.get(id);
    if (!item || item.companyId !== companyId) return null;
    return this.enrichCalendar(item);
  }

  public static async findByCode(code: string, companyId: string): Promise<PayrollCalendar | null> {
    const q = code.trim().toLowerCase();
    for (const item of this.db.payrollCalendars.values()) {
      if (item.companyId === companyId && item.code.toLowerCase() === q) {
        return this.enrichCalendar(item);
      }
    }
    return null;
  }

  public static async findDefaultCalendar(companyId: string, year?: number): Promise<PayrollCalendar | null> {
    const targetYear = year || new Date().getFullYear();
    for (const item of this.db.payrollCalendars.values()) {
      if (item.companyId === companyId && item.isDefault && item.isActive && item.year === targetYear) {
        return this.enrichCalendar(item);
      }
    }
    // Fallback to any active calendar for year
    for (const item of this.db.payrollCalendars.values()) {
      if (item.companyId === companyId && item.isActive && item.year === targetYear) {
        return this.enrichCalendar(item);
      }
    }
    return null;
  }

  /**
   * Helper to generate 12 monthly periods for a calendar year
   */
  public static generateMonthlyPeriods(
    calendarId: string,
    companyId: string,
    year: number,
    cycleStartDay: number = 1,
    cycleEndDay: number = 31,
    payDay: number = 1,
    cutoffDay: number = 25
  ): PayrollPeriod[] {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const periods: PayrollPeriod[] = [];

    for (let m = 1; m <= 12; m++) {
      const monthStr = m.toString().padStart(2, '0');
      const periodCode = `${year}-M${monthStr}`;
      const periodName = `${monthNames[m - 1]} ${year}`;

      // Calculate dates
      let startDateStr: string;
      let endDateStr: string;
      let payDateStr: string;
      let cutoffDateStr: string;

      if (cycleStartDay === 1) {
        // Standard calendar month
        const daysInMonth = new Date(year, m, 0).getDate();
        startDateStr = `${year}-${monthStr}-01`;
        endDateStr = `${year}-${monthStr}-${daysInMonth.toString().padStart(2, '0')}`;
        
        // Pay date (e.g. 1st of next month or last day of month)
        if (payDay === 1 && m < 12) {
          const nextMonthStr = (m + 1).toString().padStart(2, '0');
          payDateStr = `${year}-${nextMonthStr}-01`;
        } else if (payDay === 1 && m === 12) {
          payDateStr = `${year + 1}-01-01`;
        } else {
          payDateStr = `${year}-${monthStr}-${Math.min(payDay, daysInMonth).toString().padStart(2, '0')}`;
        }
        
        cutoffDateStr = `${year}-${monthStr}-${Math.min(cutoffDay, daysInMonth).toString().padStart(2, '0')}`;
      } else {
        // Offset cycle (e.g. 26th of prev month to 25th of current month)
        // Simplified start/end
        const prevMonth = m === 1 ? 12 : m - 1;
        const prevYear = m === 1 ? year - 1 : year;
        startDateStr = `${prevYear}-${prevMonth.toString().padStart(2, '0')}-${cycleStartDay.toString().padStart(2, '0')}`;
        endDateStr = `${year}-${monthStr}-${cycleEndDay.toString().padStart(2, '0')}`;
        payDateStr = `${year}-${monthStr}-${payDay.toString().padStart(2, '0')}`;
        cutoffDateStr = `${year}-${monthStr}-${cutoffDay.toString().padStart(2, '0')}`;
      }

      periods.push({
        id: `pp-${calendarId}-${periodCode}`,
        companyId,
        payrollCalendarId: calendarId,
        periodNumber: m,
        periodCode,
        periodName,
        startDate: startDateStr,
        endDate: endDateStr,
        payDate: payDateStr,
        cutoffDate: cutoffDateStr,
        status: PayrollPeriodStatus.UPCOMING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return periods;
  }

  public static async create(
    data: Omit<PayrollCalendar, 'createdAt' | 'updatedAt'>,
    customPeriods?: PayrollPeriod[]
  ): Promise<PayrollCalendar> {
    const newCalendar: PayrollCalendar = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // If default, unset previous default for the company and year
    if (newCalendar.isDefault) {
      for (const cal of this.db.payrollCalendars.values()) {
        if (cal.companyId === newCalendar.companyId && cal.year === newCalendar.year) {
          cal.isDefault = false;
        }
      }
    }

    this.db.payrollCalendars.set(newCalendar.id, newCalendar);

    const periodsToInsert = customPeriods && customPeriods.length > 0
      ? customPeriods
      : this.generateMonthlyPeriods(
          newCalendar.id,
          newCalendar.companyId,
          newCalendar.year,
          newCalendar.cycleStartDay,
          newCalendar.cycleEndDay,
          newCalendar.payDay,
          newCalendar.cutoffDay
        );

    for (const p of periodsToInsert) {
      this.db.payrollPeriods.set(p.id, {
        ...p,
        payrollCalendarId: newCalendar.id,
        companyId: newCalendar.companyId,
      });
    }

    return this.enrichCalendar(newCalendar);
  }

  public static async findPeriodById(periodId: string, companyId?: string): Promise<PayrollPeriod | null> {
    const period = this.db.payrollPeriods.get(periodId);
    if (!period) return null;
    if (companyId && period.companyId !== companyId) return null;
    return { ...period };
  }

  public static async findPeriodsByCalendarId(calendarId: string, companyId: string): Promise<PayrollPeriod[]> {
    return Array.from(this.db.payrollPeriods.values())
      .filter((p) => p.payrollCalendarId === calendarId && p.companyId === companyId)
      .sort((a, b) => a.periodNumber - b.periodNumber || a.startDate.localeCompare(b.startDate));
  }

  public static async updatePeriodStatus(
    periodId: string,
    companyId: string,
    status: PayrollPeriodStatus
  ): Promise<PayrollPeriod | null> {
    const period = this.db.payrollPeriods.get(periodId);
    if (!period || period.companyId !== companyId) return null;

    period.status = status;
    period.updatedAt = new Date().toISOString();
    this.db.payrollPeriods.set(periodId, period);
    return { ...period };
  }

  public static async findPeriodByDate(
    companyId: string,
    date: string,
    calendarId?: string
  ): Promise<PayrollPeriod | null> {
    let periods = Array.from(this.db.payrollPeriods.values()).filter((p) => p.companyId === companyId);
    if (calendarId) {
      periods = periods.filter((p) => p.payrollCalendarId === calendarId);
    }

    for (const p of periods) {
      if (p.startDate <= date && p.endDate >= date) {
        return { ...p };
      }
    }
    return null;
  }
}
