import type { CompanyId, InvitationId, UserId } from '@domain/value-objects/branded-id';
import type { Email } from '@domain/value-objects/email';
import { ConflictError, ValidationError } from '@domain/errors/domain-error';
import type { Role } from './membership';

export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface InvitationProps {
  readonly id: InvitationId;
  readonly companyId: CompanyId;
  readonly email: Email;
  readonly role: Role;
  readonly invitedBy: UserId;
  readonly tokenHash: string;
  readonly status: InvitationStatus;
  readonly expiresAt: string;
  readonly createdAt: string;
  readonly acceptedAt: string | null;
  readonly acceptedBy: UserId | null;
}

export interface InvitationCreateInput {
  readonly id: InvitationId;
  readonly companyId: CompanyId;
  readonly email: Email;
  readonly role: Role;
  readonly invitedBy: UserId;
  readonly tokenHash: string;
  readonly now: string;
  readonly expiresAt: string;
}

export class Invitation {
  private constructor(private props: InvitationProps) {}

  static create(input: InvitationCreateInput): Invitation {
    if (Date.parse(input.expiresAt) <= Date.parse(input.now)) {
      throw new ValidationError('Invitation expiresAt must be after now');
    }
    if (input.tokenHash.length < 8) {
      throw new ValidationError('Invitation tokenHash too short');
    }
    return new Invitation({
      id: input.id,
      companyId: input.companyId,
      email: input.email,
      role: input.role,
      invitedBy: input.invitedBy,
      tokenHash: input.tokenHash,
      status: 'pending',
      expiresAt: input.expiresAt,
      createdAt: input.now,
      acceptedAt: null,
      acceptedBy: null,
    });
  }

  static reconstruct(props: InvitationProps): Invitation {
    return new Invitation(props);
  }

  isExpired(now: string): boolean {
    return Date.parse(now) > Date.parse(this.props.expiresAt);
  }

  accept(acceptedBy: UserId, now: string): void {
    if (this.props.status !== 'pending') {
      throw new ConflictError(`Invitation already ${this.props.status}`);
    }
    if (this.isExpired(now)) {
      this.props = { ...this.props, status: 'expired' };
      throw new ConflictError('Invitation expired');
    }
    this.props = {
      ...this.props,
      status: 'accepted',
      acceptedAt: now,
      acceptedBy,
    };
  }

  revoke(now: string): void {
    if (this.props.status !== 'pending') {
      throw new ConflictError(`Cannot revoke invitation in status ${this.props.status}`);
    }
    this.props = { ...this.props, status: 'revoked', acceptedAt: now, acceptedBy: null };
  }

  get id(): InvitationId {
    return this.props.id;
  }
  get companyId(): CompanyId {
    return this.props.companyId;
  }
  get email(): Email {
    return this.props.email;
  }
  get role(): Role {
    return this.props.role;
  }
  get invitedBy(): UserId {
    return this.props.invitedBy;
  }
  get tokenHash(): string {
    return this.props.tokenHash;
  }
  get status(): InvitationStatus {
    return this.props.status;
  }
  get expiresAt(): string {
    return this.props.expiresAt;
  }
  get createdAt(): string {
    return this.props.createdAt;
  }
  get acceptedAt(): string | null {
    return this.props.acceptedAt;
  }
  get acceptedBy(): UserId | null {
    return this.props.acceptedBy;
  }
}
