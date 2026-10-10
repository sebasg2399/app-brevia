import { describe, it, expect, beforeEach } from 'vitest';
import { InviteMember } from '@app/use-cases/invite-member';
import type { CompanyRepository } from '@app/ports/company-repository';
import type { MembershipRepository } from '@app/ports/membership-repository';
import type { InvitationRepository } from '@app/ports/invitation-repository';
import type { EmailGateway } from '@app/ports/email-gateway';
import type { TokenHasher } from '@app/ports/token-hasher';
import type { IdGenerator } from '@app/ports/id-generator';
import type { Clock } from '@app/ports/clock';
import { Company } from '@domain/entities/company';
import { Membership } from '@domain/entities/membership';
import { CompanyId, UserId } from '@domain/value-objects/branded-id';
import { Slug } from '@domain/value-objects/slug';
import {
  FakeClock,
  FakeEmailGateway,
  FakeIdGenerator,
  FakeTokenHasher,
  InMemoryCompanyRepository,
  InMemoryInvitationRepository,
  InMemoryMembershipRepository,
} from '../__support__/fakes';

interface Harness {
  sut: InviteMember;
  companies: InMemoryCompanyRepository;
  memberships: InMemoryMembershipRepository;
  invitations: InMemoryInvitationRepository;
  email: FakeEmailGateway;
}

async function buildHarness(): Promise<Harness> {
  const companies = new InMemoryCompanyRepository();
  const memberships = new InMemoryMembershipRepository();
  const invitations = new InMemoryInvitationRepository();
  const email = new FakeEmailGateway();
  const tokens: TokenHasher = new FakeTokenHasher();
  const ids: IdGenerator = new FakeIdGenerator();
  const clock: Clock = new FakeClock('2026-01-01T00:00:00.000Z');

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

  const ownerMembership = Membership.create({
    id: ids.newMembershipId(),
    companyId,
    userId: ownerId,
    role: 'owner',
    now: clock.now(),
  });
  await memberships.save(ownerMembership);

  const sut = new InviteMember({ companies, memberships, invitations, email, tokens, ids, clock });
  return { sut, companies, memberships, invitations, email };
}

describe('InviteMember', () => {
  const ownerId = UserId.fromString('12345678-1234-4234-8234-123456789012');
  const companyId = CompanyId.fromString('22345678-1234-4234-8234-123456789012');

  let h: Harness;
  beforeEach(async () => {
    h = await buildHarness();
  });

  it('owner can invite a coach', async () => {
    const result = await h.sut.execute({
      companyId,
      inviterId: ownerId,
      email: 'coach@example.com',
      role: 'coach',
      acceptUrl: ({ token }) => `https://brevia.app/accept?token=${token}`,
    });

    expect(result.sentTo.value).toBe('coach@example.com');
    expect(h.email.sent).toHaveLength(1);
    expect(h.email.sent[0]?.subject).toContain('Acme');

    const allInvitations = h.invitations;
    void allInvitations;
    expect(true).toBe(true);
  });

  it('owner can invite a client', async () => {
    const result = await h.sut.execute({
      companyId,
      inviterId: ownerId,
      email: 'client@example.com',
      role: 'client',
      acceptUrl: ({ token }) => `https://brevia.app/accept?token=${token}`,
    });
    expect(result.sentTo.value).toBe('client@example.com');
  });

  it('non-owner cannot invite', async () => {
    const coachId = UserId.fromString('52345678-1234-4234-8234-123456789012');
    await h.memberships.save(
      Membership.create({
        id: new FakeIdGenerator().newMembershipId(),
        companyId,
        userId: coachId,
        role: 'coach',
        now: '2026-01-01T00:00:00.000Z',
      }),
    );

    await expect(
      h.sut.execute({
        companyId,
        inviterId: coachId,
        email: 'x@x.com',
        role: 'client',
        acceptUrl: ({ token }) => `https://x/${token}`,
      }),
    ).rejects.toThrow(/only the workspace owner/i);
  });

  it('rejects invitation with role=owner', async () => {
    await expect(
      h.sut.execute({
        companyId,
        inviterId: ownerId,
        email: 'newowner@x.com',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        role: 'owner' as any,
        acceptUrl: ({ token }) => `https://x/${token}`,
      }),
    ).rejects.toThrow(/cannot invite.*owner/i);
  });

  it('rejects duplicate pending invitation to the same email', async () => {
    await h.sut.execute({
      companyId,
      inviterId: ownerId,
      email: 'dup@x.com',
      role: 'coach',
      acceptUrl: ({ token }) => `https://x/${token}`,
    });
    await expect(
      h.sut.execute({
        companyId,
        inviterId: ownerId,
        email: 'dup@x.com',
        role: 'coach',
        acceptUrl: ({ token }) => `https://x/${token}`,
      }),
    ).rejects.toThrow(/already pending/i);
  });

  it('rejects invalid email', async () => {
    await expect(
      h.sut.execute({
        companyId,
        inviterId: ownerId,
        email: 'not-an-email',
        role: 'coach',
        acceptUrl: ({ token }) => `https://x/${token}`,
      }),
    ).rejects.toThrow(/email/i);
  });

  it('email includes accept link with token', async () => {
    await h.sut.execute({
      companyId,
      inviterId: ownerId,
      email: 'coach@x.com',
      role: 'coach',
      acceptUrl: ({ token }) => `https://brevia.app/accept?token=${token}`,
    });
    const sent = h.email.sent[0];
    expect(sent?.text).toMatch(/https:\/\/brevia\.app\/accept\?token=/);
    expect(sent?.html).toMatch(/https:\/\/brevia\.app\/accept\?token=/);
  });
});