import type { CompanyRepository } from '@app/ports/company-repository';
import type { CoachRepository } from '@app/ports/coach-repository';
import type { MembershipRepository } from '@app/ports/membership-repository';
import type { IdGenerator } from '@app/ports/id-generator';
import type { Clock } from '@app/ports/clock';
import { Coach } from '@domain/entities/coach';
import type { CompanyId, UserId } from '@domain/value-objects/branded-id';
import { ConflictError, ForbiddenError, NotFoundError } from '@domain/errors/domain-error';

export interface CreateCoachInput {
  readonly companyId: CompanyId;
  readonly actorId: UserId;
  readonly userId: UserId;
  readonly displayName: string;
  readonly bio: string;
  readonly focusAreas: ReadonlyArray<string>;
  readonly hourlyRateCents: number;
}

export class CreateCoach {
  constructor(
    private readonly deps: {
      companies: CompanyRepository;
      coaches: CoachRepository;
      memberships: MembershipRepository;
      ids: IdGenerator;
      clock: Clock;
    },
  ) {}

  async execute(input: CreateCoachInput) {
    const actorMembership = await this.deps.memberships.findByCompanyAndUser(
      input.companyId,
      input.actorId,
    );
    if (!actorMembership || !actorMembership.isOwner()) {
      throw new ForbiddenError('Only the workspace owner can create coach profiles');
    }
    const company = await this.deps.companies.findById(input.companyId);
    if (!company) {
      throw new NotFoundError('Company', input.companyId.toString());
    }
    const existing = await this.deps.coaches.findByUserId(input.userId);
    if (existing) {
      throw new ConflictError('User already has a coach profile');
    }
    const now = this.deps.clock.now();
    const coach = Coach.create({
      id: this.deps.ids.newCoachId(),
      userId: input.userId,
      companyId: input.companyId,
      displayName: input.displayName,
      bio: input.bio,
      focusAreas: input.focusAreas,
      hourlyRateCents: input.hourlyRateCents,
      now,
    });
    await this.deps.coaches.save(coach);
    return coach;
  }
}