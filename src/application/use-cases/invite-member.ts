import type { CompanyRepository } from '@app/ports/company-repository';
import type { MembershipRepository } from '@app/ports/membership-repository';
import type { InvitationRepository } from '@app/ports/invitation-repository';
import type { EmailGateway } from '@app/ports/email-gateway';
import type { TokenHasher } from '@app/ports/token-hasher';
import type { IdGenerator } from '@app/ports/id-generator';
import type { Clock } from '@app/ports/clock';
import { Invitation } from '@domain/entities/invitation';
import { Email } from '@domain/value-objects/email';
import type { CompanyId, InvitationId, UserId } from '@domain/value-objects/branded-id';
import { ConflictError, ForbiddenError, NotFoundError } from '@domain/errors/domain-error';
import type { Role } from '@domain/entities/membership';

const INVITATION_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface InviteMemberInput {
  readonly companyId: CompanyId;
  readonly inviterId: UserId;
  readonly email: string;
  readonly role: Exclude<Role, 'owner'>;
  readonly acceptUrl: (input: { token: string }) => string;
}

export interface InviteMemberResult {
  readonly invitationId: InvitationId;
  readonly sentTo: Email;
}

export class InviteMember {
  constructor(
    private readonly deps: {
      companies: CompanyRepository;
      memberships: MembershipRepository;
      invitations: InvitationRepository;
      email: EmailGateway;
      tokens: TokenHasher;
      ids: IdGenerator;
      clock: Clock;
    },
  ) {}

  async execute(input: InviteMemberInput): Promise<InviteMemberResult> {
    const inviterMembership = await this.deps.memberships.findByCompanyAndUser(
      input.companyId,
      input.inviterId,
    );
    if (!inviterMembership || !inviterMembership.isOwner()) {
      throw new ForbiddenError('Only the workspace owner can invite members');
    }
    const company = await this.deps.companies.findById(input.companyId);
    if (!company) {
      throw new NotFoundError('Company', input.companyId.toString());
    }
    const email = Email.create(input.email);
    const pending = await this.deps.invitations.findPendingByCompanyAndEmail(input.companyId, email);
    if (pending) {
      throw new ConflictError(`An invitation is already pending for ${email.value}`);
    }
    const now = this.deps.clock.now();
    const expiresAt = new Date(Date.parse(now) + INVITATION_TTL_SECONDS * 1000).toISOString();
    const token = await this.deps.tokens.generateToken();
    const tokenHash = await this.deps.tokens.hash(token);

    const invitation = Invitation.create({
      id: this.deps.ids.newInvitationId(),
      companyId: input.companyId,
      email,
      role: input.role,
      invitedBy: input.inviterId,
      tokenHash,
      now,
      expiresAt,
    });
    await this.deps.invitations.save(invitation);

    const url = input.acceptUrl({ token });
    await this.deps.email.send({
      to: email,
      subject: `${company.name} invited you to Brevia`,
      html: `<p>You have been invited to join <strong>${company.name}</strong> on Brevia as a ${input.role}.</p><p><a href="${url}">Accept invitation</a></p>`,
      text: `You have been invited to join ${company.name} on Brevia as a ${input.role}. Accept here: ${url}`,
    });

    return { invitationId: invitation.id, sentTo: email };
  }
}