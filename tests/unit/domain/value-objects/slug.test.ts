import { describe, it, expect } from 'vitest';
import { Slug } from '@domain/value-objects/slug';

describe('Slug', () => {
  it('creates Slug from valid kebab-case', () => {
    const s = Slug.create('acme-co');
    expect(s.value).toBe('acme-co');
  });

  it('throws on empty', () => {
    expect(() => Slug.create('')).toThrow('Slug cannot be empty');
  });

  it('throws on uppercase', () => {
    expect(() => Slug.create('Acme')).toThrow('Slug must be lowercase kebab-case');
  });

  it('throws on spaces', () => {
    expect(() => Slug.create('acme co')).toThrow('Slug must be lowercase kebab-case');
  });

  it('throws on underscores', () => {
    expect(() => Slug.create('acme_co')).toThrow('Slug must be lowercase kebab-case');
  });

  it('throws on leading/trailing hyphens', () => {
    expect(() => Slug.create('-acme')).toThrow('Slug cannot start or end with a hyphen');
    expect(() => Slug.create('acme-')).toThrow('Slug cannot start or end with a hyphen');
  });

  it('throws on consecutive hyphens', () => {
    expect(() => Slug.create('acme--co')).toThrow('Slug cannot have consecutive hyphens');
  });

  it('throws on too long (>63 chars)', () => {
    const long = 'a'.repeat(60) + 'bcde';
    expect(() => Slug.create(long)).toThrow('Slug too long');
  });

  it('fromString converts any string to a valid slug', () => {
    const s = Slug.fromString('Acme Co. / Coaching™');
    expect(s.value).toMatch(/^[a-z0-9-]+$/);
    expect(s.value).not.toContain(' ');
  });

  it('fromString trims special chars and collapses separators', () => {
    expect(Slug.fromString('  Hello World!! ').value).toBe('hello-world');
    expect(Slug.fromString('Foo & Bar').value).toBe('foo-bar');
  });

  it('fromString returns fallback for empty input', () => {
    expect(Slug.fromString('!!!').value).toBe('workspace');
  });

  it('equals by value', () => {
    expect(Slug.create('foo').equals(Slug.create('foo'))).toBe(true);
    expect(Slug.create('foo').equals(Slug.create('bar'))).toBe(false);
  });
});
