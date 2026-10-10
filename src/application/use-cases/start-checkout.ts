import type { StripeGateway } from '@app/ports/stripe-gateway';
import type { MembershipRepository } from '@app/ports/membership-repository';
import type { SubscriptionRepository } from '@app/ports/subscription-repository';
import type { UserRepository } from '@app/ports/user-repository';
import type { Clock } from '@app/ports/clock';
import { Plan, type PlanName } from '@domain/value-objects/plan';
import type { CompanyId, UserId } from '@domain/value-objects/branded-id';
import { ForbiddenError, NotFoundError } from '@domain/errors/domain-error';

export class StartCheckout {
  constructor(
    private readonly deps: {
      stripe: StripeGateway;
      memberships: MembershipRepository;
      subscriptions: SubscriptionRepository;
      users: UserRepository;
      clock: Clock;
    },
  ) {}

  async execute(input: {
    companyId: CompanyId;
    actorId: UserId;
    plan: PlanName;
    appUrl: string;
  }): Promise<{ url: string }> {
    const plan = Plan.fromName(input.plan);
    if (plan.name === 'free') {
      throw new ForbiddenError('Cannot checkout a free plan');
    }
    const actor = await this.deps.memberships.findByCompanyAndUser(input.companyId, input.actorId);
    if (!actor || !actor.isOwner()) {
      throw new ForbiddenError('Only the workspace owner can change the plan');
    }
    const subscription = await this.deps.subscriptions.findByCompanyId(input.companyId);
    if (!subscription) throw new NotFoundError('Subscription', input.companyId.toString());
    // For lookup of customer email, we need a user. The owner is a member, so we
    // can't trivially get the email from membership — but we have it from the
    // session in the page. We accept a pre-resolved email in the action layer
    // and not here. For now, find any member; in practice the action passes
    // the actor's email.
    const owner = await this.deps.users.findById(input.actorId);
    if (!owner) throw new NotFoundError('User', input.actorId.toString());

    const session = await this.deps.stripe.createCheckoutSession({
      companyId: input.companyId.toString(),
      customerEmail: owner.email.value,
      plan: input.plan,
      trialDays: 7,
      successUrl: `${input.appUrl}/billing/success`,
      cancelUrl: `${input.appUrl}/settings/billing?canceled=1`,
      existingCustomerId: subscription.stripeCustomerId ?? undefined,
    });
    return { url: session.url };
  }
}
