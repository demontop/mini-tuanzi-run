import Phaser from "phaser";
import type { ReplaySnapshot } from "../core/replayEngine";
import type { RunnerConfig, TrackConfig } from "../core/raceTypes";
import { RaceScene } from "./scenes/RaceScene";

export class RacePhaserView {
  private readonly scene: RaceScene;
  private readonly game: Phaser.Game;
  private pendingSnapshot?: ReplaySnapshot;

  constructor(parent: HTMLElement, runners: RunnerConfig[], track: TrackConfig) {
    this.scene = new RaceScene(runners, track);
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: parent.clientWidth || 900,
      height: parent.clientHeight || 320,
      backgroundColor: "#f8fbff",
      scene: this.scene,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      transparent: false
    });

    this.scene.events.once(Phaser.Scenes.Events.CREATE, () => {
      if (this.pendingSnapshot) {
        this.scene.setSnapshot(this.pendingSnapshot);
      }
    });
  }

  update(snapshot: ReplaySnapshot): void {
    this.pendingSnapshot = snapshot;
    this.scene.setSnapshot(snapshot);
  }

  destroy(): void {
    this.game.destroy(true);
  }
}
