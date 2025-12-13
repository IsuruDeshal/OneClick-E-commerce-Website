// C:\xampp\htdocs\oneclick\public\js\supabaseClient.js
// Centralized Supabase client - USE THIS EVERYWHERE (Fixes Issue #5)
// Single instance prevents duplicate initialization warnings

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

// Get credentials from .env (loaded via PHP or hardcoded for development)
const SUPABASE_URL = window.SUPABASE_URL || 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY_HERE';

if (SUPABASE_URL === 'https://YOUR_PROJECT_ID.supabase.co') {
    console.error('❌ Supabase credentials not configured. Update window.SUPABASE_URL and window.SUPABASE_ANON_KEY');
}

// Create single instance - reused everywhere
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export auth for convenience
export const auth = supabase.auth;

// Log initialization
console.log('✓ Supabase client initialized (single instance)');
