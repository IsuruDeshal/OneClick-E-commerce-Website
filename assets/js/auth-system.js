/**
 * ========================================
 * GLOBAL AUTH SYSTEM - One Click Computers
 * ========================================
 * Persistent user authentication using Supabase
 * Maintains session across all pages
 */

(function() {
  'use strict';

  // Global auth state
  window.OneClickAuth = {
    currentUser: null,
    isAuthenticated: false,
    isChecking: false
  };

  /**
   * Initialize authentication on page load
   */
  async function initAuth() {
    if (window.OneClickAuth.isChecking) return;
    window.OneClickAuth.isChecking = true;

    try {
      // Ensure Supabase is ready
      await window.ensureSupabase();

      if (!window.supabaseClient) {
        console.warn('Supabase not initialized');
        return;
      }

      // Check current session
      const { data: { session }, error } = await window.supabaseClient.auth.getSession();

      if (error) {
        console.error('Session check error:', error);
        handleUnauthenticated();
        return;
      }

      if (session && session.user) {
        // User is authenticated
        await handleAuthenticated(session.user, session);
      } else {
        // No active session
        handleUnauthenticated();
      }

      // Listen for auth state changes
      window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);

        if (event === 'SIGNED_IN' && session) {
          await handleAuthenticated(session.user, session);

          // Redirect if there's a saved redirect URL
          const redirectUrl = sessionStorage.getItem('redirect_after_login');
          if (redirectUrl) {
            sessionStorage.removeItem('redirect_after_login');
            window.location.href = redirectUrl;
          }
        } else if (event === 'SIGNED_OUT') {
          handleUnauthenticated();
        } else if (event === 'TOKEN_REFRESHED') {
          // Session refreshed, update user data
          if (session) {
            await handleAuthenticated(session.user, session);
          }
        }
      });

    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      window.OneClickAuth.isChecking = false;
    }
  }

  /**
   * Handle authenticated user
   */
  async function handleAuthenticated(authUser, session) {
    try {
      // Use auth user data directly (faster, no database fetch)
      const fullUser = {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
        phone: authUser.user_metadata?.phone || '',
        role: authUser.user_metadata?.role || 'customer',
        avatar_url: authUser.user_metadata?.avatar_url || null,
        email_verified: authUser.email_confirmed_at ? true : false,
        created_at: authUser.created_at
      };

      // Update global state
      window.OneClickAuth.currentUser = fullUser;
      window.OneClickAuth.isAuthenticated = true;

      // Store in localStorage for quick access (non-sensitive data only)
      localStorage.setItem('oneclick_user', JSON.stringify(fullUser));
      localStorage.setItem('oneclick_logged_in', 'true');

      // Update UI
      updateAuthUI(fullUser);

      console.log('✅ User authenticated:', fullUser.email);

    } catch (error) {
      console.error('Error handling authenticated user:', error);
    }
  }

  /**
   * Handle unauthenticated user
   */
  function handleUnauthenticated() {
    window.OneClickAuth.currentUser = null;
    window.OneClickAuth.isAuthenticated = false;

    // Clear stored data
    localStorage.removeItem('oneclick_user');
    localStorage.removeItem('oneclick_logged_in');

    // Update UI
    updateAuthUI(null);

    // Check if current page requires authentication
    if (requiresAuth()) {
      // Save current URL for redirect after login
      sessionStorage.setItem('redirect_after_login', window.location.href);

      // Redirect to login
      window.location.href = getLoginUrl();
    }
  }

  /**
   * Update UI based on auth state
   */
  function updateAuthUI(user) {
    // Update login/logout buttons
    const loginButtons = document.querySelectorAll('[data-auth="login"]');
    const logoutButtons = document.querySelectorAll('[data-auth="logout"]');
    const userNameElements = document.querySelectorAll('[data-user-name]');
    const userEmailElements = document.querySelectorAll('[data-user-email]');
    const authRequiredElements = document.querySelectorAll('[data-auth-required]');

    if (user) {
      // User is logged in
      loginButtons.forEach(btn => btn.style.display = 'none');
      logoutButtons.forEach(btn => btn.style.display = 'block');
      authRequiredElements.forEach(el => el.style.display = 'block');

      userNameElements.forEach(el => {
        el.textContent = user.full_name || user.email.split('@')[0];
      });

      userEmailElements.forEach(el => {
        el.textContent = user.email;
      });

      // Update navigation links
      const accountLinks = document.querySelectorAll('a[href*="login"]');
      accountLinks.forEach(link => {
        if (!link.closest('[data-auth="login"]')) {
          link.href = getAccountUrl();
          link.textContent = 'My Account';
        }
      });

    } else {
      // User is not logged in
      loginButtons.forEach(btn => btn.style.display = 'block');
      logoutButtons.forEach(btn => btn.style.display = 'none');
      authRequiredElements.forEach(el => el.style.display = 'none');

      userNameElements.forEach(el => {
        el.textContent = 'Guest';
      });
    }
  }

  /**
   * Check if current page requires authentication
   */
  function requiresAuth() {
    const protectedPages = [
      'account',
      'checkout',
      'orders',
      'addresses',
      'wishlist',
      'order-success',
      'payment-success'
    ];

    const path = window.location.pathname.toLowerCase();
    return protectedPages.some(page => path.includes(page));
  }

  /**
   * Get login URL with proper path
   */
  function getLoginUrl() {
    const currentPath = window.location.pathname;

    if (currentPath.includes('/oneclick/')) {
      return '/oneclick/login.html';
    } else if (currentPath.startsWith('/admin')) {
      return '/admin/login.html';
    } else {
      return '/login.html';
    }
  }

  /**
   * Get account URL
   */
  function getAccountUrl() {
    const currentPath = window.location.pathname;

    if (currentPath.includes('/oneclick/')) {
      return '/oneclick/account.html';
    } else {
      return '/account.html';
    }
  }

  /**
   * Login function
   */
  window.userLogin = async function(email, password) {
    try {
      await window.ensureSupabase();

      const { data, error } = await window.supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        throw error;
      }

      // Auth state change will handle the rest
      return { success: true, user: data.user };

    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message || 'Login failed. Please check your credentials.'
      };
    }
  };

  /**
   * Logout function
   */
  window.userLogout = async function() {
    try {
      await window.ensureSupabase();

      const { error } = await window.supabaseClient.auth.signOut();

      if (error) {
        console.error('Logout error:', error);
      }

      // Clear all user data
      window.OneClickAuth.currentUser = null;
      window.OneClickAuth.isAuthenticated = false;
      localStorage.removeItem('oneclick_user');
      localStorage.removeItem('oneclick_logged_in');
      sessionStorage.clear();

      // Redirect to home
      window.location.href = getLoginUrl().replace('login.html', 'index.html');

    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  /**
   * Register function
   */
  window.userRegister = async function(email, password, fullName, phone) {
    try {
      await window.ensureSupabase();

      const { data, error } = await window.supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            role: 'customer'
          }
        }
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        user: data.user,
        message: 'Registration successful! Please check your email to verify your account.'
      };

    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.message || 'Registration failed. Please try again.'
      };
    }
  };

  /**
   * Get current user
   */
  window.getCurrentUser = function() {
    return window.OneClickAuth.currentUser;
  };

  /**
   * Check if user is authenticated
   */
  window.isUserAuthenticated = function() {
    return window.OneClickAuth.isAuthenticated;
  };

  /**
   * Require authentication (for protected pages)
   */
  window.requireAuth = async function() {
    await initAuth();

    if (!window.OneClickAuth.isAuthenticated) {
      sessionStorage.setItem('redirect_after_login', window.location.href);
      window.location.href = getLoginUrl();
      return false;
    }

    return true;
  };

  // Initialize auth when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
  } else {
    initAuth();
  }

  // Re-check auth when page becomes visible (handles browser back button)
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
      initAuth();
    }
  });

})();

