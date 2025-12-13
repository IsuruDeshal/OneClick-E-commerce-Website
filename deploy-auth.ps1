# Deploy Authentication Fix
$KEY = "C:\Users\inbox\Downloads\oneclick-v2-key.pem"
$DOMAIN = "techelevate.news"
$REMOTE = "/var/www/html/oneclick-computers"

Write-Host "`nDeploying authentication fix..." -ForegroundColor Cyan

Write-Host "`n[1/2] Uploading auth-system.js..." -ForegroundColor Yellow
scp -i "$KEY" "C:\xampp\htdocs\oneclick\assets\js\auth-system.js" "ubuntu@${DOMAIN}:${REMOTE}/assets/js/"

Write-Host "`n[2/2] Uploading updated HTML files..." -ForegroundColor Yellow
scp -i "$KEY" "C:\xampp\htdocs\oneclick\login.html" "ubuntu@${DOMAIN}:${REMOTE}/"
scp -i "$KEY" "C:\xampp\htdocs\oneclick\cart.html" "ubuntu@${DOMAIN}:${REMOTE}/"
scp -i "$KEY" "C:\xampp\htdocs\oneclick\checkout.html" "ubuntu@${DOMAIN}:${REMOTE}/"
scp -i "$KEY" "C:\xampp\htdocs\oneclick\index.html" "ubuntu@${DOMAIN}:${REMOTE}/"
scp -i "$KEY" "C:\xampp\htdocs\oneclick\account.html" "ubuntu@${DOMAIN}:${REMOTE}/"

Write-Host "`nSetting permissions..." -ForegroundColor Yellow
ssh -i "$KEY" "ubuntu@${DOMAIN}" "chmod 644 ${REMOTE}/assets/js/auth-system.js"

Write-Host "`n✓ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "`nTEST YOUR SITE:" -ForegroundColor Cyan
Write-Host "1. Visit: https://techelevate.news/login.html" -ForegroundColor White
Write-Host "2. Login with your account" -ForegroundColor White
Write-Host "3. Navigate to cart, products, etc." -ForegroundColor White
Write-Host "4. You should stay logged in" -ForegroundColor Green
Write-Host ""
pause

