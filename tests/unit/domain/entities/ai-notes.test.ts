import { describe, it, expect } from 'vitest';
import { AINotes } from '@domain/entities/ai-notes';
import { AINoteId, CompanyId, TranscriptId } from '@domain/value-objects/branded-id';
import { ActionItem } from '@domain/value-objects/action-item';
import { StateTransitionError } from '@domain/errors/domain-error';

const noteId = AINoteId.fromString('12345678-1234-4234-8234-123456789012');
const companyId = CompanyId.fromString('22345678-1234-4234-8234-123456789012');
const transcriptId = TranscriptId.fromString('32345678-1234-4234-8234-123456789012');

describe('AINotes', () => {
  const now = '2026-01-01T00:00:00.000Z';
  const later = '2026-01-02T00:00:00.000Z';

  it('creates as pending', () => {
    const n = AINotes.createPending({ id: noteId, transcriptId, companyId, now });
    expect(n.status).toBe('pending');
    expect(n.summary).toBe('');
    expect(n.actionItems).toEqual([]);
  });

  it('markReady transitions pending → ready with content', () => {
    const n = AINotes.createPending({ id: noteId, transcriptId, companyId, now });
    const items = [ActionItem.create({ title: 'Do thing', dueDate: null })];
    n.markReady({
      summary: 'We discussed onboarding.',
      actionItems: items,
      nextSessionBrief: 'Focus on retention next.',
      model: 'claude-sonnet-4-5',
      rawResponse: '{}',
      now: later,
    });
    expect(n.status).toBe('ready');
    expect(n.summary).toBe('We discussed onboarding.');
    expect(n.actionItems).toEqual(items);
    expect(n.model).toBe('claude-sonnet-4-5');
    expect(n.updatedAt).toBe(later);
  });

  it('markReady twice throws (only pending → ready allowed)', () => {
    const n = AINotes.createPending({ id: noteId, transcriptId, companyId, now });
    n.markReady({
      summary: 'a',
      actionItems: [ActionItem.create({ title: 'x', dueDate: null })],
      nextSessionBrief: 'b',
      model: 'm',
      rawResponse: '{}',
      now: later,
    });
    expect(() =>
      n.markReady({
        summary: 'a',
        actionItems: [ActionItem.create({ title: 'x', dueDate: null })],
        nextSessionBrief: 'b',
        model: 'm',
        rawResponse: '{}',
        now: later,
      }),
    ).toThrow(StateTransitionError);
  });

  it('markFailed transitions pending → failed with error message', () => {
    const n = AINotes.createPending({ id: noteId, transcriptId, companyId, now });
    n.markFailed('API timeout', later);
    expect(n.status).toBe('failed');
    expect(n.errorMessage).toBe('API timeout');
  });

  it('markFailed on ready throws', () => {
    const n = AINotes.createPending({ id: noteId, transcriptId, companyId, now });
    n.markReady({
      summary: 'a',
      actionItems: [ActionItem.create({ title: 'x', dueDate: null })],
      nextSessionBrief: 'b',
      model: 'm',
      rawResponse: '{}',
      now: later,
    });
    expect(() => n.markFailed('err', later)).toThrow(StateTransitionError);
  });

  it('resetToPending only works on failed (retry)', () => {
    const n = AINotes.createPending({ id: noteId, transcriptId, companyId, now });
    n.markFailed('err', later);
    n.resetToPending(later);
    expect(n.status).toBe('pending');
    expect(n.errorMessage).toBeNull();
  });

  it('resetToPending on ready throws', () => {
    const n = AINotes.createPending({ id: noteId, transcriptId, companyId, now });
    n.markReady({
      summary: 'a',
      actionItems: [ActionItem.create({ title: 'x', dueDate: null })],
      nextSessionBrief: 'b',
      model: 'm',
      rawResponse: '{}',
      now: later,
    });
    expect(() => n.resetToPending(later)).toThrow(StateTransitionError);
  });

  it('isForTranscript / belongsToCompany', () => {
    const n = AINotes.createPending({ id: noteId, transcriptId, companyId, now });
    expect(n.isForTranscript(transcriptId)).toBe(true);
    expect(n.belongsToCompany(companyId)).toBe(true);
  });
});
