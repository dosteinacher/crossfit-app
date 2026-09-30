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

## Design system

- The app is **light**: white page (`pure-bg` `#ffffff`), lightly tinted grey cards (`pure-surface` `#eef0f3`) with a `gray-300` hairline, near-black ink (`pure-ink`). Long workout descriptions are the main thing people read, so readability wins over mood.
- Cards must carry their own **opaque** background. A transparent card on the page background reads as no card at all, and anything painted behind it bleeds through.
- Inputs, the navbar and popovers stay **literal white** (`bg-white`), so they lift off the tinted cards.
- The logo lime **`pure-green` `#c1ff00` is a fill-only signal** — buttons, calendar chips, active states — and always pairs with **dark text**. Lime *text* on white is unreadable, so accent text and icons use **`pure-accent-ink` `#415600`** instead.
- The `coastal-*` ramp is a cool slate scale for secondary text, labels, borders and decorative fills. `coastal-honey` stays a distinct semantic mid-tier stat/rating colour.
- Palette lives in **`tailwind.config.js`**; page/body, selection, scrollbar and watermark rules live in **`app/globals.css`**.
- **`/wod` (gym TV display) stays dark on purpose** — bright signage is unreadable across a room, and `WodScreenWake` paints near-black pixels. It opts out with the `.wod-screen` class (see the `body:has(.wod-screen)` rules in `globals.css`) and uses **literal** colour classes rather than the light tokens.
- Two logo assets ship: **`go-pure-logo.png`** is the original white + lime artwork and is used only where the background is dark (`/wod`, and the watermark on that screen). **`go-pure-logo-dark.png`** is the ink + olive variant for every light surface — navbar and page headers.
- The **global watermark** in `app/layout.tsx` is a `z-40` overlay, so it paints *above* page content. That only works on the dark `/wod` screen; `globals.css` hides it everywhere else. A watermark on a light page has to sit behind the content instead (see the dashboard, which has its own).

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
