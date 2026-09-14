// Minimal client for ESPN's public NFL endpoints. Used at build time (snapshot baked into
// the HTML) and in the browser (live refresh). Everything is parsed into small plain
// objects so the rendering code never touches raw API payloads.

const BASE = 'https://site.api.espn.com/apis';
const TIMEOUT_MS = 8000;

export interface TeamRow {
  abbr: string;
  name: string;
  shortName: string;
  logo: string;
  wins: number;
  losses: number;
  ties: number;
  pct: string;
  pf: number;
  pa: number;
  diff: string;
  streak: string;
  seed: number | null;
}
export interface Division {
  name: string;
  teams: TeamRow[];
}
export interface Conference {
  abbr: string;
  divisions: Division[];
}
export interface Standings {
  season: number;
  conferences: Conference[];
}

export type GameState = 'pre' | 'in' | 'post';
export interface GameTeam {
  abbr: string;
  name: string;
  logo: string;
  score: number | null;
  record: string;
  winner: boolean;
}
export interface Game {
  id: string;
  date: string;
  state: GameState;
  detail: string;
  away: GameTeam;
  home: GameTeam;
  venue: string;
  broadcast: string;
}
export interface Scoreboard {
  season: number;
  seasonType: number;
  week: number;
  weeks: number;
  games: Game[];
}

async function getJson(url: string): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`ESPN ${res.status} for ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const str = (v: unknown, max = 80) => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
/** Only ever emit logos from ESPN's CDN (also whitelisted in the CSP). */
const safeLogo = (v: unknown) => {
  const s = str(v, 200);
  return s.startsWith('https://a.espncdn.com/') ? s : '';
};
export const logoFor = (abbr: string) =>
  `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr.toLowerCase().replace(/[^a-z]/g, '')}.png`;

export async function fetchStandings(season?: number): Promise<Standings> {
  const q = season ? `&season=${season}` : '';
  const d = await getJson(`${BASE}/v2/sports/football/nfl/standings?level=3${q}`);
  let seasonYear = season ?? 0;
  const conferences: Conference[] = (d.children ?? []).map((conf: any) => ({
    abbr: str(conf.abbreviation, 8),
    divisions: (conf.children ?? []).map((div: any) => {
      seasonYear ||= num(div.standings?.season);
      const teams: TeamRow[] = (div.standings?.entries ?? []).map((e: any) => {
        const stats = new Map<string, any>((e.stats ?? []).map((s: any) => [s.name, s]));
        const val = (k: string) => stats.get(k)?.value;
        const disp = (k: string) => str(stats.get(k)?.displayValue, 12);
        const seed = num(val('playoffSeed'));
        return {
          abbr: str(e.team?.abbreviation, 5),
          name: str(e.team?.displayName),
          shortName: str(e.team?.shortDisplayName),
          logo: safeLogo(e.team?.logos?.[0]?.href) || logoFor(str(e.team?.abbreviation, 5)),
          wins: num(val('wins')),
          losses: num(val('losses')),
          ties: num(val('ties')),
          pct: disp('winPercent') || '.000',
          pf: num(val('pointsFor')),
          pa: num(val('pointsAgainst')),
          diff: disp('differential') || '0',
          streak: disp('streak') || '-',
          seed: seed > 0 ? seed : null,
        };
      });
      teams.sort((a, b) => b.wins - a.wins || a.losses - b.losses || (a.seed ?? 99) - (b.seed ?? 99));
      return { name: str(div.name, 20), teams };
    }),
  }));
  return { season: seasonYear, conferences };
}

function parseTeam(c: any): GameTeam {
  const abbr = str(c?.team?.abbreviation, 5);
  const score = c?.score;
  return {
    abbr,
    name: str(c?.team?.shortDisplayName || c?.team?.displayName),
    logo: safeLogo(c?.team?.logo) || logoFor(abbr),
    score: score === undefined || score === '' ? null : num(score),
    record: str(c?.records?.find((r: any) => r.type === 'total')?.summary, 10),
    winner: c?.winner === true,
  };
}

export async function fetchScoreboard(opts: { season?: number; week?: number; seasonType?: number } = {}): Promise<Scoreboard> {
  const params = new URLSearchParams();
  if (opts.season) params.set('dates', String(opts.season));
  if (opts.week) params.set('week', String(opts.week));
  if (opts.week || opts.seasonType) params.set('seasontype', String(opts.seasonType ?? 2));
  const qs = params.toString();
  const d = await getJson(`${BASE}/site/v2/sports/football/nfl/scoreboard${qs ? `?${qs}` : ''}`);
  const seasonType = num(d.season?.type) || 2;
  const cal = (d.leagues?.[0]?.calendar ?? []).find((c: any) => num(c.value) === seasonType);
  const games: Game[] = (d.events ?? []).map((e: any) => {
    const comp = e.competitions?.[0] ?? {};
    const competitors = comp.competitors ?? [];
    const stateRaw = str(e.status?.type?.state, 5);
    return {
      id: str(e.id, 20),
      date: str(e.date, 30),
      state: (['pre', 'in', 'post'].includes(stateRaw) ? stateRaw : 'pre') as GameState,
      detail: str(e.status?.type?.shortDetail, 40),
      away: parseTeam(competitors.find((c: any) => c.homeAway === 'away')),
      home: parseTeam(competitors.find((c: any) => c.homeAway === 'home')),
      venue: str(comp.venue?.fullName),
      broadcast: str(comp.broadcasts?.[0]?.names?.join(', '), 40),
    };
  });
  games.sort((a, b) => a.date.localeCompare(b.date));
  return {
    season: num(d.season?.year),
    seasonType,
    week: num(d.week?.number) || opts.week || 1,
    weeks: cal?.entries?.length || 18,
    games,
  };
}

/** Build-time helper: never let an API hiccup break the deploy. */
export async function safely<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    console.warn('[espn]', (err as Error).message);
    return null;
  }
}
