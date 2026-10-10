import type {
  CompanyId,
  SessionId,
  TranscriptId,
} from '@domain/value-objects/branded-id';
import { ValidationError, ImmutableResourceError } from '@domain/errors/domain-error';

const MIN_TEXT_LENGTH = 200;
const MAX_TEXT_LENGTH = 50000;

export interface TranscriptProps {
  readonly id: TranscriptId;
  readonly companyId: CompanyId;
  readonly sessionId: SessionId;
  readonly text: string;
  readonly createdAt: string;
}

export interface TranscriptCreateInput {
  readonly id: TranscriptId;
  readonly companyId: CompanyId;
  readonly sessionId: SessionId;
  readonly text: string;
  readonly now: string;
}

export class Transcript {
  private constructor(private readonly props: TranscriptProps) {}

  static create(input: TranscriptCreateInput): Transcript {
    Transcript.assertValidText(input.text);
    return new Transcript({
      id: input.id,
      companyId: input.companyId,
      sessionId: input.sessionId,
      text: input.text,
      createdAt: input.now,
    });
  }

  static reconstruct(props: TranscriptProps): Transcript {
    return new Transcript(props);
  }

  private static assertValidText(text: string): void {
    if (typeof text !== 'string') throw new ValidationError('Transcript text must be a string');
    const trimmed = text.trim();
    if (trimmed.length < MIN_TEXT_LENGTH) {
      throw new ValidationError(`Transcript too short (min ${MIN_TEXT_LENGTH} chars)`);
    }
    if (trimmed.length > MAX_TEXT_LENGTH) {
      throw new ValidationError(`Transcript too long (max ${MAX_TEXT_LENGTH} chars)`);
    }
  }

  // Immutability: the constructor is private and there are no setters; this
  // method is a safety net for any future misuse.
  updateText(): never {
    throw new ImmutableResourceError('Transcript is immutable');
  }

  belongsToCompany(companyId: CompanyId): boolean {
    return this.props.companyId.equals(companyId);
  }

  isForSession(sessionId: SessionId): boolean {
    return this.props.sessionId.equals(sessionId);
  }

  get id(): TranscriptId {
    return this.props.id;
  }
  get companyId(): CompanyId {
    return this.props.companyId;
  }
  get sessionId(): SessionId {
    return this.props.sessionId;
  }
  get text(): string {
    return this.props.text;
  }
  get createdAt(): string {
    return this.props.createdAt;
  }
}