import type { CompanyRepository } from '@app/ports/company-repository';
import type { UserRepository } from '@app/ports/user-repository';
import type { MembershipRepository } from '@app/ports/membership-repository';
import type { SubscriptionRepository } from '@app/ports/subscription-repository';
import type { IdGenerator } from '@app/ports/id-generator';
import type { Clock } from '@app/ports/clock';
import { Company } from '@domain/entities/company';
import { Membership } from '@domain/entities/membership';
import { Subscription } from '@domain/entities/subscription';
import { Plan } from '@domain/value-objects/plan';
import { Slug } from '@domain/value-objects/slug';
import { ConflictError, ForbiddenError, NotFoundError } from '@domain/errors/domain-error';
import type { CompanyId, UserId } from '@domain/value-objects/branded-id';

export interface CreateWorkspaceInput {
  readonly ownerId: UserId;
  readonly name: string;
}

export interface CreateWorkspaceResult {
  readonly companyId: CompanyId;
}

export class CreateWorkspace {
  constructor(
    private readonly deps: {
      users: UserRepository;
      companies: CompanyRepository;
      memberships: MembershipRepository;
      subscriptions: SubscriptionRepository;
      ids: IdGenerator;
      clock: Clock;
    },
  ) {}

  async execute(input: CreateWorkspaceInput): Promise<CreateWorkspaceResult> {
    const owner = await this.deps.users.findById(input.ownerId);
    if (!owner) {
      throw new NotFoundError('User', input.ownerId.toString());
    }
    const existing = await this.deps.companies.findByOwnerId(input.ownerId);
    if (existing) {
      throw new ForbiddenError('User already owns a workspace');
    }
    const slug = Slug.fromString(input.name);
    const slugTaken = await this.deps.companies.findBySlug(slug);
    if (slugTaken) {
      throw new ConflictError(`Slug "${slug.value}" already taken`);
    }
    const now = this.deps.clock.now();
    const company = Company.create({
      id: this.deps.ids.newCompanyId(),
      name: input.name,
      slug,
      ownerId: input.ownerId,
      now,
    });
    await this.deps.companies.save(company);

    const subscription = Subscription.create({
      companyId: company.id,
      plan: Plan.free(),
      now,
    });
    await this.deps.subscriptions.save(subscription);

    const membership = Membership.create({
      id: this.deps.ids.newMembershipId(),
      companyId: company.id,
      userId: input.ownerId,
      role: 'owner',
      now,
    });
    await this.deps.memberships.save(membership);

    return { companyId: company.id };
  }
}
