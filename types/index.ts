import type {
  Member,
  Package,
  Membership,
  MemberAttendance,
  Payment,
  Employee,
  EmployeeAttendance,
  PayrollRecord,
  MessageTemplate,
  MessageLog,
  RenewalFollowUp,
  AutomationLog,
  User,
  Company,
  MemberStatus,
  UserRole,
  EmployeeRole,
  PaymentMode,
  EmployeeAttendanceStatus,
} from "@prisma/client";

// ── Re-exports ────────────────────────────────────────────────────────────────
export type {
  Member, Package, Membership, MemberAttendance, Payment,
  Employee, EmployeeAttendance, PayrollRecord, MessageTemplate,
  MessageLog, RenewalFollowUp, AutomationLog, User,
  Company, MemberStatus, UserRole, EmployeeRole, PaymentMode, EmployeeAttendanceStatus,
};

// ── Extended types with relations ─────────────────────────────────────────────

export type MemberWithRelations = Member & {
  currentPackage?: Package | null;
  trainer?: Employee | null;
  memberships?: Membership[];
  payments?: Payment[];
  attendances?: MemberAttendance[];
};

export type PaymentWithRelations = Payment & {
  member: Pick<Member, "id" | "memberId" | "fullName" | "phone">;
  package?: Package | null;
  collectedBy: Pick<User, "id" | "name">;
};

export type MembershipWithRelations = Membership & {
  package: Package;
  payment?: Payment | null;
};

export type EmployeeWithRelations = Employee & {
  user?: User | null;
  attendances?: EmployeeAttendance[];
};

// ── Dashboard Stats ───────────────────────────────────────────────────────────

export type DashboardStats = {
  activeMembers: number;
  expiredMembers: number;
  renewalsDueThisWeek: number;
  inactiveMembers4Plus: number;
  todayAttendance: number;
  todayCollections: number;
  monthlyCollections: number;
  yosFitnessCollections: number;
  yosStudioCollections: number;
  employeePresentToday: number;
};

// ── Attendance Summary ────────────────────────────────────────────────────────

export type InactiveMemberSummary = {
  memberId: string;
  memberDbId: string;
  fullName: string;
  phone: string;
  whatsapp: string | null;
  lastAttendanceDate: Date | null;
  daysAbsent: number;
  expiryDate: Date | null;
  packageName: string | null;
  trainerName: string | null;
  company: Company;
  reminderSent: boolean;
};

// ── Payroll ───────────────────────────────────────────────────────────────────

export type PayrollCalculation = {
  employeeId: string;
  fullName: string;
  salaryType: string;
  month: number;
  year: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  weeklyOffs: number;
  leaveDays: number;
  workingDays: number;
  grossSalary: number;
  deductions: number;
  bonus: number;
  netSalary: number;
};

// ── Report Types ──────────────────────────────────────────────────────────────

export type CollectionReport = {
  date: string;
  yosFitness: number;
  yosStudio: number;
  total: number;
};

export type AttendanceTrend = {
  date: string;
  count: number;
};

// ── Form Types ────────────────────────────────────────────────────────────────

export type CreateMemberInput = {
  fullName: string;
  phone: string;
  whatsapp?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  joinDate?: string;
  status?: MemberStatus;
  primaryCompany: Company;
  trainerId?: string;
  notes?: string;
  packageId?: string;
  startDate?: string;
  discount?: number;
  paymentMode?: PaymentMode;
  paymentAmount?: number;
};

export type CreatePaymentInput = {
  memberId: string;
  amount: number;
  discount?: number;
  pendingAmount?: number;
  paymentMode: PaymentMode;
  packageId?: string;
  company: Company;
  transactionRef?: string;
  notes?: string;
};

export type MarkAttendanceInput = {
  memberId: string;
  date?: string;
  remarks?: string;
};

// ── API Response ──────────────────────────────────────────────────────────────

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
