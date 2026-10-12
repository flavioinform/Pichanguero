import { supabase } from './supabaseClient';
import { generateJoinCode } from './joinCode';
import { fetchFormationLots, fetchAuctionLotsByIds } from './auctionData';
import { highestBid, settleLot, type AuctionBid } from './auctionEngine';
import { getFormation, lotsPerGroup } from './auctionFormations';

export type AuctionStatus = 'waiting' | 'bidding' | 'reveal' | 'finished';

export interface AuctionSessionRow {
  id: string;
  join_code: string;
  host_id: string;
  status: AuctionStatus;
  budget: number;
  formation: string;
  lots_mode: 'full' | 'short';
  /** 0 until the host starts the auction and the lots are drawn */
  rounds_total: number;
  max_players: number;
  current_round: number;
  lot_player_ids: number[];
  round_started_at: string | null;
  created_at: string;
}

export interface AuctionPlayerRow {
  id: string;
  session_id: string;
  player_id: string;
  nickname: string;
  budget_left: number;
  score: number;
  joined_at: string;
}

export interface AuctionBidRow {
  id: string;
  session_id: string;
  round: number;
  player_id: string;
  amount: number;
  created_at: string;
}

export interface AuctionResultRow {
  id: string;
  session_id: string;
  round: number;
  lot_player_id: number;
  winner_id: string | null;
  price: number;
  caps: number;
  created_at: string;
}

export function bidRowToBid(row: AuctionBidRow): AuctionBid {
  return { playerKey: row.player_id, amount: row.amount, at: new Date(row.created_at).getTime() };
}

async function requireUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No hay sesión activa.');
  return user;
}

export interface CreateAuctionOptions {
  budget: number;
  formation: string;
  lotsMode: 'full' | 'short';
}

export async function createAuctionSession(nickname: string, options: CreateAuctionOptions): Promise<AuctionSessionRow> {
  const user = await requireUser();

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from('auction_sessions')
      .insert({
        join_code: generateJoinCode(),
        host_id: user.id,
        status: 'waiting',
        budget: options.budget,
        formation: options.formation,
        lots_mode: options.lotsMode,
      })
      .select()
      .single();

    if (!error) {
      const { error: playerError } = await supabase
        .from('auction_players')
        .insert({ session_id: data.id, player_id: user.id, nickname, budget_left: options.budget });
      if (playerError) throw new Error(playerError.message);
      return data as AuctionSessionRow;
    }
    if (!error.message.includes('join_code')) throw new Error(error.message);
  }

  throw new Error('No se pudo crear la sala, probá de nuevo.');
}

export async function joinAuctionSession(code: string, nickname: string): Promise<AuctionSessionRow> {
  const user = await requireUser();

  const { data: session, error: findError } = await supabase
    .from('auction_sessions')
    .select('*')
    .eq('join_code', code.toUpperCase())
    .eq('status', 'waiting')
    .maybeSingle();
  if (findError) throw new Error(findError.message);
  if (!session) throw new Error('No encontramos una sala esperando con ese código.');

  const { count } = await supabase
    .from('auction_players')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', session.id);
  if ((count ?? 0) >= session.max_players) throw new Error('La sala ya está completa.');

  const { error: insertError } = await supabase
    .from('auction_players')
    .insert({ session_id: session.id, player_id: user.id, nickname, budget_left: session.budget });
  if (insertError) {
    if (insertError.message.includes('unique')) return session as AuctionSessionRow;
    throw new Error(insertError.message);
  }

  return session as AuctionSessionRow;
}

/** Host-only: draws every lot up front (enough for each player's XI, famous
 * names first) and opens round 1. */
export async function startAuction(session: AuctionSessionRow): Promise<void> {
  const user = await requireUser();
  if (user.id !== session.host_id) throw new Error('Solo el anfitrión puede iniciar.');

  const { count } = await supabase
    .from('auction_players')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', session.id);

  const lots = await fetchFormationLots(lotsPerGroup(getFormation(session.formation), count ?? 2, session.lots_mode));
  const { error } = await supabase
    .from('auction_sessions')
    .update({
      status: 'bidding',
      current_round: 1,
      rounds_total: lots.length,
      lot_player_ids: lots.map((l) => l.id),
      round_started_at: new Date().toISOString(),
    })
    .eq('id', session.id)
    .eq('status', 'waiting');
  if (error) throw new Error(error.message);
}

export async function placeAuctionBid(
  session: AuctionSessionRow,
  amount: number,
  budgetLeft: number,
  roundBids: AuctionBid[]
): Promise<void> {
  const user = await requireUser();
  if (session.status !== 'bidding') throw new Error('La puja ya cerró.');
  if (!Number.isInteger(amount) || amount < 1) throw new Error('Puja inválida.');
  if (amount > budgetLeft) throw new Error('No te alcanza el presupuesto.');
  const top = highestBid(roundBids);
  if (top && amount <= top.amount) throw new Error('Tenés que superar la puja actual.');

  const { error } = await supabase
    .from('auction_bids')
    .insert({ session_id: session.id, round: session.current_round, player_id: user.id, amount });
  if (error) throw new Error(error.message);
}

/**
 * Host-only: closes the bidding window for the current round, settles the
 * winner (highest bid, earliest wins ties), records the result and charges
 * the winner. Claimed through a status guard so a double call is harmless.
 */
export async function finalizeAuctionRound(session: AuctionSessionRow): Promise<void> {
  const user = await requireUser();
  if (user.id !== session.host_id) throw new Error('Solo el anfitrión puede cerrar la ronda.');

  const { data: claimed, error: claimError } = await supabase
    .from('auction_sessions')
    .update({ status: 'reveal' })
    .eq('id', session.id)
    .eq('status', 'bidding')
    .eq('current_round', session.current_round)
    .select()
    .maybeSingle();
  if (claimError) throw new Error(claimError.message);
  if (!claimed) return;

  const lotId = session.lot_player_ids[session.current_round - 1];
  const [{ data: bidRows, error: bidsError }, [lot]] = await Promise.all([
    supabase.from('auction_bids').select('*').eq('session_id', session.id).eq('round', session.current_round),
    fetchAuctionLotsByIds([lotId]),
  ]);
  if (bidsError) throw new Error(bidsError.message);
  if (!lot) throw new Error('No se encontró el jugador de esta ronda.');

  const { winnerKey, price } = settleLot(((bidRows ?? []) as AuctionBidRow[]).map(bidRowToBid));

  const { error: resultError } = await supabase.from('auction_results').insert({
    session_id: session.id,
    round: session.current_round,
    lot_player_id: lot.id,
    winner_id: winnerKey,
    price,
    caps: lot.caps,
  });
  if (resultError) throw new Error(resultError.message);

  if (winnerKey) {
    const { data: winner, error: winnerError } = await supabase
      .from('auction_players')
      .select('budget_left, score')
      .eq('session_id', session.id)
      .eq('player_id', winnerKey)
      .single();
    if (winnerError) throw new Error(winnerError.message);

    const { data: updated, error: updateError } = await supabase
      .from('auction_players')
      .update({ budget_left: winner.budget_left - price, score: winner.score + lot.caps })
      .eq('session_id', session.id)
      .eq('player_id', winnerKey)
      .select()
      .maybeSingle();
    if (updateError) throw new Error(updateError.message);
    if (!updated) throw new Error('No se pudo actualizar el presupuesto del ganador (permiso denegado).');
  }
}

/** Host-only: moves from the reveal screen to the next lot, or ends the match. */
export async function advanceAuction(session: AuctionSessionRow): Promise<void> {
  const user = await requireUser();
  if (user.id !== session.host_id) throw new Error('Solo el anfitrión puede avanzar.');

  const isLast = session.current_round >= session.rounds_total;
  const update = isLast
    ? { status: 'finished' }
    : { status: 'bidding', current_round: session.current_round + 1, round_started_at: new Date().toISOString() };

  const { error } = await supabase
    .from('auction_sessions')
    .update(update)
    .eq('id', session.id)
    .eq('status', 'reveal')
    .eq('current_round', session.current_round);
  if (error) throw new Error(error.message);
}
