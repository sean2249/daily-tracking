// Public Supabase connection values. The publishable/anon key is safe to ship in
// client code — row-level security on the dt_* tables is what protects data.
// Values come from Vite env vars (VITE_*, set via .env or CI secrets) and fall
// back to the project's public defaults so the app builds without extra setup.
const env = import.meta.env || {};

export const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://xwqgrpfcuohpstqinkxb.supabase.co';
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_AreTk-QXvZCFUM5J4oP46w_TXvCc-Y0';
