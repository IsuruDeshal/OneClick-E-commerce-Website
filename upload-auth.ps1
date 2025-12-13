$KEY = "C:\Users\inbox\Downloads\oneclick-v2-key.pem"
$DOMAIN = "techelevate.news"
$REMOTE = "/var/www/html/oneclick-computers"

Write-Host "Deploying authentication fix..." -ForegroundColor Cyan

Write-Host "Uploading auth-system.js..." -ForegroundColor Yellow
scp -i "$KEY" "C:\xampp\htdocs\oneclick\assets\js\auth-system.js" "ubuntu@${DOMAIN}:${REMOTE}/assets/js/"

Write-Host "Uploading HTML files..." -ForegroundColor Yellow
scp -i "$KEY" "C:\xampp\htdocs\oneclick\login.html" "ubuntu@${DOMAIN}:${REMOTE}/"
scp -i "$KEY" "C:\xampp\htdocs\oneclick\cart.html" "ubuntu@${DOMAIN}:${REMOTE}/"
scp -i "$KEY" "C:\xampp\htdocs\oneclick\checkout.html" "ubuntu@${DOMAIN}:${REMOTE}/"
scp -i "$KEY" "C:\xampp\htdocs\oneclick\index.html" "ubuntu@${DOMAIN}:${REMOTE}/"
scp -i "$KEY" "C:\xampp\htdocs\oneclick\account.html" "ubuntu@${DOMAIN}:${REMOTE}/"

Write-Host "Done" -ForegroundColor Green
Write-Host "Test at: https://techelevate.news/login.html" -ForegroundColor White
pause

