/**
 * Supabase Authentication Manager
 * Replaces Firebase Auth with Supabase Auth
 */

class SupabaseAuthManager {
  constructor() {
    this.supabase = null;
    this.currentUser = null;
    this.authListeners = [];
  }

  async init() {
    this.supabase = await window.ensureSupabase();

    // Set up auth state listener
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.currentUser = session?.user || null;
      this.notifyListeners(this.currentUser);

      console.log('🔐 Auth state changed:', event, this.currentUser ? 'Logged in' : 'Logged out');
    });

    // Get initial session
    const { data: { session } } = await this.supabase.auth.getSession();
    this.currentUser = session?.user || null;

    return this.currentUser;
  }

  // Sign up with email and password
  async signUp(email, password, metadata = {}) {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata, // Additional user metadata
          emailRedirectTo: window.location.origin + '/account.html'
        }
      });

      if (error) throw error;

      console.log('✅ Sign up successful:', data.user);
      return { success: true, user: data.user };
    } catch (error) {
      console.error('❌ Sign up error:', error);
      return { success: false, error: error.message };
    }
  }

  // Sign in with email and password
  async signIn(email, password) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      this.currentUser = data.user;
      console.log('✅ Sign in successful:', data.user);
      return { success: true, user: data.user };
    } catch (error) {
      console.error('❌ Sign in error:', error);
      return { success: false, error: error.message };
    }
  }

  // Sign in with Google
  async signInWithGoogle() {
    try {
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/account.html'
        }
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('❌ Google sign in error:', error);
      return { success: false, error: error.message };
    }
  }

  // Sign out
  async signOut() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;

      this.currentUser = null;
      console.log('✅ Sign out successful');
      return { success: true };
    } catch (error) {
      console.error('❌ Sign out error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send password reset email
  async resetPassword(email) {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password.html'
      });

      if (error) throw error;

      console.log('✅ Password reset email sent');
      return { success: true };
    } catch (error) {
      console.error('❌ Password reset error:', error);
      return { success: false, error: error.message };
    }
  }

  // Update user password
  async updatePassword(newPassword) {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      console.log('✅ Password updated');
      return { success: true };
    } catch (error) {
      console.error('❌ Password update error:', error);
      return { success: false, error: error.message };
    }
  }

  // Update user profile
  async updateProfile(updates) {
    try {
      const { error } = await this.supabase.auth.updateUser({
        data: updates
      });

      if (error) throw error;

      console.log('✅ Profile updated');
      return { success: true };
    } catch (error) {
      console.error('❌ Profile update error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get current user
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      if (error) throw error;

      this.currentUser = user;
      return user;
    } catch (error) {
      console.error('❌ Get user error:', error);
      return null;
    }
  }

  // Check if user is logged in
  isLoggedIn() {
    return !!this.currentUser;
  }

  // Auth state listener
  onAuthStateChange(callback) {
    this.authListeners.push(callback);
    // Call immediately with current state
    if (this.currentUser !== undefined) {
      callback(this.currentUser);
    }
  }

  // Notify all listeners of auth state change
  notifyListeners(user) {
    this.authListeners.forEach(callback => callback(user));
  }
}

// Create global instance
window.supabaseAuth = new SupabaseAuthManager();

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
  await window.supabaseAuth.init();
});

console.log('✅ Supabase Auth Manager loaded');

