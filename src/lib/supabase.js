import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export let configurationError = '';
export let supabase = null;
try {
  if (!url || !key) throw new Error('Missing configuration');
  if (key.startsWith('sb_secret_')) throw new Error('Secret key is forbidden');
  if (key.startsWith('eyJ')) {
    const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.role !== 'anon') throw new Error('Only anon legacy keys are allowed');
  }
  supabase = createClient(url, key);
} catch {
  configurationError = 'Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your environment, using a publishable (or legacy anon) key, then restart or rebuild the app.';
}
