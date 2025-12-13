@echo off
SETLOCAL EnableDelayedExpansion
COLOR 0A
TITLE One Click Computers - Quick Fix Deployment

echo.
echo ╔════════════════════════════════════════════╗
echo ║   ONE CLICK COMPUTERS - DEPLOY FIXES     ║
echo ╚════════════════════════════════════════════╝
echo.

:: Configuration
set DOMAIN=techelevate.news
set SSH_KEY=C:\Users\inbox\Downloads\oneclick-v2-key.pem
set REMOTE_PATH=/var/www/html/oneclick-computers

:: Files to upload (critical fixes only)
set FILES_TO_UPLOAD=^
assets/js/supabase-config.js ^
assets/js/config-auto.js ^
assets/js/product-grid-loader.js ^
assets/img/placeholder.svg ^
sql/supabase-schema-clean.sql ^
ERROR-FIX-SUMMARY.md

echo [1/4] Uploading fixed configuration files...
echo.

for %%F in (%FILES_TO_UPLOAD%) do (
    echo    → Uploading %%F...
    scp -i "%SSH_KEY%" "%%F" ubuntu@%DOMAIN%:%REMOTE_PATH%/%%F 2>nul
    if !ERRORLEVEL! EQU 0 (
        echo       ✓ Success
    ) else (
        echo       ✗ Failed
    )
)

echo.
echo [2/4] Creating product images directory...
ssh -i "%SSH_KEY%" ubuntu@%DOMAIN% "mkdir -p %REMOTE_PATH%/assets/img/products && chmod 755 %REMOTE_PATH%/assets/img/products"

echo.
echo [3/4] Setting permissions...
ssh -i "%SSH_KEY%" ubuntu@%DOMAIN% "chmod 644 %REMOTE_PATH%/assets/js/*.js && chmod 644 %REMOTE_PATH%/assets/img/*.svg"

echo.
echo [4/4] Restarting services...
ssh -i "%SSH_KEY%" ubuntu@%DOMAIN% "sudo systemctl restart apache2"

echo.
echo ════════════════════════════════════════════
echo ✓ DEPLOYMENT COMPLETE!
echo ════════════════════════════════════════════
echo.
echo NEXT STEPS:
echo.
echo 1. Apply SQL Schema:
echo    → Go to: https://supabase.com/dashboard
echo    → Open SQL Editor
echo    → Copy/paste sql/supabase-schema-clean.sql
echo    → Run query
echo.
echo 2. Test Your Site:
echo    → Frontend: https://%DOMAIN%
echo    → Admin: https://%DOMAIN%/admin/login.html
echo    → Email: admin@oneclick.com
echo    → Password: admin123
echo.
echo 3. Check Errors Fixed:
echo    → Press F12 in browser
echo    → Look for "Product Grid Loader using Supabase API"
echo    → Products should load from Supabase
echo    → No more "your-ec2-ip" errors
echo.
echo 4. Review Full Report:
echo    → Open ERROR-FIX-SUMMARY.md
echo    → Follow remaining action items
echo.
echo ════════════════════════════════════════════
echo.

pause

