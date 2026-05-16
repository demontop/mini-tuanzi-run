import type { AppContext } from "./context";
import { bindRouteButtons, createRunnerToken, routeButton, runnerById, setMain } from "./pageUtils";

export function renderRankingPage(ctx: AppContext): void {
  const stats = Object.fromEntries(
    ctx.data.runners.map((runner) => [
      runner.id,
      {
        runner,
        wins: 0,
        podiums: 0,
        totalRank: 0,
        races: 0
      }
    ])
  );

  for (const result of Object.values(ctx.save.raceResults)) {
    for (const ranking of result.rankings) {
      const stat = stats[ranking.runnerId];
      if (!stat) continue;
      stat.races += 1;
      stat.totalRank += ranking.rank;
      if (ranking.rank === 1) stat.wins += 1;
      if (ranking.rank <= 3) stat.podiums += 1;
    }
  }

  const rows = Object.values(stats)
    .sort((left, right) => {
      if (right.wins !== left.wins) return right.wins - left.wins;
      if (right.podiums !== left.podiums) return right.podiums - left.podiums;
      return left.runner.id.localeCompare(right.runner.id);
    })
    .map((stat, index) => `
      <div class="rank-row wide">
        <span class="rank-index">${index + 1}</span>
        ${createRunnerToken(runnerById(ctx, stat.runner.id))}
        <strong>${stat.wins} 胜</strong>
        <span>${stat.podiums} 次前三</span>
        <span>均名 ${stat.races ? (stat.totalRank / stat.races).toFixed(1) : "-"}</span>
      </div>
    `)
    .join("");

  setMain(
    ctx,
    "排行榜",
    `
      <section class="toolbar-line">${routeButton("返回首页", "/")}</section>
      <section class="ranking-list">${rows}</section>
    `
  );
  bindRouteButtons(ctx);
}
