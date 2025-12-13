// C:\xampp\htdocs\oneclick\public\js\auth-manager.js
// Authentication state management - Fixes Issues #5, #7
// Handles auth state changes and UI updates

import { supabase } from './supabaseClient.js';
import { cartManager } from './cart-manager.js';

class AuthManager {
    constructor() {
        this.session = null;
        this.subscription = null;
        this.init();
    }

    /**
     * Initialize auth state listener
     */
    async init() {
        try {
            // Check initial session (Issue #7)
            const { data: { session } } = await supabase.auth.getSession();
            this.setSession(session);
            this.updateUI();

            // Listen for auth changes (Issue #7)
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                console.log('Auth state changed:', event);
                this.setSession(session);

                // Merge cart on login (Issue #1)
                if (event === 'SIGNED_IN' && session) {
                    await cartManager.mergeOnLogin(session.user.id);
                }

                // Clear cart on logout
                if (event === 'SIGNED_OUT') {
                    // Keep guest cart in localStorage
                }

                this.updateUI();
            });

            this.subscription = subscription;
        } catch (error) {
            console.error('Auth init error:', error);
        }
    }

    /**
     * Set session
     */
    setSession(session) {
        this.session = session;
        if (session) {
            console.log('✓ Session active:', session.user.email);
        } else {
            console.log('✓ Session cleared (not logged in)');
        }
    }

    /**
     * Check if authenticated
     */
    isAuthenticated() {
        return this.session !== null;
    }

    /**
     * Get current user
     */
    getUser() {
        return this.session?.user;
    }

    /**
     * Login with email/password
     */
    async login(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            console.log('✓ Login successful');
            return data;
        } catch (error) {
            console.error('Login failed:', error.message);
            throw error;
        }
    }

    /**
     * Register new account
     */
    async register(email, password) {
        try {
            const { data, error } = await supabase.auth.signUp({ email, password });
            if (error) throw error;
            console.log('✓ Registration successful');
            return data;
        } catch (error) {
            console.error('Registration failed:', error.message);
            throw error;
        }
    }

    /**
     * Logout
     */
    async logout() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            console.log('✓ Logout successful');
        } catch (error) {
            console.error('Logout failed:', error.message);
            throw error;
        }
    }

    /**
     * Update UI based on auth state (Issue #7)
     */
    updateUI() {
        const authElements = document.querySelectorAll('[data-auth]');
        authElements.forEach(el => {
            const requirement = el.dataset.auth;

            if (requirement === 'authenticated') {
                el.style.display = this.isAuthenticated() ? 'inline' : 'none';
            } else if (requirement === 'unauthenticated') {
                el.style.display = this.isAuthenticated() ? 'none' : 'inline';
            }
        });

        // Update user email display
        const userEmail = document.querySelector('[data-user-email]');
        if (userEmail) {
            userEmail.textContent = this.getUser()?.email || 'Login';
        }
    }

    /**
     * Require authentication for page
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            const redirectTo = window.location.pathname;
            window.location.href = `/oneclick/account.html?redirect=${encodeURIComponent(redirectTo)}`;
            return false;
        }
        return true;
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
}

export const authManager = new AuthManager();

// Make global for inline onclick handlers
window.authManager = authManager;
