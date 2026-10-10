import type { CoachRepository } from '@app/ports/coach-repository';
import type { MembershipRepository } from '@app/ports/membership-repository';
import type { Clock } from '@app/ports/clock';
import type { CoachId, CompanyId, UserId } from '@domain/value-objects/branded-id';
import { ForbiddenError, NotFoundError } from '@domain/errors/domain-error';

export interface UpdateCoachBioInput {
  readonly companyId: CompanyId;
  readonly actorId: UserId;
  readonly coachId: CoachId;
  readonly bio: string;
}

export class UpdateCoachBio {
  constructor(
    private readonly deps: {
      coaches: CoachRepository;
      memberships: MembershipRepository;
      clock: Clock;
    },
  ) {}

  async execute(input: UpdateCoachBioInput): Promise<void> {
    const coach = await this.deps.coaches.findById(input.coachId);
    if (!coach) throw new NotFoundError('Coach', input.coachId.toString());
    if (!coach.belongsToCompany(input.companyId)) {
      throw new ForbiddenError('Coach does not belong to this workspace');
    }
    const isOwner = await this.isOwner(input.companyId, input.actorId);
    if (!isOwner && !coach.userId.equals(input.actorId)) {
      throw new ForbiddenError('Only the coach or the workspace owner can update this profile');
    }
    coach.updateBio(input.bio, this.deps.clock.now());
    await this.deps.coaches.save(coach);
  }

  private async isOwner(companyId: CompanyId, userId: UserId): Promise<boolean> {
    const m = await this.deps.memberships.findByCompanyAndUser(companyId, userId);
    return m?.isOwner() ?? false;
  }
}
