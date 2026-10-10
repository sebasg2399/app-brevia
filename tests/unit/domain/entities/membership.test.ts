import { describe, it, expect } from 'vitest';
import { Membership } from '@domain/entities/membership';
import { CompanyId, MembershipId, UserId } from '@domain/value-objects/branded-id';
import { ValidationError } from '@domain/errors/domain-error';

const companyId = CompanyId.fromString('12345678-1234-4234-8234-123456789012');
const userId = UserId.fromString('22345678-1234-4234-8234-123456789012');
const membershipId = MembershipId.fromString('32345678-1234-4234-8234-123456789012');

describe('Membership', () => {
  const now = '2026-01-01T00:00:00.000Z';

  it('creates owner membership', () => {
    const m = Membership.create({
      id: membershipId,
      companyId,
      userId,
      role: 'owner',
      now,
    });
    expect(m.role).toBe('owner');
    expect(m.isOwner()).toBe(true);
    expect(m.isCoach()).toBe(false);
    expect(m.isClient()).toBe(false);
  });

  it('creates coach membership', () => {
    const m = Membership.create({
      id: membershipId,
      companyId,
      userId,
      role: 'coach',
      now,
    });
    expect(m.isCoach()).toBe(true);
    expect(m.isOwner()).toBe(false);
  });

  it('creates client membership', () => {
    const m = Membership.create({
      id: membershipId,
      companyId,
      userId,
      role: 'client',
      now,
    });
    expect(m.isClient()).toBe(true);
  });

  it('throws on invalid role', () => {
    expect(() =>
      Membership.create({
        id: membershipId,
        companyId,
        userId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        role: 'admin' as any,
        now,
      }),
    ).toThrow(ValidationError);
  });

  it('reconstruct from persistence', () => {
    const m = Membership.reconstruct({
      id: membershipId,
      companyId,
      userId,
      role: 'coach',
      createdAt: now,
      updatedAt: now,
    });
    expect(m.isCoach()).toBe(true);
  });

  it('exposes id, companyId, userId', () => {
    const m = Membership.create({
      id: membershipId,
      companyId,
      userId,
      role: 'owner',
      now,
    });
    expect(m.id.equals(membershipId)).toBe(true);
    expect(m.companyId.equals(companyId)).toBe(true);
    expect(m.userId.equals(userId)).toBe(true);
  });
});
