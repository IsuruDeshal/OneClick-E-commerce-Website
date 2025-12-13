@echo off
TITLE One Click Computers - Deploy ALL Supabase Connections
COLOR 0A
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║   ONE CLICK COMPUTERS - DEPLOY SUPABASE CONNECTIONS     ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

set KEY=C:\Users\inbox\Downloads\oneclick-v2-key.pem
set DOMAIN=techelevate.news
set REMOTE=/var/www/html/oneclick-computers

echo [1/4] Uploading Supabase core scripts...
echo.
scp -i "%KEY%" "assets\js\supabase-config.js" ubuntu@%DOMAIN%:%REMOTE%/assets/js/
scp -i "%KEY%" "assets\js\supabase-init.js" ubuntu@%DOMAIN%:%REMOTE%/assets/js/
scp -i "%KEY%" "assets\js\auth-system.js" ubuntu@%DOMAIN%:%REMOTE%/assets/js/

echo.
echo [2/4] Uploading admin dashboard (NOW WITH SUPABASE!)...
echo.
scp -i "%KEY%" "admin\index.html" ubuntu@%DOMAIN%:%REMOTE%/admin/

echo.
echo [3/4] Uploading main frontend pages...
echo.
scp -i "%KEY%" "index.html" ubuntu@%DOMAIN%:%REMOTE%/
scp -i "%KEY%" "login.html" ubuntu@%DOMAIN%:%REMOTE%/
scp -i "%KEY%" "cart.html" ubuntu@%DOMAIN%:%REMOTE%/
scp -i "%KEY%" "checkout.html" ubuntu@%DOMAIN%:%REMOTE%/
scp -i "%KEY%" "account.html" ubuntu@%DOMAIN%:%REMOTE%/

echo.
echo [4/4] Setting permissions...
echo.
ssh -i "%KEY%" ubuntu@%DOMAIN% "chmod 644 %REMOTE%/assets/js/*.js; chmod 644 %REMOTE%/admin/*.html; chmod 644 %REMOTE%/*.html"

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║                  DEPLOYMENT COMPLETE!                    ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo ✓ Admin dashboard NOW CONNECTED to Supabase
echo ✓ Will show REAL product count (44 products)
echo ✓ Will load REAL orders from database
echo ✓ User authentication fixed (stays logged in)
echo.
echo ════════════════════════════════════════════════════════════
echo TESTING INSTRUCTIONS:
echo ════════════════════════════════════════════════════════════
echo.
echo 1. TEST ADMIN DASHBOARD:
echo    → Visit: https://techelevate.news/admin/login.html
echo    → Login: admin@oneclick.com / admin123
echo    → Check: Should show 44 products (not 5)
echo    → Console: Should say "Loaded X products from Supabase"
echo.
echo 2. TEST USER LOGIN:
echo    → Visit: https://techelevate.news/login.html
echo    → Login with your account
echo    → Navigate to cart, products, account
echo    → Should STAY LOGGED IN on all pages!
echo.
echo 3. CHECK BROWSER CONSOLE (F12):
echo    → Should see: "✅ Supabase connected"
echo    → Should see: "✅ Loaded X products from Supabase"
echo    → NO errors about "your-ec2-ip"
echo.
echo ════════════════════════════════════════════════════════════
echo.
echo 📖 Read CONNECTION-VERIFICATION-REPORT.md for full details
echo.
pause

