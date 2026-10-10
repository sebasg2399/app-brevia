import { describe, it, expect, beforeEach } from 'vitest';
import { AcceptInvitation } from '@app/use-cases/accept-invitation';
import { InviteMember } from '@app/use-cases/invite-member';
import type { CompanyRepository } from '@app/ports/company-repository';
import type { UserRepository } from '@app/ports/user-repository';
import type { MembershipRepository } from '@app/ports/membership-repository';
import type { InvitationRepository } from '@app/ports/invitation-repository';
import type { AuthGateway } from '@app/ports/auth-gateway';
import type { EmailGateway } from '@app/ports/email-gateway';
import type { TokenHasher } from '@app/ports/token-hasher';
import type { IdGenerator } from '@app/ports/id-generator';
import type { Clock } from '@app/ports/clock';
import { Company } from '@domain/entities/company';
import { Membership } from '@domain/entities/membership';
import { CompanyId, UserId } from '@domain/value-objects/branded-id';
import { Slug } from '@domain/value-objects/slug';
import {
  FakeAuthGateway,
  FakeClock,
  FakeEmailGateway,
  FakeIdGenerator,
  FakeTokenHasher,
  InMemoryCompanyRepository,
  InMemoryInvitationRepository,
  InMemoryMembershipRepository,
  InMemoryUserRepository,
} from '../__support__/fakes';

interface Harness {
  sut: AcceptInvitation;
  invitations: InMemoryInvitationRepository;
  memberships: InMemoryMembershipRepository;
  users: InMemoryUserRepository;
  auth: FakeAuthGateway;
  issueToken: (email: string) => Promise<string>;
}

async function buildHarness(): Promise<Harness> {
  const clock = new FakeClock('2026-01-01T00:00:00.000Z');
  const ids = new FakeIdGenerator();
  const companies = new InMemoryCompanyRepository();
  const memberships = new InMemoryMembershipRepository();
  const invitations = new InMemoryInvitationRepository();
  const users = new InMemoryUserRepository();
  const auth = new FakeAuthGateway();
  const tokens = new FakeTokenHasher();
  const email = new FakeEmailGateway();

  const ownerId = UserId.fromString('12345678-1234-4234-8234-123456789012');
  const companyId = CompanyId.fromString('22345678-1234-4234-8234-123456789012');

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

  const inviteMember = new InviteMember({
    companies,
    memberships,
    invitations,
    email,
    tokens,
    ids,
    clock,
  });

  const sut = new AcceptInvitation({
    auth,
    users,
    companies,
    memberships,
    invitations,
    tokens,
    ids,
    clock,
  });

  return {
    sut,
    invitations,
    memberships,
    users,
    auth,
    issueToken: async (emailAddress: string) => {
      const result = await inviteMember.execute({
        companyId,
        inviterId: ownerId,
        email: emailAddress,
        role: 'coach',
        acceptUrl: ({ token }) => `https://brevia.app/accept?token=${token}`,
      });
      const inv = await invitations.findById(result.invitationId);
      if (!inv) throw new Error('test setup failed');
      const allTokens = await (async () => {
        const tokensList: string[] = [];
        for (const t of email.sent) {
          const match = t.html.match(/token=([a-f0-9-]+)/);
          if (match) tokensList.push(match[1]!);
        }
        return tokensList;
      })();
      const last = allTokens[allTokens.length - 1];
      void inv;
      if (!last) throw new Error('no token issued in test');
      return last;
    },
  };
}

describe('AcceptInvitation', () => {
  let h: Harness;
  beforeEach(async () => {
    h = await buildHarness();
  });

  it('new user accepts invitation → user + membership created, session returned', async () => {
    const token = await h.issueToken('newcoach@x.com');
    const result = await h.sut.execute({ token, password: 'password123' });

    expect(result.session).not.toBeNull();
    const user = await h.users.findByEmail(
      (await import('@domain/value-objects/email')).Email.create('newcoach@x.com'),
    );
    expect(user).not.toBeNull();

    const memberships = await h.memberships.listByUser(result.userId);
    expect(memberships).toHaveLength(1);
    expect(memberships[0]?.isCoach()).toBe(true);
  });

  it('cannot accept with wrong token', async () => {
    await expect(
      h.sut.execute({ token: 'fake-token-12345', password: 'password123' }),
    ).rejects.toThrow();
  });

  it('cannot accept twice', async () => {
    const token = await h.issueToken('twice@x.com');
    await h.sut.execute({ token, password: 'password123' });
    await expect(h.sut.execute({ token, password: 'password123' })).rejects.toThrow(/already/i);
  });

  it('rejects weak password', async () => {
    const token = await h.issueToken('weakpw@x.com');
    await expect(h.sut.execute({ token, password: 'short' })).rejects.toThrow(/password/i);
  });

  it('cannot accept if invitation is expired', async () => {
    const token = await h.issueToken('expired@x.com');
    (h.sut as unknown as { deps: { clock: { advance: (s: number) => void } } }).deps.clock.advance(
      8 * 24 * 60 * 60,
    );
    await expect(h.sut.execute({ token, password: 'password123' })).rejects.toThrow(/expired/i);
  });

  it('invitation moves to accepted status', async () => {
    const token = await h.issueToken('stat@x.com');
    const before = await h.invitations.findByTokenHash(`h:${token}`);
    expect(before?.status).toBe('pending');

    await h.sut.execute({ token, password: 'password123' });

    const after = await h.invitations.findByTokenHash(`h:${token}`);
    expect(after?.status).toBe('accepted');
  });
});
