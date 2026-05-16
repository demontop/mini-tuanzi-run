import runnersJson from "./data/runners.json";
import skillsJson from "./data/skills.json";
import tracksJson from "./data/tracks.json";
import scheduleJson from "./data/schedule.json";
import rewardsJson from "./data/rewards.json";
import settingsJson from "./data/settings.json";
import { simulateRace } from "./core/raceEngine";
import { settleRaceIfSupported } from "./core/rewardEngine";
import type {
  RaceConfig,
  RaceResult,
  RewardConfig,
  RunnerConfig,
  SettingsConfig,
  SkillConfig,
  TrackConfig
} from "./core/raceTypes";
import { clearSave, loadSave, saveGame, type SaveData } from "./storage/localSave";
import type { AppContext, AppData, PageRenderer } from "./ui/context";
import { renderHomePage } from "./ui/HomePage";
import { renderSchedulePage } from "./ui/SchedulePage";
import { renderSupportPage } from "./ui/SupportPage";
import { renderRaceLivePage } from "./ui/RaceLivePage";
import { renderReplayPage } from "./ui/ReplayPage";
import { renderRewardPage } from "./ui/RewardPage";
import { renderRankingPage } from "./ui/RankingPage";
import { renderWarmupPage } from "./ui/WarmupPage";
import { renderMultiplayerPage } from "./ui/MultiplayerPage";

const data: AppData = {
  runners: runnersJson as RunnerConfig[],
  skills: skillsJson as SkillConfig[],
  tracks: tracksJson as TrackConfig[],
  schedule: scheduleJson as RaceConfig[],
  rewards: rewardsJson as RewardConfig,
  settings: settingsJson as SettingsConfig
};

const routes: Record<string, PageRenderer> = {
  "": renderHomePage,
  schedule: renderSchedulePage,
  support: renderSupportPage,
  live: renderRaceLivePage,
  replay: renderReplayPage,
  rewards: renderRewardPage,
  ranking: renderRankingPage,
  warmup: renderWarmupPage,
  multiplayer: renderMultiplayerPage
};

export class App {
  private save: SaveData = loadSave(data.settings.saveKey, data.settings.initialPopularity);
  private pageRoot!: HTMLElement;
  private disposer?: () => void;

  constructor(private readonly appRoot: HTMLElement) {}

  start(): void {
    window.addEventListener("hashchange", () => this.render());
    this.render();
  }

  private makeContext(): AppContext {
    return {
      root: this.pageRoot,
      data,
      save: this.save,
      navigate: (path) => this.navigate(path),
      refresh: () => this.render(),
      persist: () => this.persist(),
      resetSave: () => this.resetSave(),
      runRace: (raceId) => this.runRace(raceId),
      getRaceStatus: (race) => this.getRaceStatus(race)
    };
  }

  private navigate(path: string): void {
    window.location.hash = path === "/" ? "#/" : `#${path}`;
  }

  private persist(): void {
    saveGame(data.settings.saveKey, this.save);
  }

  private resetSave(): void {
    this.save = clearSave(data.settings.saveKey, data.settings.initialPopularity);
    this.render();
  }

  private getRaceStatus(race: RaceConfig): RaceConfig["status"] {
    if (this.save.raceResults[race.id]) {
      return "FINISHED";
    }

    const index = data.schedule.findIndex((item) => item.id === race.id);
    const previous = data.schedule[index - 1];
    if (index === 0 || (previous && this.save.raceResults[previous.id])) {
      return "SUPPORT_OPEN";
    }

    return race.status === "SUPPORT_OPEN" ? "SUPPORT_OPEN" : "LOCKED";
  }

  private runRace(raceId: string): RaceResult {
    const cached = this.save.raceResults[raceId];
    if (cached) {
      return cached;
    }

    const race = data.schedule.find((item) => item.id === raceId);
    if (!race) {
      throw new Error(`Unknown race: ${raceId}`);
    }

    const track = data.tracks.find((item) => item.id === race.trackId);
    if (!track) {
      throw new Error(`Unknown track: ${race.trackId}`);
    }

    const runners = race.runnerIds.map((runnerId) => {
      const runner = data.runners.find((item) => item.id === runnerId);
      if (!runner) {
        throw new Error(`Unknown runner: ${runnerId}`);
      }
      return runner;
    });

    const result = simulateRace(race, runners, data.skills, track, data.settings);
    this.save.raceResults[race.id] = result;
    this.save.replayLogs[race.id] = result.eventLog;
    settleRaceIfSupported(this.save.player, result, data.rewards);
    if (!this.save.player.finishedRaceIds.includes(race.id)) {
      this.save.player.finishedRaceIds.push(race.id);
    }
    this.persist();
    return result;
  }

  private renderShell(): void {
    this.appRoot.innerHTML = `
      <header class="app-header">
        <button class="brand" data-nav="/">小团快跑</button>
        <nav>
          <button data-nav="/schedule">赛程</button>
          <button data-nav="/rewards">奖励</button>
          <button data-nav="/ranking">排行</button>
          <button data-nav="/multiplayer">联机</button>
        </nav>
        <button class="ghost-danger" data-reset>清空存档</button>
      </header>
      <main id="page-root"></main>
    `;

    this.appRoot.querySelectorAll<HTMLElement>("[data-nav]").forEach((button) => {
      button.addEventListener("click", () => this.navigate(button.dataset.nav ?? "/"));
    });
    this.appRoot.querySelector<HTMLElement>("[data-reset]")?.addEventListener("click", () => {
      if (window.confirm("确认清空本地存档？")) {
        this.resetSave();
      }
    });

    const pageRoot = this.appRoot.querySelector<HTMLElement>("#page-root");
    if (!pageRoot) {
      throw new Error("Missing page root.");
    }
    this.pageRoot = pageRoot;
  }

  private render(): void {
    this.disposer?.();
    this.disposer = undefined;
    this.renderShell();

    const raw = window.location.hash.replace(/^#\/?/, "");
    const [routeName = "", ...params] = raw.split("/").filter(Boolean);
    const renderer = routes[routeName] ?? renderHomePage;
    const disposer = renderer(this.makeContext(), params);
    if (typeof disposer === "function") {
      this.disposer = disposer;
    }
  }
}
