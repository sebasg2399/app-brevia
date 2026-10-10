import type { ClientId, CoachId, CompanyId, SessionId } from '@domain/value-objects/branded-id';
import { StateTransitionError, ValidationError } from '@domain/errors/domain-error';

export type SessionStatus = 'scheduled' | 'completed' | 'canceled' | 'archived';
const VALID_DURATIONS: ReadonlyArray<number> = [15, 30, 45, 60, 90];

export interface SessionProps {
  readonly id: SessionId;
  readonly companyId: CompanyId;
  readonly coachId: CoachId;
  readonly clientId: ClientId;
  readonly scheduledAt: string;
  readonly durationMinutes: number;
  readonly status: SessionStatus;
  readonly completedAt: string | null;
  readonly canceledAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SessionCreateInput {
  readonly id: SessionId;
  readonly companyId: CompanyId;
  readonly coachId: CoachId;
  readonly clientId: ClientId;
  readonly scheduledAt: string;
  readonly durationMinutes: number;
  readonly now: string;
}

export class Session {
  private constructor(private props: SessionProps) {}

  static create(input: SessionCreateInput): Session {
    Session.assertValidScheduledAt(input.scheduledAt, input.now);
    Session.assertValidDuration(input.durationMinutes);
    return new Session({
      id: input.id,
      companyId: input.companyId,
      coachId: input.coachId,
      clientId: input.clientId,
      scheduledAt: input.scheduledAt,
      durationMinutes: input.durationMinutes,
      status: 'scheduled',
      completedAt: null,
      canceledAt: null,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static reconstruct(props: SessionProps): Session {
    return new Session(props);
  }

  private static assertValidScheduledAt(scheduledAt: string, now: string): void {
    const ts = Date.parse(scheduledAt);
    if (!Number.isFinite(ts)) {
      throw new ValidationError(`Invalid scheduledAt: ${scheduledAt}`);
    }
    if (ts <= Date.parse(now)) {
      throw new ValidationError('scheduledAt must be in the future');
    }
  }

  private static assertValidDuration(minutes: number): void {
    if (!Number.isInteger(minutes)) {
      throw new ValidationError('Duration must be an integer');
    }
    if (!VALID_DURATIONS.includes(minutes)) {
      throw new ValidationError(`Duration must be one of ${VALID_DURATIONS.join(', ')} minutes`);
    }
  }

  markCompleted(now: string): void {
    if (this.props.status !== 'scheduled') {
      throw new StateTransitionError(`Cannot mark completed: session is ${this.props.status}`);
    }
    this.props = {
      ...this.props,
      status: 'completed',
      completedAt: now,
      updatedAt: now,
    };
  }

  cancel(now: string): void {
    if (this.props.status !== 'scheduled') {
      throw new StateTransitionError(`Cannot cancel: session is ${this.props.status}`);
    }
    if (Date.parse(now) > Date.parse(this.props.scheduledAt)) {
      throw new StateTransitionError('Cannot cancel a session that has already started');
    }
    this.props = {
      ...this.props,
      status: 'canceled',
      canceledAt: now,
      updatedAt: now,
    };
  }

  archive(now: string): void {
    if (this.props.status !== 'completed' && this.props.status !== 'canceled') {
      throw new StateTransitionError(`Cannot archive: session is ${this.props.status}`);
    }
    this.props = { ...this.props, status: 'archived', updatedAt: now };
  }

  isAssignedTo(userId: string): boolean {
    return this.props.coachId.toString() === userId;
  }

  isForClient(clientId: ClientId): boolean {
    return this.props.clientId.equals(clientId);
  }

  belongsToCompany(companyId: CompanyId): boolean {
    return this.props.companyId.equals(companyId);
  }

  get id(): SessionId {
    return this.props.id;
  }
  get companyId(): CompanyId {
    return this.props.companyId;
  }
  get coachId(): CoachId {
    return this.props.coachId;
  }
  get clientId(): ClientId {
    return this.props.clientId;
  }
  get scheduledAt(): string {
    return this.props.scheduledAt;
  }
  get durationMinutes(): number {
    return this.props.durationMinutes;
  }
  get status(): SessionStatus {
    return this.props.status;
  }
  get completedAt(): string | null {
    return this.props.completedAt;
  }
  get canceledAt(): string | null {
    return this.props.canceledAt;
  }
  get createdAt(): string {
    return this.props.createdAt;
  }
  get updatedAt(): string {
    return this.props.updatedAt;
  }
}
