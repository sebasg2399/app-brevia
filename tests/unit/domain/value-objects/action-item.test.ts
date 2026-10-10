import { describe, it, expect } from 'vitest';
import { ActionItem, countWords, assertActionItemsShape, MAX_SUMMARY_WORDS, MAX_BRIEF_WORDS } from '@domain/value-objects/action-item';
import { ValidationError } from '@domain/errors/domain-error';

describe('ActionItem', () => {
  it('creates with title only', () => {
    const a = ActionItem.create({ title: 'Send follow-up', dueDate: null });
    expect(a.title).toBe('Send follow-up');
    expect(a.dueDate).toBeNull();
  });

  it('trims title', () => {
    const a = ActionItem.create({ title: '  Do thing  ', dueDate: null });
    expect(a.title).toBe('Do thing');
  });

  it('throws on empty title', () => {
    expect(() => ActionItem.create({ title: '   ', dueDate: null })).toThrow(ValidationError);
  });

  it('throws on title > 200 chars', () => {
    expect(() => ActionItem.create({ title: 'a'.repeat(201), dueDate: null })).toThrow(ValidationError);
  });

  it('normalizes dueDate to ISO', () => {
    const a = ActionItem.create({ title: 'X', dueDate: '2026-12-31' });
    expect(a.dueDate).toBe('2026-12-31T00:00:00.000Z');
  });

  it('throws on invalid dueDate', () => {
    expect(() => ActionItem.create({ title: 'X', dueDate: 'not-a-date' })).toThrow(ValidationError);
  });

  it('fromJSON parses valid object', () => {
    const a = ActionItem.fromJSON({ title: 'X', dueDate: null });
    expect(a.title).toBe('X');
  });

  it('fromJSON rejects non-objects', () => {
    expect(() => ActionItem.fromJSON('x')).toThrow(ValidationError);
    expect(() => ActionItem.fromJSON(null)).toThrow(ValidationError);
  });
});

describe('countWords', () => {
  it('counts simple words', () => {
    expect(countWords('hello world')).toBe(2);
  });

  it('returns 0 for empty', () => {
    expect(countWords('   ')).toBe(0);
  });

  it('handles extra whitespace', () => {
    expect(countWords('a   b   c')).toBe(3);
  });
});

describe('assertActionItemsShape', () => {
  it('accepts 1-7 valid items', () => {
    const items = assertActionItemsShape([{ title: 'A', dueDate: null }]);
    expect(items).toHaveLength(1);
  });

  it('rejects empty array', () => {
    expect(() => assertActionItemsShape([])).toThrow(ValidationError);
  });

  it('rejects > 7 items', () => {
    const items = Array.from({ length: 8 }, (_, i) => ({ title: `Item ${i}`, dueDate: null }));
    expect(() => assertActionItemsShape(items)).toThrow(ValidationError);
  });

  it('rejects non-array', () => {
    expect(() => assertActionItemsShape({})).toThrow(ValidationError);
  });

  it('rejects item with empty title', () => {
    expect(() => assertActionItemsShape([{ title: '', dueDate: null }])).toThrow(ValidationError);
  });
});

describe('word limits', () => {
  it('MAX_SUMMARY_WORDS is 500', () => {
    expect(MAX_SUMMARY_WORDS).toBe(500);
  });
  it('MAX_BRIEF_WORDS is 300', () => {
    expect(MAX_BRIEF_WORDS).toBe(300);
  });
});