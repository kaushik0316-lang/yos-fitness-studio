# Yos CRM — Gym Management System

A full-stack CRM built for **Yos Fitness** and **Yos Fitness Studio**.  
Handles members, attendance, renewals, payments, payroll, messaging automation, and reports — all with strict two-company separation.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Full-stack, server actions, RSC |
| Database | PostgreSQL | Relational integrity for payments/memberships |
| ORM | Prisma | Type-safe, migrations, great DX |
| Auth | NextAuth v5 | JWT sessions, credentials provider |
| UI | Tailwind CSS + custom components | Fast, consistent, no bloat |
| Charts | Recharts | Lightweight, works with RSC |
| Validation | Zod + React Hook Form | End-to-end type safety |

---

## Quick Start

### 1. Prerequisites

- Node.js 18+
- PostgreSQL (local or cloud — Supabase, Neon, Railway all work)

### 2. Clone & install

```bash
cd "C:/Yos CRM"
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://postgres:password@localhost:5432/yos_crm?schema=public"

# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
AUTH_SECRET="your-secret-here"

NEXTAUTH_URL="http://localhost:3000"
CRON_SECRET="your-cron-secret"
```

### 4. Set up the database

```bash
# Run migrations
npm run db:migrate

# OR push schema directly (faster for first-time setup)
npm run db:push

# Seed with demo data
npm run db:seed
```

### 5. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Login Credentials (after seeding)

| Role | Email | Password |
|---|---|---|
| Admin | admin@yosfitness.in | admin123 |
| Front Desk | priya@yosfitness.in | staff123 |
| Trainer | vikram@yosfitness.in | staff123 |
| Accountant | rajesh@yosfitness.in | staff123 |

---

## Project Structure

```
C:/Yos CRM/
├── app/
│   ├── (auth)/login/          # Login page
│   ├── (dashboard)/           # All protected pages
│   │   ├── page.tsx           # Dashboard
│   │   ├── members/           # Member list + detail
│   │   ├── attendance/        # Member attendance
│   │   ├── renewals/          # Renewal tracking
│   │   ├── payments/          # Payment history
│   │   ├── employees/         # Employee profiles
│   │   ├── employee-attendance/ # Monthly grid
│   │   ├── payroll/           # Salary calculator
│   │   ├── reports/           # Revenue + analytics
│   │   ├── messages/          # Templates + logs
│   │   ├── automation/        # Cron job status
│   │   └── settings/          # Packages + users
│   └── api/
│       ├── auth/              # NextAuth handler
│       ├── cron/              # Automation endpoint
│       └── packages/          # Package CRUD
├── components/
│   ├── layout/                # Sidebar, Header
│   ├── dashboard/             # Stat cards, widgets
│   ├── members/               # Member forms, dialogs
│   ├── attendance/            # Check-in UI
│   ├── renewals/              # Renewal list
│   ├── payments/              # Payment table, dialog
│   ├── employees/             # Employee grid, payroll
│   ├── reports/               # Charts
│   ├── messages/              # Template manager
│   ├── automation/            # Cron status
│   ├── settings/              # Package/user config
│   └── ui/                    # Base components
├── lib/
│   ├── actions/               # Server actions (mutations)
│   ├── automation/            # Inactive + renewal logic
│   ├── messaging/             # Provider abstraction
│   ├── payroll/               # Salary calculator
│   ├── auth.ts                # NextAuth config
│   ├── prisma.ts              # DB client
│   └── utils.ts               # Helpers
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Demo data
└── types/index.ts             # Shared types
```

---

## Key Business Rules Implemented

### Two-Company Separation
Every `Payment` and `Membership` record has a `company` field (`YOS_FITNESS` or `YOS_FITNESS_STUDIO`). Reports, dashboards, and filters all respect this. Members have a `primaryCompany` but can have payments under either entity.

### Inactive Member Automation
Runs daily via `/api/cron`. Rules:
- 4 days absent → friendly check-in message
- 7 days absent → re-engagement message  
- 14 days absent → strong follow-up

### Renewal Reminders
Runs daily via `/api/cron`. Triggers:
- 7 days before expiry
- 3 days before expiry
- 1 day before expiry
- Day of expiry
- Already expired (max once per 7 days)

### Payroll Calculation
Navigate to **Payroll** → select month → **Generate Payroll**.

| Salary Type | Logic |
|---|---|
| Fixed Monthly | Gross − (absent days × per-day rate) − (half days × 50% per-day) |
| Per Day | Present days + paid leave × per-day rate + half days × 50% |

Weekly offs and paid leave do not reduce salary.

---

## Messaging Providers

The system auto-selects the best available provider:

1. **WhatsApp Business API** — if `WHATSAPP_API_TOKEN` is set
2. **Twilio** — if `TWILIO_ACCOUNT_SID` is set  
3. **MSG91** — if `MSG91_AUTH_KEY` is set (popular in India)
4. **Manual** — fallback; messages are logged, staff copy-sends them

To connect a provider, add the relevant env vars to `.env`.

---

## Setting Up Daily Automation

### Vercel (recommended)

Add to `vercel.json`:
```json
{
  "crons": [{ "path": "/api/cron", "schedule": "30 2 * * *" }]
}
```
Vercel cron injects the secret automatically.

### VPS / Self-hosted

```bash
# Add to crontab (runs daily at 8:30 AM IST)
30 3 * * * curl -X POST https://yourdomain.com/api/cron -H "x-cron-secret: YOUR_CRON_SECRET"
```

### GitHub Actions

```yaml
on:
  schedule:
    - cron: '30 3 * * *'
jobs:
  automation:
    runs-on: ubuntu-latest
    steps:
      - run: curl -X POST ${{ secrets.APP_URL }}/api/cron -H "x-cron-secret: ${{ secrets.CRON_SECRET }}"
```

---

## Deployment

### Vercel (easiest)

```bash
npm install -g vercel
vercel --prod
```

Set all env vars in Vercel dashboard → Project → Settings → Environment Variables.

### Docker / VPS

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci && npm run build
CMD ["npm", "start"]
```

```bash
docker build -t yos-crm .
docker run -p 3000:3000 --env-file .env yos-crm
```

---

## Database Management

```bash
# Open visual DB browser
npm run db:studio

# Create a migration after schema changes
npm run db:migrate

# Reset and reseed (DESTROYS all data)
npm run db:reset && npm run db:seed
```

---

## Role Permissions

| Feature | Admin | Front Desk | Trainer | Accountant |
|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Members (view) | ✅ | ✅ | ✅ | ✅ |
| Members (add/edit) | ✅ | ✅ | — | — |
| Attendance | ✅ | ✅ | ✅ | — |
| Renewals | ✅ | ✅ | — | ✅ |
| Payments | ✅ | ✅ | — | ✅ |
| Employees | ✅ | — | — | ✅ |
| Emp. Attendance | ✅ | — | — | ✅ |
| Payroll | ✅ | — | — | ✅ |
| Reports | ✅ | — | — | ✅ |
| Messages | ✅ | ✅ | — | — |
| Automation | ✅ | — | — | — |
| Settings | ✅ | — | — | — |

---

## Version Roadmap

### V1 (this build) ✅
- Member management with full history
- Daily attendance marking
- Renewal tracking and alerts
- Payment recording with two-company split
- Employee attendance + payroll
- Automated inactive member follow-up
- Automated renewal reminders
- Reports and charts
- Role-based access control
- CSV export

### V2 — Suggested Next Steps
- WhatsApp Business API live integration (real send)
- Member self-service portal (view schedule, renew online)
- Online payment collection (Razorpay)
- Bulk SMS campaigns
- Class/group session scheduling
- Diet and workout plans per member
- Mobile app (React Native or PWA)
- Multi-branch support
- Tally/accounting export
