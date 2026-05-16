import type { MoveEvent, RaceEvent, RaceResult } from "./raceTypes";

export interface ReplaySnapshot {
  eventIndex: number;
  round: number;
  positions: Record<string, number>;
  stacks: Record<string, string[]>;
  rankings: string[];
  lastEvent?: RaceEvent;
}

function cloneSnapshot(snapshot: ReplaySnapshot): ReplaySnapshot {
  return {
    eventIndex: snapshot.eventIndex,
    round: snapshot.round,
    positions: { ...snapshot.positions },
    stacks: Object.fromEntries(Object.entries(snapshot.stacks).map(([cell, ids]) => [cell, [...ids]])),
    rankings: [...snapshot.rankings],
    lastEvent: snapshot.lastEvent
  };
}

function rebuildStacks(positions: Record<string, number>): Record<string, string[]> {
  const stacks: Record<string, string[]> = {};
  for (const [runnerId, position] of Object.entries(positions)) {
    const key = String(position);
    stacks[key] = stacks[key] ?? [];
    stacks[key].push(runnerId);
  }
  return stacks;
}

function applyMove(snapshot: ReplaySnapshot, event: MoveEvent): void {
  snapshot.positions[event.runnerId] = event.to;
  for (const runnerId of event.carriedRunnerIds ?? []) {
    snapshot.positions[runnerId] = event.to;
  }
  snapshot.stacks = rebuildStacks(snapshot.positions);
}

export function createInitialReplaySnapshot(runnerIds: string[]): ReplaySnapshot {
  return {
    eventIndex: 0,
    round: 0,
    positions: Object.fromEntries(runnerIds.map((runnerId) => [runnerId, 0])),
    stacks: {
      "0": [...runnerIds]
    },
    rankings: []
  };
}

export function applyReplayEvent(snapshot: ReplaySnapshot, event: RaceEvent, eventIndex = 0): ReplaySnapshot {
  const next = cloneSnapshot(snapshot);
  next.eventIndex = eventIndex;
  next.round = event.round;
  next.lastEvent = event;

  if (event.type === "MOVE") {
    applyMove(next, event);
  }

  if (event.type === "STACK") {
    next.stacks[String(event.cellIndex)] = [...event.stackRunnerIds];
  }

  if (event.type === "FINISH" && !next.rankings.includes(event.runnerId)) {
    next.rankings.push(event.runnerId);
  }

  return next;
}

export function buildReplayFrames(result: RaceResult, runnerIds: string[]): ReplaySnapshot[] {
  const frames: ReplaySnapshot[] = [createInitialReplaySnapshot(runnerIds)];
  let snapshot = frames[0];

  result.eventLog.forEach((event, index) => {
    snapshot = applyReplayEvent(snapshot, event, index + 1);
    frames.push(snapshot);
  });

  return frames;
}

export function getFinalSnapshotFromReplay(result: RaceResult, runnerIds: string[]): ReplaySnapshot {
  const frames = buildReplayFrames(result, runnerIds);
  return frames[frames.length - 1];
}
