# Quick deploy (Vercel)

1. **Repo** → Push to GitHub → [vercel.com](https://vercel.com) → Import project → Next.js defaults.  
2. **Env** → `JWT_SECRET`, `ADMIN_EMAIL`, `NODE_ENV=production`, plus Resend keys if you use email (`VERCEL_DEPLOY.md`).  
3. **DB** → Vercel project → **Storage** → Create **Postgres (Neon)** → ensures `POSTGRES_URL`.  
4. **Schema** → Run SQL from **`VERCEL_DEPLOY.md`** in Neon if needed.  
5. **Deploy** → Production URL → Register with `ADMIN_EMAIL`.

Details: **[`VERCEL_DEPLOY.md`](./VERCEL_DEPLOY.md)**
