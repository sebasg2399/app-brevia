import { describe, it, expect } from 'vitest';
import { DateRange } from '@domain/value-objects/date-range';

describe('DateRange', () => {
  it('creates range with start before end', () => {
    const r = DateRange.create('2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z');
    expect(r.start).toBe('2026-01-01T00:00:00Z');
    expect(r.end).toBe('2026-01-02T00:00:00Z');
  });

  it('allows single-instant range (start === end)', () => {
    const r = DateRange.create('2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');
    expect(r.start).toBe(r.end);
  });

  it('throws on invalid ISO string', () => {
    expect(() => DateRange.create('not-a-date', '2026-01-01T00:00:00Z')).toThrow(
      'Invalid ISO datetime',
    );
  });

  it('throws when start is after end', () => {
    expect(() => DateRange.create('2026-01-02T00:00:00Z', '2026-01-01T00:00:00Z')).toThrow(
      'start must be before or equal to end',
    );
  });

  it('contains works as inclusive', () => {
    const r = DateRange.create('2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z');
    expect(r.contains('2026-01-01T00:00:00Z')).toBe(true);
    expect(r.contains('2026-01-02T00:00:00Z')).toBe(true);
    expect(r.contains('2026-01-01T12:00:00Z')).toBe(true);
  });

  it('contains returns false outside', () => {
    const r = DateRange.create('2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z');
    expect(r.contains('2025-12-31T23:59:59Z')).toBe(false);
    expect(r.contains('2026-01-02T00:00:01Z')).toBe(false);
  });

  it('overlaps detects intersection', () => {
    const a = DateRange.create('2026-01-01T00:00:00Z', '2026-01-10T00:00:00Z');
    const b = DateRange.create('2026-01-05T00:00:00Z', '2026-01-15T00:00:00Z');
    expect(a.overlaps(b)).toBe(true);
    expect(b.overlaps(a)).toBe(true);
  });

  it('overlaps returns false for non-intersecting', () => {
    const a = DateRange.create('2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z');
    const b = DateRange.create('2026-02-01T00:00:00Z', '2026-02-02T00:00:00Z');
    expect(a.overlaps(b)).toBe(false);
  });
});
