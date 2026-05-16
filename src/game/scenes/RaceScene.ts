import Phaser from "phaser";
import type { ReplaySnapshot } from "../../core/replayEngine";
import type { RunnerConfig, TrackConfig } from "../../core/raceTypes";

export class RaceScene extends Phaser.Scene {
  private graphics?: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];
  private snapshot?: ReplaySnapshot;
  private readonly runnerById: Record<string, RunnerConfig>;

  constructor(
    private readonly runners: RunnerConfig[],
    private readonly track: TrackConfig
  ) {
    super("RaceScene");
    this.runnerById = Object.fromEntries(runners.map((runner) => [runner.id, runner]));
  }

  create(): void {
    this.graphics = this.add.graphics();
    this.scale.on("resize", () => this.draw());
    this.draw();
  }

  setSnapshot(snapshot: ReplaySnapshot): void {
    this.snapshot = snapshot;
    if (this.graphics) {
      this.draw();
    }
  }

  private clearLabels(): void {
    for (const label of this.labels) {
      label.destroy();
    }
    this.labels = [];
  }

  private getCellColor(index: number): number {
    const cell = this.track.cells.find((item) => item.index === index);
    if (!cell) {
      return 0xffffff;
    }

    const colors: Record<string, number> = {
      START: 0xa6e3a1,
      BOOST: 0xffd166,
      SLOW: 0x90caf9,
      RANDOM_EVENT: 0xcdb4db,
      TELEPORT: 0x7bdff2,
      REWARD: 0xffafcc,
      FINISH: 0xff6b6b
    };

    return colors[cell.type] ?? 0xffffff;
  }

  private drawTrack(width: number, height: number): { left: number; top: number; cellWidth: number } {
    const left = Math.max(18, width * 0.04);
    const right = Math.max(18, width * 0.04);
    const top = Math.max(82, height * 0.32);
    const trackWidth = width - left - right;
    const cellWidth = trackWidth / this.track.length;
    const cellHeight = 38;

    for (let index = 0; index < this.track.length; index += 1) {
      const x = left + index * cellWidth;
      this.graphics?.fillStyle(this.getCellColor(index), 0.88);
      this.graphics?.lineStyle(1, 0x25314f, 0.14);
      this.graphics?.fillRoundedRect(x, top, Math.max(4, cellWidth - 2), cellHeight, 6);
      this.graphics?.strokeRoundedRect(x, top, Math.max(4, cellWidth - 2), cellHeight, 6);
    }

    const finishX = left + (this.track.length - 1) * cellWidth;
    this.graphics?.lineStyle(4, 0x1f2937, 0.8);
    this.graphics?.lineBetween(finishX + cellWidth * 0.5, top - 38, finishX + cellWidth * 0.5, top + 72);
    this.graphics?.fillStyle(0xff6b6b, 1);
    this.graphics?.fillTriangle(finishX + cellWidth * 0.5, top - 38, finishX + cellWidth * 0.5, top - 12, finishX + cellWidth * 1.4, top - 25);

    return { left, top, cellWidth };
  }

  private drawRunner(
    runner: RunnerConfig,
    x: number,
    y: number,
    stackIndex: number,
    isFinished: boolean
  ): void {
    const color = Phaser.Display.Color.HexStringToColor(runner.color).color;
    const radius = isFinished ? 17 : 15;
    this.graphics?.fillStyle(0xffffff, 0.9);
    this.graphics?.fillCircle(x + 2, y + 4, radius + 3);
    this.graphics?.fillStyle(color, 1);
    this.graphics?.fillCircle(x, y, radius);
    this.graphics?.lineStyle(2, 0x26324d, 0.26);
    this.graphics?.strokeCircle(x, y, radius);

    if (stackIndex > 0) {
      this.graphics?.lineStyle(2, 0xffffff, 0.7);
      this.graphics?.strokeCircle(x, y, radius + 5);
    }

    const label = this.add
      .text(x, y - 5, runner.name.slice(0, 1), {
        fontFamily: "system-ui, sans-serif",
        fontSize: "15px",
        color: "#ffffff",
        fontStyle: "700"
      })
      .setOrigin(0.5);
    this.labels.push(label);
  }

  private draw(): void {
    if (!this.graphics) {
      return;
    }

    const width = this.scale.width;
    const height = this.scale.height;
    this.graphics.clear();
    this.clearLabels();

    this.graphics.fillStyle(0xf8fbff, 1);
    this.graphics.fillRoundedRect(0, 0, width, height, 8);

    const { left, top, cellWidth } = this.drawTrack(width, height);
    const positions = this.snapshot?.positions ?? Object.fromEntries(this.runners.map((runner) => [runner.id, 0]));
    const stacks = this.snapshot?.stacks ?? { "0": this.runners.map((runner) => runner.id) };
    const finished = new Set(this.snapshot?.rankings ?? []);

    for (const [cell, stack] of Object.entries(stacks)) {
      const position = Number(cell);
      const x = left + Math.min(position, this.track.length - 1) * cellWidth + cellWidth * 0.5;
      const baseY = top + 76;

      stack.forEach((runnerId, stackIndex) => {
        const runner = this.runnerById[runnerId];
        if (!runner) {
          return;
        }

        const extra = Math.max(0, (positions[runnerId] ?? 0) - (this.track.length - 1));
        this.drawRunner(runner, x + extra * 5, baseY - stackIndex * 22, stackIndex, finished.has(runnerId));
      });
    }

    this.graphics.fillStyle(0x25314f, 0.82);
    this.graphics.fillRoundedRect(18, 16, Math.min(420, width - 36), 36, 8);
    const title = this.add
      .text(32, 24, `${this.track.name}  ·  第 ${this.snapshot?.round ?? 0} 回合`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "15px",
        color: "#ffffff",
        fontStyle: "700"
      })
      .setOrigin(0, 0);
    this.labels.push(title);
  }
}
