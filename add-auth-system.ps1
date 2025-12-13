# Add auth-system.js to all product category pages
$pages = @(
    "laptops.html",
    "desktops.html",
    "monitors.html",
    "printers.html",
    "keyboard.html",
    "mouse.html",
    "headset.html",
    "graphics-card.html",
    "internal-ssd.html",
    "external-ssd.html",
    "hard-drive.html",
    "power-supply.html",
    "cabinets.html",
    "case-fans.html",
    "mousepad.html",
    "controller.html",
    "custom-cables.html",
    "ups.html",
    "power-strip.html",
    "usb-devices.html",
    "vertical-gpu-bracket.html",
    "account.html",
    "addresses.html",
    "orders.html",
    "wishlist.html"
)

$searchPattern = '<script src="assets/js/supabase-init.js"></script>'
$replacementText = @'
<script src="assets/js/supabase-init.js"></script>
  <script src="assets/js/auth-system.js"></script>
'@

foreach ($page in $pages) {
    $filePath = "C:\xampp\htdocs\oneclick\$page"

    if (Test-Path $filePath) {
        Write-Host "Processing $page..." -ForegroundColor Yellow

        $content = Get-Content $filePath -Raw

        # Check if auth-system.js is already added
        if ($content -match 'auth-system\.js') {
            Write-Host "  ✓ Already has auth-system.js" -ForegroundColor Green
        } else {
            # Add auth-system.js after supabase-init.js
            $newContent = $content -replace [regex]::Escape($searchPattern), $replacementText

            if ($newContent -ne $content) {
                Set-Content -Path $filePath -Value $newContent -NoNewline
                Write-Host "  ✓ Added auth-system.js" -ForegroundColor Green
            } else {
                Write-Host "  ⚠ Pattern not found" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "  ✗ File not found: $page" -ForegroundColor Red
    }
}

Write-Host "`nDone!" -ForegroundColor Cyan

