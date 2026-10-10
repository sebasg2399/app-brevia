import type { Clock } from './clock';
export type { Clock };
export const systemClock: Clock = {
  now: () => new Date().toISOString(),
};