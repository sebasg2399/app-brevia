import { describe, it, expect } from 'vitest';
import { UserId, CompanyId, MembershipId, InvitationId } from '@domain/value-objects/branded-id';

describe('branded ids', () => {
  it('UserId wraps with type guard', () => {
    const id = UserId.fromString('12345678-1234-4234-8234-123456789012');
    expect(id.value).toBe('12345678-1234-4234-8234-123456789012');
  });

  it('throws on invalid UUID', () => {
    expect(() => UserId.fromString('not-a-uuid')).toThrow('Invalid UUID');
  });

  it('throws on empty', () => {
    expect(() => UserId.fromString('')).toThrow('Invalid UUID');
  });

  it('UserId.equals compares values', () => {
    const a = UserId.fromString('12345678-1234-4234-8234-123456789012');
    const b = UserId.fromString('12345678-1234-4234-8234-123456789012');
    const c = UserId.fromString('12345678-1234-4234-8234-123456789013');
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });

  it('CompanyId, MembershipId, InvitationId are distinct types but same shape', () => {
    const userId = UserId.fromString('12345678-1234-4234-8234-123456789012');
    const companyId = CompanyId.fromString('22345678-1234-4234-8234-123456789012');
    expect(userId.value).not.toBe(companyId.value);
  });

  it('toString returns raw value', () => {
    const id = UserId.fromString('12345678-1234-4234-8234-123456789012');
    expect(id.toString()).toBe('12345678-1234-4234-8234-123456789012');
  });
});