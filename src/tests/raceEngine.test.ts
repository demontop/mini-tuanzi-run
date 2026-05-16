import { describe, expect, it } from "vitest";
import runnersJson from "../data/runners.json";
import scheduleJson from "../data/schedule.json";
import settingsJson from "../data/settings.json";
import skillsJson from "../data/skills.json";
import tracksJson from "../data/tracks.json";
import { simulateRace } from "../core/raceEngine";
import { getFinalSnapshotFromReplay } from "../core/replayEngine";
import type { RaceConfig, RunnerConfig, SettingsConfig, SkillConfig, TrackConfig } from "../core/raceTypes";

const runners = runnersJson as RunnerConfig[];
const schedule = scheduleJson as RaceConfig[];
const tracks = tracksJson as TrackConfig[];
const skills = skillsJson as SkillConfig[];
const settings = settingsJson as SettingsConfig;

function raceFixture() {
  const race = schedule[0];
  const track = tracks.find((item) => item.id === race.trackId)!;
  const raceRunners = race.runnerIds.map((runnerId) => runners.find((runner) => runner.id === runnerId)!);
  return { race, track, raceRunners };
}

describe("race engine", () => {
  it("produces deterministic results for the same seed", () => {
    const { race, track, raceRunners } = raceFixture();
    const first = simulateRace(race, raceRunners, skills, track, settings);
    const second = simulateRace(race, raceRunners, skills, track, settings);

    expect(second.rankings).toEqual(first.rankings);
    expect(second.eventLog).toEqual(first.eventLog);
  });

  it("finishes all configured runners and records event log", () => {
    const { race, track, raceRunners } = raceFixture();
    const result = simulateRace(race, raceRunners, skills, track, settings);

    expect(result.rankings).toHaveLength(race.runnerIds.length);
    expect(result.rankings[0].rank).toBe(1);
    expect(result.eventLog.some((event) => event.type === "ROLL")).toBe(true);
    expect(result.eventLog.some((event) => event.type === "MOVE")).toBe(true);
    expect(result.eventLog.some((event) => event.type === "FINISH")).toBe(true);
  });

  it("can replay the event log to the final positions", () => {
    const { race, track, raceRunners } = raceFixture();
    const result = simulateRace(race, raceRunners, skills, track, settings);
    const snapshot = getFinalSnapshotFromReplay(result, race.runnerIds);

    for (const ranking of result.rankings) {
      expect(snapshot.positions[ranking.runnerId]).toBe(ranking.finalPosition);
    }
  });
});
