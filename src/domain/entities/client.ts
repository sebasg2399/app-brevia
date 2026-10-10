import type { ClientId, CompanyId } from '@domain/value-objects/branded-id';
import type { Email } from '@domain/value-objects/email';
import { ValidationError } from '@domain/errors/domain-error';

const MAX_NAME_LENGTH = 120;
const MAX_NOTES_LENGTH = 2000;

export interface ClientProps {
  readonly id: ClientId;
  readonly companyId: CompanyId;
  readonly name: string;
  readonly email: Email | null;
  readonly notes: string | null;
  readonly deletedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ClientCreateInput {
  readonly id: ClientId;
  readonly companyId: CompanyId;
  readonly name: string;
  readonly email: Email | null;
  readonly notes: string | null;
  readonly now: string;
}

export class Client {
  private constructor(private props: ClientProps) {}

  static create(input: ClientCreateInput): Client {
    Client.assertValidName(input.name);
    if (input.notes !== null) Client.assertValidNotes(input.notes);
    return new Client({
      id: input.id,
      companyId: input.companyId,
      name: input.name.trim(),
      email: input.email,
      notes: input.notes?.trim() ?? null,
      deletedAt: null,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static reconstruct(props: ClientProps): Client {
    return new Client(props);
  }

  private static assertValidName(name: string): void {
    if (typeof name !== 'string') throw new ValidationError('Client name must be a string');
    const trimmed = name.trim();
    if (trimmed.length === 0) throw new ValidationError('Client name cannot be empty');
    if (trimmed.length > MAX_NAME_LENGTH) {
      throw new ValidationError(`Client name too long (max ${MAX_NAME_LENGTH})`);
    }
  }

  private static assertValidNotes(notes: string): void {
    if (notes.length > MAX_NOTES_LENGTH) {
      throw new ValidationError(`Client notes too long (max ${MAX_NOTES_LENGTH})`);
    }
  }

  rename(newName: string, now: string): void {
    Client.assertValidName(newName);
    this.props = { ...this.props, name: newName.trim(), updatedAt: now };
  }

  updateNotes(notes: string | null, now: string): void {
    if (notes !== null) Client.assertValidNotes(notes);
    this.props = { ...this.props, notes: notes?.trim() ?? null, updatedAt: now };
  }

  softDelete(now: string): void {
    if (this.props.deletedAt !== null) {
      throw new ValidationError('Client already deleted');
    }
    this.props = { ...this.props, deletedAt: now, updatedAt: now };
  }

  isDeleted(): boolean {
    return this.props.deletedAt !== null;
  }

  belongsToCompany(companyId: CompanyId): boolean {
    return this.props.companyId.equals(companyId);
  }

  get id(): ClientId {
    return this.props.id;
  }
  get companyId(): CompanyId {
    return this.props.companyId;
  }
  get name(): string {
    return this.props.name;
  }
  get email(): Email | null {
    return this.props.email;
  }
  get notes(): string | null {
    return this.props.notes;
  }
  get deletedAt(): string | null {
    return this.props.deletedAt;
  }
  get createdAt(): string {
    return this.props.createdAt;
  }
  get updatedAt(): string {
    return this.props.updatedAt;
  }
}
