import { describe, expect, it } from "vitest";
import { createInitialStacks, getMovingRunnerIds, moveStack } from "../core/stackEngine";

describe("stack engine", () => {
  it("puts later arrivals on top", () => {
    const stacks = createInitialStacks(["red", "blue"]);
    moveStack(stacks, "blue", 0, 3, "VISUAL_ONLY");
    const moved = moveStack(stacks, "red", 0, 3, "VISUAL_ONLY");

    expect(moved.destinationStack).toEqual(["blue", "red"]);
  });

  it("carries runners above in CARRY_ABOVE mode", () => {
    const stacks = { "10": ["red", "blue", "green"] };

    expect(getMovingRunnerIds(stacks, "red", "CARRY_ABOVE")).toEqual(["red", "blue", "green"]);
    expect(getMovingRunnerIds(stacks, "blue", "CARRY_ABOVE")).toEqual(["blue", "green"]);
    expect(getMovingRunnerIds(stacks, "green", "CARRY_ABOVE")).toEqual(["green"]);
  });

  it("does not carry other runners in VISUAL_ONLY mode", () => {
    const stacks = { "10": ["red", "blue", "green"] };

    expect(getMovingRunnerIds(stacks, "red", "VISUAL_ONLY")).toEqual(["red"]);
  });
});
