import type { PlayerState, RaceEvent, RaceResult } from "../core/raceTypes";
import { createDefaultPlayer } from "../core/rewardEngine";

export interface WarmupState {
  position: number;
  diceLeft: number;
  claimedToday: boolean;
  lastClaimDate?: string;
  log: string[];
}

export interface SaveData {
  version: number;
  player: PlayerState;
  raceResults: Record<string, RaceResult>;
  replayLogs: Record<string, RaceEvent[]>;
  warmup: WarmupState;
}

export function createDefaultSave(initialPopularity: number): SaveData {
  return {
    version: 1,
    player: createDefaultPlayer(initialPopularity),
    raceResults: {},
    replayLogs: {},
    warmup: {
      position: 0,
      diceLeft: 3,
      claimedToday: false,
      log: []
    }
  };
}

function hasLocalStorage(): boolean {
  try {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

export function loadSave(saveKey: string, initialPopularity: number): SaveData {
  if (!hasLocalStorage()) {
    return createDefaultSave(initialPopularity);
  }

  const raw = window.localStorage.getItem(saveKey);
  if (!raw) {
    return createDefaultSave(initialPopularity);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const fallback = createDefaultSave(initialPopularity);
    return {
      version: parsed.version ?? fallback.version,
      player: {
        ...fallback.player,
        ...parsed.player,
        supportedRaces: parsed.player?.supportedRaces ?? {},
        claimedRewards: parsed.player?.claimedRewards ?? [],
        finishedRaceIds: parsed.player?.finishedRaceIds ?? []
      },
      raceResults: parsed.raceResults ?? {},
      replayLogs: parsed.replayLogs ?? {},
      warmup: {
        ...fallback.warmup,
        ...parsed.warmup,
        log: parsed.warmup?.log ?? []
      }
    };
  } catch {
    return createDefaultSave(initialPopularity);
  }
}

export function saveGame(saveKey: string, save: SaveData): void {
  if (!hasLocalStorage()) {
    return;
  }

  window.localStorage.setItem(saveKey, JSON.stringify(save));
}

export function clearSave(saveKey: string, initialPopularity: number): SaveData {
  if (hasLocalStorage()) {
    window.localStorage.removeItem(saveKey);
  }

  return createDefaultSave(initialPopularity);
}
