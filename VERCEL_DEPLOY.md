# Vercel Deployment Guide

## Quick Deploy Steps

### 1. Push to GitHub (if not already)

```bash
git init
git add .
git commit -m "Initial commit - Calendar app with email invites"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to https://vercel.com
2. Sign in with GitHub
3. Click "Add New Project"
4. Import your repository
5. Vercel will auto-detect Next.js settings ✅

### 3. Set Environment Variables in Vercel

In the Vercel project settings, add these environment variables:

```bash
# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Admin Email
ADMIN_EMAIL=your@email.com

# Resend Email Service
RESEND_API_KEY=re_H3PgqqQj_3qPPTZUJW3RaNZbnMQjSknvf
FROM_EMAIL=noreply@crossfit-app.com

# Node Environment
NODE_ENV=production
```

### 4. Add Neon PostgreSQL Database

Vercel can automatically provision a Neon database:

1. In your Vercel project dashboard
2. Go to "Storage" tab
3. Click "Create Database"
4. Select "Postgres (Neon)"
5. Click "Continue"
6. Vercel will automatically add `POSTGRES_URL` to your environment variables

### 5. Initialize Database Schema

After database is created, go to Neon dashboard and run this SQL:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create workouts table
CREATE TABLE IF NOT EXISTS workouts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  workout_type VARCHAR(100),
  date TIMESTAMP NOT NULL,
  max_participants INTEGER DEFAULT 4,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  sequence INTEGER DEFAULT 0
);

-- Create registrations table
CREATE TABLE IF NOT EXISTS registrations (
  id SERIAL PRIMARY KEY,
  workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  attended BOOLEAN DEFAULT FALSE,
  registered_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workout_id, user_id)
);

-- Create workout_templates table
CREATE TABLE IF NOT EXISTS workout_templates (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  workout_type VARCHAR(100),
  category VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  times_used INTEGER DEFAULT 0
);

-- Create polls table
CREATE TABLE IF NOT EXISTS polls (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  template_id INTEGER REFERENCES workout_templates(id),
  created_by INTEGER REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create poll_options table
CREATE TABLE IF NOT EXISTS poll_options (
  id SERIAL PRIMARY KEY,
  poll_id INTEGER REFERENCES polls(id) ON DELETE CASCADE,
  date TIMESTAMP NOT NULL,
  label VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create poll_votes table
CREATE TABLE IF NOT EXISTS poll_votes (
  id SERIAL PRIMARY KEY,
  poll_option_id INTEGER REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  voted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(poll_option_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);
CREATE INDEX IF NOT EXISTS idx_registrations_workout ON registrations(workout_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user ON registrations(user_id);
```

### 6. Deploy!

Click "Deploy" in Vercel. Your app will be live at:
`https://your-project-name.vercel.app`

## Testing Checklist

✅ Register your admin account (use ADMIN_EMAIL)  
✅ Create a workout  
✅ Check your email for calendar invite  
✅ Register another user  
✅ Test calendar view  
✅ Update a workout - check update emails  
✅ Test polls  

## Troubleshooting

### Database Connection Issues
- Check that `POSTGRES_URL` is set in Vercel
- Verify database tables are created in Neon dashboard

### Email Not Sending
- Verify `RESEND_API_KEY` is correct
- Check Resend dashboard for logs
- Make sure domain is not blocked

### Build Errors
- Check Vercel build logs
- Ensure all dependencies are in package.json

## Post-Deployment

1. Register with your admin email
2. Test all features
3. Invite team members
4. Set up custom domain (optional)

---

**Your app will now persist data and send real calendar invites!** 🚀
