import type { StackMoveMode } from "./raceTypes";

export function createInitialStacks(runnerIds: string[]): Record<string, string[]> {
  return {
    "0": [...runnerIds]
  };
}

export function cloneStacks(stacks: Record<string, string[]>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(stacks).map(([cellIndex, runnerIds]) => [cellIndex, [...runnerIds]])
  );
}

export function removeFromStacks(stacks: Record<string, string[]>, runnerIds: string[]): void {
  const removing = new Set(runnerIds);
  for (const [cellIndex, stack] of Object.entries(stacks)) {
    stacks[cellIndex] = stack.filter((runnerId) => !removing.has(runnerId));
    if (stacks[cellIndex].length === 0) {
      delete stacks[cellIndex];
    }
  }
}

export function getStackAt(stacks: Record<string, string[]>, cellIndex: number): string[] {
  return stacks[String(cellIndex)] ?? [];
}

export function getMovingRunnerIds(
  stacks: Record<string, string[]>,
  runnerId: string,
  mode: StackMoveMode
): string[] {
  if (mode === "NONE" || mode === "VISUAL_ONLY") {
    return [runnerId];
  }

  const stack = Object.values(stacks).find((runnerIds) => runnerIds.includes(runnerId));
  if (!stack) {
    return [runnerId];
  }

  if (mode === "CARRY_ALL") {
    return [...stack];
  }

  const runnerIndex = stack.indexOf(runnerId);
  return stack.slice(runnerIndex);
}

export function placeOnStack(
  stacks: Record<string, string[]>,
  cellIndex: number,
  runnerIds: string[]
): string[] {
  removeFromStacks(stacks, runnerIds);
  const key = String(cellIndex);
  const destination = stacks[key] ? [...stacks[key]] : [];
  destination.push(...runnerIds);
  stacks[key] = destination;
  return destination;
}

export function moveStack(
  stacks: Record<string, string[]>,
  runnerId: string,
  from: number,
  to: number,
  mode: StackMoveMode
): { movingRunnerIds: string[]; destinationStack: string[] } {
  const movingRunnerIds = getMovingRunnerIds(stacks, runnerId, mode);

  if (from === to) {
    return {
      movingRunnerIds,
      destinationStack: getStackAt(stacks, to)
    };
  }

  const destinationStack = placeOnStack(stacks, to, movingRunnerIds);
  return {
    movingRunnerIds,
    destinationStack
  };
}
