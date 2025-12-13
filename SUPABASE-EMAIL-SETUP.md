# Supabase Email Configuration Fix

## Issue
Registration shows errors:
- "Error sending confirmation email"
- "email rate limit exceeded"

## Root Cause
Supabase has email rate limits on the free tier and email confirmation is enabled by default.

## Solutions

### Option 1: Disable Email Confirmation (Development Only)
**Best for testing and development**

1. Go to Supabase Dashboard
2. Navigate to: **Authentication** → **Providers** → **Email**
3. Find: **"Confirm email"** toggle
4. **Turn it OFF** ❌
5. Click **Save**

**Result:** Users can register instantly without email verification.

---

### Option 2: Configure Custom SMTP (Production)
**Best for production - unlimited emails**

1. Go to Supabase Dashboard
2. Navigate to: **Project Settings** → **Auth** → **SMTP Settings**
3. Enable custom SMTP
4. Configure with your email provider:

#### Gmail Example:
```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP User: your-email@gmail.com
SMTP Password: [App Password]
Sender Email: your-email@gmail.com
Sender Name: One Click Computers
```

#### SendGrid Example:
```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Password: [Your SendGrid API Key]
Sender Email: noreply@yourdomain.com
Sender Name: One Click Computers
```

---

### Option 3: Wait for Rate Limit Reset
**If you hit the limit during testing**

- Supabase free tier: **3-4 emails per hour**
- Wait 1 hour and try again
- Or use a different email address

---

## Recommended Setup by Environment

### Development/Testing
```
✅ Disable email confirmation
✅ Faster testing
✅ No rate limits
```

### Staging
```
⚠️ Enable email confirmation
⚠️ Use custom SMTP (SendGrid free tier)
⚠️ Test email flow
```

### Production
```
✅ Enable email confirmation
✅ Custom SMTP with reliable provider
✅ Custom email templates
✅ Monitor delivery rates
```

---

## Code Changes Made

### 1. Added Email Redirect URL
```javascript
emailRedirectTo: window.location.origin + '/oneclick/account.html'
```
This ensures users are sent to the account page after clicking the email verification link.

### 2. Improved Error Messages
- Detects rate limit errors
- Shows user-friendly messages
- Provides alternative actions (login link)
- Shows success even if email fails (account still created)

---

## Testing Registration

### Test 1: With Email Confirmation Disabled
1. Fill registration form
2. Click "Create Account"
3. Should immediately redirect to account page
4. No email sent ✓

### Test 2: With Email Confirmation Enabled
1. Fill registration form
2. Click "Create Account"
3. Should show: "Please check your email..."
4. Check inbox for verification email
5. Click link in email
6. Should redirect to account page

---

## Email Rate Limit Error Handling

The code now handles these scenarios:

1. **Rate limit hit** → Shows waiting message with login link
2. **Email send fails but account created** → Shows success + contact support
3. **Email confirmation disabled** → Immediate login
4. **Email sent successfully** → Check inbox message

---

## Quick Fix Commands

### Check Current Settings
```sql
-- Run in Supabase SQL Editor
SELECT * FROM auth.config;
```

### Manually Confirm a User (Emergency)
```sql
-- Run in Supabase SQL Editor if user can't access email
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'user@example.com';
```

---

## Email Templates

To customize verification emails:

1. Go to: **Authentication** → **Email Templates**
2. Edit: **Confirm signup**
3. Customize HTML/text
4. Use variables: `{{ .ConfirmationURL }}`, `{{ .SiteURL }}`

---

## Best Practices

### For Production:
1. ✅ Use custom domain email (noreply@yourdomain.com)
2. ✅ Setup SPF and DKIM records
3. ✅ Monitor bounce rates
4. ✅ Keep SMTP credentials secure
5. ✅ Use environment variables

### For Development:
1. ✅ Disable email confirmation
2. ✅ Use test email addresses
3. ✅ Log email content to console (if needed)

---

## Troubleshooting

### "Email rate limit exceeded"
- **Wait:** 60 minutes for free tier reset
- **Or:** Disable email confirmation
- **Or:** Setup custom SMTP

### "Error sending confirmation email"
- **Check:** SMTP settings configured correctly
- **Check:** Sender email verified
- **Check:** Firewall not blocking port 587
- **Try:** Different SMTP provider

### User registered but can't login
```sql
-- Manually confirm in Supabase SQL Editor:
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'problematic@email.com';
```

---

## Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
- [SendGrid Free Tier](https://sendgrid.com/pricing/) - 100 emails/day free
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)

---

**Quick Action:** Go to Supabase Dashboard → Authentication → Providers → Email → **Disable "Confirm email"** for immediate testing!
