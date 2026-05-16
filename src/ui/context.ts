import type {
  RaceConfig,
  RaceResult,
  RewardConfig,
  RunnerConfig,
  SettingsConfig,
  SkillConfig,
  TrackConfig
} from "../core/raceTypes";
import type { SaveData } from "../storage/localSave";

export interface AppData {
  runners: RunnerConfig[];
  skills: SkillConfig[];
  tracks: TrackConfig[];
  schedule: RaceConfig[];
  rewards: RewardConfig;
  settings: SettingsConfig;
}

export interface AppContext {
  root: HTMLElement;
  data: AppData;
  save: SaveData;
  navigate(path: string): void;
  refresh(): void;
  persist(): void;
  resetSave(): void;
  runRace(raceId: string): RaceResult;
  getRaceStatus(race: RaceConfig): RaceConfig["status"];
}

export type PageRenderer = (ctx: AppContext, params: string[]) => void | (() => void);
