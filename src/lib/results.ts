// Build-time resolution of pick/survivor outcomes from final scores, so a result only needs
// to be typed by hand when you want to override it (or add a note).
import { fetchScoreboard, safely, type Game, type Scoreboard } from './espn';

export type Outcome = 'win' | 'loss' | 'push' | 'pending';

const cache = new Map<string, Promise<Scoreboard | null>>();

export function weekScoreboard(season: number, week: number) {
  const key = `${season}-${week}`;
  if (!cache.has(key)) cache.set(key, safely(() => fetchScoreboard({ season, week, seasonType: 2 })));
  return cache.get(key)!;
}

export async function findGame(season: number, week: number, a: string, b: string): Promise<Game | null> {
  const sb = await weekScoreboard(season, week);
  const set = new Set([a, b]);
  return sb?.games.find((g) => set.has(g.away.abbr) && set.has(g.home.abbr)) ?? null;
}

/** Straight-up outcome for `team` in a finished game. */
export function outcomeFor(game: Game | null, team: string): Outcome {
  if (!game || game.state !== 'post' || game.away.score === null || game.home.score === null) return 'pending';
  if (game.away.score === game.home.score) return 'push';
  const winner = game.away.score > game.home.score ? game.away.abbr : game.home.abbr;
  return winner === team ? 'win' : 'loss';
}

export function tally(outcomes: Outcome[]) {
  const r = { win: 0, loss: 0, push: 0, pending: 0 };
  for (const o of outcomes) r[o]++;
  return r;
}

export const recordText = (r: ReturnType<typeof tally>) => `${r.win}-${r.loss}${r.push ? `-${r.push}` : ''}`;
