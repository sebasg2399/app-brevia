import type { SessionRepository } from '@app/ports/session-repository';
import type { CoachRepository } from '@app/ports/coach-repository';
import type { TranscriptRepository } from '@app/ports/transcript-repository';
import type { AINotesRepository } from '@app/ports/ai-notes-repository';
import type { SubscriptionRepository } from '@app/ports/subscription-repository';
import type { AIGateway } from '@app/ports/ai-gateway';
import type { MembershipRepository } from '@app/ports/membership-repository';
import type { IdGenerator } from '@app/ports/id-generator';
import type { Clock } from '@app/ports/clock';
import { Transcript } from '@domain/entities/transcript';
import { AINotes } from '@domain/entities/ai-notes';
import type { CompanyId, SessionId, UserId, TranscriptId, AINoteId } from '@domain/value-objects/branded-id';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  QuotaExceededError,
  StateTransitionError,
} from '@domain/errors/domain-error';
import { currentYearMonth } from '@app/lib/year-month';

export interface CreateTranscriptInput {
  readonly companyId: CompanyId;
  readonly actorId: UserId;
  readonly sessionId: SessionId;
  readonly text: string;
}

export interface CreateTranscriptResult {
  readonly transcriptId: TranscriptId;
  readonly notesId: AINoteId;
  readonly notesStatus: 'pending' | 'ready' | 'failed';
  readonly summary?: string;
  readonly actionItems?: ReadonlyArray<unknown>;
  readonly nextSessionBrief?: string;
  readonly errorMessage?: string;
}

export class CreateTranscript {
  constructor(
    private readonly deps: {
      sessions: SessionRepository;
      coaches: CoachRepository;
      transcripts: TranscriptRepository;
      notes: AINotesRepository;
      subscriptions: SubscriptionRepository;
      memberships: MembershipRepository;
      ai: AIGateway;
      ids: IdGenerator;
      clock: Clock;
    },
  ) {}

  async execute(input: CreateTranscriptInput): Promise<CreateTranscriptResult> {
    // 1. Validate session exists and belongs to the company
    const session = await this.deps.sessions.findById(input.sessionId);
    if (!session) throw new NotFoundError('Session', input.sessionId.toString());
    if (!session.belongsToCompany(input.companyId)) {
      throw new ForbiddenError('Session does not belong to this workspace');
    }

    // 2. Session must be completed
    if (session.status !== 'completed') {
      throw new StateTransitionError(
        `Cannot add transcript: session is ${session.status}`,
      );
    }

    // 3. Actor must be the assigned coach or the owner
    const coach = await this.deps.coaches.findById(session.coachId);
    const isOwner = await this.isOwner(input.companyId, input.actorId);
    if (!isOwner && !(coach && coach.userId.equals(input.actorId))) {
      throw new ForbiddenError('Only the assigned coach or the workspace owner can add a transcript');
    }

    // 4. No transcript yet
    const existing = await this.deps.transcripts.findBySessionId(input.sessionId);
    if (existing) {
      throw new ConflictError('A transcript already exists for this session');
    }

    // 5. Subscription must allow AI (or transcript can be saved without AI)
    const subscription = await this.deps.subscriptions.findByCompanyId(input.companyId);
    if (!subscription) {
      throw new NotFoundError('Subscription', input.companyId.toString());
    }
    if (!subscription.allowsAI()) {
      throw new ForbiddenError(
        `AI notes are disabled: subscription is ${subscription.status}`,
      );
    }

    // 6. Quota check
    const now = this.deps.clock.now();
    const ym = currentYearMonth(now);
    const used = await this.deps.notes.countGeneratedByCompanyInMonth(input.companyId, ym);
    const limit = subscription.plan.monthlyNotes;
    if (used >= limit) {
      throw new QuotaExceededError('ai_notes', limit, used);
    }

    // 7. Persist transcript
    const transcript = Transcript.create({
      id: this.deps.ids.newTranscriptId(),
      companyId: input.companyId,
      sessionId: input.sessionId,
      text: input.text,
      now,
    });
    await this.deps.transcripts.save(transcript);

    // 8. Persist pending notes
    const notes = AINotes.createPending({
      id: this.deps.ids.newAINoteId(),
      transcriptId: transcript.id,
      companyId: input.companyId,
      now,
    });
    await this.deps.notes.save(notes);

    // 9. Call AI gateway with retry
    const result = await this.callAIWithRetry(notes, transcript.text, now);
    return {
      transcriptId: transcript.id,
      notesId: notes.id,
      ...result,
    };
  }

  private async isOwner(companyId: CompanyId, userId: UserId): Promise<boolean> {
    const m = await this.deps.memberships.findByCompanyAndUser(companyId, userId);
    return m?.isOwner() ?? false;
  }

  private async callAIWithRetry(
    notes: AINotes,
    text: string,
    _now: string,
  ): Promise<{ notesStatus: 'pending' | 'ready' | 'failed'; summary?: string; actionItems?: ReadonlyArray<unknown>; nextSessionBrief?: string; errorMessage?: string }> {
    const maxAttempts = 2;
    let lastError: unknown = null;
    for (let attempt = 0; attempt <= maxAttempts; attempt++) {
      try {
        const draft = await this.deps.ai.generateNotes({ transcript: text });
        notes.markReady({
          summary: draft.summary,
          actionItems: draft.actionItems,
          nextSessionBrief: draft.nextSessionBrief,
          model: draft.model,
          rawResponse: draft.rawResponse,
          now: this.deps.clock.now(),
        });
        await this.deps.notes.save(notes);
        return {
          notesStatus: 'ready',
          summary: draft.summary,
          actionItems: draft.actionItems,
          nextSessionBrief: draft.nextSessionBrief,
        };
      } catch (err) {
        lastError = err;
        // small backoff (no actual sleep in tests; production would add jitter)
      }
    }
    const message = lastError instanceof Error ? lastError.message : 'AI generation failed';
    notes.markFailed(message, this.deps.clock.now());
    await this.deps.notes.save(notes);
    return { notesStatus: 'failed', errorMessage: message };
  }
}

// Plan import removed — was only used to suppress lint warning on removed import.