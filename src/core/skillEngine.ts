import type {
  RaceState,
  RunnerRaceState,
  SkillConfig,
  SkillTrigger,
  TurnContext
} from "./raceTypes";
import type { Rng } from "./rng";
import { pickWeighted } from "./rng";

export interface SkillOutcome {
  skill: SkillConfig;
  description: string;
  teleportToPosition?: number;
}

function getRunnerRankPercentile(state: RaceState, runnerId: string): {
  rank: number;
  total: number;
} {
  const sorted = Object.values(state.runners).sort((left, right) => {
    if (left.finished !== right.finished) {
      return left.finished ? -1 : 1;
    }
    if (right.position !== left.position) {
      return right.position - left.position;
    }
    return left.id.localeCompare(right.id);
  });

  const rank = sorted.findIndex((runner) => runner.id === runnerId) + 1;
  return {
    rank: rank || sorted.length,
    total: sorted.length
  };
}

function conditionAllows(skill: SkillConfig, state: RaceState, runnerId: string, rng: Rng): boolean {
  if (!skill.condition) {
    return true;
  }

  if (skill.condition.type === "CHANCE") {
    return rng() <= (skill.condition.chance ?? 1);
  }

  const { rank, total } = getRunnerRankPercentile(state, runnerId);
  const threshold = Math.max(1, Math.ceil(total * (skill.condition.rankPercent ?? 0.5)));

  if (skill.condition.type === "RANK_BELOW") {
    return rank > threshold;
  }

  if (skill.condition.type === "RANK_ABOVE") {
    return rank <= threshold;
  }

  return true;
}

function chanceAllows(chance: number | undefined, rng: Rng): boolean {
  return chance === undefined || rng() <= chance;
}

function findNearestRunnerAhead(state: RaceState, runner: RunnerRaceState): number | undefined {
  let nearest: number | undefined;

  for (const other of Object.values(state.runners)) {
    if (other.id === runner.id || other.finished || other.position <= runner.position) {
      continue;
    }

    if (nearest === undefined || other.position < nearest) {
      nearest = other.position;
    }
  }

  return nearest;
}

export function applySkillTrigger(
  trigger: SkillTrigger,
  runnerId: string,
  state: RaceState,
  context: TurnContext,
  rng: Rng
): SkillOutcome[] {
  const runnerConfig = state.runnerConfigs[runnerId];
  const runnerState = state.runners[runnerId];
  if (!runnerConfig || !runnerState) {
    return [];
  }

  const outcomes: SkillOutcome[] = [];
  const skills = runnerConfig.skillIds
    .map((skillId) => state.skillsById[skillId])
    .filter((skill): skill is SkillConfig => Boolean(skill) && skill.trigger === trigger);

  for (const skill of skills) {
    if (!conditionAllows(skill, state, runnerId, rng) || !chanceAllows(skill.effect.chance, rng)) {
      continue;
    }

    switch (skill.effect.type) {
      case "MODIFY_DICE_RANGE": {
        if (skill.effect.dice && skill.effect.dice.length > 0) {
          context.dicePool = [...skill.effect.dice];
          outcomes.push({ skill, description: `${skill.name}：骰子变为 ${skill.effect.dice.join("/")}` });
        }
        break;
      }
      case "FIXED_STEP": {
        context.fixedStep = skill.effect.steps ?? context.fixedStep ?? 0;
        outcomes.push({ skill, description: `${skill.name}：本回合固定走 ${context.fixedStep} 格` });
        break;
      }
      case "EXTRA_STEP":
      case "BOOST_IF_BEHIND":
      case "SLOW_IF_AHEAD":
      case "STACK_BONUS": {
        const steps = skill.effect.steps ?? 0;
        context.extraSteps += steps;
        const verb = steps >= 0 ? "额外前进" : "少走";
        outcomes.push({ skill, description: `${skill.name}：${verb} ${Math.abs(steps)} 格` });
        break;
      }
      case "SKIP_TURN": {
        context.skipTurn = true;
        outcomes.push({ skill, description: `${skill.name}：本回合暂停行动` });
        break;
      }
      case "RANDOM_WEIGHTED_STEP": {
        if (skill.effect.weights && skill.effect.weights.length > 0) {
          const picked = pickWeighted(skill.effect.weights, rng);
          context.fixedStep = picked.steps;
          outcomes.push({ skill, description: `${skill.name}：本回合改为 ${picked.steps} 格` });
        }
        break;
      }
      case "TELEPORT": {
        if (typeof skill.effect.targetIndex === "number") {
          outcomes.push({
            skill,
            description: `${skill.name}：传送到 ${skill.effect.targetIndex} 格`,
            teleportToPosition: skill.effect.targetIndex
          });
        }
        break;
      }
      case "TELEPORT_TO_NEAREST_AHEAD": {
        const target = findNearestRunnerAhead(state, runnerState);
        if (typeof target === "number") {
          outcomes.push({
            skill,
            description: `${skill.name}：贴到前方最近团子所在格`,
            teleportToPosition: target
          });
        }
        break;
      }
      default:
        break;
    }
  }

  return outcomes;
}
