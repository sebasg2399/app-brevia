import { describe, it, expect } from 'vitest';
import { Client } from '@domain/entities/client';
import { ClientId, CompanyId } from '@domain/value-objects/branded-id';
import { Email } from '@domain/value-objects/email';
import { ValidationError } from '@domain/errors/domain-error';

const clientId = ClientId.fromString('12345678-1234-4234-8234-123456789012');
const companyId = CompanyId.fromString('22345678-1234-4234-8234-123456789012');

describe('Client', () => {
  const now = '2026-01-01T00:00:00.000Z';

  it('creates with name only', () => {
    const c = Client.create({
      id: clientId,
      companyId,
      name: 'Bob',
      email: null,
      notes: null,
      now,
    });
    expect(c.name).toBe('Bob');
    expect(c.email).toBeNull();
    expect(c.isDeleted()).toBe(false);
  });

  it('creates with email and notes', () => {
    const c = Client.create({
      id: clientId,
      companyId,
      name: 'Bob',
      email: Email.create('bob@x.com'),
      notes: 'VIP',
      now,
    });
    expect(c.email?.value).toBe('bob@x.com');
    expect(c.notes).toBe('VIP');
  });

  it('throws on empty name', () => {
    expect(() =>
      Client.create({
        id: clientId,
        companyId,
        name: '   ',
        email: null,
        notes: null,
        now,
      }),
    ).toThrow(ValidationError);
  });

  it('throws on name > 120 chars', () => {
    expect(() =>
      Client.create({
        id: clientId,
        companyId,
        name: 'a'.repeat(121),
        email: null,
        notes: null,
        now,
      }),
    ).toThrow(ValidationError);
  });

  it('throws on notes > 2000 chars', () => {
    expect(() =>
      Client.create({
        id: clientId,
        companyId,
        name: 'Bob',
        email: null,
        notes: 'a'.repeat(2001),
        now,
      }),
    ).toThrow(/notes too long/);
  });

  it('rename updates name and updatedAt', () => {
    const c = Client.create({
      id: clientId,
      companyId,
      name: 'Old',
      email: null,
      notes: null,
      now,
    });
    const later = '2026-02-01T00:00:00.000Z';
    c.rename('New', later);
    expect(c.name).toBe('New');
    expect(c.updatedAt).toBe(later);
  });

  it('softDelete marks deletedAt and isDeleted returns true', () => {
    const c = Client.create({ id: clientId, companyId, name: 'X', email: null, notes: null, now });
    c.softDelete(now);
    expect(c.isDeleted()).toBe(true);
    expect(c.deletedAt).toBe(now);
  });

  it('softDelete twice throws', () => {
    const c = Client.create({ id: clientId, companyId, name: 'X', email: null, notes: null, now });
    c.softDelete(now);
    expect(() => c.softDelete(now)).toThrow(/already deleted/);
  });

  it('belongsToCompany', () => {
    const c = Client.create({ id: clientId, companyId, name: 'X', email: null, notes: null, now });
    expect(c.belongsToCompany(companyId)).toBe(true);
    const other = CompanyId.fromString('42345678-1234-4234-8234-123456789012');
    expect(c.belongsToCompany(other)).toBe(false);
  });
});
