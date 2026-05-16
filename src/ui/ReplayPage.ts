import { RacePlayer } from "./RacePlayer";
import type { AppContext } from "./context";
import { bindRouteButtons, raceById, routeButton, setMain } from "./pageUtils";

export function renderReplayPage(ctx: AppContext, params: string[]): void | (() => void) {
  const race = raceById(ctx, params[0] ?? ctx.data.schedule[0].id);
  const result = ctx.save.raceResults[race.id];

  if (!result) {
    setMain(
      ctx,
      "回放",
      `<section class="empty-state"><p>这场比赛还没有结果。</p>${routeButton("去直播", `/live/${race.id}`, "primary")}</section>`
    );
    bindRouteButtons(ctx);
    return;
  }

  setMain(ctx, "回放", `<section data-race-player></section>`);
  const mount = ctx.root.querySelector<HTMLElement>("[data-race-player]")!;
  const player = new RacePlayer(ctx, mount, race, result, {
    title: "事件日志回放",
    autoplay: true
  });

  return () => player.destroy();
}
