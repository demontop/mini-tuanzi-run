import type {
  CellEvent,
  RaceConfig,
  RaceEvent,
  RaceResult,
  RaceState,
  RunnerConfig,
  RunnerRaceState,
  SettingsConfig,
  SkillConfig,
  TrackCell,
  TrackConfig,
  TurnContext
} from "./raceTypes";
import { createRng, pickOne, shuffle, type Rng } from "./rng";
import { applySkillTrigger, type SkillOutcome } from "./skillEngine";
import { createInitialStacks, getStackAt, moveStack, removeFromStacks } from "./stackEngine";

function toRecord<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

export function createInitialRaceState(
  race: RaceConfig,
  runners: RunnerConfig[],
  skills: SkillConfig[],
  track: TrackConfig,
  settings: SettingsConfig
): RaceState {
  const runnerConfigs = toRecord(runners);
  const runnersById: Record<string, RunnerRaceState> = Object.fromEntries(
    race.runnerIds.map((runnerId) => [
      runnerId,
      {
        id: runnerId,
        position: 0,
        finished: false
      }
    ])
  );

  return {
    race,
    track,
    runners: runnersById,
    runnerConfigs,
    skillsById: toRecord(skills),
    settings,
    stacks: createInitialStacks(race.runnerIds),
    round: 0,
    finishCounter: 0,
    rankings: []
  };
}

function getFinishIndex(track: TrackConfig): number {
  return track.length - 1;
}

function getCell(track: TrackConfig, position: number): TrackCell {
  const index = Math.max(0, Math.min(position, getFinishIndex(track)));
  return track.cells.find((cell) => cell.index === index) ?? { index, type: "NORMAL" };
}

function logSkillOutcomes(
  state: RaceState,
  eventLog: RaceEvent[],
  runnerId: string,
  outcomes: SkillOutcome[]
): void {
  for (const outcome of outcomes) {
    eventLog.push({
      type: "SKILL",
      round: state.round,
      runnerId,
      skillId: outcome.skill.id,
      description: outcome.description
    });
  }
}

function triggerSkills(
  trigger: Parameters<typeof applySkillTrigger>[0],
  state: RaceState,
  eventLog: RaceEvent[],
  runnerId: string,
  context: TurnContext,
  rng: Rng
): SkillOutcome[] {
  const outcomes = applySkillTrigger(trigger, runnerId, state, context, rng);
  logSkillOutcomes(state, eventLog, runnerId, outcomes);
  return outcomes;
}

function moveRunnerWithStack(
  state: RaceState,
  eventLog: RaceEvent[],
  runnerId: string,
  steps: number,
  reason: "dice" | "cell" | "skill"
): string[] {
  const runner = state.runners[runnerId];
  if (!runner || runner.finished || steps === 0) {
    return runner ? [runnerId] : [];
  }

  const from = runner.position;
  const to = Math.max(0, from + steps);
  const { movingRunnerIds, destinationStack } = moveStack(
    state.stacks,
    runnerId,
    from,
    to,
    state.settings.stackMoveMode
  );
  const activeMovingRunnerIds = movingRunnerIds.filter((id) => !state.runners[id]?.finished);

  for (const movingRunnerId of activeMovingRunnerIds) {
    state.runners[movingRunnerId].position = to;
  }

  eventLog.push({
    type: "MOVE",
    round: state.round,
    runnerId,
    from,
    to,
    carriedRunnerIds: activeMovingRunnerIds.filter((id) => id !== runnerId),
    reason
  });

  if (state.settings.stackMoveMode !== "NONE" && destinationStack.length > 1) {
    eventLog.push({
      type: "STACK",
      round: state.round,
      cellIndex: to,
      stackRunnerIds: [...destinationStack]
    });
  }

  return activeMovingRunnerIds;
}

function setRunnerPosition(
  state: RaceState,
  eventLog: RaceEvent[],
  runnerId: string,
  targetPosition: number
): string[] {
  const runner = state.runners[runnerId];
  if (!runner || runner.finished) {
    return [];
  }

  return moveRunnerWithStack(state, eventLog, runnerId, targetPosition - runner.position, "skill");
}

function checkFinishForIds(state: RaceState, eventLog: RaceEvent[], runnerIds: string[]): void {
  for (const runnerId of runnerIds) {
    const runner = state.runners[runnerId];
    if (!runner || runner.finished || runner.position < getFinishIndex(state.track)) {
      continue;
    }

    runner.finished = true;
    runner.finishRound = state.round;
    runner.finishOrder = state.finishCounter;
    runner.finalPosition = runner.position;
    state.finishCounter += 1;
    removeFromStacks(state.stacks, [runnerId]);

    const ranking = {
      runnerId,
      rank: state.rankings.length + 1,
      finishRound: runner.finishRound,
      finishOrder: runner.finishOrder,
      finalPosition: runner.finalPosition
    };
    state.rankings.push(ranking);

    eventLog.push({
      type: "FINISH",
      round: state.round,
      runnerId,
      rank: ranking.rank
    });

    if (ranking.rank === 1) {
      eventLog.push({
        type: "COMMENTARY",
        round: state.round,
        runnerId,
        message: "冠军诞生！"
      });
    }
  }
}

function shouldStopRace(state: RaceState): boolean {
  const targetRankings = state.settings.finishMode === "TOP_THREE" ? 3 : state.race.runnerIds.length;
  return state.rankings.length >= targetRankings || state.round >= state.settings.maxRounds;
}

function resolveCellEffect(
  state: RaceState,
  eventLog: RaceEvent[],
  runnerId: string,
  rng: Rng
): string[] {
  const runner = state.runners[runnerId];
  if (!runner || runner.finished || runner.position >= getFinishIndex(state.track)) {
    return [];
  }

  const cell = getCell(state.track, runner.position);
  if (cell.type === "NORMAL" || cell.type === "START" || cell.type === "FINISH") {
    return [];
  }

  let event: CellEvent | undefined;
  let movedIds: string[] = [];

  if (cell.type === "BOOST" || cell.type === "SLOW") {
    const steps = cell.steps ?? 0;
    event = {
      type: "CELL",
      round: state.round,
      runnerId,
      cellIndex: cell.index,
      cellType: cell.type,
      steps,
      description: cell.type === "BOOST" ? `加速格前进 ${steps} 格` : `减速格后退 ${Math.abs(steps)} 格`
    };
    movedIds = moveRunnerWithStack(state, eventLog, runnerId, steps, "cell");
  }

  if (cell.type === "RANDOM_EVENT") {
    const steps = pickOne([-2, -1, 0, 1, 2, 3], rng);
    event = {
      type: "CELL",
      round: state.round,
      runnerId,
      cellIndex: cell.index,
      cellType: cell.type,
      steps,
      description: steps >= 0 ? `随机事件前进 ${steps} 格` : `随机事件后退 ${Math.abs(steps)} 格`
    };
    movedIds = moveRunnerWithStack(state, eventLog, runnerId, steps, "cell");
  }

  if (cell.type === "TELEPORT" && typeof cell.targetIndex === "number") {
    event = {
      type: "CELL",
      round: state.round,
      runnerId,
      cellIndex: cell.index,
      cellType: cell.type,
      steps: cell.targetIndex - runner.position,
      description: `传送格前往 ${cell.targetIndex} 格`
    };
    movedIds = setRunnerPosition(state, eventLog, runnerId, cell.targetIndex);
  }

  if (cell.type === "REWARD") {
    event = {
      type: "CELL",
      round: state.round,
      runnerId,
      cellIndex: cell.index,
      cellType: cell.type,
      steps: 0,
      description: "奖励格触发：气势提升"
    };
  }

  if (event) {
    eventLog.push(event);
  }

  return movedIds;
}

function resolveStackSkills(
  state: RaceState,
  eventLog: RaceEvent[],
  runnerId: string,
  context: TurnContext,
  rng: Rng
): string[] {
  const runner = state.runners[runnerId];
  if (!runner || runner.finished || state.settings.stackMoveMode === "NONE") {
    return [];
  }

  const stack = getStackAt(state.stacks, runner.position);
  if (stack.length <= 1) {
    return [];
  }

  triggerSkills("ON_STACKED", state, eventLog, runnerId, context, rng);
  if (context.extraSteps !== 0) {
    const extraSteps = context.extraSteps;
    context.extraSteps = 0;
    return moveRunnerWithStack(state, eventLog, runnerId, extraSteps, "skill");
  }

  return [];
}

function finalizeUnfinishedRankings(state: RaceState): void {
  const ranked = new Set(state.rankings.map((ranking) => ranking.runnerId));
  const unfinished = Object.values(state.runners)
    .filter((runner) => !ranked.has(runner.id))
    .sort((left, right) => {
      if (right.position !== left.position) {
        return right.position - left.position;
      }
      return left.id.localeCompare(right.id);
    });

  for (const runner of unfinished) {
    state.rankings.push({
      runnerId: runner.id,
      rank: state.rankings.length + 1,
      finishRound: runner.finishRound ?? state.round,
      finishOrder: runner.finishOrder ?? state.finishCounter++,
      finalPosition: runner.position
    });
  }
}

export function simulateRace(
  race: RaceConfig,
  runners: RunnerConfig[],
  skills: SkillConfig[],
  track: TrackConfig,
  settings: SettingsConfig
): RaceResult {
  const rng = createRng(race.seed);
  const state = createInitialRaceState(race, runners, skills, track, settings);
  const eventLog: RaceEvent[] = [
    {
      type: "COMMENTARY",
      round: 0,
      message: `${race.name} 开始准备，团子们排成一列。`
    }
  ];

  while (!shouldStopRace(state)) {
    state.round += 1;
    const turnOrder = shuffle(
      race.runnerIds.filter((runnerId) => !state.runners[runnerId].finished),
      rng
    );

    eventLog.push({
      type: "TURN_ORDER",
      round: state.round,
      runnerIds: turnOrder
    });

    for (const runnerId of turnOrder) {
      const runnerState = state.runners[runnerId];
      const runnerConfig = state.runnerConfigs[runnerId];
      if (!runnerState || !runnerConfig || runnerState.finished || shouldStopRace(state)) {
        continue;
      }

      const context: TurnContext = {
        dicePool: [...runnerConfig.baseDice],
        extraSteps: 0,
        skipTurn: false
      };

      triggerSkills("BEFORE_TURN", state, eventLog, runnerId, context, rng);
      triggerSkills("BEFORE_ROLL", state, eventLog, runnerId, context, rng);

      if (context.skipTurn) {
        continue;
      }

      const dice = context.fixedStep ?? pickOne(context.dicePool, rng);
      eventLog.push({
        type: "ROLL",
        round: state.round,
        runnerId,
        value: dice
      });

      triggerSkills("AFTER_ROLL", state, eventLog, runnerId, context, rng);
      const steps = Math.max(0, context.fixedStep ?? dice) + context.extraSteps;
      context.extraSteps = 0;

      triggerSkills("BEFORE_MOVE", state, eventLog, runnerId, context, rng);
      let movedIds = moveRunnerWithStack(state, eventLog, runnerId, Math.max(-runnerState.position, steps), "dice");
      checkFinishForIds(state, eventLog, movedIds);

      movedIds = resolveCellEffect(state, eventLog, runnerId, rng);
      checkFinishForIds(state, eventLog, movedIds);

      movedIds = resolveStackSkills(state, eventLog, runnerId, context, rng);
      checkFinishForIds(state, eventLog, movedIds);

      const afterMoveOutcomes = triggerSkills("AFTER_MOVE", state, eventLog, runnerId, context, rng);
      for (const outcome of afterMoveOutcomes) {
        if (typeof outcome.teleportToPosition === "number") {
          const teleportedIds = setRunnerPosition(state, eventLog, runnerId, outcome.teleportToPosition);
          checkFinishForIds(state, eventLog, teleportedIds);
        }
      }

      checkFinishForIds(state, eventLog, [runnerId]);

      if (runnerState.position >= getFinishIndex(state.track) - 4 && !runnerState.finished) {
        eventLog.push({
          type: "COMMENTARY",
          round: state.round,
          runnerId,
          message: "最后冲刺！"
        });
      }
    }
  }

  finalizeUnfinishedRankings(state);

  return {
    raceId: race.id,
    seed: race.seed,
    trackId: track.id,
    rankings: state.rankings,
    eventLog
  };
}
