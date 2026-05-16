import { buildReplayFrames, type ReplaySnapshot } from "../core/replayEngine";
import type { RaceConfig, RaceResult } from "../core/raceTypes";
import { RacePhaserView } from "../game/RacePhaserView";
import type { AppContext } from "./context";
import { eventText, runnerById, trackById } from "./pageUtils";

export interface RacePlayerOptions {
  title?: string;
  autoplay?: boolean;
  onSnapshot?: (snapshot: ReplaySnapshot, cursor: number, playing: boolean, speed: number) => void;
  onFinish?: () => void;
}

export class RacePlayer {
  private readonly frames: ReplaySnapshot[];
  private readonly view: RacePhaserView;
  private cursor = 0;
  private playing: boolean;
  private speed = 1;
  private timer?: number;
  private controls!: HTMLElement;
  private logPanel!: HTMLElement;
  private rankPanel!: HTMLElement;
  private danmakuPanel!: HTMLElement;

  constructor(
    private readonly ctx: AppContext,
    private readonly container: HTMLElement,
    private readonly race: RaceConfig,
    private readonly result: RaceResult,
    private readonly options: RacePlayerOptions = {}
  ) {
    const track = trackById(ctx, race.trackId);
    const runners = race.runnerIds.map((runnerId) => runnerById(ctx, runnerId));
    this.frames = buildReplayFrames(result, race.runnerIds);
    this.playing = options.autoplay ?? true;

    this.container.innerHTML = `
      <div class="race-shell">
        <div class="race-canvas" data-race-canvas></div>
        <aside class="race-sidebar">
          <div class="race-panel compact">
            <p class="eyebrow">${options.title ?? "比赛直播"}</p>
            <h2>${race.name}</h2>
            <div class="race-controls" data-controls></div>
          </div>
          <div class="race-panel">
            <h3>实时排名</h3>
            <div data-ranks></div>
          </div>
        </aside>
      </div>
      <section class="live-bottom">
        <div class="event-log" data-log></div>
        <div class="danmaku-lane" data-danmaku></div>
      </section>
    `;

    const canvasParent = this.container.querySelector<HTMLElement>("[data-race-canvas]");
    if (!canvasParent) {
      throw new Error("Missing race canvas parent.");
    }

    this.controls = this.container.querySelector<HTMLElement>("[data-controls]")!;
    this.logPanel = this.container.querySelector<HTMLElement>("[data-log]")!;
    this.rankPanel = this.container.querySelector<HTMLElement>("[data-ranks]")!;
    this.danmakuPanel = this.container.querySelector<HTMLElement>("[data-danmaku]")!;
    this.view = new RacePhaserView(canvasParent, runners, track);
    this.renderControls();
    this.jumpTo(0);

    if (this.playing) {
      this.scheduleNext();
    }
  }

  setRemoteSnapshot(snapshot: ReplaySnapshot, cursor: number, playing: boolean, speed: number): void {
    this.cursor = Math.min(cursor, this.frames.length - 1);
    this.playing = playing;
    this.speed = speed;
    this.view.update(snapshot);
    this.renderSidebars(snapshot);
    this.renderControls();
  }

  private renderControls(): void {
    this.controls.innerHTML = `
      <button class="icon-btn" data-action="toggle" title="${this.playing ? "暂停" : "播放"}">${this.playing ? "Ⅱ" : "▶"}</button>
      <button class="icon-btn ${this.speed === 1 ? "active" : ""}" data-speed="1" title="1 倍速">1x</button>
      <button class="icon-btn ${this.speed === 2 ? "active" : ""}" data-speed="2" title="2 倍速">2x</button>
      <button class="icon-btn ${this.speed === 4 ? "active" : ""}" data-speed="4" title="4 倍速">4x</button>
      <button class="icon-btn" data-action="skip" title="跳到结果">»</button>
      <button class="icon-btn" data-action="restart" title="重新播放">↺</button>
    `;

    this.controls.querySelector<HTMLElement>("[data-action='toggle']")?.addEventListener("click", () => {
      this.playing = !this.playing;
      this.renderControls();
      if (this.playing) {
        this.scheduleNext();
      } else {
        this.clearTimer();
      }
      this.emitSnapshot();
    });

    this.controls.querySelector<HTMLElement>("[data-action='skip']")?.addEventListener("click", () => {
      this.jumpTo(this.frames.length - 1);
      this.playing = false;
      this.renderControls();
      this.clearTimer();
      this.options.onFinish?.();
    });

    this.controls.querySelector<HTMLElement>("[data-action='restart']")?.addEventListener("click", () => {
      this.jumpTo(0);
      this.playing = true;
      this.renderControls();
      this.scheduleNext();
    });

    this.controls.querySelectorAll<HTMLElement>("[data-speed]").forEach((button) => {
      button.addEventListener("click", () => {
        this.speed = Number(button.dataset.speed) || 1;
        this.renderControls();
        if (this.playing) {
          this.scheduleNext();
        }
        this.emitSnapshot();
      });
    });
  }

  private renderSidebars(snapshot: ReplaySnapshot): void {
    const liveRankings = [...this.race.runnerIds].sort((left, right) => {
      const leftFinished = snapshot.rankings.indexOf(left);
      const rightFinished = snapshot.rankings.indexOf(right);
      if (leftFinished !== -1 || rightFinished !== -1) {
        if (leftFinished === -1) return 1;
        if (rightFinished === -1) return -1;
        return leftFinished - rightFinished;
      }
      return (snapshot.positions[right] ?? 0) - (snapshot.positions[left] ?? 0);
    });

    this.rankPanel.innerHTML = liveRankings
      .map((runnerId, index) => {
        const runner = runnerById(this.ctx, runnerId);
        const finishedRank = snapshot.rankings.indexOf(runnerId);
        const rank = finishedRank >= 0 ? finishedRank + 1 : index + 1;
        return `
          <div class="rank-row">
            <span class="rank-index">${rank}</span>
            <span class="runner-dot" style="--runner-color: ${runner.color}"></span>
            <span>${runner.name}</span>
            <strong>${snapshot.positions[runnerId] ?? 0}</strong>
          </div>
        `;
      })
      .join("");

    const logs = this.result.eventLog
      .slice(Math.max(0, this.cursor - 9), this.cursor + 1)
      .map((event) => `<p>${eventText(this.ctx, event)}</p>`)
      .join("");
    this.logPanel.innerHTML = logs || "<p>比赛准备中</p>";

    const lastEvent = snapshot.lastEvent;
    if (
      lastEvent &&
      (lastEvent.type === "COMMENTARY" || lastEvent.type === "SKILL" || lastEvent.type === "FINISH")
    ) {
      const message = eventText(this.ctx, lastEvent);
      const item = document.createElement("span");
      item.textContent = message;
      item.className = "danmaku";
      item.style.top = `${12 + Math.floor(Math.random() * 56)}px`;
      this.danmakuPanel.append(item);
      window.setTimeout(() => item.remove(), 6200);
    }
  }

  private jumpTo(cursor: number): void {
    this.cursor = Math.max(0, Math.min(cursor, this.frames.length - 1));
    const snapshot = this.frames[this.cursor];
    this.view.update(snapshot);
    this.renderSidebars(snapshot);
    this.emitSnapshot();
  }

  private scheduleNext(): void {
    this.clearTimer();
    if (!this.playing) {
      return;
    }

    this.timer = window.setTimeout(() => {
      if (this.cursor >= this.frames.length - 1) {
        this.playing = false;
        this.renderControls();
        this.options.onFinish?.();
        this.emitSnapshot();
        return;
      }

      this.jumpTo(this.cursor + 1);
      this.scheduleNext();
    }, Math.max(90, 520 / this.speed));
  }

  private emitSnapshot(): void {
    this.options.onSnapshot?.(this.frames[this.cursor], this.cursor, this.playing, this.speed);
  }

  private clearTimer(): void {
    if (this.timer) {
      window.clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  destroy(): void {
    this.clearTimer();
    this.view.destroy();
  }
}
