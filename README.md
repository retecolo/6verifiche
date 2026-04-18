# IPv6 Compliance Tracker

A web-based compliance tracking application for validating IPv6 support across network hardware platforms. Add vendors and models, then work through the 21-item compliance checklist derived from [`IPv6-compliance-superset.md`](IPv6-compliance-superset.md) — recording PASS / FAIL / PARTIAL / N/A results with supporting notes inline.

Built with **Next.js 16** (App Router), **Prisma 7** ORM, **SQLite**, and **Zod** input validation. Ships with a full REST API, Vitest test suite, and a Docker Compose setup optimised for IPv6-only deployment targets.

---

## Table of Contents

1. [Requirements](#requirements)
2. [Quick Start (Local Dev)](#quick-start-local-dev)
3. [Docker Compose (Production / IPv6-only host)](#docker-compose-production--ipv6-only-host)
4. [Seeding Test Cases](#seeding-test-cases)
5. [Using the Web UI](#using-the-web-ui)
6. [Running Tests](#running-tests)
7. [npm Scripts Reference](#npm-scripts-reference)
8. [API Reference](#api-reference)
9. [Database Schema](#database-schema)
10. [Project Structure](#project-structure)
11. [Extending the Application](#extending-the-application)

---

## Requirements

| Tool | Minimum version | Notes |
|------|----------------|-------|
| Node.js | 20.x LTS | |
| npm | 10.x (bundled with Node 20) | |
| Python 3 + make + g++ | — | Required to compile `better-sqlite3` native addon during `npm install` |
| Docker + Compose | 26+ | For IPv6 Compose support; optional for local dev |

> **Linux / Alpine note:** install `python3 make g++` before `npm install`. macOS uses Xcode CLT (usually pre-installed). Windows uses `node-gyp` with VS Build Tools.

---

## Quick Start (Local Dev)

```bash
# 1. Clone and enter the repo
git clone <repo-url>
cd v6-compliance

# 2. Install dependencies (includes Zod, Vitest, tsx, vite-tsconfig-paths)
npm install

# 3. Push the Prisma schema to the local SQLite database and generate the client
npx prisma db push
npx prisma generate

# 4. Seed all 21 compliance test cases from IPv6-compliance-superset.md
npm run seed

# 5. Start the development server
npm run dev
```

The app is now running at **http://localhost:3000**.

---

## Docker Compose (Production / IPv6-only host)

The Compose file is configured for an **IPv6-only deployment target**. The application container binds exclusively to `::` (IPv6 any-address) and the internal Docker network is an IPv6 ULA subnet (`fd00:c0ff:ee::/64`).

### First-time setup

```bash
# Build the image and start the container
docker compose up --build -d

# Seed test cases inside the running container
docker compose exec app node -e "$(cat scripts/seed.ts | npx tsx /dev/stdin)" 2>/dev/null || \
  docker compose exec app sh -c 'DATABASE_URL=file:/data/prod.db npx tsx scripts/seed.ts'
```

> **Simpler approach:** run the seed locally pointing at the bind-mounted volume, or add a one-time seed command to the Compose `command` override.

### Accessing the app

On an IPv6-only host:

```
http://[::1]:3000/          # loopback
http://[fd00:c0ff:ee::2]:3000/   # container address on the v6net network
```

On a dual-stack dev machine the `[::]:3000` port binding also accepts IPv4-mapped connections at `http://localhost:3000`.

### Persistent data

The SQLite database file is stored in a named Docker volume (`db-data`) mounted at `/data/prod.db` inside the container. It survives container restarts and image rebuilds.

```bash
# Stop without removing volumes
docker compose down

# Remove everything including the database volume
docker compose down -v
```

### Docker notes

- Next.js `output: 'standalone'` is enabled in `next.config.ts` — the Docker image runs the compiled `server.js` directly without a Node module install step at runtime.
- The `HOSTNAME=::` environment variable tells Next.js's standalone server to bind on all IPv6 interfaces.
- `npx prisma db push` runs automatically at container startup to apply any schema changes to the live database.

---

## Seeding Test Cases

The compliance test cases are defined in [`IPv6-compliance-superset.md`](IPv6-compliance-superset.md) and hard-coded (with descriptions) in [`scripts/seed.ts`](scripts/seed.ts).

```bash
npm run seed
```

The seed script is **idempotent** — re-running it updates descriptions in place without creating duplicates. It uses Prisma `upsert` keyed on `(category, name)`.

**21 test cases across 5 categories:**

| Category | Tests |
|----------|-------|
| Network Management & Telemetry | SSH, Telnet, RADIUS, TACACS+, Syslog, SNMP, NetFlow/IPFIX/sFlow, NTP, DNS |
| Core IPv6 Protocols & Features | ICMPv6 & Neighbor Discovery, Addressing & SLAAC/DHCPv6 |
| IPv6 Routing & Forwarding | RIPng, OSPFv3, IS-IS, MP-BGP |
| Security, Transition & Hardware | IPv6 ACLs & FHS, Hardware/ASIC Datapath, Transition Mechanisms |
| Connectivity & Validation | End-to-End Traffic, Log & Monitor Verification, Certifications & Standards |

---

## Using the Web UI

### Dashboard (`/`)

Overview of all platforms with pass-rate statistics. Per-category breakdown shows cumulative PASS / FAIL / PARTIAL / N/A counts across all platforms.

### Platforms (`/platforms`)

- **Add a platform** — fill in Vendor, Model Name, and OS/Firmware Version. The form validates input client-side and server-side (Zod).
- **Delete a platform** — cascades and removes all associated test results.
- **Compliance Matrix →** — link to the per-platform result entry page.

### Compliance Matrix (`/platforms/[id]`)

The main data-entry screen. Displays all 21 test cases grouped by category. For each row:

- **Status** dropdown — select PASS / FAIL / PARTIAL / N/A (or leave unset).
- **Notes / Evidence** text field — free-text supporting notes.
- Results **auto-save** immediately on status change, and 800 ms after the last keystroke in the notes field. A "✓ Saved" indicator confirms successful writes.
- The header shows a live pass-rate summary.

### Test Cases (`/testcases`)

Read-only view of all seeded test cases grouped by category, with result counts.

---

## Running Tests

```bash
# Run all tests once
npm test

# Watch mode (re-runs on file change)
npm run test:watch

# With coverage report
npm run test:coverage
```

Tests use a **separate `prisma/test.db`** database that is created and destroyed automatically by the global setup/teardown hooks. The main `dev.db` is never touched during tests.

**Test coverage:**
- `src/__tests__/validation.test.ts` — Zod schema boundary tests (no DB required)
- `src/__tests__/platform.service.test.ts` — Platform CRUD service tests
- `src/__tests__/testcase.service.test.ts` — TestCase CRUD + upsert tests
- `src/__tests__/result.service.test.ts` — Result upsert, matrix, and update tests

---

## npm Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js development server at http://localhost:3000 |
| `npm run build` | Production build (outputs Next.js standalone bundle) |
| `npm start` | Start the production Next.js server |
| `npm run lint` | Run ESLint via Next.js lint config |
| `npm test` | Run all Vitest tests once |
| `npm run test:watch` | Vitest in interactive watch mode |
| `npm run test:coverage` | Vitest with V8 coverage report |
| `npm run seed` | Seed/update compliance test cases from `scripts/seed.ts` |
| `npm run db:reset` | Delete `dev.db`, re-push schema, and re-seed (destructive) |

---

## API Reference

All endpoints accept and return `application/json`. List endpoints support `?page=N&limit=N` query parameters (default: page 1, limit 50, max 200).

### Platforms

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/platforms` | List platforms (paginated) |
| `POST` | `/api/platforms` | Create a platform |
| `GET` | `/api/platforms/:id` | Get platform + all results |
| `PUT` | `/api/platforms/:id` | Update platform fields |
| `DELETE` | `/api/platforms/:id` | Delete platform (cascades results) |
| `GET` | `/api/platforms/:id/results` | Full compliance matrix for one platform |

**POST /api/platforms body:**
```json
{
  "vendor": "Arista",
  "modelName": "7050X3-48YC12",
  "osVersion": "EOS 4.30.2F"
}
```

### Test Cases

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/testcases` | List test cases (paginated) |
| `POST` | `/api/testcases` | Create a test case |
| `GET` | `/api/testcases/:id` | Get a test case |
| `PUT` | `/api/testcases/:id` | Update a test case |
| `DELETE` | `/api/testcases/:id` | Delete a test case |

**POST /api/testcases body:**
```json
{
  "category": "IPv6 Routing & Forwarding",
  "name": "OSPFv3",
  "description": "Verify OSPFv3 neighbour adjacencies and route installation."
}
```

### Results

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/results` | List results (paginated) |
| `POST` | `/api/results` | Create or update a result (upsert) |
| `GET` | `/api/results/:id` | Get a result |
| `PUT` | `/api/results/:id` | Update status / detail |
| `DELETE` | `/api/results/:id` | Delete a result |

**POST /api/results body:**
```json
{
  "platformId": "<cuid>",
  "testCaseId": "<cuid>",
  "status": "PASS",
  "detail": "SSHv2 verified via GUA and link-local on all tested interfaces."
}
```

`status` must be one of: `PASS` | `FAIL` | `PARTIAL` | `N/A`

The POST endpoint is an **upsert** — posting the same `(platformId, testCaseId)` pair updates the existing record.

---

## Database Schema

Three models managed by Prisma:

```
Platform
  id          String    @id @default(cuid())
  vendor      String
  modelName   String
  osVersion   String
  createdAt   DateTime  @default(now())
  results     TestResult[]

TestCase
  id          String    @id @default(cuid())
  category    String
  name        String
  description String
  results     TestResult[]
  @@unique([category, name])
  @@index([category])

TestResult
  id          String    @id @default(cuid())
  platformId  String
  testCaseId  String
  status      String    // PASS | FAIL | PARTIAL | N/A
  detail      String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  @@unique([platformId, testCaseId])
  @@index([platformId])
  @@index([testCaseId])
```

To modify the schema: edit `prisma/schema.prisma`, then run `npx prisma db push`.

---

## Project Structure

```
v6-compliance/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── platforms/
│   │   │   │   ├── route.ts              # GET /api/platforms, POST
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts          # GET/PUT/DELETE /api/platforms/:id
│   │   │   │       └── results/route.ts  # GET /api/platforms/:id/results
│   │   │   ├── testcases/
│   │   │   │   ├── route.ts              # GET/POST /api/testcases
│   │   │   │   └── [id]/route.ts         # GET/PUT/DELETE /api/testcases/:id
│   │   │   └── results/
│   │   │       ├── route.ts              # GET/POST /api/results
│   │   │       └── [id]/route.ts         # GET/PUT/DELETE /api/results/:id
│   │   ├── platforms/
│   │   │   ├── page.tsx                  # Platform list + add form
│   │   │   └── [id]/page.tsx             # Compliance matrix
│   │   ├── testcases/page.tsx            # Test case browser
│   │   ├── page.tsx                      # Dashboard
│   │   ├── layout.tsx                    # Root layout with Nav
│   │   └── globals.css                   # Application-wide styles
│   ├── components/
│   │   ├── Nav.tsx                       # Sticky navigation bar
│   │   ├── PlatformForm.tsx              # Add-platform client form
│   │   ├── ResultCell.tsx                # Auto-saving result row
│   │   └── DeleteButton.tsx              # Confirm-then-delete client button
│   ├── lib/
│   │   ├── prisma.ts                     # Singleton PrismaClient
│   │   ├── validation.ts                 # Zod schemas
│   │   ├── platform.service.ts           # Platform CRUD
│   │   ├── testcase.service.ts           # TestCase CRUD
│   │   └── result.service.ts             # Result CRUD + matrix query
│   └── __tests__/
│       ├── globalSetup.ts                # Create/destroy test.db
│       ├── setup.ts                      # Clear tables before each test
│       ├── validation.test.ts
│       ├── platform.service.test.ts
│       ├── testcase.service.test.ts
│       └── result.service.test.ts
├── prisma/
│   └── schema.prisma
├── scripts/
│   └── seed.ts                           # Populate compliance test cases
├── Dockerfile                            # Multi-stage build (node:20-alpine)
├── docker-compose.yml                    # IPv6-only deployment config
├── .dockerignore
├── .github/workflows/ci.yml             # lint → test → build
├── vitest.config.ts
├── next.config.ts                        # standalone output + CORS headers
└── IPv6-compliance-superset.md          # Source of truth for test cases
```

---

## Extending the Application

**Adding new test cases:** edit `scripts/seed.ts` and re-run `npm run seed`. The upsert logic means existing results are not affected.

**Switching to PostgreSQL:** change `provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma`, update `DATABASE_URL` in `.env`, and run `npx prisma db push`. No application code changes required.

**Exporting results:** `GET /api/platforms/:id/results` returns the full compliance matrix as JSON, suitable for piping into `jq` or feeding a reporting script.

**Scripted result ingestion:** `POST /api/results` (upsert) is designed for programmatic use. A test automation script can POST results directly:

```bash
curl -6 -X POST http://[::1]:3000/api/results \
  -H "Content-Type: application/json" \
  -d '{"platformId":"<id>","testCaseId":"<id>","status":"PASS","detail":"Automated test passed"}'
```
