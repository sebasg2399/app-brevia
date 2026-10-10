import type { AINotesRepository } from '@app/ports/ai-notes-repository';
import type { SubscriptionRepository } from '@app/ports/subscription-repository';
import type { MembershipRepository } from '@app/ports/membership-repository';
import type { Clock } from '@app/ports/clock';
import type { AINotes } from '@domain/entities/ai-notes';
import type { AINoteId, CompanyId, UserId } from '@domain/value-objects/branded-id';
import {
  ForbiddenError,
  NotFoundError,
  QuotaExceededError,
  StateTransitionError,
} from '@domain/errors/domain-error';
import { currentYearMonth } from '@app/lib/year-month';

export class RetryNotes {
  constructor(
    private readonly deps: {
      notes: AINotesRepository;
      subscriptions: SubscriptionRepository;
      memberships: MembershipRepository;
      clock: Clock;
    },
  ) {}

  async execute(input: { companyId: CompanyId; actorId: UserId; notesId: AINoteId }): Promise<AINotes> {
    const isOwner = await this.isOwner(input.companyId, input.actorId);
    if (!isOwner) {
      throw new ForbiddenError('Only the workspace owner can retry AI notes');
    }
    const notes = await this.deps.notes.findById(input.notesId);
    if (!notes) throw new NotFoundError('AINotes', input.notesId.toString());
    if (!notes.belongsToCompany(input.companyId)) {
      throw new ForbiddenError('Notes do not belong to this workspace');
    }
    if (notes.status !== 'failed') {
      throw new StateTransitionError(`Only failed notes can be retried (current: ${notes.status})`);
    }
    const subscription = await this.deps.subscriptions.findByCompanyId(input.companyId);
    if (!subscription) throw new NotFoundError('Subscription', input.companyId.toString());
    if (!subscription.allowsAI()) {
      throw new ForbiddenError(`AI is disabled (subscription: ${subscription.status})`);
    }
    // Note: retry still counts against quota — we already have a "failed" record,
    // but the spec says "the LLM is NOT called" only when quota is exceeded before
    // the first call. On retry, we re-check the quota to be safe.
    const ym = currentYearMonth(this.deps.clock.now());
    const used = await this.deps.notes.countGeneratedByCompanyInMonth(input.companyId, ym);
    if (used >= subscription.plan.monthlyNotes) {
      throw new QuotaExceededError('ai_notes', subscription.plan.monthlyNotes, used);
    }
    notes.resetToPending(this.deps.clock.now());
    await this.deps.notes.save(notes);
    return notes;
  }

  private async isOwner(companyId: CompanyId, userId: UserId): Promise<boolean> {
    const m = await this.deps.memberships.findByCompanyAndUser(companyId, userId);
    return m?.isOwner() ?? false;
  }
}