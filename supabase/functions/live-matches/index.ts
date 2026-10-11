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

async function fetchFromFootballData(path: string, token: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${FOOTBALL_DATA_BASE}${path}`, { headers: { 'X-Auth-Token': token } });

  // football-data.org has used more than one name for this header over
  // time (X-Requests-Available, then x-requests-available-minute) —
  // check both instead of silently never backing off again if it changes.
  const available = res.headers.get('X-Requests-Available') ?? res.headers.get('x-requests-available-minute');
  const resetSeconds = res.headers.get('X-RequestCounter-Reset');
  if (available !== null && Number(available) <= LOW_QUOTA_THRESHOLD) {
    backOffUntil = Date.now() + (resetSeconds ? Number(resetSeconds) * 1000 : 60_000);
  }

  if (res.status === 429) {
    backOffUntil = Date.now() + (resetSeconds ? Number(resetSeconds) * 1000 : 60_000);
    throw new RateLimited('football-data.org rate limit hit');
  }
  if (!res.ok) throw new Error(`football-data.org ${res.status}: ${await res.text()}`);

  const body = await res.json();
  return (body.matches as Record<string, unknown>[]) ?? [];
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
