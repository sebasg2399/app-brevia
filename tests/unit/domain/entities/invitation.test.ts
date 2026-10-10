import { describe, it, expect } from 'vitest';
import { Invitation } from '@domain/entities/invitation';
import {
  CompanyId,
  InvitationId,
  UserId,
} from '@domain/value-objects/branded-id';
import { Email } from '@domain/value-objects/email';
import { ConflictError } from '@domain/errors/domain-error';

const companyId = CompanyId.fromString('12345678-1234-4234-8234-123456789012');
const inviterId = UserId.fromString('22345678-1234-4234-8234-123456789012');
const invitationId = InvitationId.fromString('32345678-1234-4234-8234-123456789012');
const email = Email.create('coach@example.com');

describe('Invitation', () => {
  const now = '2026-01-01T00:00:00.000Z';
  const expiresAt = '2026-01-08T00:00:00.000Z';
  const later = '2026-01-02T00:00:00.000Z';

  it('creates a pending invitation', () => {
    const i = Invitation.create({
      id: invitationId,
      companyId,
      email,
      role: 'coach',
      invitedBy: inviterId,
      tokenHash: 'hash12345678',
      now,
      expiresAt,
    });
    expect(i.status).toBe('pending');
    expect(i.role).toBe('coach');
    expect(i.tokenHash).toBe('hash12345678');
  });

  it('expiresAt must be after now', () => {
    expect(() =>
      Invitation.create({
        id: invitationId,
        companyId,
        email,
        role: 'coach',
        invitedBy: inviterId,
tokenHash: 'hash12345678',
        now,
        expiresAt: '2025-12-31T00:00:00.000Z',
      }),
    ).toThrow();
  });

  it('isExpired compares to current time', () => {
    const i = Invitation.create({
      id: invitationId,
      companyId,
      email,
      role: 'coach',
      invitedBy: inviterId,
      tokenHash: 'hash12345678',
      now,
      expiresAt,
    });
    expect(i.isExpired(later)).toBe(false);
    expect(i.isExpired('2026-01-09T00:00:00.000Z')).toBe(true);
  });

  it('accept flips status to accepted and records acceptedBy + at', () => {
    const i = Invitation.create({
      id: invitationId,
      companyId,
      email,
      role: 'coach',
      invitedBy: inviterId,
      tokenHash: 'hash12345678',
      now,
      expiresAt,
    });
    const accepter = UserId.fromString('42345678-1234-4234-8234-123456789012');
    i.accept(accepter, later);
    expect(i.status).toBe('accepted');
    expect(i.acceptedBy?.equals(accepter)).toBe(true);
    expect(i.acceptedAt).toBe(later);
  });

  it('accept on expired throws ConflictError', () => {
    const i = Invitation.create({
      id: invitationId,
      companyId,
      email,
      role: 'coach',
      invitedBy: inviterId,
      tokenHash: 'hash12345678',
      now,
      expiresAt,
    });
    const afterExpiry = '2026-01-09T00:00:00.000Z';
    const accepter = UserId.fromString('42345678-1234-4234-8234-123456789012');
    expect(() => i.accept(accepter, afterExpiry)).toThrow(ConflictError);
  });

  it('accept twice throws', () => {
    const i = Invitation.create({
      id: invitationId,
      companyId,
      email,
      role: 'coach',
      invitedBy: inviterId,
      tokenHash: 'hash12345678',
      now,
      expiresAt,
    });
    const accepter = UserId.fromString('42345678-1234-4234-8234-123456789012');
    i.accept(accepter, later);
    expect(() => i.accept(accepter, later)).toThrow(ConflictError);
  });

  it('revoke transitions pending → revoked', () => {
    const i = Invitation.create({
      id: invitationId,
      companyId,
      email,
      role: 'coach',
      invitedBy: inviterId,
      tokenHash: 'hash12345678',
      now,
      expiresAt,
    });
    i.revoke(later);
    expect(i.status).toBe('revoked');
  });

  it('revoke on accepted throws', () => {
    const i = Invitation.create({
      id: invitationId,
      companyId,
      email,
      role: 'coach',
      invitedBy: inviterId,
      tokenHash: 'hash12345678',
      now,
      expiresAt,
    });
    const accepter = UserId.fromString('42345678-1234-4234-8234-123456789012');
    i.accept(accepter, later);
    expect(() => i.revoke(later)).toThrow(ConflictError);
  });
});