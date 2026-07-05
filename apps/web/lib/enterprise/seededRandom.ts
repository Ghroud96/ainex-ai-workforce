// Deterministic content generation: the same Industry + Company Size
// always produces the same company, so a presenter gets a reproducible
// result across sessions and can prepare a pitch around it, and the two
// spot-checks in the verification step are actually repeatable.

export function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (Math.imul(31, hash) + input.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  private next: () => number;

  constructor(seed: number) {
    this.next = mulberry32(seed);
  }

  float(): number {
    return this.next();
  }

  range(min: number, max: number): number {
    return Math.floor(this.float() * (max - min + 1)) + min;
  }

  rangeFloat(min: number, max: number, decimals = 2): number {
    const value = this.float() * (max - min) + min;
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  pick<T>(items: readonly T[]): T {
    return items[this.range(0, items.length - 1)];
  }

  pickN<T>(items: readonly T[], count: number): T[] {
    const pool = [...items];
    const picked: T[] = [];
    const n = Math.min(count, pool.length);
    for (let i = 0; i < n; i += 1) {
      const index = this.range(0, pool.length - 1);
      picked.push(pool[index]);
      pool.splice(index, 1);
    }
    return picked;
  }

  weighted<T>(items: readonly { value: T; weight: number }[]): T {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    let roll = this.float() * total;
    for (const item of items) {
      roll -= item.weight;
      if (roll <= 0) return item.value;
    }
    return items[items.length - 1].value;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const pool = [...items];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = this.range(0, i);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
  }
}

export function createRng(seedText: string): Rng {
  return new Rng(hashString(seedText));
}
