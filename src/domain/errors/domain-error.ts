export class DomainError extends Error {
  override readonly name: string = 'DomainError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends DomainError {
  override readonly name = 'ValidationError';
  readonly context?: Record<string, unknown>;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message);
    this.context = context;
  }
}

export class NotFoundError extends DomainError {
  override readonly name = 'NotFoundError';
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`);
  }
}

export class ConflictError extends DomainError {
  override readonly name = 'ConflictError';
  constructor(message: string) {
    super(message);
  }
}

export class ForbiddenError extends DomainError {
  override readonly name = 'ForbiddenError';
  constructor(message: string) {
    super(message);
  }
}

export class UnauthorizedError extends DomainError {
  override readonly name = 'UnauthorizedError';
  constructor(message: string) {
    super(message);
  }
}

export class StateTransitionError extends DomainError {
  override readonly name = 'StateTransitionError';
  constructor(message: string) {
    super(message);
  }
}

export class ImmutableResourceError extends DomainError {
  override readonly name = 'ImmutableResourceError';
  constructor(message: string) {
    super(message);
  }
}

export class QuotaExceededError extends DomainError {
  override readonly name = 'QuotaExceededError';
  constructor(resource: string, limit: number, current: number) {
    super(`Quota exceeded for ${resource}: limit=${limit}, current=${current}`);
  }
}