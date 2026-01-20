# 🚀 Cloudflare Deployment Guide

This guide will help you deploy your PURE gym app to Cloudflare Pages with D1 database.

---

## 📋 **Prerequisites**

Before you start, make sure you have:
- ✅ A Cloudflare account (free tier works!)
- ✅ Your code pushed to GitHub
- ✅ Node.js 20+ installed locally

---

## 🎯 **Step-by-Step Deployment**

### **Step 1: Install Wrangler CLI**

Wrangler is Cloudflare's command-line tool for managing deployments.

```bash
npm install -g wrangler
```

Verify installation:
```bash
wrangler --version
```

---

### **Step 2: Login to Cloudflare**

```bash
wrangler login
```

This will open a browser window asking you to authorize Wrangler. Click "Allow".

---

### **Step 3: Create D1 Database**

Create your production database:

```bash
wrangler d1 create pure-gym-db
```

This will output something like:
```
✅ Successfully created DB 'pure-gym-db'
Created your database using D1's new storage backend.

[[d1_databases]]
binding = "DB"
database_name = "pure-gym-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**IMPORTANT:** Copy the `database_id` - you'll need it in the next step!

---

### **Step 4: Update `wrangler.toml`**

Open `wrangler.toml` and update it with your database ID:

```toml
name = "pure-gym-app"
compatibility_date = "2024-01-01"

# Pages Configuration
pages_build_output_dir = ".vercel/output/static"

[env.production]
# D1 Database binding
[[env.production.d1_databases]]
binding = "DB"
database_name = "pure-gym-db"
database_id = "YOUR_DATABASE_ID_HERE"  # ← Paste your database_id here
```

---

### **Step 5: Initialize Database Schema**

Run the database migration to create all tables:

```bash
wrangler d1 execute pure-gym-db --remote --file=./lib/db/schema.sql
```

This creates:
- `users` table
- `workouts` table
- `registrations` table
- `workout_templates` table
- `polls` table
- `poll_options` table
- `poll_votes` table

---

### **Step 6: Create Your Admin Account**

Since this is a fresh database, you need to create the first admin user manually:

```bash
wrangler d1 execute pure-gym-db --remote --command="INSERT INTO users (email, password_hash, name, is_admin, created_at) VALUES ('nigglus@gmail.com', '\$2a\$10\$PLACEHOLDER', 'Dom Stone', 1, datetime('now'));"
```

**Note:** You'll set the actual password when you first log in and re-register through the app.

---

### **Step 7: Connect GitHub to Cloudflare Pages**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click **"Workers & Pages"** in the sidebar
3. Click **"Create Application"**
4. Choose **"Pages"** tab
5. Click **"Connect to Git"**
6. Select your GitHub repository: `dominiksteinacher/crossfit-app`
7. Click **"Begin setup"**

---

### **Step 8: Configure Build Settings**

In the Cloudflare Pages setup page:

**Framework preset:** `Next.js`

**Build command:**
```bash
npm run build
```

**Build output directory:**
```
.next
```

**Root directory:** (leave blank)

**Environment variables:** Click **"Add variable"** and add:

| Variable Name | Value |
|---------------|-------|
| `NODE_VERSION` | `20` |
| `JWT_SECRET` | `your-super-secret-jwt-key-here-change-this-in-production` |
| `ADMIN_EMAIL` | `nigglus@gmail.com` |
| `INVITE_CODE` | `PURE2026` |

**IMPORTANT:** Generate a secure JWT_SECRET:
```bash
openssl rand -base64 32
```
Use that output as your `JWT_SECRET` value.

---

### **Step 9: Bind D1 Database to Pages**

After your first deployment completes:

1. Go to your Pages project in Cloudflare dashboard
2. Click **"Settings"** tab
3. Scroll down to **"Functions"**
4. Click **"D1 database bindings"**
5. Click **"Add binding"**
6. Set:
   - **Variable name:** `DB`
   - **D1 database:** Select `pure-gym-db`
7. Click **"Save"**

---

### **Step 10: Deploy!**

Click **"Save and Deploy"**

Cloudflare will:
1. Clone your repo
2. Install dependencies
3. Build your Next.js app
4. Deploy it globally

Wait 2-5 minutes for the build to complete.

---

### **Step 11: Get Your Live URL**

Once deployed, you'll see your live URL:
```
https://pure-gym-app.pages.dev
```

Or you can use a custom domain (see below).

---

## 🌐 **Custom Domain Setup (Optional)**

### **Add Your Own Domain:**

1. In your Pages project, click **"Custom domains"**
2. Click **"Set up a custom domain"**
3. Enter your domain (e.g., `puregym.com`)
4. Follow the DNS instructions to:
   - Add a CNAME record pointing to your Pages URL
   - Or update your nameservers to Cloudflare

Cloudflare will automatically provision SSL certificates!

---

## 🔄 **Auto-Deployments**

Now, every time you push to your GitHub `main` branch, Cloudflare will automatically:
1. Detect the changes
2. Build your app
3. Deploy the new version

**Preview deployments:** Every Pull Request gets its own preview URL!

---

## 🛠️ **Managing Your Production Database**

### **View all users:**
```bash
wrangler d1 execute pure-gym-db --remote --command="SELECT * FROM users;"
```

### **View all workouts:**
```bash
wrangler d1 execute pure-gym-db --remote --command="SELECT * FROM workouts;"
```

### **Make a user admin:**
```bash
wrangler d1 execute pure-gym-db --remote --command="UPDATE users SET is_admin = 1 WHERE email = 'user@example.com';"
```

### **Reset a user's password:**
First, generate a bcrypt hash locally:
```bash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('newpassword', 10));"
```

Then update the database:
```bash
wrangler d1 execute pure-gym-db --remote --command="UPDATE users SET password_hash = '\$2a\$10\$...' WHERE email = 'user@example.com';"
```

---

## 🔐 **Environment Variables Management**

To update environment variables after deployment:

1. Go to your Pages project
2. Click **"Settings"**
3. Scroll to **"Environment variables"**
4. Click **"Add variable"** or edit existing ones
5. Click **"Save"**
6. Trigger a new deployment for changes to take effect

---

## 🐛 **Troubleshooting**

### **Build fails:**
- Check the build logs in Cloudflare dashboard
- Make sure `NODE_VERSION` is set to `20`
- Verify all environment variables are set

### **Database errors:**
- Check that D1 binding is configured correctly (variable name must be `DB`)
- Verify the database schema was initialized
- Check logs: `wrangler pages deployment tail`

### **Can't login:**
- Verify `JWT_SECRET` is set in environment variables
- Check that admin user was created in database
- Try re-registering with your admin email

### **Invite code not working:**
- Verify `INVITE_CODE` environment variable is set
- Check it's exactly `PURE2026` (case-sensitive)
- Make sure you redeployed after setting the variable

---

## 📊 **Monitoring**

### **View real-time logs:**
```bash
wrangler pages deployment tail
```

### **Check deployment status:**
```bash
wrangler pages deployment list
```

### **Analytics:**
Go to your Cloudflare dashboard → Pages → Your project → Analytics

You'll see:
- Page views
- Requests per second
- Error rates
- Bandwidth usage

---

## 💰 **Pricing**

**Cloudflare Pages:** FREE
- Unlimited bandwidth
- Unlimited requests
- 500 builds per month
- Automatic SSL

**Cloudflare D1:** FREE (generous limits)
- 5 GB storage
- 5 million rows read per day
- 100,000 rows written per day

For a small gym (10-50 members), you'll likely stay well within free tier limits!

---

## 🚀 **Quick Commands Reference**

```bash
# Login to Cloudflare
wrangler login

# Create database
wrangler d1 create pure-gym-db

# Initialize schema
wrangler d1 execute pure-gym-db --remote --file=./lib/db/schema.sql

# Run SQL command
wrangler d1 execute pure-gym-db --remote --command="SELECT * FROM users;"

# View logs
wrangler pages deployment tail

# List deployments
wrangler pages deployment list
```

---

## 📝 **Post-Deployment Checklist**

- [ ] Site is live and accessible
- [ ] Can register with invite code
- [ ] Admin user can log in
- [ ] Can create workouts
- [ ] Can view archive
- [ ] Can create polls
- [ ] Custom domain configured (if applicable)
- [ ] Environment variables are set
- [ ] D1 database binding is working

---

## 🎉 **You're Live!**

Your gym app is now running globally on Cloudflare's edge network!

Share your URL with your gym members:
```
https://your-app-name.pages.dev
```

And give them the invite code: **`PURE2026`**

---

## 📞 **Need Help?**

- Cloudflare Pages Docs: https://developers.cloudflare.com/pages/
- Cloudflare D1 Docs: https://developers.cloudflare.com/d1/
- Next.js on Cloudflare: https://developers.cloudflare.com/pages/framework-guides/nextjs/

---

**Last updated:** January 2026
