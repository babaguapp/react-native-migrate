import { createClient } from '@supabase/supabase-js';
import { capacitorStorage } from './capacitorStorage';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Supabase client with native storage support for mobile apps.
 * Uses Capacitor Preferences on iOS/Android for persistent sessions.
 * Falls back to localStorage on web.
 */
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: capacitorStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
