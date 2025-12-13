# Add Admin Auth Guard to HTML Files
# This script adds the admin-auth-guard.js to all admin HTML files

$adminFolder = "C:\xampp\htdocs\oneclick\admin"
$authGuardLine = '  <!-- ⚠️ CRITICAL: Auth Guard MUST be loaded first -->' + "`n" + '  <script src="../assets/js/admin-auth-guard.js"></script>' + "`n"

# Files to skip (login page should NOT have auth guard)
$skipFiles = @('login.html')

Write-Host "🔐 Adding Auth Guard to Admin Pages..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

# Get all HTML files in admin folder
$htmlFiles = Get-ChildItem -Path $adminFolder -Filter "*.html" | Where-Object { $skipFiles -notcontains $_.Name }

$modified = 0
$skipped = 0
$alreadyHas = 0

foreach ($file in $htmlFiles) {
    $filePath = $file.FullName
    $content = Get-Content -Path $filePath -Raw
    
    # Check if file already has auth guard
    if ($content -match 'admin-auth-guard\.js') {
        Write-Host "  ✓ $($file.Name) - Already protected" -ForegroundColor Green
        $alreadyHas++
        continue
    }
    
    # Check if file has <head> tag
    if ($content -notmatch '<head>') {
        Write-Host "  ⚠ $($file.Name) - No <head> tag found, skipping" -ForegroundColor Yellow
        $skipped++
        continue
    }
    
    # Find the position after <head> tag (after any meta charset)
    if ($content -match '(?s)(<head>.*?<meta charset="[^"]+">)') {
        # Insert after charset meta tag
        $newContent = $content -replace '(?s)(<head>.*?<meta charset="[^"]+">)', "`$1`n$authGuardLine"
    } elseif ($content -match '(?s)(<head>[^>]*>)') {
        # Insert right after <head> tag
        $newContent = $content -replace '(?s)(<head>[^>]*>)', "`$1`n$authGuardLine"
    } else {
        Write-Host "  ⚠ $($file.Name) - Couldn't find insertion point, skipping" -ForegroundColor Yellow
        $skipped++
        continue
    }
    
    # Backup original file
    $backupPath = "$filePath.backup"
    Copy-Item -Path $filePath -Destination $backupPath -Force
    
    # Write modified content
    Set-Content -Path $filePath -Value $newContent -NoNewline
    
    Write-Host "  ✓ $($file.Name) - Auth guard added (backup: $($file.Name).backup)" -ForegroundColor Green
    $modified++
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "  ✓ Modified: $modified files" -ForegroundColor Green
Write-Host "  ✓ Already protected: $alreadyHas files" -ForegroundColor Green
Write-Host "  ⚠ Skipped: $skipped files" -ForegroundColor Yellow
Write-Host ""

if ($modified -gt 0) {
    Write-Host "✅ Auth guard deployment complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Test each modified page" -ForegroundColor White
    Write-Host "  2. Verify unauthorized users are redirected" -ForegroundColor White
    Write-Host "  3. Verify admins can access pages normally" -ForegroundColor White
    Write-Host ""
    Write-Host "To rollback changes, restore from .backup files:" -ForegroundColor Yellow
    Write-Host "  Get-ChildItem -Path '$adminFolder' -Filter '*.backup' | ForEach-Object { Move-Item `$_.FullName (`$_.FullName -replace '\.backup$', '') -Force }" -ForegroundColor Gray
} else {
    Write-Host "ℹ️ No changes needed - all files already protected or skipped" -ForegroundColor Cyan
}
