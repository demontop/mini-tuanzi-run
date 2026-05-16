import { canSupportRace, supportRace } from "../core/rewardEngine";
import type { AppContext } from "./context";
import { bindRouteButtons, createRunnerToken, raceById, routeButton, runnerById, setMain } from "./pageUtils";

export function renderSupportPage(ctx: AppContext, params: string[]): void {
  const race = raceById(ctx, params[0] ?? ctx.data.schedule[0].id);
  const status = ctx.getRaceStatus(race);
  const support = ctx.save.player.supportedRaces[race.id];
  const canSupport = status === "SUPPORT_OPEN" && canSupportRace(ctx.save.player, race).ok;

  const runners = race.runnerIds
    .map((runnerId) => {
      const runner = runnerById(ctx, runnerId);
      const skills = runner.skillIds
        .map((skillId) => ctx.data.skills.find((skill) => skill.id === skillId)?.name)
        .filter(Boolean)
        .join(" / ");
      const isSupported = support?.runnerId === runnerId;

      return `
        <article class="runner-choice ${isSupported ? "selected" : ""}">
          <div class="runner-avatar" style="--runner-color: ${runner.color}">${runner.name.slice(0, 1)}</div>
          <div>
            <h2>${runner.name}</h2>
            <p>${runner.description}</p>
            <p class="muted">技能：${skills}</p>
          </div>
          <button class="btn ${isSupported ? "secondary" : "primary"}" data-support="${runner.id}" ${
            !canSupport || Boolean(support) ? "disabled" : ""
          }>${isSupported ? "已应援" : "应援"}</button>
        </article>
      `;
    })
    .join("");

  setMain(
    ctx,
    "应援",
    `
      <section class="support-head">
        <div>
          <h2>${race.name}</h2>
          <p class="muted">当前人气 ${ctx.save.player.popularity} · 消耗 ${race.supportCost}</p>
          <p>${support ? `你已支持 ${createRunnerToken(runnerById(ctx, support.runnerId))}` : "选择一个团子后不可更改"}</p>
        </div>
        <div class="action-row">
          ${routeButton("返回赛程", "/schedule")}
          ${routeButton("进入直播", `/live/${race.id}`, "primary")}
        </div>
      </section>
      <section class="runner-grid">${runners}</section>
    `
  );

  ctx.root.querySelectorAll<HTMLButtonElement>("[data-support]").forEach((button) => {
    button.addEventListener("click", () => {
      const runnerId = button.dataset.support;
      if (!runnerId) return;
      supportRace(ctx.save.player, race, runnerId);
      ctx.persist();
      ctx.refresh();
    });
  });

  bindRouteButtons(ctx);
}
