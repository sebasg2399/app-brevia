import type { MembershipRepository } from '@app/ports/membership-repository';
import { CompanyId, MembershipId, UserId } from '@domain/value-objects/branded-id';
import { ForbiddenError, NotFoundError } from '@domain/errors/domain-error';

export interface RemoveMemberInput {
  readonly companyId: CompanyId;
  readonly actorId: UserId;
  readonly membershipId: MembershipId;
}

export class RemoveMember {
  constructor(
    private readonly deps: {
      memberships: MembershipRepository;
    },
  ) {}

  async execute(input: RemoveMemberInput): Promise<void> {
    const actor = await this.deps.memberships.findByCompanyAndUser(input.companyId, input.actorId);
    if (!actor || !actor.isOwner()) {
      throw new ForbiddenError('Only the workspace owner can remove members');
    }
    const target = await this.deps.memberships.findById(input.membershipId);
    if (!target) {
      throw new NotFoundError('Membership', input.membershipId.toString());
    }
    if (!target.companyId.equals(input.companyId)) {
      throw new ForbiddenError('Membership does not belong to this workspace');
    }
    if (target.isOwner()) {
      throw new ForbiddenError('Cannot remove the workspace owner');
    }
    if (target.userId.equals(input.actorId)) {
      throw new ForbiddenError('Use a different flow to leave your own workspace');
    }
    await this.deps.memberships.delete(target.id);
  }
}