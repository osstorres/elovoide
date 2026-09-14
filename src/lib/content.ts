import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n/ui';
import { findGame, outcomeFor, tally, type Outcome } from './results';

export type PickEntry = CollectionEntry<'picks'>;

/** `es/2026-w01` -> { lang: 'es', slug: '2026-w01' } */
export const splitId = (id: string) => {
  const [lang, ...rest] = id.split('/');
  return { lang: lang as Lang, slug: rest.join('/') };
};

export async function getPicks(lang: Lang) {
  const all = await getCollection('picks', (e) => splitId(e.id).lang === lang && !e.data.draft);
  return all.sort((a, b) => b.data.season - a.data.season || b.data.week - a.data.week);
}

export interface ResolvedGame {
  away: string;
  home: string;
  pick: string;
  spread?: string;
  confidence: number;
  analysis?: string;
  context?: string;
  data: string[];
  awayScore: number | null;
  homeScore: number | null;
  outcome: Outcome;
  note?: string;
}

export async function resolvePicks(entry: PickEntry) {
  const { season, week } = entry.data;
  const games: ResolvedGame[] = await Promise.all(
    entry.data.games.map(async (g) => {
      const live = g.result?.outcome && g.result.outcome !== 'pending' ? null : await findGame(season, week, g.away, g.home);
      const liveAway = live ? (live.away.abbr === g.away ? live.away.score : live.home.score) : null;
      const liveHome = live ? (live.home.abbr === g.home ? live.home.score : live.away.score) : null;
      const showScore = live?.state === 'post' || live?.state === 'in';
      return {
        ...g,
        awayScore: g.result?.awayScore ?? (showScore ? liveAway : null),
        homeScore: g.result?.homeScore ?? (showScore ? liveHome : null),
        outcome: g.result?.outcome && g.result.outcome !== 'pending' ? g.result.outcome : outcomeFor(live, g.pick),
        note: g.result?.note,
      };
    }),
  );
  return { games, record: tally(games.map((g) => g.outcome)) };
}

export async function getSurvivor(season?: number) {
  const all = await getCollection('survivor');
  const seasons = [...new Set(all.map((e) => e.data.season))].sort((a, b) => b - a);
  const current = season ?? seasons[0];
  const rows = await Promise.all(
    all
      .filter((e) => e.data.season === current)
      .sort((a, b) => a.data.week - b.data.week)
      .map(async (e) => {
        const d = e.data;
        const outcome: Outcome = d.outcome ?? outcomeFor(await findGame(d.season, d.week, d.team, d.opponent), d.team);
        return { ...d, outcome };
      }),
  );
  const alive = !rows.some((r) => r.outcome === 'loss');
  return { season: current, rows, alive, record: tally(rows.map((r) => r.outcome)) };
}

export async function getMemes() {
  const all = await getCollection('memes');
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}
