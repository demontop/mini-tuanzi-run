import type {
  PlayerState,
  RaceConfig,
  RaceResult,
  RewardConfig,
  SupportRecord
} from "./raceTypes";

export function createDefaultPlayer(initialPopularity: number): PlayerState {
  return {
    popularity: initialPopularity,
    totalPopularityEarned: initialPopularity,
    supportedRaces: {},
    claimedRewards: [],
    finishedRaceIds: []
  };
}

export function canSupportRace(player: PlayerState, race: RaceConfig): { ok: boolean; reason?: string } {
  if (player.supportedRaces[race.id]) {
    return { ok: false, reason: "本场已经应援过" };
  }

  if (player.popularity < race.supportCost) {
    return { ok: false, reason: "人气值不足" };
  }

  return { ok: true };
}

export function supportRace(
  player: PlayerState,
  race: RaceConfig,
  runnerId: string,
  now = Date.now()
): SupportRecord {
  const supportState = canSupportRace(player, race);
  if (!supportState.ok) {
    throw new Error(supportState.reason ?? "Cannot support this race.");
  }

  const record: SupportRecord = {
    raceId: race.id,
    runnerId,
    cost: race.supportCost,
    timestamp: now,
    settled: false
  };

  player.popularity -= race.supportCost;
  player.supportedRaces[race.id] = record;
  return record;
}

export function settleSupport(
  player: PlayerState,
  raceResult: RaceResult,
  supportRecord: SupportRecord,
  rewards: RewardConfig
): number {
  if (supportRecord.settled) {
    return supportRecord.rewardPopularity ?? 0;
  }

  const rank = raceResult.rankings.find((ranking) => ranking.runnerId === supportRecord.runnerId)?.rank;
  const reward =
    (rank ? rewards.supportPayout[String(rank)] : undefined) ?? rewards.supportPayout.default;

  player.popularity += reward;
  player.totalPopularityEarned += reward;
  supportRecord.settled = true;
  supportRecord.rewardPopularity = reward;

  if (!player.finishedRaceIds.includes(raceResult.raceId)) {
    player.finishedRaceIds.push(raceResult.raceId);
  }

  return reward;
}

export function settleRaceIfSupported(
  player: PlayerState,
  raceResult: RaceResult,
  rewards: RewardConfig
): number | undefined {
  const supportRecord = player.supportedRaces[raceResult.raceId];
  if (!supportRecord) {
    return undefined;
  }

  return settleSupport(player, raceResult, supportRecord, rewards);
}

export function claimReward(player: PlayerState, rewardId: string): boolean {
  if (player.claimedRewards.includes(rewardId)) {
    return false;
  }

  player.claimedRewards.push(rewardId);
  return true;
}

export function getSupportCount(player: PlayerState): number {
  return Object.keys(player.supportedRaces).length;
}

export function isRewardClaimable(player: PlayerState, rewards: RewardConfig, rewardId: string): boolean {
  if (player.claimedRewards.includes(rewardId)) {
    return false;
  }

  const supportReward = rewards.supportRewards.find((reward) => reward.id === rewardId);
  if (supportReward) {
    return getSupportCount(player) >= supportReward.requiredSupportCount;
  }

  const popularityReward = rewards.popularityRewards.find((reward) => reward.id === rewardId);
  if (popularityReward) {
    return player.totalPopularityEarned >= popularityReward.requiredPopularity;
  }

  return false;
}
