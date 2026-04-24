# IPv6 Compliance Tracker

A web-based compliance tracking application for validating IPv6-only capabilities across network hardware platforms. Add vendors and models, then work through the **77-item compliance checklist** — recording PASS / FAIL / PARTIAL / N/A results with supporting notes inline.

The test suite covers the full IPv6-only stack: core protocols, all major routing protocols (OSPFv3, IS-IS, MP-BGP), MPLS (6PE, 6VPE, LDP), Segment Routing (SRv6, SR-MPLS), overlays (VXLAN, EVPN, GENEVE), multicast (MLDv2, PIM-SM/SSM, mVPN), high availability (BFD, VRRPv3, LFA), security (MACsec, uRPF, CoPP), modern management APIs (NETCONF, RESTCONF, gNMI, OpenConfig), and VPN/tunneling (IKEv2, GRE, L2TPv3). Each test case carries an RFC reference, a severity level (MANDATORY / RECOMMENDED / OPTIONAL), and searchable tags.

Upload a device's running configuration and the app cross-references it against the compliance test cases, highlighting relevant config lines for each test.

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
cd 6verifiche

# 2. Install dependencies
npm install

# 3. Create a .env file for the local database URL
echo 'DATABASE_URL="file:./dev.db"' > .env

# 4. Push the Prisma schema to the local SQLite database and generate the client
npx prisma db push
npx prisma generate

# 5. Seed all 69 compliance test cases
npm run seed

# 6. Start the development server
npm run dev
```

The app is now running at **http://localhost:3000**.

> **Note:** `.env` is listed in `.gitignore` and will not be committed. The `DATABASE_URL` must be set (either via `.env` or the environment) for `prisma db push`, `prisma generate`, and `npm run seed` to work.

---

## Docker Compose (Production / IPv6-only host)

The Compose file is configured for an **IPv6-only deployment target**. The application container binds exclusively to `::` (IPv6 any-address) and the internal Docker network is an IPv6 ULA subnet (`fd00:c0ff:ee::/64`).

### First-time setup

```bash
# Build the image and start the container
docker compose up --build -d

# Seed test cases inside the running container
docker compose exec app sh -c 'DATABASE_URL=file:/data/prod.db node scripts/seed.js'
```

### Accessing the app

On an IPv6-only host:

```
http://[::1]:3000/                    # loopback
http://[fd00:c0ff:ee::2]:3000/        # container address on the v6net network
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
- `scripts/setup-db.js` runs automatically at container startup. It applies the SQLite schema via `better-sqlite3` directly (idempotent — `CREATE TABLE IF NOT EXISTS`), with no dependency on the Prisma CLI or any TypeScript loader.

---

## Seeding Test Cases

Test cases are defined in [`scripts/seed.ts`](scripts/seed.ts) and derived from [`IPv6-compliance-superset.md`](IPv6-compliance-superset.md).

```bash
npm run seed
```

The seed script is **idempotent** — re-running it updates all metadata in place without creating duplicates or affecting existing test results. It upserts on the `(category, name)` unique key and syncs `description`, `rfcReference`, `severity`, and `tags` on every run.

**77 test cases across 13 categories:**

| Category | Count | Highlights |
|----------|-------|------------|
| Network Management & Telemetry | 9 | SSH, RADIUS, TACACS+, SNMP, syslog, NTP, DNS, NetFlow/IPFIX |
| Core IPv6 Protocols & Features | 10 | ICMPv6/ND, SLAAC/DHCPv6, extension headers, PMTUD, flow label, DHCPv6 relay, DHCPv6-PD relay, RA suppression, RDNSS/DNSSL/route-info RA options, RFC 8781 PREF64 |
| IPv6 Routing & Forwarding | 7 | RIPng, OSPFv3, IS-IS, MP-BGP, BGP ADD-PATH, BGP-LU, RFC 8950 (IPv4 NLRI/IPv6 next hop) |
| Security, Transition & Hardware | 7 | ACLs/FHS, simultaneous IPv4+IPv6 ACLs, ingress/egress ACL restrictions, ASIC datapath, NAT64, CoPP, uRPF |
| Connectivity & Validation | 3 | E2E traffic, log/monitor, certifications |
| MPLS & Label Switching | 5 | 6PE, 6VPE, LDPoIPv6, MPLS BFD, RSVP-TE |
| Segment Routing | 9 | SRv6 encap, endpoint behaviors, L3VPN, TE policy, IS-IS/OSPFv3 extensions, uSID, OAM, SR-MPLS |
| Overlay Networks & EVPN | 5 | VXLANv6, VXLAN EVPN, GENEVE, EVPN IRB, EVPN multi-homing |
| IPv6 Multicast | 5 | MLDv2, PIM-SM, PIM-SSM, mVPN/NG-mVPN, mLDP |
| High Availability & Resiliency | 5 | BFD, VRRPv3, NSF/graceful restart, ECMP, IP-FRR/LFA |
| Link Security (MACsec) | 3 | 802.1AE encryption, MKA key agreement, SRv6/VXLAN interop |
| Modern Management APIs & Telemetry | 5 | NETCONF, RESTCONF, gNMI/gRPC streaming, OpenConfig, gRIBI |
| VPN & Tunneling | 4 | IPsec/IKEv2, GREv6, L2TPv3, LDP pseudowires |

Each test case includes:
- **`rfcReference`** — the governing RFC(s) or IEEE standard (e.g. `"RFC 8754"`, `"IEEE 802.1AE"`)
- **`severity`** — `MANDATORY`, `RECOMMENDED`, or `OPTIONAL`
- **`tags`** — searchable labels (e.g. `["srv6", "segment-routing", "data-plane"]`)

---

## Using the Web UI

### Dashboard (`/`)

Overview of all platforms with pass-rate statistics. Per-category breakdown shows cumulative PASS / FAIL / PARTIAL / N/A counts across all platforms.

### Platforms (`/platforms`)

- **Add a platform** — fill in Vendor, Model Name, and OS/Firmware Version. The form validates input client-side and server-side (Zod).
- **Delete a platform** — cascades and removes all associated test results and config snapshots.
- **Compliance Matrix →** — link to the per-platform result entry page.

### Compliance Matrix (`/platforms/[id]`)

The main data-entry screen. Displays all 69 test cases grouped by category. For each row:

- **Status** dropdown — select PASS / FAIL / PARTIAL / N/A (or leave unset).
- **Notes / Evidence** text field — free-text supporting notes.
- Results **auto-save** immediately on status change, and 800 ms after the last keystroke in the notes field. A "✓ Saved" indicator confirms successful writes.
- The header shows a live pass-rate summary.

#### Configuration Snapshot panel

Below the compliance matrix is the **Configuration Snapshot** panel, which links config file content to test cases:

- **Upload** — drag-and-drop or click to browse for a plain-text config file (`.cfg`, `.conf`, `.txt`; max 5 MB). Multiple snapshots per platform are supported.
- **Select a snapshot** — click any listed snapshot to load it in the viewer on the right.
- **Find in Config** — once a snapshot is loaded, each compliance row shows a **Find** button. Clicking it highlights all lines in the config that are relevant to that test case (e.g. clicking the OSPFv3 row highlights lines containing `ospfv3`, `ospf3`, `ipv6 ospf`, etc.). The keyword sets for all test cases are defined in [`src/lib/config.keywords.ts`](src/lib/config.keywords.ts).
- **Search** — free-text search within the loaded file; matches highlighted in blue alongside the keyword highlights.
- **Matching only** toggle — collapses the viewer to show only matched lines, filtering out irrelevant config.
- **Delete** — removes a snapshot from the database (does not affect compliance results).

### Test Cases (`/testcases`)

Read-only view of all seeded test cases grouped by category, showing RFC references, severity levels, and tags alongside result counts.

### Admin (`/admin`)

The admin section provides a full management UI for test cases and categories. Access it via the **Admin** link in the navigation bar.

#### Test Cases (`/admin/testcases`)

- **List** — all test cases grouped by category with severity badge, RFC reference, and tags. Edit or delete any row.
- **New Test Case** — `/admin/testcases/new` — form with category autocomplete (datalist from existing categories), all fields, severity select, comma-separated tags.
- **Edit** — `/admin/testcases/:id/edit` — pre-populated form using the same component.
- **Delete** — removes the test case. Results referencing it are restricted (Prisma `onDelete: Restrict`) — delete associated results first.

#### Categories (`/admin/categories`)

- **List** — all categories with their test-case count.
- **Rename** — click *Rename* on any row, edit inline, press Enter or click *Save*. The rename is applied atomically to all test cases in that category via `updateMany`.

> **Auth note:** When `AUTH_MODE=none` (the default), a yellow warning banner is displayed at the top of every admin page as a reminder that the section is publicly accessible. Set `AUTH_MODE=cookie` or `AUTH_MODE=basic` to restrict access.

---

## Authentication

Access control is configured via the `AUTH_MODE` environment variable. All three modes share the same `AUTH_USER` / `AUTH_PASS` credentials; `AUTH_SECRET` is only required for cookie mode.

| `AUTH_MODE` | Description | Extra deps |
|---|---|---|
| `none` (default) | Open access — suitable for trusted networks or local dev | — |
| `basic` | HTTP Basic Auth on every request — works with browsers and `curl -u user:pass` | — |
| `cookie` | Login page at `/login`, signed 12-hour `httpOnly` session cookie | `jose` |

### Environment variables

| Variable | Required for | Description |
|---|---|---|
| `AUTH_MODE` | all | `none` \| `basic` \| `cookie` |
| `AUTH_USER` | `basic`, `cookie` | Username |
| `AUTH_PASS` | `basic`, `cookie` | Password |
| `AUTH_SECRET` | `cookie` | JWT signing secret — minimum 32 random characters |

### Local dev

```bash
# .env
AUTH_MODE=cookie
AUTH_USER=admin
AUTH_PASS=hunter2
AUTH_SECRET=dev-secret-not-for-production-use-32chars
```

### Docker

Edit the `environment` block in `docker-compose.yml`:

```yaml
AUTH_MODE: "cookie"
AUTH_USER: "admin"
AUTH_PASS: "changeme"
AUTH_SECRET: "replace-with-a-long-random-string-32-chars-min"
```

Generate a strong secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Adding nextauth (multi-user)

The `nextauth` stub is wired in `src/middleware.ts`. To activate it:

1. `npm install next-auth@5`
2. Add `User`, `Session`, `Account` tables to `prisma/schema.prisma` (see [Auth.js Prisma adapter docs](https://authjs.dev/getting-started/adapters/prisma))
3. Create `src/auth.ts` with your `NextAuth({...})` config
4. Replace the stub comment in `src/middleware.ts` with `export { auth as middleware } from '@/auth'`
5. Set `AUTH_MODE=nextauth` — the dispatch block in middleware will be bypassed by the Auth.js handler

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

| File | What it covers |
|------|---------------|
| `src/__tests__/validation.test.ts` | Zod schema boundary tests — no DB required |
| `src/__tests__/platform.service.test.ts` | Platform CRUD, pagination |
| `src/__tests__/testcase.service.test.ts` | TestCase CRUD + upsert, tags serialization |
| `src/__tests__/result.service.test.ts` | Result upsert, matrix query, update |
| `src/__tests__/config.service.test.ts` | ConfigSnapshot CRUD |
| `src/__tests__/config.keywords.test.ts` | Keyword matching, 1-based line numbers — no DB |
| `src/__tests__/auth.test.ts` | `signToken`/`verifyToken` round-trip, wrong secret, tampered token, missing `AUTH_SECRET` |
| `src/__tests__/middleware.test.ts` | All three middleware modes (`none`, `basic`, `cookie`) — public path bypass, redirect, WWW-Authenticate |
| `src/__tests__/auth.routes.test.ts` | Login endpoint (correct/wrong creds, cookie set), logout endpoint (cookie cleared) |

---

## npm Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js development server at http://localhost:3000 |
| `npm run build` | Production build (outputs Next.js standalone bundle) |
| `npm start` | Start the production Next.js server |
| `npm run lint` | Run ESLint across `src/` |
| `npm test` | Run all Vitest tests once |
| `npm run test:watch` | Vitest in interactive watch mode |
| `npm run test:coverage` | Vitest with V8 coverage report |
| `npm run seed` | Seed/update all 69 compliance test cases from `scripts/seed.ts` |
| `npm run db:reset` | Delete `dev.db`, re-push schema, and re-seed (destructive) |

---

## API Reference

All endpoints accept and return `application/json` unless noted. List endpoints support `?page=N&limit=N` query parameters (default: page 1, limit 50, max 200).

### Platforms

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/platforms` | List platforms (paginated) |
| `POST` | `/api/platforms` | Create a platform |
| `GET` | `/api/platforms/:id` | Get platform + all results |
| `PUT` | `/api/platforms/:id` | Update platform fields |
| `DELETE` | `/api/platforms/:id` | Delete platform (cascades results + config snapshots) |
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
  "category": "Segment Routing",
  "name": "SRv6 Encapsulation (H.Encaps / H.Insert)",
  "description": "Verify hardware-accelerated SRH imposition at line rate.",
  "rfcReference": "RFC 8754",
  "severity": "MANDATORY",
  "tags": ["srv6", "segment-routing", "data-plane"]
}
```

`severity` must be one of: `MANDATORY` | `RECOMMENDED` | `OPTIONAL` (defaults to `MANDATORY` if omitted).
`tags` is an array of strings (max 20 items, each max 50 chars). Defaults to `[]`.
`rfcReference` is optional free text (max 500 chars).

### Results

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/results` | List results (paginated) |
| `POST` | `/api/results` | Create or update a result (upsert) |
| `GET` | `/api/results/:id` | Get a result |
| `PUT` | `/api/results/:id` | Update status / detail / metadata |
| `DELETE` | `/api/results/:id` | Delete a result |

**POST /api/results body:**
```json
{
  "platformId": "<cuid>",
  "testCaseId": "<cuid>",
  "status": "PASS",
  "detail": "SRv6 H.Encaps verified in hardware at 400 Gbps line rate.",
  "testedAt": "2026-04-22T13:00:00Z",
  "testedBy": "lab-automation-v2",
  "firmwareBuild": "EOS 4.32.1F-12345678"
}
```

`status` must be one of: `PASS` | `FAIL` | `PARTIAL` | `N/A`

`testedAt`, `testedBy`, and `firmwareBuild` are optional. They let you record *when* the test was run, *who or what* ran it, and *which exact firmware build* was under test — useful for tracking regressions across firmware upgrades.

The POST endpoint is an **upsert** — posting the same `(platformId, testCaseId)` pair updates the existing record.

**Scripted result ingestion example:**
```bash
curl -6 -X POST http://[::1]:3000/api/results \
  -H "Content-Type: application/json" \
  -d '{
    "platformId": "<id>",
    "testCaseId": "<id>",
    "status": "PASS",
    "detail": "Automated test passed",
    "testedAt": "2026-04-22T13:00:00Z",
    "testedBy": "ci-pipeline",
    "firmwareBuild": "17.9.3a"
  }'
```

### Config Snapshots

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/platforms/:id/config` | List snapshots for a platform (metadata only — no content) |
| `POST` | `/api/platforms/:id/config` | Upload a config file (`multipart/form-data`, field `config`) |
| `GET` | `/api/platforms/:id/config/:snapshotId` | Get full snapshot including file content |
| `DELETE` | `/api/platforms/:id/config/:snapshotId` | Delete a snapshot |

**POST /api/platforms/:id/config** — `multipart/form-data`, field name `config`:

```bash
curl -6 -X POST http://[::1]:3000/api/platforms/<id>/config \
  -F "config=@/path/to/router.cfg"
```

Constraints: plain text, max **5 MB**. Content is stored verbatim in the SQLite database.

---

## Database Schema

Four models managed by Prisma. Schema lives in [`prisma/schema.prisma`](prisma/schema.prisma).

```
Platform
  id              String           @id @default(cuid())
  vendor          String
  modelName       String
  osVersion       String
  createdAt       DateTime         @default(now())
  results         TestResult[]
  configSnapshots ConfigSnapshot[]

TestCase
  id           String    @id @default(cuid())
  category     String
  name         String
  description  String
  rfcReference String?                          -- governing RFC(s) / IEEE standard
  severity     String    @default("MANDATORY")  -- MANDATORY | RECOMMENDED | OPTIONAL
  tags         String    @default("[]")         -- JSON-encoded string[]
  results      TestResult[]
  @@unique([category, name])
  @@index([category])
  @@index([severity])

TestResult
  id            String    @id @default(cuid())
  platformId    String
  testCaseId    String
  status        String                          -- PASS | FAIL | PARTIAL | N/A
  detail        String?
  testedAt      DateTime?                       -- when the test was executed
  testedBy      String?                         -- engineer name or automation system
  firmwareBuild String?                         -- exact image tested (e.g. "17.9.3a")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  platform      Platform  @relation(...)        -- onDelete: Cascade
  testCase      TestCase  @relation(...)        -- onDelete: Restrict
  @@unique([platformId, testCaseId])
  @@index([platformId])
  @@index([testCaseId])

ConfigSnapshot
  id         String   @id @default(cuid())
  platformId String
  filename   String
  content    String                             -- full plain-text file (max 5 MB)
  uploadedAt DateTime @default(now())
  platform   Platform @relation(...)            -- onDelete: Cascade
  @@index([platformId])
```

**Tags storage:** `tags` is stored as a JSON string in SQLite (e.g. `'["srv6","data-plane"]'`) and deserialized to `string[]` transparently by the service layer. The REST API always returns and accepts `tags` as a JSON array.

To modify the schema: edit `prisma/schema.prisma`, then run:
```bash
npx prisma db push
npx prisma generate
```

---

## Project Structure

```
6verifiche/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── platforms/
│   │   │   │   ├── route.ts              # GET /api/platforms, POST
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts          # GET/PUT/DELETE /api/platforms/:id
│   │   │   │       ├── results/route.ts  # GET /api/platforms/:id/results
│   │   │   │       └── config/
│   │   │   │           ├── route.ts      # GET/POST /api/platforms/:id/config
│   │   │   │           └── [snapshotId]/route.ts  # GET/DELETE snapshot
│   │   │   ├── testcases/
│   │   │   │   ├── route.ts              # GET/POST /api/testcases
│   │   │   │   └── [id]/route.ts         # GET/PUT/DELETE /api/testcases/:id
│   │   │   └── results/
│   │   │       ├── route.ts              # GET/POST /api/results (upsert)
│   │   │       └── [id]/route.ts         # GET/PUT/DELETE /api/results/:id
│   │   ├── platforms/
│   │   │   ├── page.tsx                  # Platform list + add form
│   │   │   └── [id]/page.tsx             # Compliance matrix + config panel (69 tests)
│   │   ├── testcases/page.tsx            # Test case browser
│   │   ├── admin/
│   │   │   ├── layout.tsx                # Admin sub-nav + AUTH_MODE warning
│   │   │   ├── page.tsx                  # Redirects to /admin/testcases
│   │   │   ├── testcases/
│   │   │   │   ├── page.tsx              # List all test cases (edit / delete)
│   │   │   │   ├── new/page.tsx          # Create test case form
│   │   │   │   └── [id]/edit/page.tsx    # Edit test case form
│   │   │   └── categories/page.tsx       # List + inline rename categories
│   │   ├── login/page.tsx                # Login page (AUTH_MODE=cookie only)
│   │   ├── page.tsx                      # Dashboard
│   │   ├── layout.tsx                    # Root layout with Nav
│   │   └── globals.css                   # Application-wide styles
│   ├── components/
│   │   ├── Nav.tsx                       # Sticky navigation bar (Dashboard / Platforms / Test Cases / Admin)
│   │   ├── PlatformForm.tsx              # Add-platform client form
│   │   ├── ResultCell.tsx                # Auto-saving result row (+ Find in Config)
│   │   ├── DeleteButton.tsx              # Confirm-then-delete client button
│   │   ├── TestCaseForm.tsx              # Create/edit test case (category datalist, tags)
│   │   ├── CategoryRenameRow.tsx         # Inline category rename row
│   │   ├── LoginForm.tsx                 # Cookie-mode login form
│   │   ├── PlatformComplianceSection.tsx # Client wrapper — lifts config/test-case state
│   │   ├── ConfigUpload.tsx              # Upload + manage config snapshots
│   │   └── ConfigViewer.tsx              # Config file viewer with keyword highlights
│   ├── lib/
│   │   ├── prisma.ts                     # Singleton PrismaClient (Prisma 7 + adapter)
│   │   ├── auth.ts                       # signToken / verifyToken (jose / HS256)
│   │   ├── validation.ts                 # Zod schemas for all API inputs
│   │   ├── platform.service.ts           # Platform CRUD
│   │   ├── testcase.service.ts           # TestCase CRUD + tags + category helpers
│   │   ├── result.service.ts             # Result CRUD + matrix query
│   │   ├── config.service.ts             # ConfigSnapshot CRUD
│   │   └── config.keywords.ts            # Keyword map + findMatchingLines()
│   ├── middleware.ts                      # AUTH_MODE dispatch (none / basic / cookie)
│   └── __tests__/
│       ├── globalSetup.ts                # Create/destroy prisma/test.db
│       ├── setup.ts                      # Clear all tables before each test
│       ├── validation.test.ts
│       ├── platform.service.test.ts
│       ├── testcase.service.test.ts
│       ├── result.service.test.ts
│       ├── config.service.test.ts
│       ├── config.keywords.test.ts
│       ├── auth.test.ts                  # signToken/verifyToken unit tests
│       ├── middleware.test.ts             # Middleware mode tests (none/basic/cookie)
│       └── auth.routes.test.ts           # Login + logout API route tests
├── prisma/
│   └── schema.prisma
├── scripts/
│   └── seed.ts                           # 69 compliance test cases across 13 categories
├── .env                                  # DATABASE_URL (git-ignored)
├── Dockerfile                            # Multi-stage build (node:20-alpine)
├── docker-compose.yml                    # IPv6-only deployment config
├── .dockerignore
├── .github/workflows/ci.yml             # lint → test → build CI pipeline
├── vitest.config.ts
├── next.config.ts                        # standalone output + CORS headers
└── IPv6-compliance-superset.md          # Source of truth for test case definitions
```

---

## Extending the Application

### Adding new test cases

Edit `scripts/seed.ts`, add entries to the `TEST_CASES` array with `category`, `name`, `description`, `rfcReference`, `severity`, and `tags`, then run:

```bash
npm run seed
```

The upsert logic means existing test results are never affected — only test case metadata is updated. Also add a matching entry to `TEST_CASE_KEYWORDS` in `src/lib/config.keywords.ts` — the key must match the `name` field exactly.

### Extending config keyword matching

Edit `src/lib/config.keywords.ts`. Each key is a test case name (must match `scripts/seed.ts` exactly); the value is an array of case-insensitive keyword strings tested against each config line. Vendor-specific terms (e.g. `crypto pki`, `set protocols ospf3`) can be added alongside the vendor-agnostic defaults.

### Adding custom test cases via API

```bash
curl -6 -X POST http://[::1]:3000/api/testcases \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Segment Routing",
    "name": "SRv6 FlexAlgo",
    "description": "Verify Flexible Algorithm (RFC 9350) with SRv6 data plane.",
    "rfcReference": "RFC 9350",
    "severity": "OPTIONAL",
    "tags": ["srv6", "flex-algo", "traffic-engineering"]
  }'
```

### Switching to PostgreSQL

Change `provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma`, update `DATABASE_URL` in `.env`, and run `npx prisma db push`. No application code changes required. The `tags` field (stored as a JSON string for SQLite compatibility) can be migrated to a native `Json` column type in PostgreSQL by changing the field type in the schema.

### Exporting results

`GET /api/platforms/:id/results` returns the full compliance matrix as JSON — the platform record plus every test case with its result (null if untested). Suitable for piping into `jq` or feeding a reporting script:

```bash
curl -6 -s http://[::1]:3000/api/platforms/<id>/results | \
  jq '.matrix[] | select(.result.status == "FAIL") | .testCase.name'
```

### Tracking firmware regressions

Each result record accepts `testedAt`, `testedBy`, and `firmwareBuild` fields. Automate ingestion from a CI pipeline and use the `detail` field to record test tool output. To track history across firmware versions, query results filtered by `firmwareBuild` or script against the API to compare two platform records representing the same hardware at different firmware versions.
