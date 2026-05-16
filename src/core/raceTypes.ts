export type RaceStatus =
  | "LOCKED"
  | "SUPPORT_OPEN"
  | "SUPPORT_CLOSED"
  | "LIVE"
  | "FINISHED";

export type StackMoveMode = "NONE" | "VISUAL_ONLY" | "CARRY_ABOVE" | "CARRY_ALL";
export type FinishMode = "TOP_THREE" | "ALL";

export type CellType =
  | "START"
  | "NORMAL"
  | "BOOST"
  | "SLOW"
  | "RANDOM_EVENT"
  | "TELEPORT"
  | "REWARD"
  | "FINISH";

export type SkillTrigger =
  | "ON_RACE_START"
  | "BEFORE_TURN"
  | "BEFORE_ROLL"
  | "AFTER_ROLL"
  | "BEFORE_MOVE"
  | "AFTER_MOVE"
  | "ON_STACKED"
  | "ON_PASS_RUNNER"
  | "ON_BEING_PASSED"
  | "ON_ENTER_CELL"
  | "ON_NEAR_FINISH"
  | "ON_RACE_FINISH";

export type SkillEffectType =
  | "MODIFY_DICE_RANGE"
  | "FIXED_STEP"
  | "EXTRA_STEP"
  | "SKIP_TURN"
  | "TELEPORT"
  | "TELEPORT_TO_NEAREST_AHEAD"
  | "SWAP_WITH_RUNNER"
  | "PULL_BACK_LEADER"
  | "BOOST_IF_BEHIND"
  | "SLOW_IF_AHEAD"
  | "IMMUNE_SLOW"
  | "STACK_BONUS"
  | "RANDOM_WEIGHTED_STEP";

export interface RunnerConfig {
  id: string;
  name: string;
  group: "A" | "B" | string;
  avatar: string;
  sprite: string;
  color: string;
  description: string;
  baseDice: number[];
  skillIds: string[];
  tags: string[];
}

export interface WeightedStep {
  steps: number;
  weight: number;
}

export interface SkillEffect {
  type: SkillEffectType;
  dice?: number[];
  steps?: number;
  chance?: number;
  targetIndex?: number;
  weights?: WeightedStep[];
}

export interface SkillCondition {
  type: "RANK_BELOW" | "RANK_ABOVE" | "CHANCE";
  rankPercent?: number;
  chance?: number;
}

export interface SkillConfig {
  id: string;
  name: string;
  trigger: SkillTrigger;
  description: string;
  condition?: SkillCondition;
  effect: SkillEffect;
}

export interface TrackCell {
  index: number;
  type: CellType;
  steps?: number;
  targetIndex?: number;
}

export interface TrackConfig {
  id: string;
  name: string;
  length: number;
  layout: "horizontal" | "loop" | string;
  cells: TrackCell[];
}

export interface RaceConfig {
  id: string;
  name: string;
  trackId: string;
  runnerIds: string[];
  status: RaceStatus;
  supportCost: number;
  seed: number;
}

export interface SettingsConfig {
  stackMoveMode: StackMoveMode;
  finishMode: FinishMode;
  maxRounds: number;
  initialPopularity: number;
  saveKey: string;
  danmaku: string[];
}

export interface SupportPayoutConfig {
  [rank: string]: number;
  default: number;
}

export interface RewardConfig {
  supportPayout: SupportPayoutConfig;
  supportRewards: Array<{
    id: string;
    requiredSupportCount: number;
    reward: string;
  }>;
  popularityRewards: Array<{
    id: string;
    requiredPopularity: number;
    reward: string;
  }>;
}

export interface SupportRecord {
  raceId: string;
  runnerId: string;
  cost: number;
  timestamp: number;
  settled: boolean;
  rewardPopularity?: number;
}

export interface PlayerState {
  popularity: number;
  totalPopularityEarned: number;
  supportedRaces: Record<string, SupportRecord>;
  claimedRewards: string[];
  finishedRaceIds: string[];
}

export interface RaceRanking {
  runnerId: string;
  rank: number;
  finishRound: number;
  finishOrder: number;
  finalPosition: number;
}

export interface TurnOrderEvent {
  type: "TURN_ORDER";
  round: number;
  runnerIds: string[];
}

export interface RollEvent {
  type: "ROLL";
  round: number;
  runnerId: string;
  value: number;
}

export interface MoveEvent {
  type: "MOVE";
  round: number;
  runnerId: string;
  from: number;
  to: number;
  carriedRunnerIds?: string[];
  reason?: "dice" | "cell" | "skill";
}

export interface SkillEvent {
  type: "SKILL";
  round: number;
  runnerId: string;
  skillId: string;
  description: string;
}

export interface StackEvent {
  type: "STACK";
  round: number;
  cellIndex: number;
  stackRunnerIds: string[];
}

export interface CellEvent {
  type: "CELL";
  round: number;
  runnerId: string;
  cellIndex: number;
  cellType: CellType;
  steps?: number;
  description: string;
}

export interface FinishEvent {
  type: "FINISH";
  round: number;
  runnerId: string;
  rank: number;
}

export interface CommentaryEvent {
  type: "COMMENTARY";
  round: number;
  message: string;
  runnerId?: string;
}

export type RaceEvent =
  | TurnOrderEvent
  | RollEvent
  | MoveEvent
  | SkillEvent
  | StackEvent
  | CellEvent
  | FinishEvent
  | CommentaryEvent;

export interface RaceResult {
  raceId: string;
  seed: number;
  trackId: string;
  rankings: RaceRanking[];
  eventLog: RaceEvent[];
}

export interface RunnerRaceState {
  id: string;
  position: number;
  finished: boolean;
  finishRound?: number;
  finishOrder?: number;
  finalPosition?: number;
}

export interface RaceState {
  race: RaceConfig;
  track: TrackConfig;
  runners: Record<string, RunnerRaceState>;
  runnerConfigs: Record<string, RunnerConfig>;
  skillsById: Record<string, SkillConfig>;
  settings: SettingsConfig;
  stacks: Record<string, string[]>;
  round: number;
  finishCounter: number;
  rankings: RaceRanking[];
}

export interface TurnContext {
  dicePool: number[];
  fixedStep?: number;
  extraSteps: number;
  skipTurn: boolean;
}
