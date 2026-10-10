import { describe, it, expect } from 'vitest';
import { Email } from '@domain/value-objects/email';

describe('Email', () => {
  it('creates Email from valid lowercase string', () => {
    const e = Email.create('jane@example.com');
    expect(e.value).toBe('jane@example.com');
  });

  it('lowercases input', () => {
    const e = Email.create('Jane@Example.COM');
    expect(e.value).toBe('jane@example.com');
  });

  it('trims whitespace', () => {
    const e = Email.create('  jane@example.com  ');
    expect(e.value).toBe('jane@example.com');
  });

  it('throws on empty string', () => {
    expect(() => Email.create('')).toThrow('Email cannot be empty');
  });

  it('throws on invalid format', () => {
    expect(() => Email.create('not-an-email')).toThrow('Invalid email format');
    expect(() => Email.create('foo@')).toThrow('Invalid email format');
    expect(() => Email.create('@foo.com')).toThrow('Invalid email format');
    expect(() => Email.create('foo bar@x.com')).toThrow('Invalid email format');
  });

  it('throws on too long emails (>254 chars)', () => {
    const long = 'a'.repeat(250) + '@x.com';
    expect(() => Email.create(long)).toThrow('Email too long');
  });

  it('equals compares by value', () => {
    expect(Email.create('a@x.com').equals(Email.create('A@X.com'))).toBe(true);
    expect(Email.create('a@x.com').equals(Email.create('b@x.com'))).toBe(false);
  });

  it('returns plain string via toString', () => {
    expect(Email.create('a@x.com').toString()).toBe('a@x.com');
  });
});
