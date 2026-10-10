import { describe, it, expect } from 'vitest';
import { User } from '@domain/entities/user';
import { UserId } from '@domain/value-objects/branded-id';
import { Email } from '@domain/value-objects/email';
import { ValidationError } from '@domain/errors/domain-error';

const fixedId = UserId.fromString('12345678-1234-4234-8234-123456789012');

describe('User', () => {
  const now = '2026-01-01T00:00:00.000Z';
  const email = Email.create('jane@example.com');

  it('creates user with email', () => {
    const u = User.create({ id: fixedId, email, fullName: null, now });
    expect(u.id.equals(fixedId)).toBe(true);
    expect(u.email.value).toBe('jane@example.com');
    expect(u.fullName).toBeNull();
    expect(u.createdAt).toBe(now);
  });

  it('creates user with full name', () => {
    const u = User.create({ id: fixedId, email, fullName: 'Jane Doe', now });
    expect(u.fullName).toBe('Jane Doe');
  });

  it('throws on empty full name', () => {
    expect(() => User.create({ id: fixedId, email, fullName: '   ', now })).toThrow(
      ValidationError,
    );
  });

  it('throws on full name over 120 chars', () => {
    expect(() => User.create({ id: fixedId, email, fullName: 'a'.repeat(121), now })).toThrow(
      ValidationError,
    );
  });

  it('updates full name', () => {
    const u = User.create({ id: fixedId, email, fullName: null, now });
    u.updateFullName('New Name', now);
    expect(u.fullName).toBe('New Name');
  });

  it('reconstruct does not revalidate', () => {
    const u = User.reconstruct({
      id: fixedId,
      email,
      fullName: 'Jane',
      createdAt: now,
      updatedAt: now,
    });
    expect(u.fullName).toBe('Jane');
  });
});
