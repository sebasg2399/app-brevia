const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class UserId {
  readonly _brand!: 'UserId';
  private constructor(public readonly value: string) {}

  static fromString(raw: string): UserId {
    if (typeof raw !== 'string' || !UUID_REGEX.test(raw)) {
      throw new Error(`Invalid UUID: ${raw}`);
    }
    return new UserId(raw);
  }

  equals(other: UserId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

export class CompanyId {
  readonly _brand!: 'CompanyId';
  private constructor(public readonly value: string) {}

  static fromString(raw: string): CompanyId {
    if (typeof raw !== 'string' || !UUID_REGEX.test(raw)) {
      throw new Error(`Invalid UUID: ${raw}`);
    }
    return new CompanyId(raw);
  }

  equals(other: CompanyId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

export class MembershipId {
  readonly _brand!: 'MembershipId';
  private constructor(public readonly value: string) {}

  static fromString(raw: string): MembershipId {
    if (typeof raw !== 'string' || !UUID_REGEX.test(raw)) {
      throw new Error(`Invalid UUID: ${raw}`);
    }
    return new MembershipId(raw);
  }

  equals(other: MembershipId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

export class InvitationId {
  readonly _brand!: 'InvitationId';
  private constructor(public readonly value: string) {}

  static fromString(raw: string): InvitationId {
    if (typeof raw !== 'string' || !UUID_REGEX.test(raw)) {
      throw new Error(`Invalid UUID: ${raw}`);
    }
    return new InvitationId(raw);
  }

  equals(other: InvitationId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}