# Deploy Authentication Fix to EC2
$ErrorActionPreference = "Continue"

Write-Host "`n╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   DEPLOY AUTHENTICATION FIX               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$DOMAIN = "techelevate.news"
$SSH_KEY = "C:\Users\inbox\Downloads\oneclick-v2-key.pem"
$REMOTE = "/var/www/html/oneclick-computers"
$LOCAL = "C:\xampp\htdocs\oneclick"

# Check SSH key
if (-not (Test-Path $SSH_KEY)) {
    Write-Host "❌ SSH key not found" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "[1/3] Uploading auth-system.js..." -ForegroundColor Yellow
scp -i "$SSH_KEY" "$LOCAL\assets\js\auth-system.js" "ubuntu@${DOMAIN}:${REMOTE}/assets/js/auth-system.js"
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ auth-system.js uploaded" -ForegroundColor Green
} else {
    Write-Host "   ✗ Failed to upload auth-system.js" -ForegroundColor Red
}

Write-Host "`n[2/3] Uploading updated pages..." -ForegroundColor Yellow

$pages = @(
    "login.html",
    "cart.html",
    "checkout.html",
    "index.html",
    "account.html",
    "addresses.html",
    "wishlist.html"
)

foreach ($page in $pages) {
    Write-Host "   → Uploading $page..." -ForegroundColor Gray
    scp -i "$SSH_KEY" "$LOCAL\$page" "ubuntu@${DOMAIN}:${REMOTE}/$page" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "      ✓ Success" -ForegroundColor Green
    } else {
        Write-Host "      ✗ Failed" -ForegroundColor Red
    }
}

Write-Host "`n[3/3] Setting permissions..." -ForegroundColor Yellow
ssh -i "$SSH_KEY" "ubuntu@${DOMAIN}" "chmod 644 ${REMOTE}/assets/js/auth-system.js; chmod 644 ${REMOTE}/*.html" 2>$null
Write-Host "   ✓ Permissions set" -ForegroundColor Green

Write-Host "`n════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✓ AUTHENTICATION FIX DEPLOYED!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "TESTING STEPS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Clear browser cache (Ctrl + Shift + Delete)" -ForegroundColor White
Write-Host ""
Write-Host "2. Test Login:" -ForegroundColor Cyan
Write-Host "   → Visit: https://techelevate.news/login.html" -ForegroundColor White
Write-Host "   → Login with your credentials" -ForegroundColor White
Write-Host ""
Write-Host "3. Test Session Persistence:" -ForegroundColor Cyan
Write-Host "   → Navigate to: https://techelevate.news" -ForegroundColor White
Write-Host "   → Navigate to: https://techelevate.news/cart.html" -ForegroundColor White
Write-Host "   → Navigate to: https://techelevate.news/account.html" -ForegroundColor White
Write-Host "   → You should stay logged in on all pages!" -ForegroundColor Green
Write-Host ""
Write-Host "4. Test Page Refresh:" -ForegroundColor Cyan
Write-Host "   → Press F5 on any page" -ForegroundColor White
Write-Host "   → You should still be logged in!" -ForegroundColor Green
Write-Host ""
Write-Host "5. Check Browser Console (F12):" -ForegroundColor Cyan
Write-Host "   → Should see: '✅ User authenticated: your@email.com'" -ForegroundColor White
Write-Host "   → No login errors!" -ForegroundColor Green
Write-Host ""
Write-Host "════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "📖 Read AUTH-FIX-COMPLETE.md for full details" -ForegroundColor Yellow
Write-Host ""

pause

