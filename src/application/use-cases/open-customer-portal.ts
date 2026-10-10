import type { StripeGateway } from '@app/ports/stripe-gateway';
import type { MembershipRepository } from '@app/ports/membership-repository';
import type { SubscriptionRepository } from '@app/ports/subscription-repository';
import type { CompanyId, UserId } from '@domain/value-objects/branded-id';
import { ForbiddenError, NotFoundError } from '@domain/errors/domain-error';

export class OpenCustomerPortal {
  constructor(
    private readonly deps: {
      stripe: StripeGateway;
      memberships: MembershipRepository;
      subscriptions: SubscriptionRepository;
    },
  ) {}

  async execute(input: {
    companyId: CompanyId;
    actorId: UserId;
    appUrl: string;
  }): Promise<{ url: string }> {
    const actor = await this.deps.memberships.findByCompanyAndUser(input.companyId, input.actorId);
    if (!actor || !actor.isOwner()) {
      throw new ForbiddenError('Only the workspace owner can access the billing portal');
    }
    const subscription = await this.deps.subscriptions.findByCompanyId(input.companyId);
    if (!subscription) throw new NotFoundError('Subscription', input.companyId.toString());
    if (!subscription.stripeCustomerId) {
      throw new NotFoundError('Stripe customer', 'no Stripe customer yet (free plan)');
    }
    const session = await this.deps.stripe.createPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl: `${input.appUrl}/settings/billing`,
    });
    return { url: session.url };
  }
}
