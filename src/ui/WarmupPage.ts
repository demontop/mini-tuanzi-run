import { createRng, randomInt } from "../core/rng";
import type { AppContext } from "./context";
import { bindRouteButtons, routeButton, setMain } from "./pageUtils";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function renderWarmupPage(ctx: AppContext): void {
  const warmup = ctx.save.warmup;
  if (warmup.lastClaimDate !== todayKey()) {
    warmup.claimedToday = false;
  }

  const cells = Array.from({ length: 24 }, (_, index) => {
    const active = index === warmup.position % 24;
    const type = index % 7 === 0 ? "奖励" : index % 5 === 0 ? "事件" : index % 4 === 0 ? "加速" : "";
    return `<div class="warm-cell ${active ? "active" : ""}">${active ? "团" : type}</div>`;
  }).join("");

  setMain(
    ctx,
    "热身赛",
    `
      <section class="support-head">
        <div>
          <h2>漂泊者团子的棋盘练习</h2>
          <p class="muted">剩余骰子 ${warmup.diceLeft} · 当前位置 ${warmup.position}</p>
        </div>
        <div class="action-row">
          <button class="btn secondary" data-claim-dice ${warmup.claimedToday ? "disabled" : ""}>领取今日骰子</button>
          <button class="btn primary" data-roll ${warmup.diceLeft <= 0 ? "disabled" : ""}>投骰子</button>
        </div>
      </section>
      <section class="warm-board">${cells}</section>
      <section class="event-log warm-log">${warmup.log.map((item) => `<p>${item}</p>`).join("")}</section>
      <section class="toolbar-line">${routeButton("返回首页", "/")}</section>
    `
  );

  ctx.root.querySelector<HTMLElement>("[data-claim-dice]")?.addEventListener("click", () => {
    warmup.diceLeft += 3;
    warmup.claimedToday = true;
    warmup.lastClaimDate = todayKey();
    warmup.log.unshift("领取了今日 3 枚骰子");
    ctx.persist();
    ctx.refresh();
  });

  ctx.root.querySelector<HTMLElement>("[data-roll]")?.addEventListener("click", () => {
    const rng = createRng(Date.now() + warmup.position);
    const dice = randomInt(rng, 1, 6);
    warmup.diceLeft -= 1;
    warmup.position = (warmup.position + dice) % 24;
    const reward = warmup.position % 7 === 0 ? 60 : warmup.position % 5 === 0 ? 30 : 10;
    ctx.save.player.popularity += reward;
    ctx.save.player.totalPopularityEarned += reward;
    warmup.log.unshift(`掷出 ${dice}，获得 ${reward} 人气`);
    warmup.log = warmup.log.slice(0, 8);
    ctx.persist();
    ctx.refresh();
  });

  bindRouteButtons(ctx);
}
