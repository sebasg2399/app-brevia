import { describe, it, expect, beforeEach } from 'vitest';
import { CreateCoach } from '@app/use-cases/create-coach';
import { UpdateCoachBio } from '@app/use-cases/update-coach-bio';
import { CreateClient } from '@app/use-cases/create-client';
import { DeleteClient } from '@app/use-cases/delete-client';
import { BookSession } from '@app/use-cases/book-session';
import { CompleteSession } from '@app/use-cases/complete-session';
import { CancelSession } from '@app/use-cases/cancel-session';
import { Company } from '@domain/entities/company';
import { Membership } from '@domain/entities/membership';
import { Coach } from '@domain/entities/coach';
import { Client } from '@domain/entities/client';
import {
  ClientId,
  CoachId,
  CompanyId,
  SessionId,
  UserId,
} from '@domain/value-objects/branded-id';
import { Slug } from '@domain/value-objects/slug';
import { Email } from '@domain/value-objects/email';
import { StateTransitionError } from '@domain/errors/domain-error';
import {
  FakeClock,
  FakeIdGenerator,
  InMemoryClientRepository,
  InMemoryCoachRepository,
  InMemoryCompanyRepository,
  InMemoryMembershipRepository,
  InMemorySessionRepository,
} from '../__support__/fakes';

const ownerId = UserId.fromString('12345678-1234-4234-8234-123456789012');
const coachUserId = UserId.fromString('22345678-1234-4234-8234-123456789012');
const companyId = CompanyId.fromString('32345678-1234-4234-8234-123456789012');

interface Harness {
  companies: InMemoryCompanyRepository;
  coaches: InMemoryCoachRepository;
  clients: InMemoryClientRepository;
  sessions: InMemorySessionRepository;
  memberships: InMemoryMembershipRepository;
  clock: FakeClock;
  ids: FakeIdGenerator;
  ownerId: UserId;
  companyId: CompanyId;
}

async function buildHarness(): Promise<Harness> {
  const clock = new FakeClock('2026-01-01T00:00:00.000Z');
  const ids = new FakeIdGenerator();
  const companies = new InMemoryCompanyRepository();
  const memberships = new InMemoryMembershipRepository();
  const coaches = new InMemoryCoachRepository();
  const clients = new InMemoryClientRepository();
  const sessions = new InMemorySessionRepository();

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

  return { companies, coaches, clients, sessions, memberships, clock, ids, ownerId, companyId };
}

describe('CreateCoach', () => {
  let h: Harness;
  beforeEach(async () => {
    h = await buildHarness();
  });

  it('owner creates a coach profile', async () => {
    const sut = new CreateCoach({
      companies: h.companies,
      coaches: h.coaches,
      memberships: h.memberships,
      ids: h.ids,
      clock: h.clock,
    });
    const coach = await sut.execute({
      companyId: h.companyId,
      actorId: h.ownerId,
      userId: coachUserId,
      displayName: 'Jane Coach',
      bio: 'I help people',
      focusAreas: ['career'],
      hourlyRateCents: 10000,
    });
    expect(coach.isActive).toBe(true);
    expect(coach.hourlyRateCents).toBe(10000);
  });

  it('non-owner cannot create a coach', async () => {
    const otherUser = UserId.fromString('52345678-1234-4234-8234-123456789012');
    await h.memberships.save(
      Membership.create({
        id: h.ids.newMembershipId(),
        companyId: h.companyId,
        userId: otherUser,
        role: 'client',
        now: h.clock.now(),
      }),
    );
    const sut = new CreateCoach({
      companies: h.companies,
      coaches: h.coaches,
      memberships: h.memberships,
      ids: h.ids,
      clock: h.clock,
    });
    await expect(
      sut.execute({
        companyId: h.companyId,
        actorId: otherUser,
        userId: coachUserId,
        displayName: 'X',
        bio: '',
        focusAreas: ['career'],
        hourlyRateCents: 0,
      }),
    ).rejects.toThrow(/only the workspace owner/i);
  });

  it('rejects duplicate coach profile for same user', async () => {
    const sut = new CreateCoach({
      companies: h.companies,
      coaches: h.coaches,
      memberships: h.memberships,
      ids: h.ids,
      clock: h.clock,
    });
    await sut.execute({
      companyId: h.companyId,
      actorId: h.ownerId,
      userId: coachUserId,
      displayName: 'Jane',
      bio: '',
      focusAreas: ['career'],
      hourlyRateCents: 0,
    });
    await expect(
      sut.execute({
        companyId: h.companyId,
        actorId: h.ownerId,
        userId: coachUserId,
        displayName: 'Jane2',
        bio: '',
        focusAreas: ['career'],
        hourlyRateCents: 0,
      }),
    ).rejects.toThrow(/already has a coach profile/i);
  });
});

describe('UpdateCoachBio', () => {
  let h: Harness;
  let coach: Coach;

  beforeEach(async () => {
    h = await buildHarness();
    coach = Coach.create({
      id: h.ids.newCoachId(),
      userId: coachUserId,
      companyId: h.companyId,
      displayName: 'Jane',
      bio: 'old',
      focusAreas: ['career'],
      hourlyRateCents: 0,
      now: h.clock.now(),
    });
    await h.coaches.save(coach);
  });

  it('coach can update own bio', async () => {
    const sut = new UpdateCoachBio({ coaches: h.coaches, memberships: h.memberships, clock: h.clock });
    await sut.execute({ companyId: h.companyId, actorId: coachUserId, coachId: coach.id, bio: 'new' });
    const updated = await h.coaches.findById(coach.id);
    expect(updated?.bio).toBe('new');
  });

  it('owner can update any coach bio', async () => {
    const sut = new UpdateCoachBio({ coaches: h.coaches, memberships: h.memberships, clock: h.clock });
    await sut.execute({ companyId: h.companyId, actorId: h.ownerId, coachId: coach.id, bio: 'owner edit' });
    expect((await h.coaches.findById(coach.id))?.bio).toBe('owner edit');
  });

  it('other coach cannot edit', async () => {
    const otherCoachUser = UserId.fromString('62345678-1234-4234-8234-123456789012');
    await h.memberships.save(
      Membership.create({
        id: h.ids.newMembershipId(),
        companyId: h.companyId,
        userId: otherCoachUser,
        role: 'coach',
        now: h.clock.now(),
      }),
    );
    const sut = new UpdateCoachBio({ coaches: h.coaches, memberships: h.memberships, clock: h.clock });
    await expect(
      sut.execute({ companyId: h.companyId, actorId: otherCoachUser, coachId: coach.id, bio: 'hack' }),
    ).rejects.toThrow(/Only the coach or the workspace owner/);
  });
});

describe('CreateClient', () => {
  let h: Harness;
  beforeEach(async () => {
    h = await buildHarness();
  });

  it('owner creates client', async () => {
    const sut = new CreateClient({
      companies: h.companies,
      clients: h.clients,
      memberships: h.memberships,
      ids: h.ids,
      clock: h.clock,
    });
    const c = await sut.execute({
      companyId: h.companyId,
      actorId: h.ownerId,
      name: 'Bob',
      email: 'bob@x.com',
    });
    expect(c.name).toBe('Bob');
    expect(c.email?.value).toBe('bob@x.com');
  });

  it('rejects duplicate active email', async () => {
    const sut = new CreateClient({
      companies: h.companies,
      clients: h.clients,
      memberships: h.memberships,
      ids: h.ids,
      clock: h.clock,
    });
    await sut.execute({ companyId: h.companyId, actorId: h.ownerId, name: 'Bob', email: 'bob@x.com' });
    await expect(
      sut.execute({ companyId: h.companyId, actorId: h.ownerId, name: 'Bob 2', email: 'bob@x.com' }),
    ).rejects.toThrow(/already exists/);
  });

  it('client cannot create clients', async () => {
    const clientUser = UserId.fromString('72345678-1234-4234-8234-123456789012');
    await h.memberships.save(
      Membership.create({
        id: h.ids.newMembershipId(),
        companyId: h.companyId,
        userId: clientUser,
        role: 'client',
        now: h.clock.now(),
      }),
    );
    const sut = new CreateClient({
      companies: h.companies,
      clients: h.clients,
      memberships: h.memberships,
      ids: h.ids,
      clock: h.clock,
    });
    await expect(
      sut.execute({ companyId: h.companyId, actorId: clientUser, name: 'X', email: null }),
    ).rejects.toThrow(/owners or coaches/i);
  });
});

describe('DeleteClient', () => {
  let h: Harness;
  beforeEach(async () => {
    h = await buildHarness();
  });

  it('owner soft-deletes a client', async () => {
    const client = Client.create({
      id: h.ids.newClientId(),
      companyId: h.companyId,
      name: 'Bob',
      email: Email.create('bob@x.com'),
      notes: null,
      now: h.clock.now(),
    });
    await h.clients.save(client);

    const sut = new DeleteClient({ clients: h.clients, memberships: h.memberships, clock: h.clock });
    await sut.execute({ companyId: h.companyId, actorId: h.ownerId, clientId: client.id });

    const updated = await h.clients.findById(client.id);
    expect(updated?.isDeleted()).toBe(true);

    const active = await h.clients.listByCompany(h.companyId);
    expect(active.find((c) => c.id.equals(client.id))).toBeUndefined();
  });

  it('non-owner cannot delete', async () => {
    const coachUser = UserId.fromString('82345678-1234-4234-8234-123456789012');
    await h.memberships.save(
      Membership.create({
        id: h.ids.newMembershipId(),
        companyId: h.companyId,
        userId: coachUser,
        role: 'coach',
        now: h.clock.now(),
      }),
    );
    const client = Client.create({
      id: h.ids.newClientId(),
      companyId: h.companyId,
      name: 'Bob',
      email: null,
      notes: null,
      now: h.clock.now(),
    });
    await h.clients.save(client);

    const sut = new DeleteClient({ clients: h.clients, memberships: h.memberships, clock: h.clock });
    await expect(
      sut.execute({ companyId: h.companyId, actorId: coachUser, clientId: client.id }),
    ).rejects.toThrow(/only the workspace owner/i);
  });
});

describe('BookSession', () => {
  let h: Harness;
  let coach: Coach;
  let client: Client;

  beforeEach(async () => {
    h = await buildHarness();
    coach = Coach.create({
      id: h.ids.newCoachId(),
      userId: coachUserId,
      companyId: h.companyId,
      displayName: 'Jane',
      bio: '',
      focusAreas: ['career'],
      hourlyRateCents: 0,
      now: h.clock.now(),
    });
    await h.coaches.save(coach);
    client = Client.create({
      id: h.ids.newClientId(),
      companyId: h.companyId,
      name: 'Bob',
      email: null,
      notes: null,
      now: h.clock.now(),
    });
    await h.clients.save(client);
  });

  it('owner books session for a coach', async () => {
    const sut = new BookSession({
      sessions: h.sessions,
      coaches: h.coaches,
      clients: h.clients,
      memberships: h.memberships,
      ids: h.ids,
      clock: h.clock,
    });
    const session = await sut.execute({
      companyId: h.companyId,
      actorId: h.ownerId,
      coachId: coach.id,
      clientId: client.id,
      scheduledAt: '2026-01-02T10:00:00.000Z',
      durationMinutes: 45,
    });
    expect(session.status).toBe('scheduled');
    expect(session.durationMinutes).toBe(45);
  });

  it('coach can book own session', async () => {
    const sut = new BookSession({
      sessions: h.sessions,
      coaches: h.coaches,
      clients: h.clients,
      memberships: h.memberships,
      ids: h.ids,
      clock: h.clock,
    });
    const session = await sut.execute({
      companyId: h.companyId,
      actorId: coachUserId,
      coachId: coach.id,
      clientId: client.id,
      scheduledAt: '2026-01-02T10:00:00.000Z',
      durationMinutes: 30,
    });
    expect(session.coachId.equals(coach.id)).toBe(true);
  });

  it('other coach cannot book on behalf', async () => {
    const otherCoachUser = UserId.fromString('92345678-1234-4234-8234-123456789012');
    const otherCoach = Coach.create({
      id: h.ids.newCoachId(),
      userId: otherCoachUser,
      companyId: h.companyId,
      displayName: 'Other',
      bio: '',
      focusAreas: ['career'],
      hourlyRateCents: 0,
      now: h.clock.now(),
    });
    await h.coaches.save(otherCoach);

    const sut = new BookSession({
      sessions: h.sessions,
      coaches: h.coaches,
      clients: h.clients,
      memberships: h.memberships,
      ids: h.ids,
      clock: h.clock,
    });
    await expect(
      sut.execute({
        companyId: h.companyId,
        actorId: otherCoachUser,
        coachId: coach.id,
        clientId: client.id,
        scheduledAt: '2026-01-02T10:00:00.000Z',
        durationMinutes: 30,
      }),
    ).rejects.toThrow(/Only the assigned coach or the workspace owner/);
  });

  it('rejects past scheduledAt', async () => {
    const sut = new BookSession({
      sessions: h.sessions,
      coaches: h.coaches,
      clients: h.clients,
      memberships: h.memberships,
      ids: h.ids,
      clock: h.clock,
    });
    await expect(
      sut.execute({
        companyId: h.companyId,
        actorId: h.ownerId,
        coachId: coach.id,
        clientId: client.id,
        scheduledAt: '2020-01-01T00:00:00.000Z',
        durationMinutes: 30,
      }),
    ).rejects.toThrow(/future/);
  });

  it('rejects deactivated coach', async () => {
    coach.deactivate(h.clock.now());
    await h.coaches.save(coach);
    const sut = new BookSession({
      sessions: h.sessions,
      coaches: h.coaches,
      clients: h.clients,
      memberships: h.memberships,
      ids: h.ids,
      clock: h.clock,
    });
    await expect(
      sut.execute({
        companyId: h.companyId,
        actorId: h.ownerId,
        coachId: coach.id,
        clientId: client.id,
        scheduledAt: '2026-01-02T10:00:00.000Z',
        durationMinutes: 30,
      }),
    ).rejects.toThrow(/not active/);
  });
});

describe('Session lifecycle (Complete / Cancel)', () => {
  let h: Harness;
  let coach: Coach;
  let client: Client;
  let sessionId: SessionId;

  beforeEach(async () => {
    h = await buildHarness();
    coach = Coach.create({
      id: h.ids.newCoachId(),
      userId: coachUserId,
      companyId: h.companyId,
      displayName: 'Jane',
      bio: '',
      focusAreas: ['career'],
      hourlyRateCents: 0,
      now: h.clock.now(),
    });
    await h.coaches.save(coach);
    client = Client.create({
      id: h.ids.newClientId(),
      companyId: h.companyId,
      name: 'Bob',
      email: null,
      notes: null,
      now: h.clock.now(),
    });
    await h.clients.save(client);
    sessionId = h.ids.newSessionId();
  });

  async function bookSession() {
    const sut = new BookSession({
      sessions: h.sessions,
      coaches: h.coaches,
      clients: h.clients,
      memberships: h.memberships,
      ids: h.ids,
      clock: h.clock,
    });
    await sut.execute({
      companyId: h.companyId,
      actorId: h.ownerId,
      coachId: coach.id,
      clientId: client.id,
      scheduledAt: '2026-01-02T10:00:00.000Z',
      durationMinutes: 30,
    });
    return await h.sessions.findById((await h.sessions.listByCompany(h.companyId))[0]!.id);
  }

  it('coach completes own session', async () => {
    const session = await bookSession();
    const sut = new CompleteSession({ sessions: h.sessions, coaches: h.coaches, memberships: h.memberships, clock: h.clock });
    await sut.execute({ companyId: h.companyId, actorId: coachUserId, sessionId: session!.id });
    const updated = await h.sessions.findById(session!.id);
    expect(updated?.status).toBe('completed');
  });

  it('owner can complete any session', async () => {
    const session = await bookSession();
    const sut = new CompleteSession({ sessions: h.sessions, coaches: h.coaches, memberships: h.memberships, clock: h.clock });
    await sut.execute({ companyId: h.companyId, actorId: h.ownerId, sessionId: session!.id });
    expect((await h.sessions.findById(session!.id))?.status).toBe('completed');
  });

  it('cancel before scheduledAt works', async () => {
    const session = await bookSession();
    const sut = new CancelSession({ sessions: h.sessions, coaches: h.coaches, memberships: h.memberships, clock: h.clock });
    await sut.execute({ companyId: h.companyId, actorId: coachUserId, sessionId: session!.id });
    expect((await h.sessions.findById(session!.id))?.status).toBe('canceled');
  });

  it('cancel after scheduledAt throws', async () => {
    const session = await bookSession();
    h.clock.advance(48 * 60 * 60); // 48h
    const sut = new CancelSession({ sessions: h.sessions, coaches: h.coaches, memberships: h.memberships, clock: h.clock });
    await expect(
      sut.execute({ companyId: h.companyId, actorId: coachUserId, sessionId: session!.id }),
    ).rejects.toThrow(/already started/);
  });

  it('completing twice throws', async () => {
    const session = await bookSession();
    const sut = new CompleteSession({ sessions: h.sessions, coaches: h.coaches, memberships: h.memberships, clock: h.clock });
    await sut.execute({ companyId: h.companyId, actorId: coachUserId, sessionId: session!.id });
    await expect(
      sut.execute({ companyId: h.companyId, actorId: coachUserId, sessionId: session!.id }),
    ).rejects.toThrow(StateTransitionError);
  });

  void sessionId; // suppress unused
});