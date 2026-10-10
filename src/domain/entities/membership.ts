import type { CompanyId, MembershipId, UserId } from '@domain/value-objects/branded-id';
import { ValidationError } from '@domain/errors/domain-error';

export type Role = 'owner' | 'coach' | 'client';
const VALID_ROLES: readonly Role[] = ['owner', 'coach', 'client'];

export interface MembershipProps {
  readonly id: MembershipId;
  readonly companyId: CompanyId;
  readonly userId: UserId;
  readonly role: Role;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MembershipCreateInput {
  readonly id: MembershipId;
  readonly companyId: CompanyId;
  readonly userId: UserId;
  readonly role: Role;
  readonly now: string;
}

export class Membership {
  private constructor(private props: MembershipProps) {}

  static create(input: MembershipCreateInput): Membership {
    if (!VALID_ROLES.includes(input.role)) {
      throw new ValidationError(`Invalid role: ${input.role}`);
    }
    return new Membership({
      id: input.id,
      companyId: input.companyId,
      userId: input.userId,
      role: input.role,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static reconstruct(props: MembershipProps): Membership {
    return new Membership(props);
  }

  isOwner(): boolean {
    return this.props.role === 'owner';
  }
  isCoach(): boolean {
    return this.props.role === 'coach';
  }
  isClient(): boolean {
    return this.props.role === 'client';
  }

  get id(): MembershipId {
    return this.props.id;
  }
  get companyId(): CompanyId {
    return this.props.companyId;
  }
  get userId(): UserId {
    return this.props.userId;
  }
  get role(): Role {
    return this.props.role;
  }
  get createdAt(): string {
    return this.props.createdAt;
  }
  get updatedAt(): string {
    return this.props.updatedAt;
  }
}
