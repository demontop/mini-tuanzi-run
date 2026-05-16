import { describe, expect, it } from "vitest";
import { createInitialRaceState } from "../core/raceEngine";
import { applySkillTrigger } from "../core/skillEngine";
import { createRng } from "../core/rng";
import type { RaceConfig, RunnerConfig, SettingsConfig, SkillConfig, TrackConfig, TurnContext } from "../core/raceTypes";

const settings: SettingsConfig = {
  stackMoveMode: "CARRY_ABOVE",
  finishMode: "ALL",
  maxRounds: 20,
  initialPopularity: 1000,
  saveKey: "test",
  danmaku: []
};

const track: TrackConfig = {
  id: "track",
  name: "测试赛道",
  length: 12,
  layout: "horizontal",
  cells: [{ index: 0, type: "START" }, { index: 11, type: "FINISH" }]
};

const race: RaceConfig = {
  id: "race",
  name: "测试赛",
  trackId: "track",
  runnerIds: ["a", "b"],
  status: "SUPPORT_OPEN",
  supportCost: 100,
  seed: 1
};

const runners: RunnerConfig[] = [
  {
    id: "a",
    name: "A",
    group: "A",
    avatar: "",
    sprite: "",
    color: "#f00",
    description: "",
    baseDice: [1, 2, 3],
    skillIds: ["stable", "teleport"],
    tags: []
  },
  {
    id: "b",
    name: "B",
    group: "A",
    avatar: "",
    sprite: "",
    color: "#00f",
    description: "",
    baseDice: [1, 2, 3],
    skillIds: [],
    tags: []
  }
];

const skills: SkillConfig[] = [
  {
    id: "stable",
    name: "稳定",
    trigger: "BEFORE_ROLL",
    description: "",
    effect: { type: "MODIFY_DICE_RANGE", dice: [2, 3] }
  },
  {
    id: "teleport",
    name: "贴贴",
    trigger: "AFTER_MOVE",
    description: "",
    effect: { type: "TELEPORT_TO_NEAREST_AHEAD", chance: 1 }
  }
];

describe("skill engine", () => {
  it("modifies dice pool from config", () => {
    const state = createInitialRaceState(race, runners, skills, track, settings);
    const context: TurnContext = { dicePool: [1, 2, 3], extraSteps: 0, skipTurn: false };

    const outcomes = applySkillTrigger("BEFORE_ROLL", "a", state, context, createRng(1));

    expect(outcomes).toHaveLength(1);
    expect(context.dicePool).toEqual([2, 3]);
  });

  it("creates teleport outcome to nearest runner ahead", () => {
    const state = createInitialRaceState(race, runners, skills, track, settings);
    state.runners.a.position = 2;
    state.runners.b.position = 5;
    const context: TurnContext = { dicePool: [1, 2, 3], extraSteps: 0, skipTurn: false };

    const outcomes = applySkillTrigger("AFTER_MOVE", "a", state, context, createRng(1));

    expect(outcomes[0].teleportToPosition).toBe(5);
  });
});
