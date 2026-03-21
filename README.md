# SwissTrust Dossier

A privacy-preserving verified tenant identity platform for the Swiss rental market.

## Architecture Decision Record

### Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR for `/c/[id]` QR pages, API routes, server components |
| Language | TypeScript | Type safety across DB↔API↔UI |
| Database | PostgreSQL via Supabase | Swiss region (eu-central-2), RLS, Auth + Storage bundled |
| ORM | Prisma 7 | Type-safe queries, migrations, driver adapter for PG |
| Auth | Supabase Auth | Row-level security integration |
| AI | Claude claude-opus-4-6 | Multilingual CH documents (DE/FR/IT), single-pass extraction |
| Email | Resend | Excellent DX, Swiss-compliant transactional email |
| QR | qrcode | Lightweight server-side generation |
| PDF | @react-pdf/renderer | React-based, no headless browser required |
| Styling | Tailwind CSS + custom CSS | Rapid dashboards + custom certificate page design |

### Key Design Decisions

1. **Certificate data tiers** — Three distinct data access levels (public/full/request) enforced server-side on every API call. No client-side trust.

2. **Signed URLs only** — Raw Supabase Storage paths are never exposed to clients. All document URLs are 15-minute signed URLs generated server-side.

3. **AI verification as service** — `DocumentVerificationService` is a clean abstraction. All Claude API calls go through `src/services/document-verification/`. Retries, fallbacks, and human escalation are all in one place.

4. **Ghost delivery** — Pre-seeded régie directory allows tenants to direct certificates to agencies that don't have accounts yet. Invitation emails fire at 1, 10, and 25 dossier thresholds.

5. **Trust Score is computed, not stored as truth** — Recomputed on every document change via `recomputeTenantScores()`. The stored value is always fresh.

## Setup

### Prerequisites

- Node.js 20+
- A Supabase project (Swiss region: eu-central-2 recommended)
- Anthropic API key
- Resend API key (optional for email)

### Installation

```bash
npm install
cp .env.example .env.local
# Fill in .env.local with your values
```

### Environment Variables

```
DATABASE_URL                   # Supabase PostgreSQL connection string (pooled)
NEXT_PUBLIC_SUPABASE_URL       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Supabase anon key (safe for client)
SUPABASE_SERVICE_ROLE_KEY      # Supabase service role key (server only)
ANTHROPIC_API_KEY              # Claude API key for document verification
RESEND_API_KEY                 # Resend for transactional email
NEXT_PUBLIC_APP_URL            # e.g. https://app.swisstrust.ch
NEXTAUTH_SECRET                # Random 32-byte secret
```

### Database Setup

```bash
# Run migrations
npx prisma migrate dev --name init

# Seed the database (25+ Swiss régies + test users)
npm run db:seed
```

### Supabase Storage Buckets

Create these buckets in your Supabase dashboard:
- `documents` — private (tenant documents)
- `qr-codes` — private (generated QR codes)
- `pdfs` — private (generated certificates)

Apply the RLS policies from `src/lib/supabase/rls-policies.sql`.

### Development

```bash
npm run dev
```

Visit:
- `http://localhost:3000` — Landing page
- `http://localhost:3000/auth/register` — Register
- `http://localhost:3000/admin/dashboard` — Admin (requires ADMIN role)

## Project Structure

```
src/
├── app/
│   ├── (public)/           # Public routes: landing, /c/[certificateId], régie profiles
│   ├── (auth)/             # Auth routes: login, register, invite
│   ├── (tenant)/           # Tenant dashboard (protected)
│   ├── (agent)/            # Agent/régie dashboard (protected)
│   ├── (landlord)/         # Landlord dashboard (protected)
│   ├── (admin)/            # Admin panel (protected)
│   └── api/                # API routes
├── components/
│   ├── ui/                 # Design system: Button, Badge, Card
│   ├── certificate/        # Certificate public view
│   ├── tenant/             # Tenant-specific components
│   ├── agent/              # Agent-specific components
│   └── shared/             # Shared components
├── lib/
│   ├── supabase/           # Server/client clients, storage helpers
│   ├── prisma/             # Prisma client with PG adapter
│   ├── email/              # Resend email templates (9 templates)
│   └── utils/              # Auth helpers, formatters, math
├── services/
│   ├── document-verification/  # Claude vision + prompts + validators
│   ├── certificates/           # Certificate generation + access control
│   ├── trust-score/            # Trust score + profile completeness
│   └── notifications/          # In-app notification service
└── types/                  # Shared TypeScript types
```

## Core Features

### Certificate Sharing Modes

| Mode | Who sees full dossier |
|---|---|
| **DIRECTED** | Only the specific régie/agent/owner pre-authorised by tenant |
| **OPEN** | Any verified property professional on SwissTrust |
| **ON_REQUEST** | Only after tenant approves (or auto-approve timeout) |

### Trust Score

- **A** — All core documents verified, clean Betreibungsauszug, income qualifies
- **B** — Most documents verified, no major issues
- **C** — Incomplete or pending verification
- **UNRATED** — No documents uploaded

### Document Verification (AI)

Claude claude-opus-4-6 analyses each document in a single pass:
1. Confirms document type
2. Extracts structured fields
3. Cross-validates against tenant's declared profile
4. Returns confidence score (0.0–1.0)

Thresholds: `≥0.90` → VERIFIED auto, `0.65–0.89` → human review queue, `<0.65` → REJECTED with reason.

### nFADP Compliance

- Every full dossier access logged in `certificate_accesses` table
- Sensitive documents served only via 15-minute signed Supabase Storage URLs
- Tenant can revoke any certificate at any time (immediate effect)
- Tenant can view complete access log for their data
- No PII in server logs

## Seeded Test Data

After `npm run db:seed`:
- **25+ Swiss régies** pre-seeded (all `has_account: false`)
- **Test tenant**: `tenant@example.com`
- **Admin**: `admin@swisstrust.ch`

Create passwords via Supabase Auth dashboard or the registration API.
