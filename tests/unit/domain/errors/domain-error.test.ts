import { describe, it, expect } from 'vitest';
import {
  DomainError,
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  StateTransitionError,
  ImmutableResourceError,
  QuotaExceededError,
} from '@domain/errors/domain-error';

describe('DomainError', () => {
  it('is the base class with name + message', () => {
    const e = new DomainError('boom');
    expect(e.message).toBe('boom');
    expect(e.name).toBe('DomainError');
    expect(e).toBeInstanceOf(Error);
  });

  it('ValidationError inherits', () => {
    const e = new ValidationError('bad input', { field: 'email' });
    expect(e.name).toBe('ValidationError');
    expect(e.context).toEqual({ field: 'email' });
  });

  it('NotFoundError has resource + id', () => {
    const e = new NotFoundError('Company', '123');
    expect(e.message).toContain('Company');
    expect(e.message).toContain('123');
  });

  it('ConflictError has reason', () => {
    const e = new ConflictError('duplicate slug');
    expect(e.message).toBe('duplicate slug');
  });

  it('ForbiddenError vs UnauthorizedError', () => {
    const f = new ForbiddenError('cannot remove owner');
    const u = new UnauthorizedError('not signed in');
    expect(f.name).toBe('ForbiddenError');
    expect(u.name).toBe('UnauthorizedError');
  });

  it('StateTransitionError', () => {
    const e = new StateTransitionError('cannot cancel after start');
    expect(e.name).toBe('StateTransitionError');
  });

  it('ImmutableResourceError', () => {
    const e = new ImmutableResourceError('transcript is immutable');
    expect(e.name).toBe('ImmutableResourceError');
  });

  it('QuotaExceededError has resource + limit', () => {
    const e = new QuotaExceededError('ai_notes', 50, 51);
    expect(e.message).toContain('ai_notes');
    expect(e.message).toContain('50');
    expect(e.message).toContain('51');
  });

  it('all errors extend DomainError', () => {
    const errors = [
      new ValidationError('x'),
      new NotFoundError('X', '1'),
      new ForbiddenError('x'),
      new UnauthorizedError('x'),
      new StateTransitionError('x'),
      new ImmutableResourceError('x'),
      new QuotaExceededError('x', 1, 2),
      new ConflictError('x'),
    ];
    for (const e of errors) {
      expect(e).toBeInstanceOf(DomainError);
      expect(e).toBeInstanceOf(Error);
    }
  });
});
