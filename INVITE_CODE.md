# Invite Code Setup

## Current Invite Code

Your current invite code is: **`PURE2026`**

This is the default code. Anyone who wants to register needs this code.

## How to Change the Invite Code

You can set a custom invite code by adding it to your `.env.local` file:

```bash
INVITE_CODE=YourCustomCode123
```

If you don't set one, it defaults to `PURE2026`.

## How to Share With Your Members

Give them:
1. The website URL (e.g., `http://192.168.1.106:3000` or your production URL)
2. The invite code: `PURE2026` (or your custom code)
3. Tell them to click "Register here" and enter the code

## Changing the Code

To change the invite code:

1. Open `.env.local` in your project
2. Add or update:
   ```
   INVITE_CODE=NewCode2026
   ```
3. Restart your dev server
4. Tell your members the new code

## Security Note

- Keep this code private - only share with people you want to have access
- You can change it anytime if it gets shared publicly
- The code is case-sensitive

## Example Registration Flow

1. User visits your site
2. Clicks "Register here"
3. Fills in:
   - Name: "John Doe"
   - Email: "john@example.com"
   - **Invite Code: "PURE2026"** ← Required!
   - Password: ••••••••
   - Confirm Password: ••••••••
4. If code is correct → Account created ✅
5. If code is wrong → Error: "Invalid invite code" ❌

---

**Your current default invite code is: `PURE2026`**
