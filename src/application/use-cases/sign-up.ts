import type { AuthGateway, AuthSession } from '@app/ports/auth-gateway';
import type { Clock } from '@app/ports/clock';
import type { IdGenerator } from '@app/ports/id-generator';
import type { CompanyRepository } from '@app/ports/company-repository';
import type { UserRepository } from '@app/ports/user-repository';
import type { MembershipRepository } from '@app/ports/membership-repository';
import type { SubscriptionRepository } from '@app/ports/subscription-repository';
import { Company } from '@domain/entities/company';
import { User } from '@domain/entities/user';
import { Membership } from '@domain/entities/membership';
import { Subscription } from '@domain/entities/subscription';
import { Plan } from '@domain/value-objects/plan';
import { Email } from '@domain/value-objects/email';
import { Slug } from '@domain/value-objects/slug';
import type { CompanyId, UserId } from '@domain/value-objects/branded-id';
import { ConflictError } from '@domain/errors/domain-error';

export interface SignUpInput {
  readonly email: string;
  readonly password: string;
  readonly workspaceName: string;
}

export interface SignUpResult {
  readonly userId: UserId;
  readonly companyId: CompanyId;
  readonly session: AuthSession | null;
}

export class SignUp {
  constructor(
    private readonly deps: {
      auth: AuthGateway;
      users: UserRepository;
      companies: CompanyRepository;
      memberships: MembershipRepository;
      subscriptions: SubscriptionRepository;
      ids: IdGenerator;
      clock: Clock;
    },
  ) {}

  async execute(input: SignUpInput): Promise<SignUpResult> {
    const email = Email.create(input.email);
    const existing = await this.deps.users.findByEmail(email);
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const authResult = await this.deps.auth.signUp({ email, password: input.password });
    const now = this.deps.clock.now();

    const user = User.create({
      id: authResult.userId,
      email,
      fullName: null,
      now,
    });
    await this.deps.users.save(user);

    const slug = Slug.fromString(input.workspaceName);
    const company = Company.create({
      id: this.deps.ids.newCompanyId(),
      name: input.workspaceName,
      slug,
      ownerId: authResult.userId,
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
      userId: authResult.userId,
      role: 'owner',
      now,
    });
    await this.deps.memberships.save(membership);

    return {
      userId: authResult.userId,
      companyId: company.id,
      session: authResult.session,
    };
  }
}
