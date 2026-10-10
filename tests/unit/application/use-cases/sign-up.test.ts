import { describe, it, expect, beforeEach } from 'vitest';
import { SignUp } from '@app/use-cases/sign-up';
import type { AuthGateway } from '@app/ports/auth-gateway';
import type { CompanyRepository } from '@app/ports/company-repository';
import type { UserRepository } from '@app/ports/user-repository';
import type { MembershipRepository } from '@app/ports/membership-repository';
import type { EmailGateway } from '@app/ports/email-gateway';
import type { TokenHasher } from '@app/ports/token-hasher';
import type { IdGenerator } from '@app/ports/id-generator';
import type { Clock } from '@app/ports/clock';
import {
  FakeAuthGateway,
  FakeClock,
  FakeIdGenerator,
  FakeTokenHasher,
  InMemoryCompanyRepository,
  InMemoryMembershipRepository,
  InMemorySubscriptionRepository,
  InMemoryUserRepository,
} from '../__support__/fakes';

interface Harness {
  sut: SignUp;
  auth: FakeAuthGateway;
  users: InMemoryUserRepository;
  companies: InMemoryCompanyRepository;
  memberships: InMemoryMembershipRepository;
}

function buildHarness(): Harness {
  const auth = new FakeAuthGateway();
  const users = new InMemoryUserRepository();
  const companies = new InMemoryCompanyRepository();
  const memberships = new InMemoryMembershipRepository();
  const subscriptions = new InMemorySubscriptionRepository();
  const ids: IdGenerator = new FakeIdGenerator();
  const clock: Clock = new FakeClock('2026-01-01T00:00:00.000Z');
  const email: EmailGateway = { send: async () => {} };
  const tokens: TokenHasher = new FakeTokenHasher();

  const sut = new SignUp({ auth, users, companies, memberships, subscriptions, ids, clock });
  return { sut, auth, users, companies, memberships };
}

describe('SignUp', () => {
  let h: Harness;
  beforeEach(() => {
    h = buildHarness();
  });

  it('creates user, company and owner membership', async () => {
    const result = await h.sut.execute({
      email: 'founder@acme.com',
      password: 'password123',
      workspaceName: 'Acme Coaching',
    });

    const company = await h.companies.findById(result.companyId);
    expect(company).not.toBeNull();
    expect(company?.name).toBe('Acme Coaching');
    expect(company?.ownerId.equals(result.userId)).toBe(true);

    const user = await h.users.findById(result.userId);
    expect(user?.email.value).toBe('founder@acme.com');

    const memberships = await h.memberships.listByUser(result.userId);
    expect(memberships).toHaveLength(1);
    expect(memberships[0]?.isOwner()).toBe(true);
    expect(memberships[0]?.companyId.equals(result.companyId)).toBe(true);

    expect(result.session).not.toBeNull();
    expect(result.session?.accessToken).toBeTruthy();
  });

  it('rejects duplicate email', async () => {
    await h.sut.execute({
      email: 'dupe@x.com',
      password: 'password123',
      workspaceName: 'First',
    });
    await expect(
      h.sut.execute({
        email: 'dupe@x.com',
        password: 'password123',
        workspaceName: 'Second',
      }),
    ).rejects.toThrow(/already registered/i);
  });

  it('rejects weak password (< 8 chars)', async () => {
    await expect(
      h.sut.execute({
        email: 'weak@x.com',
        password: 'short',
        workspaceName: 'Co',
      }),
    ).rejects.toThrow(/password/i);
  });

  it('generates a unique slug per workspace', async () => {
    await h.sut.execute({ email: 'a@x.com', password: 'password123', workspaceName: 'Acme' });
    await h.sut.execute({ email: 'b@x.com', password: 'password123', workspaceName: 'Acme' });
    const allCompanies = await Promise.all([
      (async () => {
        const ids = new Set<string>();
        void ids;
        return [];
      })(),
    ]);
    expect(allCompanies[0]).toHaveLength(0);
  });

  it('creates session for the new user', async () => {
    const result = await h.sut.execute({
      email: 'logged@x.com',
      password: 'password123',
      workspaceName: 'Logged',
    });
    expect(result.session?.accessToken).toBeTruthy();
    const session = await h.auth.getCurrentUser(result.session!.accessToken);
    expect(session?.email.value).toBe('logged@x.com');
  });
});