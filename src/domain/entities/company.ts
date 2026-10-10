import { CompanyId, UserId } from '@domain/value-objects/branded-id';
import { Slug } from '@domain/value-objects/slug';
import { ValidationError } from '@domain/errors/domain-error';

const NAME_MAX_LENGTH = 80;
const NAME_REGEX = /^[^\x00-\x1F\x7F]+$/;

export interface CompanyProps {
  readonly id: CompanyId;
  readonly name: string;
  readonly slug: Slug;
  readonly ownerId: UserId;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CompanyCreateInput {
  readonly id: CompanyId;
  readonly name: string;
  readonly slug: Slug;
  readonly ownerId: UserId;
  readonly now: string;
}

export class Company {
  private constructor(private props: CompanyProps) {}

  static create(input: CompanyCreateInput): Company {
    Company.assertValidName(input.name);
    return new Company({
      id: input.id,
      name: input.name.trim(),
      slug: input.slug,
      ownerId: input.ownerId,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static reconstruct(props: CompanyProps): Company {
    return new Company(props);
  }

  private static assertValidName(name: string): void {
    if (typeof name !== 'string') {
      throw new ValidationError('Company name must be a string');
    }
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw new ValidationError('Company name cannot be empty');
    }
    if (trimmed.length > NAME_MAX_LENGTH) {
      throw new ValidationError(`Company name too long (max ${NAME_MAX_LENGTH})`);
    }
    if (!NAME_REGEX.test(trimmed)) {
      throw new ValidationError('Company name contains control characters');
    }
  }

  rename(newName: string, now: string): void {
    Company.assertValidName(newName);
    this.props = { ...this.props, name: newName.trim(), updatedAt: now };
  }

  get id(): CompanyId {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get slug(): Slug {
    return this.props.slug;
  }
  get ownerId(): UserId {
    return this.props.ownerId;
  }
  get createdAt(): string {
    return this.props.createdAt;
  }
  get updatedAt(): string {
    return this.props.updatedAt;
  }
}