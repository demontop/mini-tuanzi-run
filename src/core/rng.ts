export type Rng = () => number;

export function createRng(seed: number): Rng {
  let t = seed >>> 0;
  return function rng() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function pickOne<T>(items: T[], rng: Rng): T {
  if (items.length === 0) {
    throw new Error("Cannot pick from an empty array.");
  }

  return items[Math.floor(rng() * items.length)];
}

export function shuffle<T>(items: T[], rng: Rng): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function pickWeighted<T extends { weight: number }>(items: T[], rng: Rng): T {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  if (total <= 0) {
    return items[0];
  }

  let cursor = rng() * total;
  for (const item of items) {
    cursor -= Math.max(0, item.weight);
    if (cursor <= 0) {
      return item;
    }
  }

  return items[items.length - 1];
}
