import { systemClock } from '@app/ports/clock';
export type { Clock } from '@app/ports/clock';
export const clock = systemClock;