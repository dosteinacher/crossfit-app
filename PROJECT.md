# Crossfit-app — project context for humans & assistants

Concise facts about this repo so tools and teammates don’t rely on stale guesses.

## Product

- Internal **PURE / CrossFit-style gym** app: scheduled **workouts**, **sign-ups**, **attendance**, **dashboard**.
- **Calendar** route combines a **month/list calendar** with **polls** (scheduling votes).
- **Workout templates**, **archive** + **import** flows, optional **workout result** / difficulty.
- Optional **email**: **Resend** sends **`.ics` calendar invites** on create / update / register / delete when configured.

## Hosting & data

- Deployed on **Vercel** (see `VERCEL_DEPLOY.md`, `DEPLOYMENT.md`, `DEPLOY_QUICK.md`).
- **PostgreSQL** via **`POSTGRES_URL`** or **`DATABASE_URL`** (`@vercel/postgres`, Neon when provisioned from Vercel).
- **Without** a DB URL in dev: **in-memory mock** (`lib/db/mock.ts`) — data **lost on restart**.
- Schema / tables: **`lib/db/postgres.ts`** (`CREATE TABLE IF NOT EXISTS …`). Not Cloudflare D1.

## Auth & roles

- **JWT** in HTTP-only cookie **`auth-token`** (`lib/auth.ts`).
- Passwords: **SHA-256** via Web Crypto (not bcrypt in edge-friendly paths).
- **Admin** is set at **registration** when **`email === ADMIN_EMAIL`** — not “first registered user”.
- **Invite-only registration**: body field **`inviteCode`** must match **`INVITE_CODE`** env, default **`PURE2026`** if unset (`app/api/auth/register/route.ts`, `INVITE_CODE.md`).

## Routing note

- **`middleware.ts`** rewrites **`/` → `/home`** (root page also composes home).

## Where to read more

| Topic | File |
|--------|------|
| Overview & API sketch | `README.md` |
| Deploy + env (Neon, Resend) | `VERCEL_DEPLOY.md` |
| Invite code behavior | `INVITE_CODE.md` |
| Calendar + email behavior | `CALENDAR_IMPLEMENTATION.md` |
| Types | `lib/types.ts` |
| DB selection | `lib/db/index.ts` |

## Secrets (names only — never commit values)

- `JWT_SECRET`, `ADMIN_EMAIL`, `INVITE_CODE` (optional override)
- `POSTGRES_URL` / `DATABASE_URL`
- `RESEND_API_KEY`, `FROM_EMAIL` (optional email)
