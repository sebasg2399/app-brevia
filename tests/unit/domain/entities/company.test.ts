import { describe, it, expect } from 'vitest';
import { Company } from '@domain/entities/company';
import { CompanyId, UserId } from '@domain/value-objects/branded-id';
import { Slug } from '@domain/value-objects/slug';
import { ValidationError } from '@domain/errors/domain-error';

const fixedId = CompanyId.fromString('12345678-1234-4234-8234-123456789012');
const ownerId = UserId.fromString('22345678-1234-4234-8234-123456789012');

describe('Company', () => {
  const now = '2026-01-01T00:00:00.000Z';

  it('creates a company with required fields', () => {
    const c = Company.create({
      id: fixedId,
      name: 'Acme Coaching',
      slug: Slug.create('acme-coaching'),
      ownerId,
      now,
    });
    expect(c.id.equals(fixedId)).toBe(true);
    expect(c.name).toBe('Acme Coaching');
    expect(c.slug.value).toBe('acme-coaching');
    expect(c.ownerId.equals(ownerId)).toBe(true);
    expect(c.createdAt).toBe(now);
    expect(c.updatedAt).toBe(now);
  });

  it('throws on empty name', () => {
    expect(() =>
      Company.create({
        id: fixedId,
        name: '   ',
        slug: Slug.create('x'),
        ownerId,
        now,
      }),
    ).toThrow(ValidationError);
  });

  it('throws on name over 80 chars', () => {
    expect(() =>
      Company.create({
        id: fixedId,
        name: 'a'.repeat(81),
        slug: Slug.create('x'),
        ownerId,
        now,
      }),
    ).toThrow(ValidationError);
  });

  it('rename updates name and updatedAt', () => {
    const c = Company.create({
      id: fixedId,
      name: 'Old',
      slug: Slug.create('old'),
      ownerId,
      now,
    });
    const later = '2026-02-01T00:00:00.000Z';
    c.rename('New', later);
    expect(c.name).toBe('New');
    expect(c.updatedAt).toBe(later);
  });

  it('rename throws on empty', () => {
    const c = Company.create({
      id: fixedId,
      name: 'Old',
      slug: Slug.create('old'),
      ownerId,
      now,
    });
    expect(() => c.rename('', now)).toThrow(ValidationError);
  });

  it('reconstruct from persistence does not validate again', () => {
    const c = Company.reconstruct({
      id: fixedId,
      name: 'Persisted',
      slug: Slug.create('persisted'),
      ownerId,
      createdAt: now,
      updatedAt: now,
    });
    expect(c.name).toBe('Persisted');
  });

  it('rejects name with control characters', () => {
    expect(() =>
      Company.create({
        id: fixedId,
        name: 'Bad\x00Name',
        slug: Slug.create('x'),
        ownerId,
        now,
      }),
    ).toThrow(ValidationError);
  });
});