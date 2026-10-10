import type { AINoteId, CompanyId, TranscriptId } from '@domain/value-objects/branded-id';
import type { ActionItem } from '@domain/value-objects/action-item';
import { StateTransitionError, ValidationError } from '@domain/errors/domain-error';

export type AINotesStatus = 'pending' | 'ready' | 'failed';

export interface AINotesProps {
  readonly id: AINoteId;
  readonly transcriptId: TranscriptId;
  readonly companyId: CompanyId;
  readonly status: AINotesStatus;
  readonly summary: string;
  readonly actionItems: ReadonlyArray<ActionItem>;
  readonly nextSessionBrief: string;
  readonly model: string | null;
  readonly rawResponse: string | null;
  readonly errorMessage: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AINotesPendingInput {
  readonly id: AINoteId;
  readonly transcriptId: TranscriptId;
  readonly companyId: CompanyId;
  readonly now: string;
}

export class AINotes {
  private constructor(private props: AINotesProps) {}

  static createPending(input: AINotesPendingInput): AINotes {
    return new AINotes({
      id: input.id,
      transcriptId: input.transcriptId,
      companyId: input.companyId,
      status: 'pending',
      summary: '',
      actionItems: [],
      nextSessionBrief: '',
      model: null,
      rawResponse: null,
      errorMessage: null,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static reconstruct(props: AINotesProps): AINotes {
    return new AINotes(props);
  }

  markReady(input: {
    summary: string;
    actionItems: ReadonlyArray<ActionItem>;
    nextSessionBrief: string;
    model: string;
    rawResponse: string;
    now: string;
  }): void {
    if (this.props.status !== 'pending') {
      throw new StateTransitionError(`Cannot mark ready: notes are ${this.props.status}`);
    }
    if (typeof input.summary !== 'string') throw new ValidationError('summary required');
    if (typeof input.nextSessionBrief !== 'string') {
      throw new ValidationError('nextSessionBrief required');
    }
    this.props = {
      ...this.props,
      status: 'ready',
      summary: input.summary,
      actionItems: [...input.actionItems],
      nextSessionBrief: input.nextSessionBrief,
      model: input.model,
      rawResponse: input.rawResponse,
      errorMessage: null,
      updatedAt: input.now,
    };
  }

  markFailed(errorMessage: string, now: string): void {
    if (this.props.status !== 'pending') {
      throw new StateTransitionError(`Cannot mark failed: notes are ${this.props.status}`);
    }
    this.props = {
      ...this.props,
      status: 'failed',
      errorMessage,
      updatedAt: now,
    };
  }

  resetToPending(now: string): void {
    if (this.props.status !== 'failed') {
      throw new StateTransitionError('Can only reset failed notes to pending (retry)');
    }
    this.props = {
      ...this.props,
      status: 'pending',
      summary: '',
      actionItems: [],
      nextSessionBrief: '',
      model: null,
      rawResponse: null,
      errorMessage: null,
      updatedAt: now,
    };
  }

  belongsToCompany(companyId: CompanyId): boolean {
    return this.props.companyId.equals(companyId);
  }

  isForTranscript(transcriptId: TranscriptId): boolean {
    return this.props.transcriptId.equals(transcriptId);
  }

  get id(): AINoteId {
    return this.props.id;
  }
  get transcriptId(): TranscriptId {
    return this.props.transcriptId;
  }
  get companyId(): CompanyId {
    return this.props.companyId;
  }
  get status(): AINotesStatus {
    return this.props.status;
  }
  get summary(): string {
    return this.props.summary;
  }
  get actionItems(): ReadonlyArray<ActionItem> {
    return this.props.actionItems;
  }
  get nextSessionBrief(): string {
    return this.props.nextSessionBrief;
  }
  get model(): string | null {
    return this.props.model;
  }
  get rawResponse(): string | null {
    return this.props.rawResponse;
  }
  get errorMessage(): string | null {
    return this.props.errorMessage;
  }
  get createdAt(): string {
    return this.props.createdAt;
  }
  get updatedAt(): string {
    return this.props.updatedAt;
  }
}
