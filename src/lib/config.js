// Public Supabase connection values. The publishable/anon key is safe to ship in
// client code — row-level security on the dt_* tables is what protects data.
// Values come from Vite env vars (VITE_*, set via .env or CI secrets) and fall
// back to the project's public defaults so the app builds without extra setup.
const env = import.meta.env || {};

export const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://xwqgrpfcuohpstqinkxb.supabase.co';
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_AreTk-QXvZCFUM5J4oP46w_TXvCc-Y0';

// VAPID application server public key for Web Push. The matching private key lives
// only server-side (dt_app_config); the public key is safe to ship.
export const VAPID_PUBLIC_KEY = env.VITE_VAPID_PUBLIC_KEY || 'BKdCo3I2-GHe8a4qSlizAgVh3tCGoqRHNIM2IkZmpRbjs74Abmd-U0q4fz91wG5xhL5LPREW1WU0Pyf93FtmEN0';
