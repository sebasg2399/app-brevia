import type { AuthGateway, AuthSession } from '@app/ports/auth-gateway';
import type { Clock } from '@app/ports/clock';
import type { CompanyRepository } from '@app/ports/company-repository';
import type { UserRepository } from '@app/ports/user-repository';
import type { MembershipRepository } from '@app/ports/membership-repository';
import type { InvitationRepository } from '@app/ports/invitation-repository';
import type { CoachRepository } from '@app/ports/coach-repository';
import type { ClientRepository } from '@app/ports/client-repository';
import type { SessionRepository } from '@app/ports/session-repository';
import type { EmailGateway } from '@app/ports/email-gateway';
import type { TokenHasher } from '@app/ports/token-hasher';
import type { IdGenerator } from '@app/ports/id-generator';
import {
  ClientId,
  CoachId,
  CompanyId,
  InvitationId,
  MembershipId,
  SessionId,
  UserId,
} from '@domain/value-objects/branded-id';
import type { Company } from '@domain/entities/company';
import type { User } from '@domain/entities/user';
import type { Membership, Role } from '@domain/entities/membership';
import type { Invitation } from '@domain/entities/invitation';
import type { Coach } from '@domain/entities/coach';
import type { Client } from '@domain/entities/client';
import type { Session, SessionStatus } from '@domain/entities/session';
import type { Email } from '@domain/value-objects/email';
import type { Slug } from '@domain/value-objects/slug';
import { ConflictError, NotFoundError, ValidationError } from '@domain/errors/domain-error';
import { randomUUID } from 'node:crypto';

const uuidv4 = randomUUID;

export class FakeClock implements Clock {
  public current: string;
  constructor(initialIso = '2026-01-01T00:00:00.000Z') {
    this.current = initialIso;
  }
  now(): string {
    return this.current;
  }
  advance(seconds: number): void {
    const next = new Date(Date.parse(this.current) + seconds * 1000);
    this.current = next.toISOString();
  }
}

export class FakeIdGenerator implements IdGenerator {
  newUserId(): UserId {
    return UserId.fromString(uuidv4());
  }
  newCompanyId(): CompanyId {
    return CompanyId.fromString(uuidv4());
  }
  newMembershipId(): MembershipId {
    return MembershipId.fromString(uuidv4());
  }
  newInvitationId(): InvitationId {
    return InvitationId.fromString(uuidv4());
  }
  newCoachId(): CoachId {
    return CoachId.fromString(uuidv4());
  }
  newClientId(): ClientId {
    return ClientId.fromString(uuidv4());
  }
  newSessionId(): SessionId {
    return SessionId.fromString(uuidv4());
  }
}

export class InMemoryCompanyRepository implements CompanyRepository {
  private store = new Map<string, Company>();
  async findById(id: CompanyId): Promise<Company | null> {
    return this.store.get(id.toString()) ?? null;
  }
  async findBySlug(slug: Slug): Promise<Company | null> {
    for (const c of this.store.values()) {
      if (c.slug.equals(slug)) return c;
    }
    return null;
  }
  async findByOwnerId(ownerId: UserId): Promise<Company | null> {
    for (const c of this.store.values()) {
      if (c.ownerId.equals(ownerId)) return c;
    }
    return null;
  }
  async save(company: Company): Promise<void> {
    this.store.set(company.id.toString(), company);
  }
}

export class InMemoryUserRepository implements UserRepository {
  private store = new Map<string, User>();
  async findById(id: UserId): Promise<User | null> {
    return this.store.get(id.toString()) ?? null;
  }
  async findByEmail(email: Email): Promise<User | null> {
    for (const u of this.store.values()) {
      if (u.email.equals(email)) return u;
    }
    return null;
  }
  async save(user: User): Promise<void> {
    this.store.set(user.id.toString(), user);
  }
}

export class InMemoryMembershipRepository implements MembershipRepository {
  private store = new Map<string, Membership>();
  async findById(id: MembershipId): Promise<Membership | null> {
    return this.store.get(id.toString()) ?? null;
  }
  async findByCompanyAndUser(companyId: CompanyId, userId: UserId): Promise<Membership | null> {
    for (const m of this.store.values()) {
      if (m.companyId.equals(companyId) && m.userId.equals(userId)) return m;
    }
    return null;
  }
  async listByCompany(companyId: CompanyId): Promise<ReadonlyArray<Membership>> {
    return Array.from(this.store.values()).filter((m) => m.companyId.equals(companyId));
  }
  async listByUser(userId: UserId): Promise<ReadonlyArray<Membership>> {
    return Array.from(this.store.values()).filter((m) => m.userId.equals(userId));
  }
  async save(membership: Membership): Promise<void> {
    this.store.set(membership.id.toString(), membership);
  }
  async delete(id: MembershipId): Promise<void> {
    this.store.delete(id.toString());
  }
  async countByRole(companyId: CompanyId, role: Role): Promise<number> {
    let count = 0;
    for (const m of this.store.values()) {
      if (m.companyId.equals(companyId) && m.role === role) count++;
    }
    return count;
  }
}

export class InMemoryInvitationRepository implements InvitationRepository {
  private store = new Map<string, Invitation>();
  async findById(id: InvitationId): Promise<Invitation | null> {
    return this.store.get(id.toString()) ?? null;
  }
  async findByTokenHash(tokenHash: string): Promise<Invitation | null> {
    for (const i of this.store.values()) {
      if (i.tokenHash === tokenHash) return i;
    }
    return null;
  }
  async findPendingByCompanyAndEmail(companyId: CompanyId, email: Email): Promise<Invitation | null> {
    for (const i of this.store.values()) {
      if (
        i.companyId.equals(companyId) &&
        i.email.equals(email) &&
        i.status === 'pending'
      ) {
        return i;
      }
    }
    return null;
  }
  async save(invitation: Invitation): Promise<void> {
    this.store.set(invitation.id.toString(), invitation);
  }
  async deleteExpired(now: string): Promise<number> {
    let removed = 0;
    for (const [k, v] of this.store) {
      if (v.isExpired(now) && v.status === 'pending') {
        this.store.delete(k);
        removed++;
      }
    }
    return removed;
  }
}

export class InMemoryCoachRepository implements CoachRepository {
  private store = new Map<string, Coach>();
  async findById(id: CoachId): Promise<Coach | null> {
    return this.store.get(id.toString()) ?? null;
  }
  async findByUserId(userId: UserId): Promise<Coach | null> {
    for (const c of this.store.values()) {
      if (c.userId.equals(userId)) return c;
    }
    return null;
  }
  async listByCompany(companyId: CompanyId): Promise<ReadonlyArray<Coach>> {
    return Array.from(this.store.values()).filter((c) => c.belongsToCompany(companyId));
  }
  async save(coach: Coach): Promise<void> {
    this.store.set(coach.id.toString(), coach);
  }
}

export class InMemoryClientRepository implements ClientRepository {
  private store = new Map<string, Client>();
  async findById(id: ClientId): Promise<Client | null> {
    return this.store.get(id.toString()) ?? null;
  }
  async findActiveByCompanyAndEmail(companyId: CompanyId, email: Email): Promise<Client | null> {
    for (const c of this.store.values()) {
      if (
        c.belongsToCompany(companyId) &&
        !c.isDeleted() &&
        c.email?.equals(email)
      ) {
        return c;
      }
    }
    return null;
  }
  async listByCompany(companyId: CompanyId, includeDeleted = false): Promise<ReadonlyArray<Client>> {
    return Array.from(this.store.values()).filter(
      (c) => c.belongsToCompany(companyId) && (includeDeleted || !c.isDeleted()),
    );
  }
  async save(client: Client): Promise<void> {
    this.store.set(client.id.toString(), client);
  }
}

export class InMemorySessionRepository implements SessionRepository {
  private store = new Map<string, Session>();
  async findById(id: SessionId): Promise<Session | null> {
    return this.store.get(id.toString()) ?? null;
  }
  async listByCompany(companyId: CompanyId, status?: SessionStatus): Promise<ReadonlyArray<Session>> {
    return Array.from(this.store.values()).filter(
      (s) => s.belongsToCompany(companyId) && (status === undefined || s.status === status),
    );
  }
  async listByCoach(coachId: CoachId, status?: SessionStatus): Promise<ReadonlyArray<Session>> {
    return Array.from(this.store.values()).filter(
      (s) => s.coachId.equals(coachId) && (status === undefined || s.status === status),
    );
  }
  async listByClient(clientId: ClientId, status?: SessionStatus): Promise<ReadonlyArray<Session>> {
    return Array.from(this.store.values()).filter(
      (s) => s.clientId.equals(clientId) && (status === undefined || s.status === status),
    );
  }
  async listByCoachAndClient(coachId: CoachId, clientId: ClientId): Promise<ReadonlyArray<Session>> {
    return Array.from(this.store.values()).filter(
      (s) => s.coachId.equals(coachId) && s.clientId.equals(clientId),
    );
  }
  async save(session: Session): Promise<void> {
    this.store.set(session.id.toString(), session);
  }
}

export class FakeAuthGateway implements AuthGateway {
  private passwords = new Map<string, { userId: UserId; email: Email }>();
  private tokens = new Map<string, UserId>();

  async signUp(input: { email: Email; password: string }): Promise<{ userId: UserId; email: Email; session: AuthSession | null }> {
    if (this.passwords.has(input.email.value)) {
      throw new ConflictError('Email already registered');
    }
    if (input.password.length < 8) {
      throw new ValidationError('Password too short (min 8 chars)');
    }
    const userId = UserId.fromString(uuidv4());
    this.passwords.set(input.email.value, { userId, email: input.email });
    const token = uuidv4();
    this.tokens.set(token, userId);
    return {
      userId,
      email: input.email,
      session: {
        userId,
        email: input.email,
        accessToken: token,
        refreshToken: uuidv4(),
        expiresAt: '2099-01-01T00:00:00.000Z',
      },
    };
  }

  async signIn(input: { email: Email; password: string }): Promise<AuthSession> {
    const record = this.passwords.get(input.email.value);
    if (!record) {
      throw new NotFoundError('User', input.email.value);
    }
    const token = uuidv4();
    this.tokens.set(token, record.userId);
    return {
      userId: record.userId,
      email: record.email,
      accessToken: token,
      refreshToken: uuidv4(),
      expiresAt: '2099-01-01T00:00:00.000Z',
    };
  }

  async signOut(input: { accessToken: string }): Promise<void> {
    this.tokens.delete(input.accessToken);
  }

  async getCurrentUser(accessToken: string): Promise<{ userId: UserId; email: Email } | null> {
    const userId = this.tokens.get(accessToken);
    if (!userId) return null;
    for (const record of this.passwords.values()) {
      if (record.userId.equals(userId)) {
        return { userId, email: record.email };
      }
    }
    return null;
  }
}

export class FakeEmailGateway implements EmailGateway {
  public sent: Array<{ to: Email; subject: string; html: string; text: string }> = [];
  async send(input: { to: Email; subject: string; html: string; text: string }): Promise<void> {
    this.sent.push(input);
  }
}

export class FakeTokenHasher implements TokenHasher {
  async hash(token: string): Promise<string> {
    return `h:${token}`;
  }
  async compare(token: string, hash: string): Promise<boolean> {
    return `h:${token}` === hash;
  }
  async generateToken(): Promise<string> {
    return uuidv4();
  }
}