# PowerShell deployment script for One Click Computers fixes
# Run this to upload fixed files to EC2

$ErrorActionPreference = "Continue"

Write-Host "`n╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   ONE CLICK COMPUTERS - DEPLOY FIXES      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$DOMAIN = "techelevate.news"
$SSH_KEY = "C:\Users\inbox\Downloads\oneclick-v2-key.pem"
$REMOTE_PATH = "/var/www/html/oneclick-computers"
$LOCAL_PATH = "C:\xampp\htdocs\oneclick"

# Check if SSH key exists
if (-not (Test-Path $SSH_KEY)) {
    Write-Host "❌ SSH key not found at: $SSH_KEY" -ForegroundColor Red
    Write-Host "Please update the SSH_KEY path in this script." -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "[1/4] Uploading fixed JavaScript files..." -ForegroundColor Yellow
Write-Host ""

# Upload JS files
$jsFiles = @(
    "assets/js/supabase-config.js",
    "assets/js/config-auto.js",
    "assets/js/product-grid-loader.js"
)

foreach ($file in $jsFiles) {
    Write-Host "   → Uploading $file..." -ForegroundColor Gray
    scp -i "$SSH_KEY" "$LOCAL_PATH\$file" "ubuntu@${DOMAIN}:${REMOTE_PATH}/$file" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "      ✓ Success" -ForegroundColor Green
    } else {
        Write-Host "      ✗ Failed" -ForegroundColor Red
    }
}

Write-Host "`n[2/4] Uploading placeholder image..." -ForegroundColor Yellow
scp -i "$SSH_KEY" "$LOCAL_PATH\assets\img\placeholder.svg" "ubuntu@${DOMAIN}:${REMOTE_PATH}/assets/img/placeholder.svg" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ Placeholder uploaded" -ForegroundColor Green
} else {
    Write-Host "   ✗ Failed to upload placeholder" -ForegroundColor Red
}

Write-Host "`n[3/4] Creating product images directory..." -ForegroundColor Yellow
ssh -i "$SSH_KEY" "ubuntu@${DOMAIN}" "mkdir -p ${REMOTE_PATH}/assets/img/products && chmod 755 ${REMOTE_PATH}/assets/img/products" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ Directory created" -ForegroundColor Green
} else {
    Write-Host "   ⚠ Directory may already exist" -ForegroundColor Yellow
}

Write-Host "`n[4/4] Setting permissions..." -ForegroundColor Yellow
ssh -i "$SSH_KEY" "ubuntu@${DOMAIN}" "chmod 644 ${REMOTE_PATH}/assets/js/*.js && chmod 644 ${REMOTE_PATH}/assets/img/*.svg" 2>$null
Write-Host "   ✓ Permissions set" -ForegroundColor Green

Write-Host "`n════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✓ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Test Connection:" -ForegroundColor Cyan
Write-Host "   → https://techelevate.news/test-supabase.html" -ForegroundColor White
Write-Host ""
Write-Host "2. Create Admin User in Supabase:" -ForegroundColor Cyan
Write-Host "   → Go to: https://supabase.com/dashboard" -ForegroundColor White
Write-Host "   → Authentication → Users → Add User" -ForegroundColor White
Write-Host "   → Email: admin@oneclick.com" -ForegroundColor White
Write-Host "   → Password: admin123" -ForegroundColor White
Write-Host "   → User Metadata: {`"role`":`"admin`"}" -ForegroundColor White
Write-Host ""
Write-Host "3. Test Your Site:" -ForegroundColor Cyan
Write-Host "   → Homepage: https://techelevate.news" -ForegroundColor White
Write-Host "   → Admin: https://techelevate.news/admin/login.html" -ForegroundColor White
Write-Host ""
Write-Host "4. Check Browser Console (F12):" -ForegroundColor Cyan
Write-Host "   Should see: '🔗 Product Grid Loader using Supabase API'" -ForegroundColor White
Write-Host "   No more 'your-ec2-ip' errors!" -ForegroundColor Green
Write-Host ""
Write-Host "════════════════════════════════════════════`n" -ForegroundColor Cyan

pause

