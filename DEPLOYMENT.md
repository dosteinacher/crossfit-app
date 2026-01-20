# Cloudflare Pages Deployment Guide

This guide will help you deploy your Crossfit Workout app to Cloudflare Pages.

## Prerequisites

- Cloudflare account (free tier works great)
- Wrangler CLI installed globally
- Your app code pushed to GitHub

## Step 1: Install Wrangler CLI

```bash
npm install -g wrangler
```

## Step 2: Login to Cloudflare

```bash
wrangler login
```

This will open a browser window for authentication.

## Step 3: Create D1 Database

```bash
wrangler d1 create crossfit-db
```

You'll get output like:
```
✅ Successfully created DB 'crossfit-db'

[[d1_databases]]
binding = "DB"
database_name = "crossfit-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

## Step 4: Update wrangler.toml

Update the `database_id` in `wrangler.toml` with the ID from Step 3:

```toml
[[d1_databases]]
binding = "DB"
database_name = "crossfit-db"
database_id = "your-actual-database-id-here"
```

## Step 5: Initialize Database Schema

```bash
wrangler d1 execute crossfit-db --file=./lib/db/schema.sql
```

Verify it worked:
```bash
wrangler d1 execute crossfit-db --command="SELECT name FROM sqlite_master WHERE type='table'"
```

## Step 6: Update Database Code for Production

Create `lib/db/cloudflare.ts`:

```typescript
import { User, Workout, Registration } from '../types';

export class CloudflareDatabase {
  constructor(private db: D1Database) {}

  // Implement the same methods as the mock database
  // but using D1 SQL queries instead of in-memory arrays
  
  async createUser(email: string, password_hash: string, name: string, is_admin: boolean) {
    const result = await this.db.prepare(
      'INSERT INTO users (email, password_hash, name, is_admin) VALUES (?, ?, ?, ?)'
    ).bind(email, password_hash, name, is_admin ? 1 : 0).run();
    
    return this.getUserByEmail(email);
  }

  // ... implement other methods
}
```

## Step 7: Configure Next.js for Cloudflare

Update `next.config.ts`:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export', // For static export
  // OR for edge runtime:
  experimental: {
    runtime: 'edge',
  },
};

export default nextConfig;
```

## Step 8: Build Your Application

```bash
npm run build
```

## Step 9: Deploy to Cloudflare Pages

### Option A: Using Wrangler

```bash
npx wrangler pages deploy .next
```

### Option B: Using Cloudflare Dashboard

1. Go to Cloudflare Dashboard > Pages
2. Click "Create a project"
3. Connect your GitHub repository
4. Configure build settings:
   - Build command: `npm run build`
   - Build output directory: `.next`
   - Root directory: `/`

## Step 10: Set Environment Variables

In Cloudflare Dashboard:
1. Go to Pages > Your Project > Settings > Environment Variables
2. Add these variables:
   - `JWT_SECRET`: A random secure string (use a password generator)
   - `ADMIN_EMAIL`: Your admin email address
   - `NODE_ENV`: `production`

## Step 11: Configure Custom Domain (Optional)

1. Go to Pages > Your Project > Custom Domains
2. Click "Set up a custom domain"
3. Enter your domain (e.g., `workouts.yourgym.com`)
4. Follow the DNS configuration instructions

## Testing Your Deployment

1. Visit your Cloudflare Pages URL (e.g., `crossfit-app.pages.dev`)
2. Register an account with your admin email
3. Create a test workout
4. Test registration and other features

## Troubleshooting

### Database Connection Issues

Check D1 binding:
```bash
wrangler d1 info crossfit-db
```

### Build Failures

Check build logs in Cloudflare Dashboard > Pages > Deployments

### Environment Variables Not Working

Make sure you've added them to BOTH:
- Production environment
- Preview environment (if testing previews)

## Updating Your Deployment

### Automatic Deployments (GitHub)

If connected to GitHub, every push to main will automatically deploy.

### Manual Deployments

```bash
npm run build
npx wrangler pages deploy .next
```

## Monitoring

Monitor your app:
- Cloudflare Dashboard > Analytics > Pages
- View request logs, errors, and performance metrics

## Cost Considerations

Cloudflare Free Tier includes:
- Unlimited bandwidth
- Unlimited requests
- 500 D1 writes/day (100K reads/day)
- 5GB D1 storage

This is more than enough for a small gym (10-50 members).

## Security Best Practices

1. **JWT Secret**: Use a strong, random secret
2. **HTTPS**: Always enabled on Cloudflare
3. **Rate Limiting**: Consider adding Cloudflare rate limiting rules
4. **CORS**: Configure properly if using custom domains

## Next Steps

- Set up custom domain
- Configure email notifications (using Cloudflare Email Workers)
- Set up monitoring and alerts
- Create backups of D1 database

---

Need help? Check the [Cloudflare Pages docs](https://developers.cloudflare.com/pages/) or open an issue on GitHub.
