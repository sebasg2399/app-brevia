import { describe, it, expect } from 'vitest';
import { Plan } from '@domain/value-objects/plan';
import { ValidationError } from '@domain/errors/domain-error';

describe('Plan', () => {
  it('free plan has 5 notes/month', () => {
    expect(Plan.free().monthlyNotes).toBe(5);
    expect(Plan.free().name).toBe('free');
  });

  it('pro plan has 50 notes/month', () => {
    expect(Plan.pro().monthlyNotes).toBe(50);
    expect(Plan.pro().name).toBe('pro');
  });

  it('team plan has 500 notes/month', () => {
    expect(Plan.team().monthlyNotes).toBe(500);
    expect(Plan.team().name).toBe('team');
  });

  it('fromName parses valid plan', () => {
    expect(Plan.fromName('pro').name).toBe('pro');
  });

  it('throws on unknown plan', () => {
    expect(() => Plan.fromName('enterprise')).toThrow(ValidationError);
  });

  it('displayName present', () => {
    expect(Plan.pro().displayName).toBe('Pro');
  });
});
