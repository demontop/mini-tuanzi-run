import { claimReward, getSupportCount, isRewardClaimable } from "../core/rewardEngine";
import type { AppContext } from "./context";
import { bindRouteButtons, routeButton, setMain } from "./pageUtils";

export function renderRewardPage(ctx: AppContext): void {
  const supportCount = getSupportCount(ctx.save.player);

  const supportRewards = ctx.data.rewards.supportRewards
    .map((reward) => {
      const claimed = ctx.save.player.claimedRewards.includes(reward.id);
      const claimable = isRewardClaimable(ctx.save.player, ctx.data.rewards, reward.id);
      return `
        <article class="reward-row">
          <div>
            <h2>${reward.reward}</h2>
            <p class="muted">应援 ${supportCount}/${reward.requiredSupportCount}</p>
          </div>
          <button class="btn primary" data-claim="${reward.id}" ${!claimable || claimed ? "disabled" : ""}>${
            claimed ? "已领取" : "领取"
          }</button>
        </article>
      `;
    })
    .join("");

  const popularityRewards = ctx.data.rewards.popularityRewards
    .map((reward) => {
      const claimed = ctx.save.player.claimedRewards.includes(reward.id);
      const claimable = isRewardClaimable(ctx.save.player, ctx.data.rewards, reward.id);
      return `
        <article class="reward-row">
          <div>
            <h2>${reward.reward}</h2>
            <p class="muted">累计人气 ${ctx.save.player.totalPopularityEarned}/${reward.requiredPopularity}</p>
          </div>
          <button class="btn primary" data-claim="${reward.id}" ${!claimable || claimed ? "disabled" : ""}>${
            claimed ? "已领取" : "领取"
          }</button>
        </article>
      `;
    })
    .join("");

  setMain(
    ctx,
    "奖励",
    `
      <section class="toolbar-line">${routeButton("返回首页", "/")}</section>
      <section class="split-list">
        <div>
          <h2>应援奖励</h2>
          ${supportRewards}
        </div>
        <div>
          <h2>人气奖励</h2>
          ${popularityRewards}
        </div>
      </section>
    `
  );

  ctx.root.querySelectorAll<HTMLButtonElement>("[data-claim]").forEach((button) => {
    button.addEventListener("click", () => {
      const rewardId = button.dataset.claim;
      if (rewardId && claimReward(ctx.save.player, rewardId)) {
        ctx.persist();
        ctx.refresh();
      }
    });
  });

  bindRouteButtons(ctx);
}
