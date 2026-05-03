# Production deployment (Vercel)

This app is deployed on **[Vercel](https://vercel.com)** with **PostgreSQL** (commonly **Neon**, provisioned from Vercel’s Storage tab). The runtime uses `@vercel/postgres` when `POSTGRES_URL` or `DATABASE_URL` is set (`lib/db/index.ts` → `lib/db/postgres.ts`).

## Full guide

Use **[`VERCEL_DEPLOY.md`](./VERCEL_DEPLOY.md)** for:

- Importing the GitHub repo and Next.js settings  
- Required environment variables (`JWT_SECRET`, `ADMIN_EMAIL`, email keys, etc.)  
- Creating a Vercel Postgres (Neon) database and initializing tables  
- Troubleshooting  

## Quick checklist

1. Push code to GitHub and connect the repo in Vercel.  
2. Add env vars in the Vercel project (match what you use locally in `.env.local`).  
3. Create **Storage → Postgres** so `POSTGRES_URL` is available to the app.  
4. Run the SQL from `VERCEL_DEPLOY.md` in the Neon console if tables are not created automatically.  
5. Deploy; register with `ADMIN_EMAIL` for the first admin user.

Older instructions that referenced Cloudflare Pages / D1 are obsolete for this project.
