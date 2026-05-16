import type { RunnerConfig } from "../../core/raceTypes";

export interface RunnerSpriteState {
  runner: RunnerConfig;
  x: number;
  y: number;
  stackIndex: number;
}
