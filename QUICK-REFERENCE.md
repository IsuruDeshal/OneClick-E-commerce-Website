# 🎯 QUICK REFERENCE CARD

## 🔑 CREDENTIALS

### Production Site
- **URL:** https://techelevate.news
- **Admin:** https://techelevate.news/admin/login.html

### Admin Login
- **Email:** admin@oneclick.com
- **Password:** admin123

### Supabase
- **Project URL:** https://pvnlavcuswjxhywbsodm.supabase.co
- **Dashboard:** https://supabase.com/dashboard
- **Anon Key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

### PayHere (Sri Lanka)
- **Merchant ID:** 1232664
- **Merchant Secret:** MTExNzc3MzI0NjIyMzM4NzIwOTgyMTg2MDU2ODUwMjEwMjMwMTEzNA==

### SSH/EC2
- **Domain:** techelevate.news
- **User:** ubuntu
- **Key:** C:\Users\inbox\Downloads\oneclick-v2-key.pem
- **Path:** /var/www/html/oneclick-computers

---

## ⚡ CRITICAL FIXES APPLIED

### ✅ What Was Fixed:
1. **API URL Errors** → Now uses Supabase REST API directly
2. **Placeholder Images** → Created placeholder.svg
3. **Supabase Config** → Centralized configuration file
4. **Database Schema** → Clean SQL with no duplicate errors
5. **Product Loading** → Direct from Supabase, no PHP needed

### 📁 Files Modified:
```
assets/js/supabase-config.js          ← NEW
assets/js/config-auto.js              ← FIXED
assets/js/product-grid-loader.js      ← FIXED
assets/img/placeholder.svg            ← NEW
sql/supabase-schema-clean.sql         ← NEW
```

---

## 🚀 IMMEDIATE NEXT STEPS

### 1. Apply Database Schema (2 min)
```
1. Open: https://supabase.com/dashboard
2. SQL Editor → Paste sql/supabase-schema-clean.sql
3. Run
```

### 2. Deploy Files (3 min)
```cmd
cd C:\xampp\htdocs\oneclick
DEPLOY-FIXES.bat
```

### 3. Test Connection (2 min)
```
Visit: https://techelevate.news/test-supabase.html
All should be green ✓
```

### 4. Create Admin User (3 min)
```
Supabase → Authentication → Add User
Email: admin@oneclick.com
Password: admin123
User Metadata: {"role": "admin"}
```

---

## 🧪 TESTING URLS

| Test | URL |
|------|-----|
| Connection Test | https://techelevate.news/test-supabase.html |
| Homepage | https://techelevate.news |
| Admin Login | https://techelevate.news/admin/login.html |
| Products API | https://pvnlavcuswjxhywbsodm.supabase.co/rest/v1/products |
| Session Check | https://techelevate.news/api/check-session-simple.php |

---

## 🐛 CONSOLE VERIFICATION

### Should See (Good):
```
✓ Supabase config loaded
✓ Supabase Client initialized
✓ Product Grid Loader using Supabase API
✓ Products loaded: 44
```

### Should NOT See (Bad):
```
✗ your-ec2-ip (placeholder error)
✗ Failed to load resource: net::ERR_NAME_NOT_RESOLVED
✗ 404 placeholder.png
✗ localhost:5000 connection refused (if auto-collect disabled)
```

---

## 📊 CURRENT STATUS

### ✅ Working:
- Supabase connection
- Product loading from database
- Homepage display
- Category pages
- Search functionality
- WhatsApp button (+94719159933)

### ⚠️ Needs Setup:
- Product images (upload to /assets/img/products/)
- Admin dashboard navigation (review sidebar JS)
- Add to cart (test cart-manager.js)
- User registration (apply SQL schema first)
- PayHere payment (configure credentials)

---

## 🎯 SUCCESS CHECKLIST

Quick 5-minute verification:

```
□ Run test-supabase.html → All green?
□ Homepage loads products?
□ No console errors (F12)?
□ Admin login works?
□ Products show in all sections?
□ WhatsApp button visible?
```

If all ✓ → You're good to go! 🎉

---

## 📞 COMMON COMMANDS

### Upload Files to EC2:
```cmd
scp -i "C:\Users\inbox\Downloads\oneclick-v2-key.pem" ^
  FILE_PATH ^
  ubuntu@techelevate.news:/var/www/html/oneclick-computers/
```

### SSH into EC2:
```cmd
ssh -i "C:\Users\inbox\Downloads\oneclick-v2-key.pem" ^
  ubuntu@techelevate.news
```

### Restart Apache:
```bash
sudo systemctl restart apache2
```

### Check Supabase Products:
```sql
SELECT COUNT(*) FROM products;
SELECT * FROM products LIMIT 5;
```

### Update Product Tags:
```sql
UPDATE products 
SET tags = ARRAY['top-selling'] 
WHERE featured = true;
```

---

## 📚 DOCUMENTATION

| Document | Purpose |
|----------|---------|
| ERROR-FIX-SUMMARY.md | Complete error analysis |
| IMMEDIATE-ACTION-PLAN.md | Step-by-step guide |
| QUICK-REFERENCE.md | This card |
| sql/supabase-schema-clean.sql | Database setup |

---

## 🆘 HELP

### Problem: Products not loading
**Fix:** Check test-supabase.html, verify Supabase connection

### Problem: Admin can't login
**Fix:** Create user in Supabase auth, set role='admin'

### Problem: Images 404
**Fix:** Upload to /assets/img/products/ or use Supabase Storage

### Problem: API errors
**Fix:** Deploy fixed JS files, check config-auto.js

---

**Print this card for quick reference! 📄**

