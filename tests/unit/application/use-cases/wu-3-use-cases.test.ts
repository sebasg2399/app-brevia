import { describe, it, expect, beforeEach } from 'vitest';
import { CreateTranscript } from '@app/use-cases/create-transcript';
import { RetryNotes } from '@app/use-cases/retry-notes';
import { GetQuotaUsage } from '@app/use-cases/get-quota-usage';
import { Company } from '@domain/entities/company';
import { Membership } from '@domain/entities/membership';
import { Subscription } from '@domain/entities/subscription';
import { Coach } from '@domain/entities/coach';
import { Client } from '@domain/entities/client';
import { Session } from '@domain/entities/session';
import { Transcript } from '@domain/entities/transcript';
import { AINotes } from '@domain/entities/ai-notes';
import { Plan } from '@domain/value-objects/plan';
import { Email } from '@domain/value-objects/email';
import {
  ClientId,
  CoachId,
  CompanyId,
  SessionId,
  UserId,
} from '@domain/value-objects/branded-id';
import { Slug } from '@domain/value-objects/slug';
import {
  QuotaExceededError,
  StateTransitionError,
} from '@domain/errors/domain-error';
import {
  FakeAIGateway,
  FakeClock,
  FakeIdGenerator,
  InMemoryAINotesRepository,
  InMemoryClientRepository,
  InMemoryCoachRepository,
  InMemoryCompanyRepository,
  InMemoryMembershipRepository,
  InMemorySessionRepository,
  InMemorySubscriptionRepository,
  InMemoryTranscriptRepository,
  InMemoryUserRepository,
} from '../__support__/fakes';

const ownerId = UserId.fromString('12345678-1234-4234-8234-123456789012');
const coachUserId = UserId.fromString('22345678-1234-4234-8234-123456789012');
const companyId = CompanyId.fromString('32345678-1234-4234-8234-123456789012');

interface Harness {
  companies: InMemoryCompanyRepository;
  coaches: InMemoryCoachRepository;
  clients: InMemoryClientRepository;
  sessions: InMemorySessionRepository;
  transcripts: InMemoryTranscriptRepository;
  notes: InMemoryAINotesRepository;
  subscriptions: InMemorySubscriptionRepository;
  memberships: InMemoryMembershipRepository;
  users: InMemoryUserRepository;
  ai: FakeAIGateway;
  clock: FakeClock;
  ids: FakeIdGenerator;
}

async function buildHarness(): Promise<Harness> {
  const clock = new FakeClock('2026-01-15T10:00:00.000Z');
  const ids = new FakeIdGenerator();
  const companies = new InMemoryCompanyRepository();
  const users = new InMemoryUserRepository();
  const memberships = new InMemoryMembershipRepository();
  const coaches = new InMemoryCoachRepository();
  const clients = new InMemoryClientRepository();
  const sessions = new InMemorySessionRepository();
  const transcripts = new InMemoryTranscriptRepository();
  const notes = new InMemoryAINotesRepository();
  const subscriptions = new InMemorySubscriptionRepository();
  const ai = new FakeAIGateway();

  const company = Company.create({
    id: companyId,
    name: 'Acme',
    slug: Slug.create('acme'),
    ownerId,
    now: clock.now(),
  });
  await companies.save(company);
  await memberships.save(
    Membership.create({
      id: ids.newMembershipId(),
      companyId,
      userId: ownerId,
      role: 'owner',
      now: clock.now(),
    }),
  );
  const sub = Subscription.create({ companyId, plan: Plan.free(), now: clock.now() });
  await subscriptions.save(sub);

  return {
    companies,
    coaches,
    clients,
    sessions,
    transcripts,
    notes,
    subscriptions,
    memberships,
    users,
    ai,
    clock,
    ids,
  };
}

async function setupCompletedSession(h: Harness): Promise<{
  coach: ReturnType<typeof Coach.create>;
  client: ReturnType<typeof Client.create>;
  session: ReturnType<typeof Session.create>;
}> {
  const coach = Coach.create({
    id: h.ids.newCoachId(),
    userId: coachUserId,
    companyId,
    displayName: 'Jane',
    bio: '',
    focusAreas: ['career'],
    hourlyRateCents: 0,
    now: h.clock.now(),
  });
  await h.coaches.save(coach);
  const client = Client.create({
    id: h.ids.newClientId(),
    companyId,
    name: 'Bob',
    email: Email.create('bob@x.com'),
    notes: null,
    now: h.clock.now(),
  });
  await h.clients.save(client);
  const session = Session.create({
    id: h.ids.newSessionId(),
    companyId,
    coachId: coach.id,
    clientId: client.id,
    scheduledAt: '2026-01-16T10:00:00.000Z',
    durationMinutes: 30,
    now: h.clock.now(),
  });
  await h.sessions.save(session);
  session.markCompleted(h.clock.now());
  await h.sessions.save(session);
  return { coach, client, session };
}

describe('CreateTranscript', () => {
  let h: Harness;
  beforeEach(async () => {
    h = await buildHarness();
  });

  it('coach creates a transcript → AI notes are ready', async () => {
    const { session, coach } = await setupCompletedSession(h);
    const sut = new CreateTranscript({
      sessions: h.sessions,
      coaches: h.coaches,
      transcripts: h.transcripts,
      notes: h.notes,
      subscriptions: h.subscriptions,
      memberships: h.memberships,
      ai: h.ai,
      ids: h.ids,
      clock: h.clock,
    });
    const text = 'a'.repeat(250) + ' Coach discussed career goals with the client.';
    const result = await sut.execute({
      companyId,
      actorId: coach.userId,
      sessionId: session.id,
      text,
    });
    expect(result.notesStatus).toBe('ready');
    expect(result.summary).toBeDefined();
    expect(h.ai.callCount).toBe(1);
  });

  it('owner can create transcript for any session', async () => {
    const { session } = await setupCompletedSession(h);
    const sut = new CreateTranscript({
      sessions: h.sessions,
      coaches: h.coaches,
      transcripts: h.transcripts,
      notes: h.notes,
      subscriptions: h.subscriptions,
      memberships: h.memberships,
      ai: h.ai,
      ids: h.ids,
      clock: h.clock,
    });
    const text = 'a'.repeat(250);
    const result = await sut.execute({
      companyId,
      actorId: ownerId,
      sessionId: session.id,
      text,
    });
    expect(result.notesStatus).toBe('ready');
  });

  it('rejects transcript for non-completed session', async () => {
    const { session } = await setupCompletedSession(h);
    // mark session back to scheduled
    const fresh = await h.sessions.findById(session.id);
    expect(fresh).not.toBeNull();
    // create a new scheduled session
    const newSession = Session.create({
      id: h.ids.newSessionId(),
      companyId,
      coachId: session.coachId,
      clientId: session.clientId,
      scheduledAt: '2026-01-20T10:00:00.000Z',
      durationMinutes: 30,
      now: h.clock.now(),
    });
    await h.sessions.save(newSession);

    const sut = new CreateTranscript({
      sessions: h.sessions,
      coaches: h.coaches,
      transcripts: h.transcripts,
      notes: h.notes,
      subscriptions: h.subscriptions,
      memberships: h.memberships,
      ai: h.ai,
      ids: h.ids,
      clock: h.clock,
    });
    await expect(
      sut.execute({ companyId, actorId: ownerId, sessionId: newSession.id, text: 'a'.repeat(250) }),
    ).rejects.toThrow(StateTransitionError);
  });

  it('rejects text < 200 chars', async () => {
    const { session } = await setupCompletedSession(h);
    const sut = new CreateTranscript({
      sessions: h.sessions,
      coaches: h.coaches,
      transcripts: h.transcripts,
      notes: h.notes,
      subscriptions: h.subscriptions,
      memberships: h.memberships,
      ai: h.ai,
      ids: h.ids,
      clock: h.clock,
    });
    await expect(
      sut.execute({ companyId, actorId: ownerId, sessionId: session.id, text: 'short' }),
    ).rejects.toThrow(/min 200/);
  });

  it('rejects when quota is exceeded and does NOT call AI', async () => {
    const { session } = await setupCompletedSession(h);
    // Bump subscription to a plan with quota 1, then pre-create 1 ready note
    const sub = Subscription.create({
      companyId,
      plan: Plan.fromName('pro') /* 50 */,
      now: h.clock.now(),
    });
    await h.subscriptions.save(sub);
    // pre-fill quota count: insert 50 ready notes
    for (let i = 0; i < 50; i++) {
      const n = AINotes.createPending({
        id: h.ids.newAINoteId(),
        transcriptId: Transcript.create({
          id: h.ids.newTranscriptId(),
          companyId,
          sessionId: h.ids.newSessionId(),
          text: 'a'.repeat(250),
          now: h.clock.now(),
        }).id,
        companyId,
        now: h.clock.now(),
      });
      n.markReady({
        summary: 'a',
        actionItems: [{ title: 'x', dueDate: null }],
        nextSessionBrief: 'b',
        model: 'm',
        rawResponse: '{}',
        now: h.clock.now(),
      });
      await h.notes.save(n);
    }

    const sut = new CreateTranscript({
      sessions: h.sessions,
      coaches: h.coaches,
      transcripts: h.transcripts,
      notes: h.notes,
      subscriptions: h.subscriptions,
      memberships: h.memberships,
      ai: h.ai,
      ids: h.ids,
      clock: h.clock,
    });
    await expect(
      sut.execute({ companyId, actorId: ownerId, sessionId: session.id, text: 'a'.repeat(250) }),
    ).rejects.toThrow(QuotaExceededError);
    expect(h.ai.callCount).toBe(0);
  });

  it('rejects duplicate transcript on same session', async () => {
    const { session } = await setupCompletedSession(h);
    const t = Transcript.create({
      id: h.ids.newTranscriptId(),
      companyId,
      sessionId: session.id,
      text: 'a'.repeat(250),
      now: h.clock.now(),
    });
    await h.transcripts.save(t);

    const sut = new CreateTranscript({
      sessions: h.sessions,
      coaches: h.coaches,
      transcripts: h.transcripts,
      notes: h.notes,
      subscriptions: h.subscriptions,
      memberships: h.memberships,
      ai: h.ai,
      ids: h.ids,
      clock: h.clock,
    });
    await expect(
      sut.execute({ companyId, actorId: ownerId, sessionId: session.id, text: 'a'.repeat(250) }),
    ).rejects.toThrow(/already exists/);
  });

  it('rejects when subscription is past_due (no AI)', async () => {
    const { session } = await setupCompletedSession(h);
    const sub = await h.subscriptions.findByCompanyId(companyId);
    sub!.updateStatus('past_due', h.clock.now());
    await h.subscriptions.save(sub!);

    const sut = new CreateTranscript({
      sessions: h.sessions,
      coaches: h.coaches,
      transcripts: h.transcripts,
      notes: h.notes,
      subscriptions: h.subscriptions,
      memberships: h.memberships,
      ai: h.ai,
      ids: h.ids,
      clock: h.clock,
    });
    await expect(
      sut.execute({ companyId, actorId: ownerId, sessionId: session.id, text: 'a'.repeat(250) }),
    ).rejects.toThrow(/subscription is past_due/);
  });

  it('AI failure (after retries) marks notes as failed', async () => {
    const { session } = await setupCompletedSession(h);
    h.ai.failNTimes = 10; // fail every attempt
    const sut = new CreateTranscript({
      sessions: h.sessions,
      coaches: h.coaches,
      transcripts: h.transcripts,
      notes: h.notes,
      subscriptions: h.subscriptions,
      memberships: h.memberships,
      ai: h.ai,
      ids: h.ids,
      clock: h.clock,
    });
    const result = await sut.execute({
      companyId,
      actorId: ownerId,
      sessionId: session.id,
      text: 'a'.repeat(250),
    });
    expect(result.notesStatus).toBe('failed');
    expect(h.ai.callCount).toBeGreaterThanOrEqual(3); // 1 + 2 retries
  });
});

describe('RetryNotes', () => {
  let h: Harness;
  beforeEach(async () => {
    h = await buildHarness();
  });

  it('resets failed notes to pending', async () => {
    const { session } = await setupCompletedSession(h);
    const transcript = Transcript.create({
      id: h.ids.newTranscriptId(),
      companyId,
      sessionId: session.id,
      text: 'a'.repeat(250),
      now: h.clock.now(),
    });
    await h.transcripts.save(transcript);
    const notes = AINotes.createPending({
      id: h.ids.newAINoteId(),
      transcriptId: transcript.id,
      companyId,
      now: h.clock.now(),
    });
    notes.markFailed('boom', h.clock.now());
    await h.notes.save(notes);

    const sut = new RetryNotes({
      notes: h.notes,
      subscriptions: h.subscriptions,
      memberships: h.memberships,
      ai: h.ai,
      clock: h.clock,
    });
    const out = await sut.execute({ companyId, actorId: ownerId, notesId: notes.id });
    expect(out.status).toBe('pending');
    expect(out.errorMessage).toBeNull();
  });

  it('rejects retry on non-failed notes', async () => {
    const { session } = await setupCompletedSession(h);
    const transcript = Transcript.create({
      id: h.ids.newTranscriptId(),
      companyId,
      sessionId: session.id,
      text: 'a'.repeat(250),
      now: h.clock.now(),
    });
    await h.transcripts.save(transcript);
    const notes = AINotes.createPending({
      id: h.ids.newAINoteId(),
      transcriptId: transcript.id,
      companyId,
      now: h.clock.now(),
    });
    notes.markReady({
      summary: 'a',
      actionItems: [{ title: 'x', dueDate: null }],
      nextSessionBrief: 'b',
      model: 'm',
      rawResponse: '{}',
      now: h.clock.now(),
    });
    await h.notes.save(notes);

    const sut = new RetryNotes({
      notes: h.notes,
      subscriptions: h.subscriptions,
      memberships: h.memberships,
      ai: h.ai,
      clock: h.clock,
    });
    await expect(
      sut.execute({ companyId, actorId: ownerId, notesId: notes.id }),
    ).rejects.toThrow(/Only failed/);
  });

  it('rejects when quota would be exceeded on retry', async () => {
    const { session } = await setupCompletedSession(h);
    const transcript = Transcript.create({
      id: h.ids.newTranscriptId(),
      companyId,
      sessionId: session.id,
      text: 'a'.repeat(250),
      now: h.clock.now(),
    });
    await h.transcripts.save(transcript);
    const notes = AINotes.createPending({
      id: h.ids.newAINoteId(),
      transcriptId: transcript.id,
      companyId,
      now: h.clock.now(),
    });
    notes.markFailed('boom', h.clock.now());
    await h.notes.save(notes);

    // Pre-fill quota to the free-plan limit
    for (let i = 0; i < 5; i++) {
      const n = AINotes.createPending({
        id: h.ids.newAINoteId(),
        transcriptId: h.ids.newTranscriptId(),
        companyId,
        now: h.clock.now(),
      });
      n.markReady({
        summary: 'a',
        actionItems: [{ title: 'x', dueDate: null }],
        nextSessionBrief: 'b',
        model: 'm',
        rawResponse: '{}',
        now: h.clock.now(),
      });
      await h.notes.save(n);
    }

    const sut = new RetryNotes({
      notes: h.notes,
      subscriptions: h.subscriptions,
      memberships: h.memberships,
      ai: h.ai,
      clock: h.clock,
    });
    await expect(
      sut.execute({ companyId, actorId: ownerId, notesId: notes.id }),
    ).rejects.toThrow(QuotaExceededError);
  });
});

describe('GetQuotaUsage', () => {
  let h: Harness;
  beforeEach(async () => {
    h = await buildHarness();
  });

  it('returns plan limits and usage', async () => {
    const sut = new GetQuotaUsage({
      subscriptions: h.subscriptions,
      notes: h.notes,
      clock: h.clock,
    });
    const status = await sut.execute({ companyId });
    expect(status.plan).toBe('free');
    expect(status.monthlyLimit).toBe(5);
    expect(status.usedThisMonth).toBe(0);
    expect(status.remaining).toBe(5);
  });
});

// suppress unused
void ClientId;
void CoachId;
void SessionId;