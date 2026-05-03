# Crossfit Workout Management App

A modern, full-stack web application for managing Crossfit workouts, participant registrations, and attendance tracking.

## Features

- **User Authentication**: Email/password login; registration requires an **invite code** (`INVITE_CODE` env, default `PURE2026` — see `INVITE_CODE.md`)
- **Workout Management**: Create, edit, and delete workouts; optional results/ratings; **.txt export** (`/api/export/workouts-txt`)
- **Calendar**: Month/list views, polls for scheduling (`/calendar`)
- **Registration System**: Register for upcoming workouts
- **Attendance Tracking**: Mark who attended (admin)
- **User Dashboard**: Stats and upcoming workouts
- **Collaborative Editing**: All logged-in users can edit workouts
- **Templates & polls**: Workout templates and date polls (API + UI on calendar flow)
- **Email (optional)**: Resend + `.ics` invites on create/update/register/delete when `RESEND_API_KEY` / `FROM_EMAIL` are set
- **Mobile Responsive**: Tailwind layouts
- **Role-Based Access**: Admin flag (`email === ADMIN_EMAIL` at registration); admin user management (`/admin/users`)

## Tech Stack

- **Frontend**: Next.js 16 with React and TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (e.g. Neon via Vercel) when `POSTGRES_URL` or `DATABASE_URL` is set; in-memory mock for local dev without a DB URL
- **Authentication**: JWT with HTTP-only cookies
- **Deployment**: [Vercel](https://vercel.com) (see `VERCEL_DEPLOY.md`)

## Getting Started

### Prerequisites

- Node.js 20.9.0 or higher (recommended)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/dosteinacher/crossfit-app.git
cd crossfit-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (minimum):
```bash
# .env.local
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ADMIN_EMAIL=your@email.com
# Optional: override default invite code (default is PURE2026)
# INVITE_CODE=your-private-code
# Optional: same DB as production locally
# POSTGRES_URL=...
# Optional: calendar emails (see VERCEL_DEPLOY.md / CALENDAR_IMPLEMENTATION.md)
# RESEND_API_KEY=...
# FROM_EMAIL=noreply@yourdomain.com
NODE_ENV=development
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### First Time Setup

1. Register with the **invite code** (default `PURE2026` unless you set `INVITE_CODE`)
2. Use the **same email** as `ADMIN_EMAIL` if you want that account to be **admin**
3. Create your first workout!

## Project Structure

```
crossfit-app/
├── app/
│   ├── api/              # API routes (auth, workouts, polls, templates, admin, export, …)
│   ├── dashboard/        # User dashboard
│   ├── calendar/         # Calendar + polls
│   ├── archive/          # Past workouts + import
│   ├── admin/users/      # Admin user management
│   ├── login/            # Login
│   ├── register/         # Registration (invite code)
│   ├── workouts/         # List, create, edit, import
│   │   ├── [id]/         # Workout detail/edit
│   │   └── create/       # Create workout
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Homepage
├── components/
│   ├── Navbar.tsx        # Navigation component
│   └── ui.tsx            # Reusable UI components
├── lib/
│   ├── auth.ts           # Authentication utilities
│   ├── db/               # Database layer
│   │   ├── index.ts      # Picks Postgres vs mock; delegates to adapter
│   │   ├── postgres.ts   # Production DB (tables created on first use)
│   │   └── mock.ts       # In-memory dev database
│   └── types.ts          # TypeScript type definitions
└── public/               # Static assets
```

## Database Schema

PostgreSQL tables created in `lib/db/postgres.ts` include:

- **users**, **workouts** (with `sequence` for calendar updates), **registrations**
- **workout_templates**, **polls**, **poll_options**, **poll_votes**

The in-memory **mock** DB (`lib/db/mock.ts`) mirrors these features for local dev; it also keeps a simple **workout edit log** in memory only (not persisted in Postgres).

**Note:** There is no `workout_edits` table in PostgreSQL; the `WorkoutEdit` type exists mainly for mock/history-style tracking.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/session` - Get current session

### Workouts
- `GET /api/workouts` - List all workouts
- `POST /api/workouts` - Create workout
- `GET /api/workouts/[id]` - Get workout details
- `PUT /api/workouts/[id]` - Update workout
- `DELETE /api/workouts/[id]` - Delete workout (admin only)

### Registrations
- `POST /api/workouts/[id]/register` - Register for workout
- `DELETE /api/workouts/[id]/register` - Unregister from workout
- `POST /api/workouts/[id]/attendance` - Mark attendance (admin only)

### User
- `GET /api/user/stats` - Get user statistics

### Other (non-exhaustive)
- `GET /api/workouts/today` — today’s workout(s)
- `POST /api/workouts/[id]/result` — save workout result
- `GET/POST /api/polls`, `GET/PATCH/DELETE /api/polls/[id]`, `POST /api/polls/vote`, poll options routes
- `GET/POST /api/templates`, `GET/PATCH/DELETE /api/templates/[id]`
- `GET /api/users` — list users (authenticated; used for dropdowns, etc.)
- `GET/POST /api/admin/users`, `PATCH/DELETE /api/admin/users/[id]`
- `GET /api/export/workouts-txt` — export workouts as text

## Deployment (Vercel)

Deploy as a standard Next.js app on Vercel: connect the Git repo, add environment variables (`JWT_SECRET`, `ADMIN_EMAIL`, email keys if used), and attach a Postgres database (Vercel Storage → Neon sets `POSTGRES_URL` automatically).

**Step-by-step:** see [`VERCEL_DEPLOY.md`](./VERCEL_DEPLOY.md).

## Local Development

Without `POSTGRES_URL` / `DATABASE_URL`, the app uses an in-memory mock database:

- No database setup required
- Data is lost when the server restarts

With a Postgres URL in `.env.local`, the app uses the same Postgres adapter as production.

## Features Roadmap

Already in the app (not exhaustive): calendar emails via Resend, templates, polls, `.txt` export.

Ideas for later:

- [ ] Automated workout **reminder** emails (distinct from calendar `.ics` invites)
- [ ] Richer **PR / performance** tracking
- [ ] Photo uploads for workouts
- [ ] Social features (comments, likes)
- [ ] Mobile app (React Native)

## Maintainer context

For stack, auth, invite codes, and deployment facts kept in sync with the codebase, see **[`PROJECT.md`](./PROJECT.md)**. Cursor picks up **`.cursor/rules/crossfit-app.mdc`** automatically.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for your Crossfit gym!

## Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ for the Crossfit community
