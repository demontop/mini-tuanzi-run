import { describe, expect, it } from "vitest";
import { canSupportRace, createDefaultPlayer, settleSupport, supportRace } from "../core/rewardEngine";
import type { RaceConfig, RaceResult, RewardConfig } from "../core/raceTypes";

const race: RaceConfig = {
  id: "race_001",
  name: "测试赛",
  trackId: "track",
  runnerIds: ["a", "b"],
  status: "SUPPORT_OPEN",
  supportCost: 100,
  seed: 1
};

const rewards: RewardConfig = {
  supportPayout: {
    "1": 300,
    "2": 180,
    "3": 120,
    default: 50
  },
  supportRewards: [],
  popularityRewards: []
};

const result: RaceResult = {
  raceId: race.id,
  seed: 1,
  trackId: "track",
  eventLog: [],
  rankings: [
    { runnerId: "a", rank: 1, finishRound: 1, finishOrder: 0, finalPosition: 11 },
    { runnerId: "b", rank: 2, finishRound: 2, finishOrder: 1, finalPosition: 11 }
  ]
};

describe("reward engine", () => {
  it("prevents duplicate support", () => {
    const player = createDefaultPlayer(1000);
    supportRace(player, race, "a", 1);

    expect(canSupportRace(player, race).ok).toBe(false);
  });

  it("prevents support when popularity is not enough", () => {
    const player = createDefaultPlayer(20);

    expect(canSupportRace(player, race).ok).toBe(false);
  });

  it("settles first place payout once", () => {
    const player = createDefaultPlayer(1000);
    const record = supportRace(player, race, "a", 1);
    const first = settleSupport(player, result, record, rewards);
    const second = settleSupport(player, result, record, rewards);

    expect(first).toBe(300);
    expect(second).toBe(300);
    expect(player.popularity).toBe(1200);
  });
});
