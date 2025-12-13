/**
 * Admin Authentication Guard
 * Protects admin routes from unauthorized access
 * 
 * Usage: Include this script at the TOP of every admin page:
 * <script src="../assets/js/admin-auth-guard.js"></script>
 * 
 * This script:
 * 1. Hides page content immediately (prevents flash)
 * 2. Checks for valid admin session
 * 3. Verifies admin role in Supabase
 * 4. Redirects unauthorized users
 * 5. Shows content only if authorized
 */

(function() {
  'use strict';

  // STEP 1: Hide page content immediately to prevent flash
  document.documentElement.style.visibility = 'hidden';
  document.documentElement.style.opacity = '0';

  // Configuration
  const CONFIG = {
    loginUrl: '/oneclick/admin/login.html',
    supabaseUrl: 'https://pvnlavcuswjxhywbsodm.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2bmxhdmN1c3dqeGh5d2Jzb2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNTkyOTYsImV4cCI6MjA3NzczNTI5Nn0.pddR-mTtvaELNeK_F1HDwZfjs29xj__k9z-WFOqZbFA',
    allowedRoles: ['admin'],
    checkTimeout: 5000 // 5 seconds max for auth check
  };

  // STEP 2: Check authentication
  async function checkAdminAuth() {
    try {
      console.log('[Auth Guard] Starting authorization check...');

      // Check localStorage for admin session
      const adminLoggedIn = localStorage.getItem('admin_logged_in');
      const adminEmail = localStorage.getItem('admin_email');
      const accessToken = localStorage.getItem('admin_access_token');

      console.log('[Auth Guard] Session check:', {
        loggedIn: adminLoggedIn === 'true',
        hasEmail: !!adminEmail,
        hasToken: !!accessToken
      });

      // Quick fail: No local session
      if (adminLoggedIn !== 'true' || !adminEmail) {
        console.warn('[Auth Guard] ❌ No valid session found');
        redirectToLogin('No active session');
        return false;
      }

      // If we have access token, verify with Supabase
      if (accessToken && window.supabase) {
        try {
          // Set the session
          const { data: sessionData, error: sessionError } = await Promise.race([
            window.supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: localStorage.getItem('admin_refresh_token') || ''
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Session setup timeout')), CONFIG.checkTimeout)
            )
          ]);

          if (sessionError) {
            console.error('[Auth Guard] Session error:', sessionError);
            redirectToLogin('Invalid session');
            return false;
          }

          // Get current user
          const { data: { user }, error: userError } = await window.supabase.auth.getUser();

          if (userError || !user) {
            console.error('[Auth Guard] User error:', userError);
            redirectToLogin('User not found');
            return false;
          }

          // Check user role in metadata
          const userRole = user.user_metadata?.role || 
                          user.app_metadata?.role || 
                          null;

          console.log('[Auth Guard] User data:', {
            email: user.email,
            role: userRole,
            metadata: user.user_metadata
          });

          // Verify admin role
          if (!CONFIG.allowedRoles.includes(userRole)) {
            console.warn('[Auth Guard] ❌ Insufficient permissions. Role:', userRole);
            redirectToLogin('Insufficient permissions');
            return false;
          }

          // Check if email is in allowed admin list
          const allowedAdmins = [
            'admin@oneclick.com',
            'inboxtoisuru@gmail.com',
            'inboxtoisuru3@gmail.com'
          ];

          if (!allowedAdmins.includes(user.email)) {
            console.warn('[Auth Guard] ❌ Email not in admin list:', user.email);
            redirectToLogin('Access denied');
            return false;
          }

          // SUCCESS: User is authorized
          console.log('[Auth Guard] ✅ Authorization successful');
          showPage();
          return true;

        } catch (error) {
          console.error('[Auth Guard] Supabase check failed:', error);
          // If Supabase check fails but we have local session, allow access
          // (Fallback for offline scenarios)
          if (isEmailAllowedAdmin(adminEmail)) {
            console.warn('[Auth Guard] ⚠️ Supabase check failed, using local session fallback');
            showPage();
            return true;
          }
          redirectToLogin('Authentication failed');
          return false;
        }
      } else {
        // No access token but has local session
        // Check if email is allowed admin
        if (isEmailAllowedAdmin(adminEmail)) {
          console.warn('[Auth Guard] ⚠️ Using local session (no token available)');
          showPage();
          return true;
        } else {
          redirectToLogin('Invalid admin email');
          return false;
        }
      }

    } catch (error) {
      console.error('[Auth Guard] Fatal error:', error);
      redirectToLogin('Authentication error');
      return false;
    }
  }

  // Helper: Check if email is allowed admin
  function isEmailAllowedAdmin(email) {
    const allowedAdmins = [
      'admin@oneclick.com',
      'inboxtoisuru@gmail.com',
      'inboxtoisuru3@gmail.com'
    ];
    return allowedAdmins.includes(email);
  }

  // STEP 3: Redirect to login
  function redirectToLogin(reason) {
    console.warn('[Auth Guard] Redirecting to login. Reason:', reason);
    
    // Clear invalid session
    localStorage.removeItem('admin_logged_in');
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_refresh_token');
    
    // Store redirect URL
    const currentPath = window.location.pathname + window.location.search;
    sessionStorage.setItem('admin_redirect_after_login', currentPath);
    
    // Redirect
    window.location.href = CONFIG.loginUrl;
  }

  // STEP 4: Show page content (authorization passed)
  function showPage() {
    console.log('[Auth Guard] ✅ Showing protected content');
    document.documentElement.style.visibility = 'visible';
    document.documentElement.style.opacity = '1';
    
    // Dispatch custom event for page-specific initialization
    window.dispatchEvent(new CustomEvent('adminAuthSuccess', {
      detail: {
        email: localStorage.getItem('admin_email'),
        timestamp: Date.now()
      }
    }));
  }

  // STEP 5: Run auth check when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(checkAdminAuth, 0);
    });
  } else {
    // DOM already loaded
    setTimeout(checkAdminAuth, 0);
  }

  // STEP 6: Timeout safety - show error if check takes too long
  setTimeout(() => {
    if (document.documentElement.style.visibility === 'hidden') {
      console.error('[Auth Guard] ⚠️ Authorization check timeout');
      redirectToLogin('Authorization timeout');
    }
  }, CONFIG.checkTimeout + 1000);

  // STEP 7: Monitor session changes
  window.addEventListener('storage', (e) => {
    if (e.key === 'admin_logged_in' && e.newValue !== 'true') {
      console.warn('[Auth Guard] Session invalidated in another tab');
      redirectToLogin('Session ended');
    }
  });

  // Export for debugging (only in development)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.adminAuthGuard = {
      checkAuth: checkAdminAuth,
      showPage: showPage,
      config: CONFIG
    };
  }

})();
