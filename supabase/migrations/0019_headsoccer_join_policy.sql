-- Joining a Head Soccer room never worked: the guest has to UPDATE the row
-- to claim the second seat, but the only update policy (0013) requires being
-- the host or the guest already, so Supabase matched 0 rows and the join
-- failed with "La sala ya no está disponible".
--
-- This lets a signed-in player claim an open seat, and only for themselves:
-- the row must be waiting with no guest, and the new guest must be them.
-- Policies are OR'd, so the host/guest policy still covers everything else.
create policy "a player can claim the open seat in a waiting headsoccer session"
  on headsoccer_sessions for update
  using (status = 'waiting' and guest_id is null)
  with check (guest_id = auth.uid());
