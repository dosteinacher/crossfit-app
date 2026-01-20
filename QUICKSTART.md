# Quick Start Guide

## ⚠️ Node.js Version Requirement

This app requires **Node.js 20.9.0 or higher**. Your current version is 18.14.2.

### Update Node.js

**Option 1: Using nvm (recommended)**
```bash
# Install nvm if you don't have it
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node 20
nvm install 20
nvm use 20
nvm alias default 20
```

**Option 2: Download from nodejs.org**
Visit https://nodejs.org/ and download Node.js 20 LTS

### Verify Installation
```bash
node --version  # Should show v20.x.x
```

## Running the App

1. **Install dependencies**
```bash
npm install
```

2. **Configure environment variables**

Edit `.env.local`:
```bash
JWT_SECRET=change-this-to-a-random-secure-string
ADMIN_EMAIL=your@email.com
NODE_ENV=development
```

3. **Start development server**
```bash
npm run dev
```

4. **Open in browser**

Visit http://localhost:3000

5. **Create your admin account**

Register using the email you set in `ADMIN_EMAIL`

## First Steps

1. Register an account
2. Create your first workout
3. Test registration and attendance features
4. Invite your gym members!

## Mobile Access

The app is fully mobile-responsive. Just visit the URL on your phone!

## Need Help?

- Check the [README.md](README.md) for detailed documentation
- See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment
- Open an issue on GitHub if you encounter problems

## Common Issues

### "Module not found" errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### Port 3000 already in use
```bash
# Kill the process
lsof -ti:3000 | xargs kill

# Or use a different port
npm run dev -- -p 3001
```

### Database issues in development

The app uses an in-memory database for local development. Data resets when you restart the server. This is normal and intended for development.

---

Happy CrossFitting! 💪
