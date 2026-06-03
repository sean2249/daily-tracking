// db.js — Supabase data layer for the Daily item/log model.
// Plain CRUD: all streak/completion math lives in data.jsx and runs client-side
// from the loaded {items, logs}. Rows map to the shapes the screens expect.
//
//   dt_items(id, user_id, name, type, status, start_date, archive_date, created_at)
//   dt_item_logs(id, user_id, item_id, log_date, is_completed)
//
// user_id defaults to auth.uid() on insert and RLS keeps every row scoped to the
// signed-in user, so the client never sets user_id.

import { supabase } from './supabase.js';

function mapItem(r) {
  return { id: r.id, name: r.name, type: r.type, status: r.status, start_date: r.start_date, archive_date: r.archive_date };
}
function mapLog(r) {
  return { id: r.id, item_id: r.item_id, date: r.log_date, is_completed: r.is_completed };
}

// Load the full working set for the signed-in user.
export async function getState() {
  const [itemsRes, logsRes] = await Promise.all([
    supabase.from('dt_items').select('*').order('created_at', { ascending: true }),
    supabase.from('dt_item_logs').select('*'),
  ]);
  if (itemsRes.error) throw itemsRes.error;
  if (logsRes.error) throw logsRes.error;
  return {
    items: (itemsRes.data || []).map(mapItem),
    logs: (logsRes.data || []).map(mapLog),
  };
}

// Insert a new item. `item` carries a client-generated id + local start_date so
// the optimistic UI and the DB row share the same id.
export async function addItem(item) {
  const { error } = await supabase.from('dt_items').insert({
    id: item.id,
    name: item.name,
    type: item.type,
    status: 'active',
    start_date: item.start_date,
    archive_date: null,
  });
  if (error) throw error;
}

export async function renameItem(id, name) {
  const { error } = await supabase.from('dt_items').update({ name }).eq('id', id);
  if (error) throw error;
}

// Upsert one (item, date) log to the given completed value. One row per day;
// unchecking keeps the row at is_completed:false (rows are never deleted here).
export async function toggle(itemId, date, isCompleted) {
  const { error } = await supabase
    .from('dt_item_logs')
    .upsert({ item_id: itemId, log_date: date, is_completed: isCompleted }, { onConflict: 'item_id,log_date' });
  if (error) throw error;
}

export async function archive(id, archiveDate) {
  const { error } = await supabase.from('dt_items').update({ status: 'archived', archive_date: archiveDate }).eq('id', id);
  if (error) throw error;
}

export async function restore(id) {
  const { error } = await supabase.from('dt_items').update({ status: 'active', archive_date: null }).eq('id', id);
  if (error) throw error;
}

// Hard delete: removes the item and (via ON DELETE CASCADE) all its logs.
export async function remove(id) {
  const { error } = await supabase.from('dt_items').delete().eq('id', id);
  if (error) throw error;
}
