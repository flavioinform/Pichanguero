// Proxies football-data.org for the "live matches" menu widget.
//
// This has to be a server-side proxy, not a direct fetch from the browser:
// football-data.org's API doesn't send Access-Control-Allow-Origin, so a
// browser blocks the request outright regardless of the API key. It also
// keeps FOOTBALL_DATA_API_KEY (set via `supabase secrets set` or the
// dashboard's Edge Functions → Secrets) out of the client bundle — the
// free tier's request cap is shared across every visitor hitting this
// function, not per-visitor, so the cache below (and the backoff logic
// further down) matter more here than in a typical per-user API call.

const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';
// Lineups/formations aren't in football-data.org's free tier — API-FOOTBALL
// (api-football.com, v3.football.api-sports.io) has a free 100-req/day plan
// that does include them. Used only to enrich a single match's detail view
// (never the list), and only as a best-effort fallback: football-data.org
// and API-FOOTBALL use different IDs for the same match, so the fixture is
// found by matching team names + date, and any failure here just means the
// detail view shows no lineups instead of erroring out.
const API_FOOTBALL_BASE = 'https://v3.football.api-sports.io';
const CACHE_TTL_MS = 90_000;
// Stop calling upstream once fewer than this many requests remain in the
// current window, per the account's own rate-limit headers (see the
// "Response Headers" table in football-data.org's docs) — better to serve
// slightly stale data than to be the request that trips a 429 for
// everyone sharing this key.
const LOW_QUOTA_THRESHOLD = 3;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NormalizedMatch {
  id: number;
  competition: string;
  competitionEmblem: string | null;
  homeTeam: string;
  homeCrest: string | null;
  awayTeam: string;
  awayCrest: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  minute: number | null;
  utcDate: string;
}

interface Cache {
  data: NormalizedMatch[];
  expiresAt: number;
}

let cache: Cache | null = null;
// Set whenever the upstream account is low on quota (or actually rate
// limited) — until this timestamp passes, we serve cached data (even if
// past its own TTL) instead of calling football-data.org again.
let backOffUntil = 0;

function normalize(raw: Record<string, unknown>[]): NormalizedMatch[] {
  return raw.map((m) => {
    const competition = m.competition as Record<string, unknown>;
    const homeTeam = m.homeTeam as Record<string, unknown>;
    const awayTeam = m.awayTeam as Record<string, unknown>;
    const score = m.score as Record<string, unknown>;
    const fullTime = score?.fullTime as Record<string, unknown> | undefined;
    return {
      id: m.id as number,
      competition: (competition?.name as string) ?? '',
      competitionEmblem: (competition?.emblem as string) ?? null,
      homeTeam: (homeTeam?.shortName as string) || (homeTeam?.name as string) || '',
      homeCrest: (homeTeam?.crest as string) ?? null,
      awayTeam: (awayTeam?.shortName as string) || (awayTeam?.name as string) || '',
      awayCrest: (awayTeam?.crest as string) ?? null,
      homeScore: (fullTime?.home as number | null) ?? null,
      awayScore: (fullTime?.away as number | null) ?? null,
      status: m.status as string,
      minute: (m.minute as number | null) ?? null,
      utcDate: m.utcDate as string,
    };
  });
}

class RateLimited extends Error {}

/** Shared by both the list and single-match fetch paths: reads the
 * rate-limit headers and arms the backoff, throws RateLimited on a 429. */
function checkRateLimit(res: Response): void {
  const available = res.headers.get('X-Requests-Available') ?? res.headers.get('x-requests-available-minute');
  const resetSeconds = res.headers.get('X-RequestCounter-Reset');
  if (available !== null && Number(available) <= LOW_QUOTA_THRESHOLD) {
    backOffUntil = Date.now() + (resetSeconds ? Number(resetSeconds) * 1000 : 60_000);
  }
  if (res.status === 429) {
    backOffUntil = Date.now() + (resetSeconds ? Number(resetSeconds) * 1000 : 60_000);
    throw new RateLimited('football-data.org rate limit hit');
  }
}

async function fetchFromFootballData(path: string, token: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${FOOTBALL_DATA_BASE}${path}`, { headers: { 'X-Auth-Token': token } });
  checkRateLimit(res);
  if (!res.ok) throw new Error(`football-data.org ${res.status}: ${await res.text()}`);

  const body = await res.json();
  return (body.matches as Record<string, unknown>[]) ?? [];
}

interface LineupPlayer {
  name: string;
  position: string | null;
  shirtNumber: number | null;
  /** API-FOOTBALL's "row:col" pitch coordinate for this player (row 1 is
   * the goalkeeper, increasing rows move toward attack) — used to draw the
   * formation on an actual pitch instead of a plain list. Only API-FOOTBALL
   * provides this; football-data.org lineups (when it has any) won't. */
  grid: string | null;
}

interface MatchDetail extends NormalizedMatch {
  halfTimeHome: number | null;
  halfTimeAway: number | null;
  venue: string | null;
  referee: string | null;
  matchday: number | null;
  stage: string | null;
  homeFormation: string | null;
  awayFormation: string | null;
  homeLineup: LineupPlayer[] | null;
  awayLineup: LineupPlayer[] | null;
}

function normalizeLineup(team: Record<string, unknown>): LineupPlayer[] | null {
  const arr = team.lineup as Record<string, unknown>[] | undefined;
  if (!arr || arr.length === 0) return null;
  return arr.map((p) => ({
    name: (p.name as string) ?? '',
    position: (p.position as string) ?? null,
    shirtNumber: (p.shirtNumber as number) ?? null,
    grid: null,
  }));
}

function normalizeDetail(m: Record<string, unknown>): MatchDetail {
  const competition = m.competition as Record<string, unknown>;
  const homeTeam = m.homeTeam as Record<string, unknown>;
  const awayTeam = m.awayTeam as Record<string, unknown>;
  const score = m.score as Record<string, unknown>;
  const fullTime = score?.fullTime as Record<string, unknown> | undefined;
  const halfTime = score?.halfTime as Record<string, unknown> | undefined;
  const referees = (m.referees as Record<string, unknown>[] | undefined) ?? [];

  return {
    id: m.id as number,
    competition: (competition?.name as string) ?? '',
    competitionEmblem: (competition?.emblem as string) ?? null,
    homeTeam: (homeTeam?.shortName as string) || (homeTeam?.name as string) || '',
    homeCrest: (homeTeam?.crest as string) ?? null,
    awayTeam: (awayTeam?.shortName as string) || (awayTeam?.name as string) || '',
    awayCrest: (awayTeam?.crest as string) ?? null,
    homeScore: (fullTime?.home as number | null) ?? null,
    awayScore: (fullTime?.away as number | null) ?? null,
    status: m.status as string,
    minute: (m.minute as number | null) ?? null,
    utcDate: m.utcDate as string,
    halfTimeHome: (halfTime?.home as number | null) ?? null,
    halfTimeAway: (halfTime?.away as number | null) ?? null,
    venue: (m.venue as string) ?? null,
    referee: referees[0] ? ((referees[0].name as string) ?? null) : null,
    matchday: (m.matchday as number) ?? null,
    stage: (m.stage as string) ?? null,
    homeFormation: (homeTeam?.formation as string) ?? null,
    awayFormation: (awayTeam?.formation as string) ?? null,
    homeLineup: normalizeLineup(homeTeam ?? {}),
    awayLineup: normalizeLineup(awayTeam ?? {}),
  };
}

/** The free tier rarely includes lineups/formations (that's typically a
 * paid-plan field) — this still asks for them and passes through whatever
 * football-data.org actually returns, so a match that does have them (or
 * if the plan ever changes) just works without further changes here. */
function normalizeTeamName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\b(fc|cf|sc|afc|cd|ud|ac|ca|if|bk|sk)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function teamNamesMatch(a: string, b: string): boolean {
  const na = normalizeTeamName(a);
  const nb = normalizeTeamName(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

interface ApiFootballLineups {
  homeFormation: string | null;
  awayFormation: string | null;
  homeLineup: LineupPlayer[] | null;
  awayLineup: LineupPlayer[] | null;
}

/** Finds the matching API-FOOTBALL fixture by date + team name (the two
 * APIs don't share IDs) and pulls its lineups. Returns null on anything
 * from "no API key configured" to "no fixture matched" to "lineups not
 * published yet" — all treated the same by the caller: skip enrichment. */
async function fetchApiFootballLineups(
  homeTeam: string,
  awayTeam: string,
  utcDate: string,
  apiKey: string
): Promise<ApiFootballLineups | null> {
  const date = utcDate.slice(0, 10);
  const headers = { 'x-apisports-key': apiKey };

  const fixturesRes = await fetch(`${API_FOOTBALL_BASE}/fixtures?date=${date}`, { headers });
  if (!fixturesRes.ok) return null;
  const fixturesBody = await fixturesRes.json();
  const fixtures = (fixturesBody.response as Record<string, unknown>[]) ?? [];

  const match = fixtures.find((f) => {
    const teams = f.teams as Record<string, unknown>;
    const home = teams?.home as Record<string, unknown>;
    const away = teams?.away as Record<string, unknown>;
    return teamNamesMatch((home?.name as string) ?? '', homeTeam) && teamNamesMatch((away?.name as string) ?? '', awayTeam);
  });
  if (!match) return null;

  const fixture = match.fixture as Record<string, unknown>;
  const fixtureId = fixture?.id as number | undefined;
  if (!fixtureId) return null;

  const lineupsRes = await fetch(`${API_FOOTBALL_BASE}/fixtures/lineups?fixture=${fixtureId}`, { headers });
  if (!lineupsRes.ok) return null;
  const lineupsBody = await lineupsRes.json();
  const teamsLineup = (lineupsBody.response as Record<string, unknown>[]) ?? [];
  if (teamsLineup.length === 0) return null;

  const teams = match.teams as Record<string, unknown>;
  const homeId = (teams?.home as Record<string, unknown>)?.id as number;
  const awayId = (teams?.away as Record<string, unknown>)?.id as number;

  function extract(teamId: number): { formation: string | null; lineup: LineupPlayer[] | null } {
    const entry = teamsLineup.find((t) => (t.team as Record<string, unknown>)?.id === teamId);
    if (!entry) return { formation: null, lineup: null };
    const startXI = (entry.startXI as Record<string, unknown>[]) ?? [];
    const lineup = startXI.map((p) => {
      const player = p.player as Record<string, unknown>;
      return {
        name: (player?.name as string) ?? '',
        position: (player?.pos as string) ?? null,
        shirtNumber: (player?.number as number) ?? null,
        grid: (player?.grid as string) ?? null,
      };
    });
    return { formation: (entry.formation as string) ?? null, lineup: lineup.length > 0 ? lineup : null };
  }

  const home = extract(homeId);
  const away = extract(awayId);
  return { homeFormation: home.formation, awayFormation: away.formation, homeLineup: home.lineup, awayLineup: away.lineup };
}

async function fetchMatchDetail(matchId: number, token: string): Promise<MatchDetail> {
  const res = await fetch(`${FOOTBALL_DATA_BASE}/matches/${matchId}`, { headers: { 'X-Auth-Token': token } });
  checkRateLimit(res);
  if (!res.ok) throw new Error(`football-data.org ${res.status}: ${await res.text()}`);
  const body = await res.json();
  const detail = normalizeDetail(body as Record<string, unknown>);

  const apiFootballKey = Deno.env.get('API_FOOTBALL_KEY');
  if (apiFootballKey && !detail.homeLineup && !detail.awayLineup) {
    try {
      const enrichment = await fetchApiFootballLineups(detail.homeTeam, detail.awayTeam, detail.utcDate, apiFootballKey);
      if (enrichment) {
        detail.homeFormation = detail.homeFormation ?? enrichment.homeFormation;
        detail.awayFormation = detail.awayFormation ?? enrichment.awayFormation;
        detail.homeLineup = enrichment.homeLineup;
        detail.awayLineup = enrichment.awayLineup;
      }
    } catch {
      // Lineups are a nice-to-have — never fail the whole match detail over this.
    }
  }

  return detail;
}

function isoDate(daysFromNow: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

async function loadMatches(token: string): Promise<NormalizedMatch[]> {
  const live = await fetchFromFootballData('/matches?status=LIVE', token);
  if (live.length > 0) return normalize(live);

  // Nothing live right now — fall back to upcoming matches so the widget
  // isn't empty most of the day. A `dateFrom=X&dateTo=X` single-day query
  // unreliably returns 0 even when a wider range confirms matches exist
  // on that exact date (seemingly an API quirk, not a client-side bug —
  // verified directly against football-data.org outside of this
  // function), so this asks for a window ahead and keeps only the
  // soonest matches instead of trusting an exact single day. 10 days
  // covers an international break (the accessible competitions can go
  // over a week with nothing scheduled while national teams play
  // qualifiers that aren't in this free-tier competition list).
  const upcoming = await fetchFromFootballData(`/matches?dateFrom=${isoDate(0)}&dateTo=${isoDate(10)}`, token);
  const sorted = normalize(upcoming).sort((a, b) => a.utcDate.localeCompare(b.utcDate));
  return sorted.slice(0, 6);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

  const token = Deno.env.get('FOOTBALL_DATA_API_KEY');
  if (!token) {
    return new Response(JSON.stringify({ error: 'FOOTBALL_DATA_API_KEY is not configured' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // A POST with a matchId body asks for one match's detail (venue, referee,
  // half-time score, lineups if the plan includes them) instead of the
  // cached list — used when the widget's user clicks into a match.
  if (req.method === 'POST') {
    let matchId: number | null = null;
    try {
      const body = await req.json();
      if (typeof body?.matchId === 'number') matchId = body.matchId;
    } catch {
      // no/invalid body — fall through to the list behavior below
    }

    if (matchId !== null) {
      if (Date.now() < backOffUntil) {
        return new Response(JSON.stringify({ error: 'Sin cupo de pedidos por ahora, probá en un ratito.' }), {
          status: 503,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      try {
        const match = await fetchMatchDetail(matchId, token);
        return new Response(JSON.stringify({ match }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
          status: 502,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
    }
  }

  const shouldSkipUpstream = Date.now() < backOffUntil;

  if ((!cache || cache.expiresAt < Date.now()) && !shouldSkipUpstream) {
    try {
      const matches = await loadMatches(token);
      cache = { data: matches, expiresAt: Date.now() + CACHE_TTL_MS };
    } catch (err) {
      // Rate limited or upstream hiccup: keep serving whatever's in cache
      // (even if stale) rather than surfacing an error for a decoration
      // widget. Only a genuinely empty cache is a real failure.
      if (!(err instanceof RateLimited) && !cache) {
        return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
          status: 502,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
    }
  }

  return new Response(JSON.stringify({ matches: cache?.data ?? [] }), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
});
