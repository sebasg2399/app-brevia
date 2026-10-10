import { describe, it, expect } from 'vitest';
import { Session } from '@domain/entities/session';
import { ClientId, CoachId, CompanyId, SessionId } from '@domain/value-objects/branded-id';
import { StateTransitionError, ValidationError } from '@domain/errors/domain-error';

const sessionId = SessionId.fromString('12345678-1234-4234-8234-123456789012');
const companyId = CompanyId.fromString('22345678-1234-4234-8234-123456789012');
const coachId = CoachId.fromString('32345678-1234-4234-8234-123456789012');
const clientId = ClientId.fromString('42345678-1234-4234-8234-123456789012');

describe('Session', () => {
  const now = '2026-01-01T00:00:00.000Z';
  const future = '2026-01-02T10:00:00.000Z';

  it('creates with future scheduledAt', () => {
    const s = Session.create({
      id: sessionId,
      companyId,
      coachId,
      clientId,
      scheduledAt: future,
      durationMinutes: 45,
      now,
    });
    expect(s.status).toBe('scheduled');
    expect(s.completedAt).toBeNull();
    expect(s.canceledAt).toBeNull();
  });

  it('throws on past scheduledAt', () => {
    expect(() =>
      Session.create({
        id: sessionId,
        companyId,
        coachId,
        clientId,
        scheduledAt: '2020-01-01T00:00:00.000Z',
        durationMinutes: 30,
        now,
      }),
    ).toThrow(/future/);
  });

  it('throws on invalid duration', () => {
    expect(() =>
      Session.create({
        id: sessionId,
        companyId,
        coachId,
        clientId,
        scheduledAt: future,
        durationMinutes: 20,
        now,
      }),
    ).toThrow(/Duration/);
  });

  it('accepts all valid durations', () => {
    let n = 0;
    for (const d of [15, 30, 45, 60, 90]) {
      n++;
      const idStr = `${n.toString().padStart(8, '0')}-1234-4234-8234-123456789012`.slice(0, 36);
      const s = Session.create({
        id: SessionId.fromString(idStr),
        companyId,
        coachId,
        clientId,
        scheduledAt: future,
        durationMinutes: d,
        now,
      });
      expect(s.durationMinutes).toBe(d);
    }
  });

  it('markCompleted transitions scheduled → completed', () => {
    const s = Session.create({
      id: sessionId,
      companyId,
      coachId,
      clientId,
      scheduledAt: future,
      durationMinutes: 30,
      now,
    });
    s.markCompleted(future);
    expect(s.status).toBe('completed');
    expect(s.completedAt).toBe(future);
  });

  it('markCompleted on non-scheduled throws', () => {
    const s = Session.create({
      id: sessionId,
      companyId,
      coachId,
      clientId,
      scheduledAt: future,
      durationMinutes: 30,
      now,
    });
    s.markCompleted(future);
    expect(() => s.markCompleted(future)).toThrow(StateTransitionError);
  });

  it('cancel before scheduledAt works', () => {
    const s = Session.create({
      id: sessionId,
      companyId,
      coachId,
      clientId,
      scheduledAt: future,
      durationMinutes: 30,
      now,
    });
    s.cancel(now);
    expect(s.status).toBe('canceled');
    expect(s.canceledAt).toBe(now);
  });

  it('cancel after scheduledAt throws (state transition error)', () => {
    const s = Session.create({
      id: sessionId,
      companyId,
      coachId,
      clientId,
      scheduledAt: future,
      durationMinutes: 30,
      now,
    });
    const afterStart = '2026-01-02T11:00:00.000Z';
    expect(() => s.cancel(afterStart)).toThrow(/already started/);
  });

  it('cancel on completed throws', () => {
    const s = Session.create({
      id: sessionId,
      companyId,
      coachId,
      clientId,
      scheduledAt: future,
      durationMinutes: 30,
      now,
    });
    s.markCompleted(future);
    expect(() => s.cancel(now)).toThrow(StateTransitionError);
  });

  it('archive transitions completed/canceled → archived', () => {
    const s = Session.create({
      id: sessionId,
      companyId,
      coachId,
      clientId,
      scheduledAt: future,
      durationMinutes: 30,
      now,
    });
    s.markCompleted(future);
    s.archive(future);
    expect(s.status).toBe('archived');
  });

  it('archive on scheduled throws', () => {
    const s = Session.create({
      id: sessionId,
      companyId,
      coachId,
      clientId,
      scheduledAt: future,
      durationMinutes: 30,
      now,
    });
    expect(() => s.archive(now)).toThrow(StateTransitionError);
  });

  it('isForClient', () => {
    const s = Session.create({
      id: sessionId,
      companyId,
      coachId,
      clientId,
      scheduledAt: future,
      durationMinutes: 30,
      now,
    });
    expect(s.isForClient(clientId)).toBe(true);
    const other = ClientId.fromString('52345678-1234-4234-8234-123456789012');
    expect(s.isForClient(other)).toBe(false);
  });

  it('belongsToCompany', () => {
    const s = Session.create({
      id: sessionId,
      companyId,
      coachId,
      clientId,
      scheduledAt: future,
      durationMinutes: 30,
      now,
    });
    expect(s.belongsToCompany(companyId)).toBe(true);
  });
});