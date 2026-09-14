// HTML builders shared by the build (Astro `set:html`) and the browser (live refresh),
// so the snapshot and the refreshed view are identical. Every dynamic value is escaped.
import type { Game, GameTeam, Scoreboard, Standings } from './espn';

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export interface StandingsLabels {
  team: string; w: string; l: string; t: string; pct: string; pf: string; pa: string; diff: string; strk: string;
}
export interface ScoresLabels {
  final: string; live: string; empty: string; locale: string;
  /** Fixed zone for the build-time snapshot; the browser uses its own. */
  timeZone?: string;
}

export function standingsHtml(s: Standings, L: StandingsLabels): string {
  return s.conferences
    .map(
      (conf) => `
<section class="conf" data-conf="${esc(conf.abbr)}">
  <h2 class="conf-title">${esc(conf.abbr)}</h2>
  <div class="div-grid">
  ${conf.divisions
    .map(
      (div) => `
    <div class="card table-card">
      <h3 class="div-title">${esc(div.name)}</h3>
      <div class="table-wrap">
      <table class="standings">
        <thead><tr>
          <th scope="col" class="col-team">${esc(L.team)}</th>
          <th scope="col">${esc(L.w)}</th><th scope="col">${esc(L.l)}</th><th scope="col">${esc(L.t)}</th>
          <th scope="col">${esc(L.pct)}</th>
          <th scope="col" class="hide-sm">${esc(L.pf)}</th><th scope="col" class="hide-sm">${esc(L.pa)}</th>
          <th scope="col">${esc(L.diff)}</th><th scope="col" class="hide-sm">${esc(L.strk)}</th>
        </tr></thead>
        <tbody>
        ${div.teams
          .map(
            (tm) => `
          <tr>
            <th scope="row" class="col-team">
              <span class="team">
                <img src="${esc(tm.logo)}" alt="" width="24" height="24" loading="lazy" decoding="async" />
                <span class="team-name"><span class="full">${esc(tm.name)}</span><span class="abbr">${esc(tm.abbr)}</span></span>
                ${tm.seed ? `<span class="seed" title="Seed">${esc(tm.seed)}</span>` : ''}
              </span>
            </th>
            <td>${tm.wins}</td><td>${tm.losses}</td><td>${tm.ties}</td>
            <td>${esc(tm.pct)}</td>
            <td class="hide-sm">${tm.pf}</td><td class="hide-sm">${tm.pa}</td>
            <td class="${tm.diff.startsWith('+') ? 'pos' : tm.diff.startsWith('-') ? 'neg' : ''}">${esc(tm.diff)}</td>
            <td class="hide-sm">${esc(tm.streak)}</td>
          </tr>`,
          )
          .join('')}
        </tbody>
      </table>
      </div>
    </div>`,
    )
    .join('')}
  </div>
</section>`,
    )
    .join('');
}

function teamLine(tm: GameTeam, game: Game) {
  const lost = game.state === 'post' && !tm.winner && (game.away.winner || game.home.winner);
  return `
    <div class="gt${tm.winner ? ' is-winner' : ''}${lost ? ' is-loser' : ''}">
      <img src="${esc(tm.logo)}" alt="" width="32" height="32" loading="lazy" decoding="async" />
      <span class="gt-name">${esc(tm.name)}</span>
      <span class="gt-rec">${esc(tm.record)}</span>
      <span class="gt-score">${game.state === 'pre' || tm.score === null ? '' : tm.score}</span>
    </div>`;
}

export function scoresHtml(sb: Scoreboard, L: ScoresLabels): string {
  if (!sb.games.length) return `<p class="empty">${esc(L.empty)}</p>`;
  const dayFmt = new Intl.DateTimeFormat(L.locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: L.timeZone });
  const timeFmt = new Intl.DateTimeFormat(L.locale, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone: L.timeZone });
  const byDay = new Map<string, Game[]>();
  for (const g of sb.games) {
    const key = dayFmt.format(new Date(g.date));
    byDay.set(key, [...(byDay.get(key) ?? []), g]);
  }
  return [...byDay.entries()]
    .map(
      ([day, games]) => `
<section class="day">
  <h2 class="day-title">${esc(day)}</h2>
  <div class="games">
  ${games
    .map((g) => {
      const status =
        g.state === 'post'
          ? `<span class="badge badge-final">${esc(L.final)}</span>`
          : g.state === 'in'
            ? `<span class="badge badge-live">${esc(L.live)} · ${esc(g.detail)}</span>`
            : `<span class="badge">${esc(timeFmt.format(new Date(g.date)))}</span>`;
      return `
    <article class="card game">
      <header class="game-head">${status}${g.broadcast ? `<span class="muted">${esc(g.broadcast)}</span>` : ''}</header>
      ${teamLine(g.away, g)}
      ${teamLine(g.home, g)}
      ${g.venue ? `<footer class="game-foot muted">${esc(g.venue)}</footer>` : ''}
    </article>`;
    })
    .join('')}
  </div>
</section>`,
    )
    .join('');
}
