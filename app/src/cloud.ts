// Supabase: Google sign-in, trips saved to an account, the admin price list, reviews and feedback.
// Everything here is optional. Without VITE_SUPABASE_URL the app keeps trips on the
// device only and uses the built-in price list.
//
// The Supabase "anon" key is designed to be public (it ships to every browser).
// What protects the data is row-level security in supabase/schema.sql: people can
// only read and change their own trips, and only admins can change prices.
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import type { PriceList } from './prices';
import type { SavedTrip } from './trips';

// Tolerate the Data API address (…/rest/v1/) being pasted instead of the Project URL.
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
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
/** Admin sign-in with the email and password set in Supabase (Authentication → Users). */
export async function signInWithPassword(email: string, password: string) {
  if (!sb) throw new Error('Accounts are not set up');
  const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}
/** Emails a link to set a new password; it opens `returnTo`, where `onPasswordRecovery` fires. */
export async function sendPasswordReset(email: string, returnTo = '/admin') {
  if (!sb) throw new Error('Accounts are not set up');
  const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin + returnTo });
  if (error) throw error;
}
export async function updatePassword(password: string) {
  if (!sb) throw new Error('Accounts are not set up');
  const { error } = await sb.auth.updateUser({ password });
  if (error) throw error;
}
/** Called when someone arrives from a reset-password email. */
export function onPasswordRecovery(fn: () => void) {
  if (!sb) return () => {};
  const { data } = sb.auth.onAuthStateChange(e => { if (e === 'PASSWORD_RECOVERY') fn(); });
  return () => data.subscription.unsubscribe();
}

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
/** The admin's changes to places, food, destinations, security areas and closed roads (see src/content.ts). */
export async function loadContent(): Promise<unknown> {
  if (!sb) return null;
  const { data, error } = await sb.from('app_config').select('value').eq('key', 'content').maybeSingle();
  if (error) throw error;
  return data?.value ?? null;
}
export async function saveContent(value: unknown) {
  if (!sb) throw new Error('Accounts are not set up');
  const { error } = await sb.from('app_config').upsert({ key: 'content', value, updated_at: new Date().toISOString() });
  if (error) throw error;
}
/** Everyone who has signed up, for admins only (supabase/users.sql). */
export interface AppUser { id: string; email: string; name: string; provider: string; created_at: string; last_sign_in_at: string | null; trips: number; reviews: number; tips: number; is_admin: boolean }
export async function listUsers(): Promise<AppUser[]> {
  if (!sb) return [];
  const { data, error } = await sb.rpc('admin_users');
  if (error) throw error;
  return (data || []) as AppUser[];
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

// ---- Reviews of trusted hotels and drivers (shown once an admin approves them) --------

export type ReviewKind = 'hotel' | 'driver';
export interface Review { id: number; created_at: string; item_kind: ReviewKind; item_id: string; rating: number; comment: string; author: string; status: 'pending' | 'approved' | 'hidden'; stayed_on?: string | null }
const REVIEW_COLS = 'id,created_at,item_kind,item_id,rating,comment,author,status';

export async function loadReviews(): Promise<Review[] | null> {
  if (!sb) return null;
  const { data, error } = await sb.from('reviews').select(REVIEW_COLS).eq('status', 'approved').order('created_at', { ascending: false }).limit(3000);
  if (error) throw error;
  return data as Review[];
}
/** Writes (or replaces) the signed-in traveller's review; it waits for the admin again. */
export async function submitReview(kind: ReviewKind, itemId: string, rating: number, comment: string, author: string, stayedOn: string) {
  if (!sb) throw new Error('Reviews are not set up');
  const row = { item_kind: kind, item_id: itemId, rating, comment: comment.slice(0, 600), author: author.slice(0, 60), status: 'pending', created_at: new Date().toISOString(), stayed_on: stayedOn || null };
  let { error } = await sb.from('reviews').upsert(row, { onConflict: 'user_id,item_kind,item_id' });
  // Databases set up before the stay date existed: save the review without it.
  if (error && /stayed_on/.test(error.message)) ({ error } = await sb.from('reviews').upsert({ ...row, stayed_on: undefined }, { onConflict: 'user_id,item_kind,item_id' }));
  if (error) throw error;
}
export async function listAllReviews(): Promise<Review[]> {
  if (!sb) return [];
  const q = (cols: string) => sb!.from('reviews').select(cols).order('created_at', { ascending: false }).limit(500);
  let r = await q(REVIEW_COLS + ',stayed_on');
  if (r.error && /stayed_on/.test(r.error.message)) r = await q(REVIEW_COLS);
  if (r.error) throw r.error;
  const data = r.data;
  return data as unknown as Review[];
}
export async function setReviewStatus(id: number, status: Review['status']) {
  if (!sb) return; const { error } = await sb.from('reviews').update({ status }).eq('id', id); if (error) throw error;
}
export async function deleteReview(id: number) {
  if (!sb) return; const { error } = await sb.from('reviews').delete().eq('id', id); if (error) throw error;
}

// ---- Places to eat suggested by travellers (supabase/food.sql; shown once an admin approves them) ----
export interface FoodTip { id: number; created_at: string; dest: string; name: string; dish: string; note: string; rating: number | null; author: string; status: 'pending' | 'approved' | 'hidden' }
const FOOD_COLS = 'id,created_at,dest,name,dish,note,rating,author,status';
export async function loadFoodTips(): Promise<FoodTip[] | null> {
  if (!sb) return null;
  const { data, error } = await sb.from('food_tips').select(FOOD_COLS).eq('status', 'approved').order('created_at', { ascending: false }).limit(2000);
  if (error) throw error;
  return data as FoodTip[];
}
export async function submitFoodTip(t: { dest: string; name: string; dish: string; note: string; rating: number | null }, author: string) {
  if (!sb) throw new Error('Food tips are not set up');
  const { error } = await sb.from('food_tips').insert({ dest: t.dest, name: t.name.slice(0, 80), dish: t.dish.slice(0, 80), note: t.note.slice(0, 300), rating: t.rating, author: author.slice(0, 60), status: 'pending' });
  if (error) throw error;
}
export async function listAllFoodTips(): Promise<FoodTip[]> {
  if (!sb) return [];
  const { data, error } = await sb.from('food_tips').select(FOOD_COLS).order('created_at', { ascending: false }).limit(500);
  if (error) throw error;
  return data as FoodTip[];
}
export async function setFoodTipStatus(id: number, status: FoodTip['status']) {
  if (!sb) return; const { error } = await sb.from('food_tips').update({ status }).eq('id', id); if (error) throw error;
}
export async function deleteFoodTip(id: number) {
  if (!sb) return; const { error } = await sb.from('food_tips').delete().eq('id', id); if (error) throw error;
}

// ---- Family "follow our trip" links (supabase/follow.sql) ----------------------------
export interface FollowView { data: unknown; expired: boolean; checkins: { place: string; lat: number | null; lon: number | null; created_at: string }[] }
/** Makes a follow link for this trip (signed in only); returns its id. */
export async function createFollow(data: unknown, expiresOn: string): Promise<string> {
  if (!sb) throw new Error('Accounts are not set up');
  const { data: row, error } = await sb.from('follows').insert({ data, expires_on: expiresOn }).select('id').single();
  if (error) throw error; return row.id as string;
}
/** Keeps the family's view of the plan up to date after changes. */
export async function updateFollow(id: string, data: unknown, expiresOn: string) {
  if (!sb) return; const { error } = await sb.from('follows').update({ data, expires_on: expiresOn, updated_at: new Date().toISOString() }).eq('id', id); if (error) throw error;
}
export async function stopFollow(id: string) { if (!sb) return; const { error } = await sb.from('follows').delete().eq('id', id); if (error) throw error; }
export async function addCheckin(id: string, place: string, lat?: number, lon?: number) {
  if (!sb) return; const { error } = await sb.from('checkins').insert({ follow_id: id, place: place.slice(0, 80), lat: lat ?? null, lon: lon ?? null }); if (error) throw error;
}
/** What family see: the plan and the latest check-ins, or null if the link doesn't exist. */
export async function getFollow(id: string): Promise<FollowView | null> {
  if (!sb) return null;
  const { data, error } = await sb.rpc('follow_view', { fid: id });
  if (error) throw error; return (data as FollowView) || null;
}
