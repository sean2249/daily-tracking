-- Harden dt_item_logs RLS: a log row's item_id must reference an item owned by
-- the same user, not just carry the caller's user_id. Without this, a user could
-- insert log rows pointing at another user's dt_items.id (UUID guessing).

drop policy if exists dt_item_logs_owner on public.dt_item_logs;

create policy dt_item_logs_owner on public.dt_item_logs
  for all
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.dt_items i
      where i.id = dt_item_logs.item_id and i.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.dt_items i
      where i.id = dt_item_logs.item_id and i.user_id = auth.uid()
    )
  );
