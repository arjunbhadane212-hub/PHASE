import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY. Set them in frontend/.env.local (and in Vercel for deployed builds).'
  );
}

// Remember returning users across visits: the session is persisted in
// localStorage and its token auto-refreshed, so a user who has signed in once
// is picked back up silently on their next visit (web or mobile web) and never
// has to sign in again until they explicitly log out. detectSessionInUrl keeps
// the OAuth / password-reset redirect links working. These are the supabase-js
// v2 defaults, pinned explicitly so the behaviour can't drift.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
