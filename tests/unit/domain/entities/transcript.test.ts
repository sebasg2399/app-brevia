import { describe, it, expect } from 'vitest';
import { Transcript } from '@domain/entities/transcript';
import { CompanyId, SessionId, TranscriptId } from '@domain/value-objects/branded-id';
import { ImmutableResourceError, ValidationError } from '@domain/errors/domain-error';

const transcriptId = TranscriptId.fromString('12345678-1234-4234-8234-123456789012');
const companyId = CompanyId.fromString('22345678-1234-4234-8234-123456789012');
const sessionId = SessionId.fromString('32345678-1234-4234-8234-123456789012');

describe('Transcript', () => {
  const now = '2026-01-01T00:00:00.000Z';

  it('creates with valid text', () => {
    const t = Transcript.create({
      id: transcriptId,
      companyId,
      sessionId,
      text: 'a'.repeat(200),
      now,
    });
    expect(t.text).toHaveLength(200);
  });

  it('throws on text < 200 chars', () => {
    expect(() =>
      Transcript.create({
        id: transcriptId,
        companyId,
        sessionId,
        text: 'short',
        now,
      }),
    ).toThrow(/min 200/);
  });

  it('throws on text > 50000 chars', () => {
    expect(() =>
      Transcript.create({
        id: transcriptId,
        companyId,
        sessionId,
        text: 'a'.repeat(50001),
        now,
      }),
    ).toThrow(/max 50000/);
  });

  it('rejects 50 chars (under min)', () => {
    expect(() =>
      Transcript.create({
        id: transcriptId,
        companyId,
        sessionId,
        text: 'a'.repeat(50),
        now,
      }),
    ).toThrow(ValidationError);
  });

  it('is immutable: updateText throws', () => {
    const t = Transcript.create({
      id: transcriptId,
      companyId,
      sessionId,
      text: 'a'.repeat(200),
      now,
    });
    expect(() => t.updateText()).toThrow(ImmutableResourceError);
  });

  it('isForSession / belongsToCompany', () => {
    const t = Transcript.create({
      id: transcriptId,
      companyId,
      sessionId,
      text: 'a'.repeat(200),
      now,
    });
    expect(t.isForSession(sessionId)).toBe(true);
    expect(t.belongsToCompany(companyId)).toBe(true);
  });
});