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

const IMF_DATE_PATTERN =
  /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d{2}) (?<month>\w{3}) \d{4} \d{2}:\d{2}:\d{2} GMT$/;
const RFC850_DATE_PATTERN =
  /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (?<date>\d{2}-(?<month>\w{3})-)(?<year>\d{2})(?<time> \d{2}:\d{2}:\d{2} GMT)$/;
const ASCTIME_DATE_PATTERN =
  /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (?<month>\w{3}) (?<day>\d{2}| \d) \d{2}:\d{2}:\d{2} \d{4}$/;
const HTTP_MONTHS = new Set([
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]);
const RFC850_FUTURE_YEARS = 50;
const YEARS_PER_CENTURY = 100;

function validatedDateTimestamp(
  value: string,
  day: number,
  month: string,
): number {
  if (!HTTP_MONTHS.has(month)) {
    return Number.NaN;
  }

  const date = new Date(value);

  return date.getUTCDate() === day ? date.getTime() : Number.NaN;
}

function httpDateTimestamp(value: string, now: number): number {
  const imfDate = IMF_DATE_PATTERN.exec(value);

  if (imfDate) {
    return validatedDateTimestamp(
      value,
      Number(imfDate[1]),
      imfDate.groups!.month,
    );
  }

  const asctimeDate = ASCTIME_DATE_PATTERN.exec(value);

  if (asctimeDate) {
    return validatedDateTimestamp(
      `${value} GMT`,
      Number(asctimeDate.groups!.day),
      asctimeDate.groups!.month,
    );
  }

  const rfc850 = RFC850_DATE_PATTERN.exec(value);

  if (!rfc850) {
    return Number.NaN;
  }

  // RFC 9110 interprets two-digit years relative to the 50-year future boundary.
  const futureLimit = new Date(now);

  futureLimit.setUTCFullYear(
    futureLimit.getUTCFullYear() + RFC850_FUTURE_YEARS,
  );
  const century =
    Math.floor(futureLimit.getUTCFullYear() / YEARS_PER_CENTURY) *
    YEARS_PER_CENTURY;
  const { date: datePrefix, month, year: shortYear, time } = rfc850.groups!;
  const year = century + Number(shortYear);
  const day = Number(datePrefix.slice(0, 2));
  const timestamp = validatedDateTimestamp(
    `${datePrefix}${year}${time}`,
    day,
    month,
  );
  const date = new Date(timestamp);

  if (date.getTime() > futureLimit.getTime()) {
    return validatedDateTimestamp(
      `${datePrefix}${year - YEARS_PER_CENTURY}${time}`,
      day,
      month,
    );
  }

  return date.getTime();
}

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
    : httpDateTimestamp(trimmed, now);

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
