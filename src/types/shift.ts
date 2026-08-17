/**
 * Phase 2A: Shift Management & Employee Shift Assignment Types
 * Aligned with HRMS Document 2 (Shift Specification), Document 3 (Entities), and Document 4 (APIs)
 */

export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export type ShiftStatus = 'ACTIVE' | 'INACTIVE';
export type ShiftAssignmentType = 'PERMANENT' | 'TEMPORARY' | 'ROSTER' | 'ROTATIONAL';
export type ShiftAssignmentStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED';

export interface ShiftBreak {
  id: string;
  shiftId: string;
  companyId: string;
  breakName: string;
  startTime: string; // 'HH:mm'
  endTime: string;   // 'HH:mm'
  durationMinutes: number;
  isPaid: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyOffRule {
  id: string;
  companyId: string;
  shiftId?: string;
  name: string;
  daysOfWeek: DayOfWeek[];
  alternateSaturday: boolean; // e.g. 2nd & 4th Saturday off
  alternateSaturdayWeeks?: number[];
  isDefault: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface Shift {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  startTime: string; // 'HH:mm' (e.g. '09:30', '21:00')
  endTime: string;   // 'HH:mm' (e.g. '18:30', '06:00')
  isOvernight: boolean;
  lateEntryGraceMinutes: number;
  earlyExitGraceMinutes: number;
  lateAllowed: boolean;
  earlyExitAllowed: boolean;
  halfDayHours: number;
  fullDayHours: number;
  color?: string;
  status: ShiftStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;

  // Hydrated sub-entities
  breaks?: ShiftBreak[];
  weeklyOffRule?: WeeklyOffRule;
  assignedEmployeesCount?: number;
}

export interface EmployeeShiftAssignment {
  id: string;
  employeeId: string;
  companyId: string;
  shiftId: string;
  effectiveFrom: string; // 'YYYY-MM-DD'
  effectiveTo?: string;   // 'YYYY-MM-DD' (optional, undefined = open-ended)
  assignmentType: ShiftAssignmentType;
  reason?: string;
  notes?: string;
  status: ShiftAssignmentStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;

  // Hydrated details for display
  employeeCode?: string;
  employeeName?: string;
  departmentId?: string;
  departmentName?: string;
  designationName?: string;
  branchName?: string;
  shiftCode?: string;
  shiftName?: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  isOvernight?: boolean;
  shiftColor?: string;
  fullDayHours?: number;
  halfDayHours?: number;
  weeklyOffDays?: string[];
  alternateSaturday?: boolean;
}

export interface ShiftRosterEntry {
  id: string;
  employeeId: string;
  companyId: string;
  shiftId: string;
  rosterDate: string; // 'YYYY-MM-DD'
  isWeeklyOff: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;

  // Hydrated
  shiftCode?: string;
  shiftName?: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  isOvernight?: boolean;
  shiftColor?: string;
  employeeCode?: string;
  employeeName?: string;
}

export interface CreateShiftBreakDTO {
  breakName: string;
  startTime: string;
  endTime: string;
  durationMinutes?: number;
  isPaid?: boolean;
}

export interface CreateShiftDTO {
  code: string;
  name: string;
  description?: string;
  startTime: string;
  endTime: string;
  isOvernight?: boolean;
  lateEntryGraceMinutes?: number;
  earlyExitGraceMinutes?: number;
  lateAllowed?: boolean;
  earlyExitAllowed?: boolean;
  halfDayHours?: number;
  fullDayHours?: number;
  color?: string;
  status?: ShiftStatus;
  breaks?: CreateShiftBreakDTO[];
  weeklyOffDays?: DayOfWeek[];
  alternateSaturday?: boolean;
}

export interface UpdateShiftDTO extends Partial<CreateShiftDTO> {
  status?: ShiftStatus;
}

export interface CreateShiftAssignmentDTO {
  employeeId: string;
  shiftId: string;
  effectiveFrom: string;
  effectiveTo?: string;
  assignmentType?: ShiftAssignmentType;
  reason?: string;
  notes?: string;
}

export interface BulkShiftAssignmentDTO {
  employeeIds: string[];
  shiftId: string;
  effectiveFrom: string;
  effectiveTo?: string;
  assignmentType?: ShiftAssignmentType;
  reason?: string;
  notes?: string;
}

export interface ShiftFilter {
  search?: string;
  status?: ShiftStatus;
  isOvernight?: boolean;
  page?: number;
  limit?: number;
}

export interface ShiftAssignmentFilter {
  employeeId?: string;
  shiftId?: string;
  departmentId?: string;
  branchId?: string;
  search?: string;
  status?: ShiftAssignmentStatus;
  effectiveDate?: string;
  page?: number;
  limit?: number;
}

export interface ShiftRosterQuery {
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;   // 'YYYY-MM-DD'
  departmentId?: string;
  branchId?: string;
  employeeId?: string;
  search?: string;
}

export interface ShiftSummary {
  totalShifts: number;
  activeShifts: number;
  overnightShifts: number;
  assignedEmployeesCount: number;
}
