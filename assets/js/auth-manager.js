/**
 * ========================================
 * AUTH MANAGER - One Click Computers
 * ========================================
 * Session-based authentication with Supabase
 */

class AuthManager {
  constructor() {
    this.user = null;
    this.API_URL = 'https://YOUR-EC2-IP/api';
    this.init();
  }

  /**
   * Initialize auth manager
   */
  init() {
    // Check existing session
    this.loadSession();

    // Protect pages if needed
    if (this.isProtectedPage() && !this.user) {
      this.redirectToLogin();
    }

    // Update UI
    this.updateAuthUI();
  }

  /**
   * Load session from sessionStorage
   */
  loadSession() {
    try {
      const userData = sessionStorage.getItem('oneclick_user');
      if (userData) {
        this.user = JSON.parse(userData);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  }

  /**
   * Save session to sessionStorage
   */
  saveSession(user) {
    try {
      this.user = user;
      sessionStorage.setItem('oneclick_user', JSON.stringify(user));
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }

  /**
   * Clear session
   */
  clearSession() {
    this.user = null;
    sessionStorage.removeItem('oneclick_user');
    localStorage.removeItem('oneclick_cart');
  }

  /**
   * Check if current page is protected
   */
  isProtectedPage() {
    const protectedPages = [
      'checkout',
      'orders',
      'account',
      'addresses',
      'wishlist'
    ];

    const path = window.location.pathname.toLowerCase();
    return protectedPages.some(page => path.includes(page));
  }

  /**
   * Redirect to login
   */
  redirectToLogin() {
    // Save current URL for redirect after login
    sessionStorage.setItem('redirect_after_login', window.location.href);
    window.location.href = '/login.html';
  }

  /**
   * Login user
   */
  async login(email, password) {
    try {
      const response = await fetch(`${this.API_URL}/auth/login.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        this.saveSession(data.user);
        this.updateAuthUI();

        // Redirect to saved URL or home
        const redirect = sessionStorage.getItem('redirect_after_login');
        sessionStorage.removeItem('redirect_after_login');
        window.location.href = redirect || '/index.html';

        return { success: true };
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  }

  /**
   * Register user
   */
  async register(email, password, name) {
    try {
      const response = await fetch(`${this.API_URL}/auth/register.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, name })
      });

      const data = await response.json();

      if (data.success) {
        // Auto-login after registration
        return await this.login(email, password);
      } else {
        return { success: false, message: data.message || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      await fetch(`${this.API_URL}/auth/logout.php`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }

    this.clearSession();
    window.location.href = '/index.html';
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn() {
    return this.user !== null;
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.user;
  }

  /**
   * Update auth UI
   */
  updateAuthUI() {
    const loginLinks = document.querySelectorAll('[data-auth="login"]');
    const logoutLinks = document.querySelectorAll('[data-auth="logout"]');
    const userNameElements = document.querySelectorAll('[data-auth="username"]');

    if (this.user) {
      // User is logged in
      loginLinks.forEach(el => el.style.display = 'none');
      logoutLinks.forEach(el => el.style.display = 'block');
      userNameElements.forEach(el => el.textContent = this.user.name || this.user.email);
    } else {
      // User is not logged in
      loginLinks.forEach(el => el.style.display = 'block');
      logoutLinks.forEach(el => el.style.display = 'none');
    }
  }

  /**
   * Require authentication for action
   */
  requireAuth(callback) {
    if (this.isLoggedIn()) {
      callback();
    } else {
      this.redirectToLogin();
    }
  }
}

// Create global instance
window.authManager = new AuthManager();

// Global helper function
window.requireAuth = (callback) => {
  return window.authManager.requireAuth(callback);
};

// Handle logout links
document.addEventListener('click', (e) => {
  const logoutBtn = e.target.closest('[data-action="logout"]');
  if (logoutBtn) {
    e.preventDefault();
    window.authManager.logout();
  }
});

