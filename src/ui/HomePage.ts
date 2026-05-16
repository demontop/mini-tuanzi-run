import type { AppContext } from "./context";
import { bindRouteButtons, createRunnerToken, formatStatus, resultWinner, routeButton, setMain } from "./pageUtils";

export function renderHomePage(ctx: AppContext): void {
  const nextRace = ctx.data.schedule.find((race) => ctx.getRaceStatus(race) !== "FINISHED") ?? ctx.data.schedule[0];
  const nextResult = ctx.save.raceResults[nextRace.id];
  const winner = resultWinner(ctx, nextResult);
  const supportedCount = Object.keys(ctx.save.player.supportedRaces).length;

  setMain(
    ctx,
    "小团快跑",
    `
      <section class="dashboard-grid">
        <div class="metric-band">
          <div>
            <span>当前人气</span>
            <strong>${ctx.save.player.popularity}</strong>
          </div>
          <div>
            <span>累计应援</span>
            <strong>${supportedCount}</strong>
          </div>
          <div>
            <span>已完成赛事</span>
            <strong>${Object.keys(ctx.save.raceResults).length}/10</strong>
          </div>
        </div>
        <section class="focus-race">
          <div>
            <p class="eyebrow">今日赛事</p>
            <h2>${nextRace.name}</h2>
            <p class="muted">状态：${formatStatus(ctx.getRaceStatus(nextRace))}</p>
            <p class="muted">冠军：${winner ? createRunnerToken(winner) : "等待开跑"}</p>
          </div>
          <div class="action-row">
            ${routeButton("应援", `/support/${nextRace.id}`, "primary")}
            ${routeButton(nextResult ? "看回放" : "进入直播", nextResult ? `/replay/${nextRace.id}` : `/live/${nextRace.id}`, "secondary")}
          </div>
        </section>
      </section>
      <section class="shortcut-grid">
        ${routeButton("赛程", "/schedule")}
        ${routeButton("奖励", "/rewards")}
        ${routeButton("排行榜", "/ranking")}
        ${routeButton("热身赛", "/warmup")}
        ${routeButton("联机房间", "/multiplayer", "primary")}
      </section>
    `
  );

  bindRouteButtons(ctx);
}
