import type { SubscriptionRepository } from '@app/ports/subscription-repository';
import type { AINotesRepository } from '@app/ports/ai-notes-repository';
import type { Clock } from '@app/ports/clock';
import type { CompanyId } from '@domain/value-objects/branded-id';
import { NotFoundError } from '@domain/errors/domain-error';
import { currentYearMonth } from '@app/lib/year-month';

export interface QuotaStatus {
  readonly plan: string;
  readonly monthlyLimit: number;
  readonly usedThisMonth: number;
  readonly remaining: number;
  readonly yearMonth: string;
}

export class GetQuotaUsage {
  constructor(
    private readonly deps: {
      subscriptions: SubscriptionRepository;
      notes: AINotesRepository;
      clock: Clock;
    },
  ) {}

  async execute(input: { companyId: CompanyId }): Promise<QuotaStatus> {
    const subscription = await this.deps.subscriptions.findByCompanyId(input.companyId);
    if (!subscription) throw new NotFoundError('Subscription', input.companyId.toString());
    const ym = currentYearMonth(this.deps.clock.now());
    const used = await this.deps.notes.countGeneratedByCompanyInMonth(input.companyId, ym);
    const limit = subscription.plan.monthlyNotes;
    return {
      plan: subscription.plan.name,
      monthlyLimit: limit,
      usedThisMonth: used,
      remaining: Math.max(0, limit - used),
      yearMonth: ym,
    };
  }
}
