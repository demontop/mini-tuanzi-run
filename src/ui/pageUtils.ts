import type { AppContext } from "./context";
import type { RaceConfig, RaceResult, RunnerConfig, TrackConfig } from "../core/raceTypes";

export function runnerById(ctx: AppContext, runnerId: string): RunnerConfig {
  const runner = ctx.data.runners.find((item) => item.id === runnerId);
  if (!runner) {
    throw new Error(`Unknown runner: ${runnerId}`);
  }
  return runner;
}

export function trackById(ctx: AppContext, trackId: string): TrackConfig {
  const track = ctx.data.tracks.find((item) => item.id === trackId);
  if (!track) {
    throw new Error(`Unknown track: ${trackId}`);
  }
  return track;
}

export function raceById(ctx: AppContext, raceId: string): RaceConfig {
  const race = ctx.data.schedule.find((item) => item.id === raceId);
  if (!race) {
    throw new Error(`Unknown race: ${raceId}`);
  }
  return race;
}

export function resultWinner(ctx: AppContext, result?: RaceResult): RunnerConfig | undefined {
  const winnerId = result?.rankings[0]?.runnerId;
  return winnerId ? runnerById(ctx, winnerId) : undefined;
}

export function setMain(ctx: AppContext, title: string, content: string): HTMLElement {
  ctx.root.innerHTML = `
    <section class="page-head">
      <p class="eyebrow">小团快跑</p>
      <h1>${title}</h1>
    </section>
    ${content}
  `;
  return ctx.root;
}

export function routeButton(label: string, path: string, variant = "secondary"): string {
  return `<button class="btn ${variant}" data-route="${path}">${label}</button>`;
}

export function bindRouteButtons(ctx: AppContext, root: ParentNode = ctx.root): void {
  root.querySelectorAll<HTMLElement>("[data-route]").forEach((element) => {
    element.addEventListener("click", () => {
      const route = element.dataset.route;
      if (route) {
        ctx.navigate(route);
      }
    });
  });
}

export function formatStatus(status: RaceConfig["status"]): string {
  const labels: Record<RaceConfig["status"], string> = {
    LOCKED: "未解锁",
    SUPPORT_OPEN: "应援中",
    SUPPORT_CLOSED: "已锁定",
    LIVE: "直播中",
    FINISHED: "已结束"
  };
  return labels[status];
}

export function eventText(ctx: AppContext, event: RaceResult["eventLog"][number]): string {
  if (event.type === "COMMENTARY") {
    return event.message;
  }

  if (event.type === "TURN_ORDER") {
    return `第 ${event.round} 回合行动顺序更新`;
  }

  if (event.type === "ROLL") {
    return `${runnerById(ctx, event.runnerId).name} 掷出 ${event.value}`;
  }

  if (event.type === "MOVE") {
    const carried = event.carriedRunnerIds?.length ? `，带着 ${event.carriedRunnerIds.length} 个团子` : "";
    return `${runnerById(ctx, event.runnerId).name} 从 ${event.from} 到 ${event.to}${carried}`;
  }

  if (event.type === "SKILL") {
    return `${runnerById(ctx, event.runnerId).name} 触发 ${event.description}`;
  }

  if (event.type === "CELL") {
    return `${runnerById(ctx, event.runnerId).name}：${event.description}`;
  }

  if (event.type === "STACK") {
    return `第 ${event.cellIndex} 格出现团子堆叠`;
  }

  if (event.type === "FINISH") {
    return `${runnerById(ctx, event.runnerId).name} 获得第 ${event.rank} 名`;
  }

  return "";
}

export function createRunnerToken(runner: RunnerConfig): string {
  return `
    <span class="runner-token" style="--runner-color: ${runner.color}">
      <span class="runner-dot"></span>${runner.name}
    </span>
  `;
}
