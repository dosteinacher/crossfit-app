# Crossfit Workout Management App

A modern, full-stack web application for managing Crossfit workouts, participant registrations, and attendance tracking.

## Features

- **User Authentication**: Secure email/password registration and login
- **Workout Management**: Create, edit, and delete workouts
- **Registration System**: Register for upcoming workouts
- **Attendance Tracking**: Track who attended each workout (admin feature)
- **User Dashboard**: View personal stats and upcoming workouts
- **Collaborative Editing**: All users can edit workouts
- **Mobile Responsive**: Fully optimized for mobile devices
- **Role-Based Access**: Admin controls for managing the platform

## Tech Stack

- **Frontend**: Next.js 16 with React and TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Cloudflare D1 (SQLite) / In-memory for local development
- **Authentication**: JWT with HTTP-only cookies
- **Deployment**: Cloudflare Pages

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

3. Set up environment variables:
```bash
# .env.local
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ADMIN_EMAIL=your@email.com
NODE_ENV=development
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### First Time Setup

1. Register a new account using the email you set in `ADMIN_EMAIL`
2. This account will have admin privileges
3. Create your first workout!

## Project Structure

```
crossfit-app/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── workouts/     # Workout CRUD endpoints
│   │   └── user/         # User stats endpoints
│   ├── dashboard/        # User dashboard page
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   ├── workouts/         # Workout pages
│   │   ├── [id]/         # Individual workout detail/edit
│   │   └── create/       # Create workout page
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Homepage
├── components/
│   ├── Navbar.tsx        # Navigation component
│   └── ui.tsx            # Reusable UI components
├── lib/
│   ├── auth.ts           # Authentication utilities
│   ├── db/               # Database layer
│   │   ├── index.ts      # Database operations
│   │   └── schema.sql    # Database schema
│   └── types.ts          # TypeScript type definitions
└── public/               # Static assets
```

## Database Schema

The application uses four main tables:

- **users**: User accounts with authentication
- **workouts**: Workout information and schedules
- **registrations**: User registrations for workouts
- **workout_edits**: Log of workout modifications

See `lib/db/schema.sql` for the complete schema.

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

## Deployment to Cloudflare Pages

### 1. Install Wrangler CLI
```bash
npm install -g wrangler
```

### 2. Login to Cloudflare
```bash
wrangler login
```

### 3. Create D1 Database
```bash
wrangler d1 create crossfit-db
```

Copy the database ID and update `wrangler.toml`:
```toml
database_id = "your-database-id"
```

### 4. Initialize Database
```bash
wrangler d1 execute crossfit-db --file=./lib/db/schema.sql
```

### 5. Deploy to Cloudflare Pages
```bash
npm run build
npx wrangler pages deploy .next
```

### 6. Set Environment Variables

In Cloudflare Dashboard > Pages > Settings > Environment Variables:
- `JWT_SECRET`: Your secret key
- `ADMIN_EMAIL`: Admin email address
- `NODE_ENV`: production

## Local Development

The application uses an in-memory mock database for local development. This means:
- No database setup required for development
- Data is lost when the server restarts
- Perfect for testing and development

For production, the same code automatically uses Cloudflare D1.

## Features Roadmap

- [ ] Email notifications for workout reminders
- [ ] Workout templates library
- [ ] Performance tracking (PRs)
- [ ] Photo uploads for workouts
- [ ] Social features (comments, likes)
- [ ] Export workout history
- [ ] Mobile app (React Native)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for your Crossfit gym!

## Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ for the Crossfit community
