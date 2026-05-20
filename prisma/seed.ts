import { PrismaClient, Company, MemberStatus, Gender, PaymentMode, UserRole, EmployeeRole, SalaryType, EmployeeAttendanceStatus, AutomationTrigger } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, subDays, subMonths, startOfMonth } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Yos CRM database...\n");

  // ── Clean existing data ────────────────────────────────────────────────────
  await prisma.auditLog.deleteMany();
  await prisma.automationLog.deleteMany();
  await prisma.messageLog.deleteMany();
  await prisma.messageTemplate.deleteMany();
  await prisma.renewalFollowUp.deleteMany();
  await prisma.payrollRecord.deleteMany();
  await prisma.employeeAttendance.deleteMany();
  await prisma.memberAttendance.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.member.deleteMany();
  await prisma.package.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();

  // ── Users (Auth) ───────────────────────────────────────────────────────────
  console.log("Creating users...");
  const hashedPassword = await bcrypt.hash("admin123", 12);
  const staffPassword = await bcrypt.hash("staff123", 12);

  const adminUser = await prisma.user.create({
    data: {
      name: "Yos Admin",
      email: "admin@yosfitness.in",
      password: hashedPassword,
      role: UserRole.ADMIN,
    },
  });

  const frontDeskUser = await prisma.user.create({
    data: {
      name: "Priya Sharma",
      email: "priya@yosfitness.in",
      password: staffPassword,
      role: UserRole.FRONT_DESK,
    },
  });

  const accountantUser = await prisma.user.create({
    data: {
      name: "Rajesh Kumar",
      email: "rajesh@yosfitness.in",
      password: staffPassword,
      role: UserRole.ACCOUNTANT,
    },
  });

  const trainerUser = await prisma.user.create({
    data: {
      name: "Vikram Singh",
      email: "vikram@yosfitness.in",
      password: staffPassword,
      role: UserRole.TRAINER,
    },
  });

  // ── Employees ──────────────────────────────────────────────────────────────
  console.log("Creating employees...");
  const trainerEmployee = await prisma.employee.create({
    data: {
      employeeId: "EMP-001",
      fullName: "Vikram Singh",
      role: EmployeeRole.TRAINER,
      phone: "9876543210",
      joinDate: new Date("2022-06-01"),
      salaryType: SalaryType.FIXED_MONTHLY,
      monthlySalary: 25000,
      isActive: true,
      userId: trainerUser.id,
    },
  });

  const trainerEmployee2 = await prisma.employee.create({
    data: {
      employeeId: "EMP-002",
      fullName: "Anita Patel",
      role: EmployeeRole.TRAINER,
      phone: "9876543211",
      joinDate: new Date("2023-01-10"),
      salaryType: SalaryType.FIXED_MONTHLY,
      monthlySalary: 22000,
      isActive: true,
    },
  });

  const frontDeskEmployee = await prisma.employee.create({
    data: {
      employeeId: "EMP-003",
      fullName: "Priya Sharma",
      role: EmployeeRole.FRONT_DESK,
      phone: "9876543212",
      joinDate: new Date("2021-09-15"),
      salaryType: SalaryType.FIXED_MONTHLY,
      monthlySalary: 18000,
      isActive: true,
      userId: frontDeskUser.id,
    },
  });

  const cleanerEmployee = await prisma.employee.create({
    data: {
      employeeId: "EMP-004",
      fullName: "Suresh Yadav",
      role: EmployeeRole.CLEANER,
      phone: "9876543213",
      joinDate: new Date("2023-03-01"),
      salaryType: SalaryType.PER_DAY,
      perDaySalary: 500,
      isActive: true,
    },
  });

  const managerEmployee = await prisma.employee.create({
    data: {
      employeeId: "EMP-005",
      fullName: "Rajesh Kumar",
      role: EmployeeRole.MANAGER,
      phone: "9876543214",
      joinDate: new Date("2021-01-01"),
      salaryType: SalaryType.FIXED_MONTHLY,
      monthlySalary: 35000,
      isActive: true,
      userId: accountantUser.id,
    },
  });

  // ── Packages ───────────────────────────────────────────────────────────────
  console.log("Creating packages...");

  // Yos Fitness packages
  const pkg1mYF = await prisma.package.create({
    data: { name: "1 Month - Yos Fitness", durationDays: 30, price: 1500, company: Company.YOS_FITNESS },
  });
  const pkg3mYF = await prisma.package.create({
    data: { name: "3 Months - Yos Fitness", durationDays: 90, price: 3500, company: Company.YOS_FITNESS },
  });
  const pkg6mYF = await prisma.package.create({
    data: { name: "6 Months - Yos Fitness", durationDays: 180, price: 6000, company: Company.YOS_FITNESS },
  });
  const pkg12mYF = await prisma.package.create({
    data: { name: "12 Months - Yos Fitness", durationDays: 365, price: 10000, company: Company.YOS_FITNESS },
  });

  // Yos Fitness Studio packages
  const pkg1mYFS = await prisma.package.create({
    data: { name: "1 Month - Yos Studio", durationDays: 30, price: 2000, company: Company.YOS_FITNESS_STUDIO },
  });
  const pkg3mYFS = await prisma.package.create({
    data: { name: "3 Months - Yos Studio", durationDays: 90, price: 5000, company: Company.YOS_FITNESS_STUDIO },
  });
  const pkg6mYFS = await prisma.package.create({
    data: { name: "6 Months - Yos Studio", durationDays: 180, price: 9000, company: Company.YOS_FITNESS_STUDIO },
  });
  const pkg12mYFS = await prisma.package.create({
    data: { name: "12 Months - Yos Studio", durationDays: 365, price: 15000, company: Company.YOS_FITNESS_STUDIO },
  });

  // Personal Training (both companies)
  const pkgPT = await prisma.package.create({
    data: { name: "Personal Training - Monthly", durationDays: 30, price: 5000, company: null },
  });

  // ── Members ────────────────────────────────────────────────────────────────
  console.log("Creating members...");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const membersData = [
    // Active Yos Fitness members
    { memberId: "YF-001", fullName: "Arjun Mehta", phone: "9811234567", gender: Gender.MALE, joinDate: new Date("2024-01-15"), pkg: pkg3mYF, company: Company.YOS_FITNESS, startOffset: -45, trainer: trainerEmployee.id, status: MemberStatus.ACTIVE },
    { memberId: "YF-002", fullName: "Sneha Joshi", phone: "9822345678", gender: Gender.FEMALE, joinDate: new Date("2024-03-01"), pkg: pkg6mYF, company: Company.YOS_FITNESS, startOffset: -60, trainer: trainerEmployee2.id, status: MemberStatus.ACTIVE },
    { memberId: "YF-003", fullName: "Rahul Verma", phone: "9833456789", gender: Gender.MALE, joinDate: new Date("2023-11-01"), pkg: pkg12mYF, company: Company.YOS_FITNESS, startOffset: -120, trainer: null, status: MemberStatus.ACTIVE },
    { memberId: "YF-004", fullName: "Kavita Reddy", phone: "9844567890", gender: Gender.FEMALE, joinDate: new Date("2024-04-10"), pkg: pkg1mYF, company: Company.YOS_FITNESS, startOffset: -10, trainer: trainerEmployee2.id, status: MemberStatus.ACTIVE },
    { memberId: "YF-005", fullName: "Deepak Nair", phone: "9855678901", gender: Gender.MALE, joinDate: new Date("2024-02-20"), pkg: pkg3mYF, company: Company.YOS_FITNESS, startOffset: -70, trainer: trainerEmployee.id, status: MemberStatus.ACTIVE },
    { memberId: "YF-006", fullName: "Pooja Desai", phone: "9866789012", gender: Gender.FEMALE, joinDate: new Date("2024-05-01"), pkg: pkg1mYF, company: Company.YOS_FITNESS, startOffset: -5, trainer: null, status: MemberStatus.ACTIVE },
    { memberId: "YF-007", fullName: "Sameer Khan", phone: "9877890123", gender: Gender.MALE, joinDate: new Date("2023-09-15"), pkg: pkg6mYF, company: Company.YOS_FITNESS, startOffset: -160, trainer: trainerEmployee.id, status: MemberStatus.ACTIVE },
    { memberId: "YF-008", fullName: "Meera Pillai", phone: "9888901234", gender: Gender.FEMALE, joinDate: new Date("2024-01-01"), pkg: pkg3mYF, company: Company.YOS_FITNESS, startOffset: -55, trainer: trainerEmployee2.id, status: MemberStatus.ACTIVE },
    // Inactive (haven't attended 4+ days)
    { memberId: "YF-009", fullName: "Rohan Saxena", phone: "9899012345", gender: Gender.MALE, joinDate: new Date("2024-03-10"), pkg: pkg3mYF, company: Company.YOS_FITNESS, startOffset: -40, trainer: null, status: MemberStatus.ACTIVE, lastAttendanceDaysAgo: 6 },
    { memberId: "YF-010", fullName: "Nisha Gupta", phone: "9800123456", gender: Gender.FEMALE, joinDate: new Date("2024-04-01"), pkg: pkg1mYF, company: Company.YOS_FITNESS, startOffset: -15, trainer: trainerEmployee.id, status: MemberStatus.ACTIVE, lastAttendanceDaysAgo: 4 },
    // Expiring soon
    { memberId: "YF-011", fullName: "Amit Bansal", phone: "9811111111", gender: Gender.MALE, joinDate: new Date("2024-01-20"), pkg: pkg3mYF, company: Company.YOS_FITNESS, startOffset: -87, trainer: null, status: MemberStatus.ACTIVE },
    { memberId: "YF-012", fullName: "Ritu Sharma", phone: "9822222222", gender: Gender.FEMALE, joinDate: new Date("2024-02-01"), pkg: pkg1mYF, company: Company.YOS_FITNESS, startOffset: -27, trainer: trainerEmployee2.id, status: MemberStatus.ACTIVE },
    // Expired
    { memberId: "YF-013", fullName: "Sanjay Tiwari", phone: "9833333333", gender: Gender.MALE, joinDate: new Date("2023-12-01"), pkg: pkg3mYF, company: Company.YOS_FITNESS, startOffset: -120, trainer: null, status: MemberStatus.EXPIRED },
    { memberId: "YF-014", fullName: "Geeta Mishra", phone: "9844444444", gender: Gender.FEMALE, joinDate: new Date("2023-10-15"), pkg: pkg1mYF, company: Company.YOS_FITNESS, startOffset: -150, trainer: trainerEmployee.id, status: MemberStatus.EXPIRED },
    // Prospect
    { memberId: "YF-015", fullName: "Kartik Agarwal", phone: "9855555555", gender: Gender.MALE, joinDate: new Date("2026-04-15"), pkg: null, company: Company.YOS_FITNESS, startOffset: 0, trainer: null, status: MemberStatus.PROSPECT },
    // Yos Fitness Studio members
    { memberId: "YFS-001", fullName: "Divya Kapoor", phone: "9866666666", gender: Gender.FEMALE, joinDate: new Date("2024-02-15"), pkg: pkg3mYFS, company: Company.YOS_FITNESS_STUDIO, startOffset: -55, trainer: trainerEmployee2.id, status: MemberStatus.ACTIVE },
    { memberId: "YFS-002", fullName: "Aakash Rao", phone: "9877777777", gender: Gender.MALE, joinDate: new Date("2024-03-20"), pkg: pkg1mYFS, company: Company.YOS_FITNESS_STUDIO, startOffset: -25, trainer: null, status: MemberStatus.ACTIVE },
    { memberId: "YFS-003", fullName: "Sunita Bhat", phone: "9888888888", gender: Gender.FEMALE, joinDate: new Date("2023-12-01"), pkg: pkg6mYFS, company: Company.YOS_FITNESS_STUDIO, startOffset: -120, trainer: trainerEmployee2.id, status: MemberStatus.ACTIVE },
    { memberId: "YFS-004", fullName: "Manoj Iyer", phone: "9899999999", gender: Gender.MALE, joinDate: new Date("2024-01-10"), pkg: pkg12mYFS, company: Company.YOS_FITNESS_STUDIO, startOffset: -100, trainer: null, status: MemberStatus.ACTIVE },
    { memberId: "YFS-005", fullName: "Lakshmi Venkat", phone: "9800000001", gender: Gender.FEMALE, joinDate: new Date("2024-04-05"), pkg: pkg1mYFS, company: Company.YOS_FITNESS_STUDIO, startOffset: -12, trainer: trainerEmployee2.id, status: MemberStatus.ACTIVE },
    // Inactive studio member
    { memberId: "YFS-006", fullName: "Vivek Chauhan", phone: "9800000002", gender: Gender.MALE, joinDate: new Date("2024-03-01"), pkg: pkg3mYFS, company: Company.YOS_FITNESS_STUDIO, startOffset: -45, trainer: null, status: MemberStatus.ACTIVE, lastAttendanceDaysAgo: 8 },
    // Frozen
    { memberId: "YFS-007", fullName: "Shreya Menon", phone: "9800000003", gender: Gender.FEMALE, joinDate: new Date("2023-11-20"), pkg: pkg6mYFS, company: Company.YOS_FITNESS_STUDIO, startOffset: -90, trainer: trainerEmployee2.id, status: MemberStatus.FROZEN },
  ];

  const createdMembers: Record<string, string> = {};

  for (const m of membersData) {
    const startDate = m.pkg ? addDays(today, m.startOffset) : undefined;
    const expiryDate = m.pkg && startDate ? addDays(startDate, m.pkg.durationDays) : undefined;
    const lastAttendance = m.lastAttendanceDaysAgo
      ? subDays(today, m.lastAttendanceDaysAgo)
      : m.pkg && m.status === MemberStatus.ACTIVE && expiryDate && expiryDate > today
      ? subDays(today, Math.floor(Math.random() * 3))
      : undefined;

    const member = await prisma.member.create({
      data: {
        memberId: m.memberId,
        fullName: m.fullName,
        phone: m.phone,
        whatsapp: m.phone,
        gender: m.gender,
        joinDate: m.joinDate,
        status: m.status,
        currentPackageId: m.pkg?.id,
        startDate,
        expiryDate,
        renewalDueDate: expiryDate,
        lastAttendanceDate: lastAttendance,
        trainerId: m.trainer,
        address: generateAddress(),
      },
    });

    createdMembers[m.memberId] = member.id;

    // Create membership record
    if (m.pkg && startDate && expiryDate) {
      const payment = await prisma.payment.create({
        data: {
          memberId: member.id,
          date: startDate,
          amount: Number(m.pkg.price),
          paymentMode: [PaymentMode.CASH, PaymentMode.UPI, PaymentMode.CARD][Math.floor(Math.random() * 3)],
          packageId: m.pkg.id,
          company: m.company,
          collectedById: frontDeskUser.id,
          notes: "Initial enrollment",
        },
      });

      await prisma.membership.create({
        data: {
          memberId: member.id,
          packageId: m.pkg.id,
          startDate,
          expiryDate,
          company: m.company,
          amount: Number(m.pkg.price),
          paymentId: payment.id,
        },
      });
    }
  }

  // ── Member Attendance (last 30 days) ───────────────────────────────────────
  console.log("Creating member attendance records...");
  const activeMembers = membersData.filter(
    (m) => m.status === MemberStatus.ACTIVE && !m.lastAttendanceDaysAgo
  );

  for (const m of activeMembers) {
    const memberId = createdMembers[m.memberId];
    if (!memberId) continue;

    for (let i = 29; i >= 1; i--) {
      const attendanceDate = subDays(today, i);
      if (attendanceDate.getDay() === 0) continue; // skip Sundays occasionally
      if (Math.random() > 0.75) continue; // ~75% attendance rate

      await prisma.memberAttendance.create({
        data: {
          memberId,
          date: attendanceDate,
          checkInTime: new Date(attendanceDate.setHours(6 + Math.floor(Math.random() * 4), 0, 0, 0)),
          markedById: frontDeskUser.id,
        },
      }).catch(() => {}); // ignore duplicates
    }
  }

  // ── Employee Attendance (current month) ───────────────────────────────────
  console.log("Creating employee attendance...");
  const allEmployees = [trainerEmployee, trainerEmployee2, frontDeskEmployee, cleanerEmployee, managerEmployee];
  const monthStart = startOfMonth(today);

  for (const emp of allEmployees) {
    let date = new Date(monthStart);
    while (date <= today) {
      const dayOfWeek = date.getDay();
      let status: EmployeeAttendanceStatus;

      if (dayOfWeek === 0) {
        status = EmployeeAttendanceStatus.WEEKLY_OFF;
      } else if (Math.random() > 0.9) {
        status = Math.random() > 0.5 ? EmployeeAttendanceStatus.ABSENT : EmployeeAttendanceStatus.HALF_DAY;
      } else {
        status = EmployeeAttendanceStatus.PRESENT;
      }

      await prisma.employeeAttendance.create({
        data: {
          employeeId: emp.id,
          date: new Date(date),
          status,
        },
      }).catch(() => {});

      date = addDays(date, 1);
    }
  }

  // ── Message Templates ──────────────────────────────────────────────────────
  console.log("Creating message templates...");

  const templates = [
    {
      name: "4 Days Absent - Friendly Check-in",
      trigger: AutomationTrigger.INACTIVE_4_DAYS,
      body: "Hi {{name}}! 👋 We missed you at Yos Fitness for the past {{days_absent}} days. Your fitness journey matters to us. Come back strong — we're waiting for you! 💪",
    },
    {
      name: "7 Days Absent - Re-engagement",
      trigger: AutomationTrigger.INACTIVE_7_DAYS,
      body: "Hey {{name}}, it's been {{days_absent}} days since your last visit to Yos Fitness. Don't let your hard work go to waste! Your membership is active till {{expiry_date}}. See you soon! 🏋️",
    },
    {
      name: "14 Days Absent - Strong Follow-up",
      trigger: AutomationTrigger.INACTIVE_14_DAYS,
      body: "{{name}}, we haven't seen you in 2 weeks! 😔 Your trainer {{trainer_name}} is asking about you. Please come in or call us at the front desk. Your health is our priority!",
    },
    {
      name: "Expiry in 7 Days",
      trigger: AutomationTrigger.EXPIRY_7_DAYS,
      body: "Hi {{name}}! Your {{package_name}} at Yos Fitness expires on {{expiry_date}} (in {{days_to_expiry}} days). Renew now to continue your fitness journey without interruption! 🎯",
    },
    {
      name: "Expiry in 3 Days",
      trigger: AutomationTrigger.EXPIRY_3_DAYS,
      body: "⚠️ {{name}}, your membership expires in just 3 days ({{expiry_date}})! Visit us or call {{gym_phone}} to renew and avoid a gap in your training.",
    },
    {
      name: "Expiry Tomorrow",
      trigger: AutomationTrigger.EXPIRY_1_DAY,
      body: "🚨 {{name}}, your Yos Fitness membership expires TOMORROW ({{expiry_date}})! Please renew today. Visit us or contact the front desk immediately.",
    },
    {
      name: "Already Expired - Renewal Reminder",
      trigger: AutomationTrigger.ALREADY_EXPIRED,
      body: "Hi {{name}}, your membership expired on {{expiry_date}}. We'd love to have you back! Visit Yos Fitness to renew and get back on track. 💪",
    },
  ];

  for (const t of templates) {
    await prisma.messageTemplate.create({ data: t });
  }

  // ── Renewal Follow-ups ─────────────────────────────────────────────────────
  console.log("Creating renewal follow-ups...");
  const expiringMemberId = createdMembers["YF-013"];
  if (expiringMemberId) {
    await prisma.renewalFollowUp.create({
      data: {
        memberId: expiringMemberId,
        followUpDate: subDays(today, 5),
        type: "CALL",
        notes: "Called member, said will come in next week",
        isCompleted: true,
        completedAt: subDays(today, 5),
        completedBy: frontDeskUser.id,
        reminderSent: true,
      },
    });
  }

  console.log("\n✅ Database seeded successfully!\n");
  console.log("─────────────────────────────────────────");
  console.log("Login credentials:");
  console.log("  Admin:      admin@yosfitness.in / admin123");
  console.log("  Front Desk: priya@yosfitness.in / staff123");
  console.log("  Trainer:    vikram@yosfitness.in / staff123");
  console.log("  Accountant: rajesh@yosfitness.in / staff123");
  console.log("─────────────────────────────────────────\n");
}

function generateAddress(): string {
  const areas = [
    "Koramangala, Bangalore",
    "Indiranagar, Bangalore",
    "HSR Layout, Bangalore",
    "JP Nagar, Bangalore",
    "Whitefield, Bangalore",
    "Marathahalli, Bangalore",
    "BTM Layout, Bangalore",
    "Electronic City, Bangalore",
  ];
  return areas[Math.floor(Math.random() * areas.length)];
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
