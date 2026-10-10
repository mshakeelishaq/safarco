// Supabase: Google sign-in, trips saved to an account, the admin price list and feedback.
// Everything here is optional. Without VITE_SUPABASE_URL the app keeps trips on the
// device only and uses the built-in price list.
//
// The Supabase "anon" key is designed to be public (it ships to every browser).
// What protects the data is row-level security in supabase/schema.sql: people can
// only read and change their own trips, and only admins can change prices.
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import type { PriceList } from './prices';
import type { SavedTrip } from './trips';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const sb: SupabaseClient | null = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } }) : null;
export const cloudEnabled = !!sb;

export interface User { id: string; email: string; name: string; avatar?: string }
const toUser = (s: Session | null): User | null => s?.user ? {
  id: s.user.id, email: s.user.email || '',
  name: String(s.user.user_metadata?.full_name || s.user.user_metadata?.name || s.user.email || 'Traveller'),
  avatar: s.user.user_metadata?.avatar_url
} : null;

export async function currentUser() { if (!sb) return null; const { data } = await sb.auth.getSession(); return toUser(data.session); }
export function onUserChange(fn: (u: User | null) => void) {
  if (!sb) return () => {};
  const { data } = sb.auth.onAuthStateChange((_e, s) => fn(toUser(s)));
  return () => data.subscription.unsubscribe();
}

/** Opens Google's sign-in page; the browser comes back to `returnTo` signed in. */
export async function signInWithGoogle(returnTo = location.pathname + location.search) {
  if (!sb) throw new Error('Accounts are not set up');
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + returnTo } });
  if (error) throw error;
}
export async function signOut() { await sb?.auth.signOut(); }

// ---- Trips ------------------------------------------------------------------

interface TripRow { id: string; name: string; data: SavedTrip['data']; updated_at: string }
const fromRow = (r: TripRow): SavedTrip => ({ id: r.id, cloudId: r.id, name: r.name, data: r.data, savedAt: r.updated_at });

export async function cloudTrips(): Promise<SavedTrip[]> {
  if (!sb) return [];
  const { data, error } = await sb.from('trips').select('id,name,data,updated_at').order('updated_at', { ascending: false }).limit(200);
  if (error) throw error;
  return (data as TripRow[]).map(fromRow);
}

/** Creates or updates a trip in the signed-in user's account; returns its cloud id. */
export async function cloudSave(t: SavedTrip): Promise<string> {
  if (!sb) throw new Error('Accounts are not set up');
  const row = { name: t.name, data: t.data, updated_at: new Date().toISOString() };
  const q = t.cloudId ? sb.from('trips').update(row).eq('id', t.cloudId).select('id').single() : sb.from('trips').insert(row).select('id').single();
  const { data, error } = await q;
  if (error) throw error;
  return (data as { id: string }).id;
}
export async function cloudDelete(cloudId: string) { if (!sb) return; const { error } = await sb.from('trips').delete().eq('id', cloudId); if (error) throw error; }

// ---- Price list (public read, admin write) -------------------------------------

export async function loadPriceList(): Promise<Partial<PriceList> | null> {
  if (!sb) return null;
  const { data, error } = await sb.from('app_config').select('value').eq('key', 'prices').maybeSingle();
  if (error) throw error;
  return (data?.value as Partial<PriceList>) || null;
}
export async function savePriceList(value: PriceList) {
  if (!sb) throw new Error('Accounts are not set up');
  const { error } = await sb.from('app_config').upsert({ key: 'prices', value, updated_at: new Date().toISOString() });
  if (error) throw error;
}
export async function isAdmin(): Promise<boolean> {
  if (!sb) return false;
  const { data, error } = await sb.rpc('is_admin');
  return !error && data === true;
}

// ---- Feedback -------------------------------------------------------------------

export async function sendFeedback(message: string, contact: string, page: string) {
  if (!sb) throw new Error('Feedback is not set up');
  const { error } = await sb.from('feedback').insert({ message: message.slice(0, 2000), contact: contact.slice(0, 200), page: page.slice(0, 300) });
  if (error) throw error;
}
export interface FeedbackRow { id: number; created_at: string; message: string; contact: string | null; page: string | null }
export async function listFeedback(): Promise<FeedbackRow[]> {
  if (!sb) return [];
  const { data, error } = await sb.from('feedback').select('id,created_at,message,contact,page').order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return data as FeedbackRow[];
}
