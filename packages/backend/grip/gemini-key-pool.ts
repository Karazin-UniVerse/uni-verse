import { HttpStatus } from '@nestjs/common';
import {
  GRIP_KEY_COOLDOWN_MS,
  GRIP_KEY_QUOTA_COOLDOWN_MS,
} from './grip.constants';
import type {
  GeminiKeyCooldownParams,
  GeminiKeyReservation,
  GeminiKeyState,
} from './grip.types';

function retryAfterTimestamp(
  value: string | null | undefined,
  now: number,
): number {
  if (!value) {
    return now;
  }

  const trimmed = value.trim();
  const timestamp = /^\d+$/.test(trimmed)
    ? now + Number(trimmed) * 1_000
    : Date.parse(
        /^\w{3}, \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(trimmed)
          ? trimmed
          : '',
      );

  return Number.isSafeInteger(timestamp) ? timestamp : now;
}

export class GeminiKeyPool {
  private readonly keys: GeminiKeyState[];
  private cursor = 0;

  constructor(apiKeys: readonly string[]) {
    this.keys = apiKeys.map((apiKey) => ({
      apiKey,
      active: 0,
      availableAfter: 0,
    }));
  }

  private select(excludedSlots: ReadonlySet<number>): number | undefined {
    const now = Date.now();
    let selected: number | undefined;

    for (let offset = 0; offset < this.keys.length; offset += 1) {
      const slot = (this.cursor + offset) % this.keys.length;
      const key = this.keys[slot];

      if (excludedSlots.has(slot) || key.availableAfter > now) {
        continue;
      }

      if (selected === undefined || key.active < this.keys[selected].active) {
        selected = slot;
      }
    }

    return selected;
  }

  hasAvailable(excludedSlots: ReadonlySet<number>): boolean {
    return this.select(excludedSlots) !== undefined;
  }

  reserve(
    excludedSlots: ReadonlySet<number>,
  ): GeminiKeyReservation | undefined {
    const slot = this.select(excludedSlots);

    if (slot === undefined) {
      return undefined;
    }

    this.keys[slot].active += 1;
    this.cursor = (slot + 1) % this.keys.length;

    return { slot, apiKey: this.keys[slot].apiKey };
  }

  release(slot: number): void {
    this.keys[slot].active -= 1;
  }

  coolDown({ slot, status, retryAfter }: GeminiKeyCooldownParams): void {
    const now = Date.now();
    const isQuota = status === HttpStatus.TOO_MANY_REQUESTS;
    const isAuth =
      status === HttpStatus.UNAUTHORIZED || status === HttpStatus.FORBIDDEN;
    const duration =
      isQuota || isAuth ? GRIP_KEY_QUOTA_COOLDOWN_MS : GRIP_KEY_COOLDOWN_MS;
    const until = isQuota ? retryAfterTimestamp(retryAfter, now) : now;

    this.keys[slot].availableAfter = Math.max(
      this.keys[slot].availableAfter,
      now + duration,
      until,
    );
  }
}
