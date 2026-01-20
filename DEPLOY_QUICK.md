# 🚀 Quick Deploy to Cloudflare - Cheat Sheet

Copy and paste these commands in order:

## 1️⃣ Install Wrangler
```bash
npm install -g wrangler
```

## 2️⃣ Login
```bash
wrangler login
```

## 3️⃣ Create Database
```bash
wrangler d1 create pure-gym-db
```
**→ Copy the `database_id` from the output!**

## 4️⃣ Update wrangler.toml
Edit `wrangler.toml` and paste your database_id on line 11.

## 5️⃣ Initialize Database
```bash
wrangler d1 execute pure-gym-db --remote --file=./lib/db/schema.sql
```

## 6️⃣ Create Admin User
```bash
wrangler d1 execute pure-gym-db --remote --command="INSERT INTO users (email, password_hash, name, is_admin, created_at) VALUES ('nigglus@gmail.com', '\$2a\$10\$PLACEHOLDER', 'Dom Stone', 1, datetime('now'));"
```

## 7️⃣ Generate JWT Secret
```bash
openssl rand -base64 32
```
**→ Copy this output! You'll need it for Cloudflare.**

## 8️⃣ Deploy on Cloudflare Dashboard

1. Go to: https://dash.cloudflare.com/
2. Click **Workers & Pages** → **Create Application** → **Pages**
3. Connect GitHub → Select your repo
4. Build settings:
   - Framework: **Next.js**
   - Build command: `npm run build`
   - Build output: `.next`
5. Environment variables:
   ```
   NODE_VERSION = 20
   JWT_SECRET = [paste the output from step 7]
   ADMIN_EMAIL = nigglus@gmail.com
   INVITE_CODE = PURE2026
   ```
6. Click **Save and Deploy**

## 9️⃣ Bind Database

After first deployment:
1. Go to your project → **Settings** → **Functions**
2. **D1 database bindings** → **Add binding**
3. Variable name: `DB`
4. D1 database: `pure-gym-db`
5. **Save**

## 🔟 Redeploy
1. Go to **Deployments** tab
2. Click the ⋮ menu on latest deployment
3. Click **Retry deployment**

## ✅ Done!

Your app is live at: `https://your-project.pages.dev`

Share with members:
- URL: `https://your-project.pages.dev`
- Invite code: `PURE2026`

---

**Full guide:** See `DEPLOYMENT.md` for detailed explanations.
