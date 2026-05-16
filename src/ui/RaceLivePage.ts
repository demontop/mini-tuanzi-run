import { RacePlayer } from "./RacePlayer";
import type { AppContext } from "./context";
import { bindRouteButtons, raceById, routeButton, setMain } from "./pageUtils";

export function renderRaceLivePage(ctx: AppContext, params: string[]): () => void {
  const race = raceById(ctx, params[0] ?? ctx.data.schedule[0].id);
  const result = ctx.save.raceResults[race.id] ?? ctx.runRace(race.id);

  setMain(
    ctx,
    "直播",
    `
      <section class="toolbar-line">
        ${routeButton("赛程", "/schedule")}
        ${routeButton("奖励", "/rewards")}
        ${routeButton("联机房间", "/multiplayer", "primary")}
      </section>
      <section data-race-player></section>
    `
  );
  bindRouteButtons(ctx);

  const mount = ctx.root.querySelector<HTMLElement>("[data-race-player]")!;
  const player = new RacePlayer(ctx, mount, race, result, {
    title: ctx.save.raceResults[race.id] ? "回放 / 直播记录" : "比赛直播",
    autoplay: true,
    onFinish: () => {
      ctx.persist();
    }
  });

  return () => player.destroy();
}
