import { describe, it, expect } from 'vitest';
import { Coach } from '@domain/entities/coach';
import { CoachId, CompanyId, UserId } from '@domain/value-objects/branded-id';
import { ValidationError } from '@domain/errors/domain-error';

const coachId = CoachId.fromString('12345678-1234-4234-8234-123456789012');
const companyId = CompanyId.fromString('22345678-1234-4234-8234-123456789012');
const userId = UserId.fromString('32345678-1234-4234-8234-123456789012');

describe('Coach', () => {
  const now = '2026-01-01T00:00:00.000Z';

  it('creates with valid fields', () => {
    const c = Coach.create({
      id: coachId,
      userId,
      companyId,
      displayName: 'Jane Coach',
      bio: 'I help people grow.',
      focusAreas: ['career', 'leadership'],
      hourlyRateCents: 12000,
      now,
    });
    expect(c.isActive).toBe(true);
    expect(c.hourlyRateCents).toBe(12000);
    expect(c.focusAreas).toEqual(['career', 'leadership']);
  });

  it('throws on empty display name', () => {
    expect(() =>
      Coach.create({
        id: coachId,
        userId,
        companyId,
        displayName: '   ',
        bio: '',
        focusAreas: ['career'],
        hourlyRateCents: 0,
        now,
      }),
    ).toThrow(ValidationError);
  });

  it('throws on display name > 120 chars', () => {
    expect(() =>
      Coach.create({
        id: coachId,
        userId,
        companyId,
        displayName: 'a'.repeat(121),
        bio: '',
        focusAreas: ['career'],
        hourlyRateCents: 0,
        now,
      }),
    ).toThrow(ValidationError);
  });

  it('throws on bio > 2000 chars', () => {
    expect(() =>
      Coach.create({
        id: coachId,
        userId,
        companyId,
        displayName: 'X',
        bio: 'a'.repeat(2001),
        focusAreas: ['career'],
        hourlyRateCents: 0,
        now,
      }),
    ).toThrow(/Bio too long/);
  });

  it('throws when focusAreas empty', () => {
    expect(() =>
      Coach.create({
        id: coachId,
        userId,
        companyId,
        displayName: 'X',
        bio: '',
        focusAreas: [],
        hourlyRateCents: 0,
        now,
      }),
    ).toThrow(/Focus areas/);
  });

  it('throws when focusAreas > 8', () => {
    expect(() =>
      Coach.create({
        id: coachId,
        userId,
        companyId,
        displayName: 'X',
        bio: '',
        focusAreas: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'],
        hourlyRateCents: 0,
        now,
      }),
    ).toThrow(/Focus areas/);
  });

  it('throws on negative hourly rate', () => {
    expect(() =>
      Coach.create({
        id: coachId,
        userId,
        companyId,
        displayName: 'X',
        bio: '',
        focusAreas: ['career'],
        hourlyRateCents: -1,
        now,
      }),
    ).toThrow(/cannot be negative/);
  });

  it('throws on non-integer hourly rate', () => {
    expect(() =>
      Coach.create({
        id: coachId,
        userId,
        companyId,
        displayName: 'X',
        bio: '',
        focusAreas: ['career'],
        hourlyRateCents: 1.5,
        now,
      }),
    ).toThrow(/integer/);
  });

  it('updateBio persists new bio and bumps updatedAt', () => {
    const c = Coach.create({
      id: coachId,
      userId,
      companyId,
      displayName: 'X',
      bio: 'old',
      focusAreas: ['career'],
      hourlyRateCents: 0,
      now,
    });
    const later = '2026-02-01T00:00:00.000Z';
    c.updateBio('new bio', later);
    expect(c.bio).toBe('new bio');
    expect(c.updatedAt).toBe(later);
  });

  it('deactivate / activate toggles isActive', () => {
    const c = Coach.create({
      id: coachId,
      userId,
      companyId,
      displayName: 'X',
      bio: '',
      focusAreas: ['career'],
      hourlyRateCents: 0,
      now,
    });
    c.deactivate(now);
    expect(c.isActive).toBe(false);
    c.activate(now);
    expect(c.isActive).toBe(true);
  });

  it('belongsToCompany', () => {
    const c = Coach.create({
      id: coachId,
      userId,
      companyId,
      displayName: 'X',
      bio: '',
      focusAreas: ['career'],
      hourlyRateCents: 0,
      now,
    });
    expect(c.belongsToCompany(companyId)).toBe(true);
    const other = CompanyId.fromString('42345678-1234-4234-8234-123456789012');
    expect(c.belongsToCompany(other)).toBe(false);
  });
});
