#!/bin/bash
# ========================================
# One Click Computers - EC2 Deployment
# ========================================
# Run this script on your EC2 Ubuntu instance

set -e  # Exit on error

echo "🚀 Starting One Click Computers deployment..."

# Step 1: Install Apache and PHP
echo "📦 Installing Apache and PHP..."
sudo apt update
sudo apt install -y apache2 php php-mysql php-pgsql php-curl php-json php-xml

# Step 2: Enable Apache modules
echo "⚙️ Enabling Apache modules..."
sudo a2enmod rewrite
sudo a2enmod headers

# Step 3: Create project directory
PROJECT_DIR="/var/www/oneclick"
echo "📁 Creating project directory: $PROJECT_DIR"
sudo mkdir -p $PROJECT_DIR
sudo chown -R $USER:$USER $PROJECT_DIR

# Step 4: Clone or copy project files
# (Assuming you're copying from local machine via SCP or git)
# For now, create placeholder
echo "📝 Waiting for project files to be copied to $PROJECT_DIR"

# Step 5: Configure Apache VirtualHost
APACHE_CONFIG="/etc/apache2/sites-available/oneclick.conf"
echo "🔧 Creating Apache configuration..."

sudo tee $APACHE_CONFIG > /dev/null << 'EOF'
<VirtualHost *:80>
    ServerName oneclick.com
    ServerAlias www.oneclick.com localhost
    ServerAdmin admin@oneclick.com

    DocumentRoot /var/www/oneclick

    <Directory /var/www/oneclick>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Enable rewrite for clean URLs
    <IfModule mod_rewrite.c>
        RewriteEngine On
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule ^ index.html [QSA,L]
    </IfModule>

    # PHP configuration
    <FilesMatch \.php$>
        SetHandler "proxy:unix:/run/php/php-fpm.sock|fcgi://localhost"
    </FilesMatch>

    # Security headers
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-XSS-Protection "1; mode=block"

    # Logging
    ErrorLog ${APACHE_LOG_DIR}/oneclick_error.log
    CustomLog ${APACHE_LOG_DIR}/oneclick_access.log combined
</VirtualHost>
EOF

# Step 6: Enable the new site
echo "✅ Enabling Apache site..."
sudo a2dissite 000-default
sudo a2ensite oneclick.conf

# Step 7: Create required directories
echo "📂 Creating application directories..."
sudo mkdir -p $PROJECT_DIR/uploads
sudo mkdir -p $PROJECT_DIR/api/logs
sudo chown -R www-data:www-data $PROJECT_DIR/uploads
sudo chown -R www-data:www-data $PROJECT_DIR/api/logs
sudo chmod -R 755 $PROJECT_DIR/uploads
sudo chmod -R 755 $PROJECT_DIR/api/logs

# Step 8: Test Apache configuration
echo "🔍 Testing Apache configuration..."
sudo apache2ctl configtest

# Step 9: Restart Apache
echo "🔄 Restarting Apache..."
sudo systemctl restart apache2

# Step 10: Create environment file for API
echo "📝 Creating .env file for Supabase/API config..."
sudo tee $PROJECT_DIR/api/.env > /dev/null << 'EOF'
# Supabase Configuration
SUPABASE_URL=https://pvnlavcuswjxhywbsodm.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2bmxhdmN1c3dqeGh5d2Jzb2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNTkyOTYsImV4cCI6MjA3NzczNTI5Nn0.pddR-mTtvaELNeK_F1HDwZfjs29xj__k9z-WFOqZbFA

# API Configuration
API_BASE_URL=https://your-domain.com/api
API_ENV=production
DEBUG_MODE=false

# Database (if using MySQL fallback)
# DB_HOST=localhost
# DB_USER=oneclick_user
# DB_PASS=your_secure_password
# DB_NAME=oneclick_db
EOF

echo "✅ Deployment configuration complete!"
echo ""
echo "📌 NEXT STEPS:"
echo "1. Copy project files to $PROJECT_DIR"
echo "2. Update Supabase credentials in api/.env"
echo "3. Set domain name in DNS"
echo "4. Configure SSL certificate (Let's Encrypt)"
echo "5. Test the website"
echo ""
echo "🌐 Access your site at: http://your-ec2-ip/"
