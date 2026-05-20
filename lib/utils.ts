import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, differenceInDays, isToday, isPast } from "date-fns";
import { Company, MemberStatus, UserRole } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Date Helpers ──────────────────────────────────────────────────────────────

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy");
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy, hh:mm a");
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "hh:mm a");
}

export function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function daysUntil(date: Date | string | null | undefined): number {
  if (!date) return 0;
  return differenceInDays(new Date(date), new Date());
}

export function daysAgo(date: Date | string | null | undefined): number {
  if (!date) return 0;
  return differenceInDays(new Date(), new Date(date));
}

export function isExpired(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  return isPast(new Date(date));
}

export function getMonthName(month: number): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return months[month - 1] ?? "—";
}

// ── Currency Helpers ──────────────────────────────────────────────────────────

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "₹0";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

// ── Label Helpers ─────────────────────────────────────────────────────────────

export const COMPANY_LABELS: Record<Company, string> = {
  YOS_FITNESS: "Yos Fitness",
  YOS_FITNESS_STUDIO: "Yos Fitness Studio",
};

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  ACTIVE: "Active",
  EXPIRED: "Expired",
  FROZEN: "Frozen",
  INACTIVE: "Inactive",
  PROSPECT: "Prospect",
};

export const MEMBER_STATUS_COLORS: Record<MemberStatus, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  EXPIRED: "bg-red-100 text-red-800",
  FROZEN: "bg-blue-100 text-blue-800",
  INACTIVE: "bg-yellow-100 text-yellow-800",
  PROSPECT: "bg-purple-100 text-purple-800",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Admin",
  FRONT_DESK: "Front Desk",
  TRAINER: "Trainer",
  ACCOUNTANT: "Accountant",
};

export const COMPANY_COLORS: Record<Company, string> = {
  YOS_FITNESS: "bg-orange-100 text-orange-800",
  YOS_FITNESS_STUDIO: "bg-indigo-100 text-indigo-800",
};

// ── Permission Helpers ────────────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: ["*"],
  FRONT_DESK: ["members", "attendance", "renewals", "payments", "dashboard"],
  TRAINER: ["members:read", "attendance", "inactive", "notes"],
  ACCOUNTANT: ["payments", "reports", "payroll", "renewals", "dashboard"],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  if (permissions.includes("*")) return true;
  return permissions.some((p) => p === permission || p === permission.split(":")[0]);
}

// ── ID Generation ─────────────────────────────────────────────────────────────

export async function generateMemberId(company: Company, prisma: any): Promise<string> {
  const prefix = company === Company.YOS_FITNESS ? "YF" : "YFS";
  const count = await prisma.member.count({ where: { memberId: { startsWith: `${prefix}-` } } });
  const num = String(count + 1).padStart(3, "0");
  return `${prefix}-${num}`;
}

export async function generateEmployeeId(prisma: any): Promise<string> {
  const count = await prisma.employee.count();
  const num = String(count + 1).padStart(3, "0");
  return `EMP-${num}`;
}

// ── Misc ──────────────────────────────────────────────────────────────────────

// Trim + uppercase a string field before saving to DB. Returns undefined for blank input.
export function ucase(s: string | undefined | null): string | undefined {
  if (!s) return undefined;
  const t = s.trim().toUpperCase();
  return t || undefined;
}

// Trim + uppercase a required string field.
export function ucaseReq(s: string): string {
  return s.trim().toUpperCase();
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function truncate(str: string, length = 50): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
