/**
 * Supabase Configuration
 * Single source of truth for Supabase connection
 */

(function() {
  'use strict';

  // Supabase credentials
  const SUPABASE_URL = 'https://pvnlavcuswjxhywbsodm.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2bmxhdmN1c3dqeGh5d2Jzb2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNTkyOTYsImV4cCI6MjA3NzczNTI5Nn0.pddR-mTtvaELNeK_F1HDwZfjs29xj__k9z-WFOqZbFA';

  // Export to global scope
  window.SUPABASE_CONFIG = {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    restUrl: `${SUPABASE_URL}/rest/v1`
  };

  console.log('🔗 Supabase config loaded:', window.SUPABASE_CONFIG.url);

})();

