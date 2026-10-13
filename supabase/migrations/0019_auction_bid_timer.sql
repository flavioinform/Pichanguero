-- Every accepted bid restarts the round's bidding clock, so the round only
-- closes after a full quiet window. Only the host can update auction_sessions
-- under RLS, so the bump runs in a security-definer trigger instead of from
-- the bidder's client.
create or replace function auction_restart_bid_window()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update auction_sessions
  set round_started_at = now()
  where id = new.session_id
    and status = 'bidding'
    and current_round = new.round;
  return new;
end;
$$;

drop trigger if exists auction_bids_restart_window on auction_bids;
create trigger auction_bids_restart_window
  after insert on auction_bids
  for each row execute function auction_restart_bid_window();
