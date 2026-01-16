/**
 * API Configuration
 * Centralized config for all API calls
 */

// Replace localhost with 127.0.0.1 to avoid IPv6 issues
export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
).replace('localhost', '127.0.0.1');

export const API_BASE = `${API_URL}/api`;

// Supabase config (if needed on frontend)
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
