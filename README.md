# SPL Stallions Premier League Registration

A full Next.js registration system for the SPL Stallions Premier League.

Features:
- Player registration with photo, Aadhaar photo, and payment screenshot
- Unique registration per phone number
- `₹300` registration proof only, no payment gateway
- Admin verification panel to update registration status
- Search players by name or phone
- PostgreSQL backend
- Optional free media storage via Supabase
- Local storage fallback under `public/uploads`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
copy .env.example .env.local
```

Update `DATABASE_URL` and Supabase keys as needed.

For production on Vercel or other IPv4/serverless hosts, use the Supabase pooler connection string from **Supabase Dashboard > Connect > Transaction pooler** instead of the direct `db.<project-ref>.supabase.co:5432` URL. Keep `DATABASE_SSL=true`.

3. Start PostgreSQL (if using local Docker):

```bash
docker compose up -d
```

Or skip this if using Supabase.

4. Run database migrations:

The migration scripts read `.env` / `.env.local` automatically, so you do not need to set `DATABASE_URL` manually each time.

**On Windows (PowerShell):**

```powershell
.\migrate.ps1 -Command up
```

**On macOS/Linux (Bash):**

```bash
export DATABASE_URL="your_database_url"
./migrate.sh up
```

Check migration status:

```powershell
.\migrate.ps1 -Command status
```

Or:

```bash
./migrate.sh status
```

5. Run the app:

```bash
npm run dev
```

`npm run dev` runs pending migrations before starting Next.js.

Open `http://localhost:3000`

## Pages

- `/register` — Player registration form (open for everyone)
- `/admin/login` — Admin email + password login
- `/admin` — Admin CRM with search, filter, and approve/reject controls

## Notes

- Duplicate phone registrations are blocked in the backend.
- After registration, the status starts as `pending`.
- Admin can verify payment by clicking **Verify**.
- Uploaded images are stored locally in `public/uploads` if Supabase is not configured.
- To use free Supabase storage, set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_BUCKET`.

## Database Migrations

Migrations are stored in the `migrations/` folder and tracked in the `schema_migrations` table.

### Creating a new migration

1. Create a new SQL file in `migrations/` with a descriptive name:

```
migrations/002_add_payment_status_column.sql
```

2. Write your SQL changes:

```sql
-- Migration: 002_add_payment_status_column
-- Description: Add payment_status column to track payment verification

ALTER TABLE registrations ADD COLUMN payment_status TEXT DEFAULT 'unverified';
```

3. Run migrations:

**Windows:**
```powershell
.\migrate.ps1 -Command up
```

**macOS/Linux:**
```bash
./migrate.sh up
```

4. Check status:

```powershell
.\migrate.ps1 -Command status
```

### Migration file naming

- Start with a number: `000_`, `001_`, `002_`, etc.
- Keep names descriptive: `001_create_registrations_table.sql`
- Migrations run in alphabetical order

## PostgreSQL table

The initial table schema is managed via migrations in the `migrations/` folder.


## Admin login protection

To protect the admin verification area, set an admin password and optional cookie name in your environment variables.

```env
ADMIN_PASSWORD=stallions123
ADMIN_SECRET=replace-with-a-secure-random-value
ADMIN_COOKIE_NAME=stallions_admin
```

Then visit `/admin/login` and sign in before using the verification dashboard.

## Optional free media storage

Use Supabase free tier for image storage. Create a project, add a storage bucket, and set these environment variables:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_BUCKET=player-media
```
