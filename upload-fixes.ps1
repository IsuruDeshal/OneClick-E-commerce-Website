# Simple deployment script
$KEY = "C:\Users\inbox\Downloads\oneclick-v2-key.pem"
$DOMAIN = "techelevate.news"
$REMOTE = "/var/www/html/oneclick-computers"
$LOCAL = "C:\xampp\htdocs\oneclick"

Write-Host "Uploading fixed files to EC2..." -ForegroundColor Green

# Upload JS files
Write-Host "Uploading JavaScript files..."
scp -i "$KEY" "$LOCAL\assets\js\supabase-config.js" "ubuntu@${DOMAIN}:${REMOTE}/assets/js/supabase-config.js"
scp -i "$KEY" "$LOCAL\assets\js\config-auto.js" "ubuntu@${DOMAIN}:${REMOTE}/assets/js/config-auto.js"
scp -i "$KEY" "$LOCAL\assets\js\product-grid-loader.js" "ubuntu@${DOMAIN}:${REMOTE}/assets/js/product-grid-loader.js"

# Upload placeholder
Write-Host "Uploading placeholder image..."
scp -i "$KEY" "$LOCAL\assets\img\placeholder.svg" "ubuntu@${DOMAIN}:${REMOTE}/assets/img/placeholder.svg"

# Upload test file
Write-Host "Uploading test file..."
scp -i "$KEY" "$LOCAL\test-supabase.html" "ubuntu@${DOMAIN}:${REMOTE}/test-supabase.html"

# Set permissions
Write-Host "Setting permissions..."
ssh -i "$KEY" "ubuntu@${DOMAIN}" "chmod 644 ${REMOTE}/assets/js/*.js && chmod 644 ${REMOTE}/assets/img/*.svg && chmod 644 ${REMOTE}/test-supabase.html"

Write-Host ""
Write-Host "DONE!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Visit: https://techelevate.news/test-supabase.html"
Write-Host "2. Create admin user in Supabase dashboard"
Write-Host "3. Test your site!"
Write-Host ""

