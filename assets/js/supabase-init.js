/**
 * Supabase Client Initialization
 * Using official @supabase/supabase-js library
 */

(function() {
  'use strict';

  // If already initialized, do nothing
  if (window.__SUPABASE_READY__ && (window.supabaseClient || window.supabase)) {
    console.debug('Supabase already initialized, skipping re-init');
    return;
  }

  // Load Supabase library from CDN
  const loadSupabase = () => {
    return new Promise((resolve, reject) => {
      if (window.supabase) {
        resolve(window.supabase);
        return;
      }

      const script = document.createElement('script');
      script.type = 'module';
      script.textContent = `
        import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
        window.createSupabaseClient = createClient;
        window.dispatchEvent(new Event('supabase-loaded'));
      `;
      document.head.appendChild(script);

      window.addEventListener('supabase-loaded', () => {
        console.log('✅ Supabase library loaded');
        resolve(window.createSupabaseClient);
      }, { once: true });

      setTimeout(() => reject(new Error('Supabase library timeout')), 30000);
    });
  };

  // Initialize Supabase Client
  async function initSupabase() {
    try {
      if (window.__SUPABASE_READY__ && window.supabaseClient) {
        return window.supabaseClient;
      }
      // Load library
      await loadSupabase();

      if (!window.SUPABASE_CONFIG) {
        throw new Error('Supabase config not found. Please include supabase-config.js first.');
      }

      const { url: supabaseUrl, anonKey: supabaseKey } = window.SUPABASE_CONFIG;

      // Create Supabase client using official method
      const supabase = window.createSupabaseClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage,
          flowType: 'pkce'
        },
        db: {
          schema: 'public'
        },
        global: {
          headers: {
            'x-application-name': 'OneClickComputers'
          },
          fetch: (url, options = {}) => {
            // Increase timeout to 30 seconds
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
            return fetch(url, {
              ...options,
              signal: controller.signal
            }).finally(() => clearTimeout(timeoutId));
          }
        }
      });

      // Export globally for easy access
      window.supabaseClient = supabase;
      window.supabase = supabase;
      window.__SUPABASE_READY__ = true;

      // Create convenient accessors
      window.Supabase = {
        client: supabase,
        auth: supabase.auth,
        db: supabase,
        storage: supabase.storage,
        from: (table) => supabase.from(table)
      };

      console.log('✅ Supabase Client initialized');
      console.log('📊 Ready to use: window.supabase or window.Supabase');

      return supabase;

    } catch (error) {
      console.error('❌ Supabase initialization error:', error);
      throw error;
    }
  }

  // Auto-initialize on load once
  if (!window.__SUPABASE_INIT_ATTEMPTED__) {
    window.__SUPABASE_INIT_ATTEMPTED__ = true;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initSupabase, { once: true });
    } else {
      initSupabase();
    }
  }

})();

// ==========================================
// GLOBAL HELPER: ensureSupabase (NO RECURSION)
// Safe to call from any module
// ==========================================
if (typeof window.ensureSupabase === 'undefined') {
  window.ensureSupabase = async function() {
    // If already initialized, return immediately
    if (window.__SUPABASE_READY__ && window.supabaseClient) {
      return window.supabaseClient;
    }

    // Wait for initialization to complete
    let attempts = 0;
    while (!window.__SUPABASE_READY__ && attempts < 50) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }

    return window.supabaseClient || null;
  };
}
