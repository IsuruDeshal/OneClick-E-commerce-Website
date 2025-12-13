#!/bin/bash
# ✅ One Click Computers - Quick Start Guide

echo "
╔════════════════════════════════════════════════════════════════╗
║     🚀 One Click Computers - Quick Start Guide 🚀             ║
║                                                                ║
║                  Fixed & Ready to Deploy!                     ║
╚════════════════════════════════════════════════════════════════╝
"

echo "📋 WHAT WAS FIXED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "
✅ Issue #1: '404 Not Found' on localhost/index.html
   → Solution: Access via http://localhost/oneclick/
   → Also created .htaccess for production

✅ Issue #2: Product grid crashes after 2-3 seconds
   → Solution: Fixed real-time subscription (non-blocking)
   → Added error handling and timeout protection
   → Better logging for debugging
"

echo "🧪 QUICK START - LOCAL TESTING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "
Step 1: Start XAMPP
   → Open XAMPP Control Panel
   → Click 'Start' on Apache & MySQL

Step 2: Open in Browser
   → http://localhost/oneclick/
   
   Expected: Products load and stay visible (NO crashes after 2-3s)

Step 3: Check for Errors
   → Press F12 to open DevTools
   → Go to Console tab
   → Look for green ✅ messages (not red ❌ errors)

Step 4: If Issues Occur
   → Visit: http://localhost/oneclick/debug-product-load.html
   → Click 'Check Supabase Config' button
   → Click 'Test Supabase Connection' button
   → Run diagnostic tests
"

echo "📊 WHAT TO EXPECT IN CONSOLE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "
✅ Good signs:
   • 'Found 6 product grid(s)'
   • '✅ Fetched X products from Supabase'
   • '✅ Rendered X products in container'
   • 'Product grid initialization complete'

❌ Bad signs:
   • 'Failed to load resource'
   • 'Supabase not available'
   • 'RLS policy violation'
   • 'TypeError' or 'Cannot read property'
"

echo "🛠️ FILES CREATED/MODIFIED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "
Created:
   📄 .htaccess - Apache rewrite rules
   📄 debug-product-load.html - Diagnostic testing page
   📄 DEPLOYMENT-EC2.sh - Automated EC2 setup
   📄 DEPLOYMENT-CHECKLIST.md - Pre-deployment checklist
   📄 PRODUCT-GRID-CRASH-FIX.md - Troubleshooting guide
   📄 SESSION-SUMMARY.md - Full session recap

Modified:
   ⚙️ assets/js/backend-products.js - Error handling improvements
"

echo "🚀 EC2 DEPLOYMENT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "
Step 1: SSH into EC2 instance
   \$ ssh -i your-key.pem ubuntu@your-ec2-ip

Step 2: Copy deployment script
   \$ scp -i your-key.pem DEPLOYMENT-EC2.sh ubuntu@your-ec2-ip:~/

Step 3: Run deployment script
   \$ chmod +x DEPLOYMENT-EC2.sh
   \$ ./DEPLOYMENT-EC2.sh

Step 4: Copy project files
   \$ scp -r oneclick-computers/* ubuntu@your-ec2-ip:/var/www/oneclick/

Step 5: Follow DEPLOYMENT-CHECKLIST.md for verification
"

echo "📖 DOCUMENTATION FILES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "
Open these files for detailed information:

   📖 DEPLOYMENT-CHECKLIST.md (500+ lines)
      → Complete pre/post deployment checks
      → Troubleshooting guide
      → Security & performance tips

   📖 PRODUCT-GRID-CRASH-FIX.md (200+ lines)
      → Why products crash
      → How to diagnose issues
      → Step-by-step solutions

   📖 SESSION-SUMMARY.md (300+ lines)
      → All issues fixed in this session
      → Technical details
      → Quick reference guide

   📖 DEPLOYMENT-EC2.sh (100+ lines)
      → Bash script for EC2 setup
      → Automated Apache/PHP installation
      → VirtualHost configuration

   🧪 debug-product-load.html
      → Open in browser for live testing
      → 6 diagnostic tests
      → Real-time console logs
"

echo "⚡ QUICK COMMANDS FOR TESTING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "
Paste these in browser DevTools Console (F12 → Console):

// Check Supabase config
console.log('Config:', window.SUPABASE_CONFIG);

// Fetch products manually
const sb = await window.ensureSupabase();
const {data} = await sb.from('products').select('*').limit(5);
console.log('Products:', data);

// Count total products
const {count} = await sb.from('products').select('*', {count: 'exact'});
console.log('Total products in DB:', count);

// Clear product cache
Object.keys(localStorage)
  .filter(k => k.startsWith('supabase_products_'))
  .forEach(k => localStorage.removeItem(k));
console.log('Cache cleared');
"

echo "✅ VERIFICATION CHECKLIST:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "
Local Testing:
   [ ] Access http://localhost/oneclick/ works
   [ ] Products display on homepage
   [ ] No '404' or 'Not Found' errors
   [ ] No crashes after 2-3 seconds
   [ ] Console shows green ✅ logs
   [ ] Debug page runs diagnostics successfully

Before EC2 Deploy:
   [ ] All local tests pass
   [ ] Supabase credentials ready
   [ ] Domain name ready
   [ ] EC2 instance launched
   [ ] Security group allows HTTP/HTTPS
   [ ] Elastic IP assigned

After EC2 Deploy:
   [ ] Site loads at domain
   [ ] Products display
   [ ] No console errors
   [ ] Admin dashboard works
   [ ] SSL certificate active (HTTPS)
   [ ] Search functionality works
   [ ] Add to cart works
"

echo "
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║  📧 For support: Check files in project root                  ║
║  🐛 For debugging: Visit debug-product-load.html              ║
║  📚 For docs: Read DEPLOYMENT-CHECKLIST.md                    ║
║                                                                ║
║          Your site is ready for deployment! 🎉                ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
"

echo ""
echo "Last Updated: November 12, 2025"
echo "Version: 1.0"
