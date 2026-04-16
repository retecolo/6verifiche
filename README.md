# IPv6 Compliance Test Framework

A comprehensive web-based test framework explicitly designed to track and manage IPv6 compatibility across various network hardware platforms.

Built on the modern Next.js App Router, it provides:
1. **Frontend**: A React application ready for you to build forms and display test results.
2. **Backend**: A heavily RESTful API (Node.js/Next.js native) to programmatic interact with the database.
3. **Database**: A serverless, file-based SQLite database accessed via Prisma ORM.

## System Requirements
- Node.js (v18.17.0 or newer recommended)
- npm (Node Package Manager)

## Installation

1. **Navigate to the application directory:**
   ```bash
   cd 6verifiche
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Initialize the SQLite Database:**
   The database configuration is inside `prisma.config.ts`, pointing to a local file in `.env`. First, migrate the latest schema configurations (from `prisma/schema.prisma`) into the SQL file:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

## Usage (Development Server)

Start the Next.js development server to bring both the Web frontend and the API online.

```bash
npm run dev
```

The application will launch locally at **http://localhost:3000**.
- **Web UI:** Available at `http://localhost:3000/` (You can modify `src/app/page.tsx` to build your test reporting GUI).
- **API Backend:** Available at `http://localhost:3000/api/...`

---

## API Details

The application features a fully-functional JSON REST API for automation tools or integrations.

### 1. Platforms Endpoint

The `Platform` object represents a piece of hardware you are assessing (e.g. Arista 7050X3, Cisco Nexus 9k).

**Base Route:** `/api/platforms`

#### Get All Platforms + Their Test Results
Provides a heavily-nested JSON dump of all platforms and all associated compliance passes/fails.
- **Method:** `GET`
- **Request:** `None`
- **Response Example:**
```json
[
  {
    "id": "clzxyz123...",
    "vendor": "Arista",
    "modelName": "7050X3",
    "osVersion": "EOS 4.30.2F",
    "createdAt": "2024-04-16T12:00:00Z",
    "results": [
      {
        "id": "clzyxw234...",
        "testCaseId": "clzbcd567...",
        "status": "PASS",
        "detail": "Native SSHv2 verified via link-local and GUA.",
        "testCase": { ... }
      }
    ]
  }
]
```

#### Add a New Platform
Programmatically inject a new vendor switch/router to the testing database.
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Body Example:**
```json
{
  "vendor": "Juniper",
  "modelName": "QFX5120-48Y",
  "osVersion": "Junos 22.2R3"
}
```

### Expanding the API

You can easily expand the API to post new Test Cases and Results.
1. Open the `./src/app/api/` directory.
2. Inside `api/`, create a new folder named exactly what you want your URL path to be (e.g. `api/results/`).
3. Create a raw `route.ts` inside it.
4. Export functions named `GET`, `POST`, `PATCH`, etc.
For example, a script parsing python test logs could automatically `POST` test successes to `/api/results` to fill out the matrix!

## Database Modification
All database structures are defined via Prisma. If you wish to track additional properties for a platform:
1. Edit `prisma/schema.prisma`.
2. Run `npx prisma db push` to push the new requirements into the DB.
3. Automatically generated typings inside your code will be immediately updated!
