import type { AppContext } from "./context";
import {
  bindRouteButtons,
  createRunnerToken,
  formatStatus,
  resultWinner,
  routeButton,
  runnerById,
  setMain
} from "./pageUtils";

export function renderSchedulePage(ctx: AppContext): void {
  const rows = ctx.data.schedule
    .map((race, index) => {
      const result = ctx.save.raceResults[race.id];
      const winner = resultWinner(ctx, result);
      const support = ctx.save.player.supportedRaces[race.id];
      const status = ctx.getRaceStatus(race);
      const runners = race.runnerIds.map((runnerId) => createRunnerToken(runnerById(ctx, runnerId))).join("");
      const action =
        status === "LOCKED"
          ? `<button class="btn secondary" disabled>未解锁</button>`
          : `${routeButton(support ? "已应援" : "应援", `/support/${race.id}`)} ${routeButton(
              result ? "回放" : "直播",
              result ? `/replay/${race.id}` : `/live/${race.id}`,
              result ? "secondary" : "primary"
            )}`;

      return `
        <article class="race-row">
          <div class="race-number">${String(index + 1).padStart(2, "0")}</div>
          <div class="race-row-main">
            <h2>${race.name}</h2>
            <p class="muted">${formatStatus(status)} · 应援消耗 ${race.supportCost}</p>
            <div class="runner-strip">${runners}</div>
          </div>
          <div class="race-row-side">
            <p>${winner ? createRunnerToken(winner) : "冠军待定"}</p>
            <p>${support ? `你支持：${createRunnerToken(runnerById(ctx, support.runnerId))}` : "尚未应援"}</p>
            <div class="action-row">${action}</div>
          </div>
        </article>
      `;
    })
    .join("");

  setMain(ctx, "赛程", `<section class="race-list">${rows}</section>`);
  bindRouteButtons(ctx);
}
