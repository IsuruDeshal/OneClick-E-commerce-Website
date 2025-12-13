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

foreach ($page in $pages) {
    $filePath = "C:\xampp\htdocs\oneclick\$page"

    if (Test-Path $filePath) {
        Write-Host "Processing $page..." -ForegroundColor Yellow

        $content = Get-Content $filePath -Raw

        if ($content -match 'auth-system\.js') {
            Write-Host "  Already has auth-system.js" -ForegroundColor Green
        } elseif ($content -match 'supabase-init\.js') {
            $newContent = $content -replace '(<script src="assets/js/supabase-init.js"></script>)', '$1`n  <script src="assets/js/auth-system.js"></script>'
            Set-Content -Path $filePath -Value $newContent -NoNewline
            Write-Host "  Added auth-system.js" -ForegroundColor Green
        } else {
            Write-Host "  No supabase-init.js found" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  File not found: $page" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Cyan

