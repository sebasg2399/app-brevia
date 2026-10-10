import type { UserId } from '@domain/value-objects/branded-id';
import type { Email } from '@domain/value-objects/email';
import { ValidationError } from '@domain/errors/domain-error';

const NAME_MAX_LENGTH = 120;

export interface UserProps {
  readonly id: UserId;
  readonly email: Email;
  readonly fullName: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface UserCreateInput {
  readonly id: UserId;
  readonly email: Email;
  readonly fullName: string | null;
  readonly now: string;
}

export class User {
  private constructor(private props: UserProps) {}

  static create(input: UserCreateInput): User {
    if (input.fullName !== null) {
      User.assertValidName(input.fullName);
    }
    return new User({
      id: input.id,
      email: input.email,
      fullName: input.fullName?.trim() ?? null,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static reconstruct(props: UserProps): User {
    return new User(props);
  }

  private static assertValidName(name: string): void {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw new ValidationError('User full name cannot be empty');
    }
    if (trimmed.length > NAME_MAX_LENGTH) {
      throw new ValidationError(`User full name too long (max ${NAME_MAX_LENGTH})`);
    }
  }

  updateFullName(newName: string | null, now: string): void {
    if (newName !== null) {
      User.assertValidName(newName);
    }
    this.props = {
      ...this.props,
      fullName: newName?.trim() ?? null,
      updatedAt: now,
    };
  }

  get id(): UserId {
    return this.props.id;
  }
  get email(): Email {
    return this.props.email;
  }
  get fullName(): string | null {
    return this.props.fullName;
  }
  get createdAt(): string {
    return this.props.createdAt;
  }
  get updatedAt(): string {
    return this.props.updatedAt;
  }
}