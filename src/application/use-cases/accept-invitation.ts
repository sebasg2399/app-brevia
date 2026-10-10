import type { AuthGateway } from '@app/ports/auth-gateway';
import type { UserRepository } from '@app/ports/user-repository';
import type { CompanyRepository } from '@app/ports/company-repository';
import type { MembershipRepository } from '@app/ports/membership-repository';
import type { InvitationRepository } from '@app/ports/invitation-repository';
import type { TokenHasher } from '@app/ports/token-hasher';
import type { IdGenerator } from '@app/ports/id-generator';
import type { Clock } from '@app/ports/clock';
import { User } from '@domain/entities/user';
import { Membership } from '@domain/entities/membership';
import type { CompanyId, UserId } from '@domain/value-objects/branded-id';
import { ConflictError, NotFoundError, ValidationError } from '@domain/errors/domain-error';

export interface AcceptInvitationInput {
  readonly token: string;
  readonly password: string;
}

export interface AcceptInvitationResult {
  readonly userId: UserId;
  readonly companyId: CompanyId;
  readonly session: Awaited<ReturnType<AuthGateway['signUp']>>['session'];
}

export class AcceptInvitation {
  constructor(
    private readonly deps: {
      auth: AuthGateway;
      users: UserRepository;
      companies: CompanyRepository;
      memberships: MembershipRepository;
      invitations: InvitationRepository;
      tokens: TokenHasher;
      ids: IdGenerator;
      clock: Clock;
    },
  ) {}

  async execute(input: AcceptInvitationInput): Promise<AcceptInvitationResult> {
    if (input.password.length < 8) {
      throw new ValidationError('Password too short (min 8 chars)');
    }
    const tokenHash = await this.deps.tokens.hash(input.token);
    const invitation = await this.deps.invitations.findByTokenHash(tokenHash);
    if (!invitation) {
      throw new NotFoundError('Invitation', 'token');
    }
    const now = this.deps.clock.now();
    if (invitation.isExpired(now)) {
      throw new ConflictError('Invitation expired');
    }
    if (invitation.status !== 'pending') {
      throw new ConflictError(`Invitation already ${invitation.status}`);
    }

    let user = await this.deps.users.findByEmail(invitation.email);
    let authSession: Awaited<ReturnType<AuthGateway['signUp']>>['session'] = null;
    if (!user) {
      const result = await this.deps.auth.signUp({
        email: invitation.email,
        password: input.password,
      });
      user = User.create({ id: result.userId, email: invitation.email, fullName: null, now });
      await this.deps.users.save(user);
      authSession = result.session;
    }

    const existingMembership = await this.deps.memberships.findByCompanyAndUser(
      invitation.companyId,
      user.id,
    );
    if (existingMembership) {
      throw new ConflictError('User already belongs to this workspace');
    }

    invitation.accept(user.id, now);
    await this.deps.invitations.save(invitation);

    const membership = Membership.create({
      id: this.deps.ids.newMembershipId(),
      companyId: invitation.companyId,
      userId: user.id,
      role: invitation.role,
      now,
    });
    await this.deps.memberships.save(membership);

    return {
      userId: user.id,
      companyId: invitation.companyId,
      session: authSession,
    };
  }
}
