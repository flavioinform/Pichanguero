// Transfermarkt hosts club crests at a predictable path keyed by the same
// club_id used throughout our player-scores tables — no extra data needed.
export function getClubCrestUrl(clubId: number | string): string {
  return `https://tmssl.akamaized.net/images/wappen/head/${clubId}.png`;
}
