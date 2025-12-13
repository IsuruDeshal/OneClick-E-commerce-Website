#!/bin/bash

# ============================================
# EC2 ADMIN DASHBOARD FIX SCRIPT
# ============================================
# Fixes admin navigation and page loading issues
# Run this on your EC2 instance

set -e  # Exit on error

echo "🔧 EC2 Admin Dashboard Fix Script"
echo "====================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Check Apache mod_rewrite
echo -e "${BLUE}1. Checking Apache mod_rewrite...${NC}"
if apache2ctl -M 2>/dev/null | grep -q rewrite_module; then
    echo -e "${GREEN}✅ mod_rewrite is enabled${NC}"
else
    echo -e "${YELLOW}⚠️  mod_rewrite not enabled, enabling now...${NC}"
    sudo a2enmod rewrite
    sudo systemctl restart apache2
    echo -e "${GREEN}✅ mod_rewrite enabled${NC}"
fi

echo ""

# 2. Check if .htaccess exists
echo -e "${BLUE}2. Checking .htaccess configuration...${NC}"
if [ -f /var/www/html/oneclick-computers/.htaccess ]; then
    echo -e "${GREEN}✅ .htaccess found${NC}"
    echo "Current contents:"
    cat /var/www/html/oneclick-computers/.htaccess
else
    echo -e "${YELLOW}⚠️  .htaccess missing, creating...${NC}"
    sudo tee /var/www/html/oneclick-computers/.htaccess > /dev/null <<'HTACCESS'
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /oneclick-computers/

    # Handle direct file/directory access
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d

    # Route everything to index.html for SPA
    RewriteRule ^ index.html [QSA,L]

    # Admin SPA
    RewriteCond %{REQUEST_URI} ^/oneclick-computers/admin/
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^ admin/index.html [QSA,L]
</IfModule>
HTACCESS
    echo -e "${GREEN}✅ .htaccess created${NC}"
fi

echo ""

# 3. Check Apache logs for errors
echo -e "${BLUE}3. Checking Apache error logs...${NC}"
echo "Recent errors (last 20 lines):"
sudo tail -20 /var/log/apache2/error.log 2>/dev/null || echo "No error log found"

echo ""

# 4. Check file permissions
echo -e "${BLUE}4. Checking file permissions...${NC}"
PERMS=$(stat -c '%a' /var/www/html/oneclick-computers/admin/index.html 2>/dev/null || echo "unknown")
echo "Admin index.html permissions: $PERMS"
if [ "$PERMS" != "644" ]; then
    echo -e "${YELLOW}⚠️  Fixing permissions...${NC}"
    sudo chmod -R 755 /var/www/html/oneclick-computers/admin/
    sudo chmod -R 644 /var/www/html/oneclick-computers/admin/*.html
    sudo chmod -R 644 /var/www/html/oneclick-computers/admin/css/*
    sudo chmod -R 644 /var/www/html/oneclick-computers/admin/js/*
    echo -e "${GREEN}✅ Permissions fixed${NC}"
fi

echo ""

# 5. Test admin pages accessibility
echo -e "${BLUE}5. Testing admin pages...${NC}"
for page in index.html products.html orders.html users.html payments.html; do
    if [ -f "/var/www/html/oneclick-computers/admin/$page" ]; then
        echo -e "${GREEN}✅ $page exists${NC}"
    else
        echo -e "${RED}❌ $page missing${NC}"
    fi
done

echo ""

# 6. Check API endpoints
echo -e "${BLUE}6. Checking API endpoints...${NC}"
for api in admin-login.php admin-logout.php get-products-v2.php get-orders.php; do
    if [ -f "/var/www/html/oneclick-computers/api/$api" ]; then
        echo -e "${GREEN}✅ $api exists${NC}"
    else
        echo -e "${RED}❌ $api missing${NC}"
    fi
done

echo ""

# 7. Restart Apache
echo -e "${BLUE}7. Restarting Apache...${NC}"
sudo systemctl restart apache2
echo -e "${GREEN}✅ Apache restarted${NC}"

echo ""
echo "====================================="
echo -e "${GREEN}✅ Admin Dashboard Fix Complete${NC}"
echo "====================================="
echo ""
echo "📝 Next steps:"
echo "1. Go to: https://your-domain.com/oneclick-computers/admin/"
echo "2. Login with admin credentials"
echo "3. Try clicking Products, Orders, Users, Payments buttons"
echo "4. Check browser DevTools (F12) Console for errors"
echo ""
echo "❓ Troubleshooting:"
echo "- If still blank: Check Firefox/Chrome DevTools Console tab"
echo "- Look for 404 or CORS errors"
echo "- Check /var/log/apache2/error.log for PHP errors"
echo ""
