const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

export class Email {
  private constructor(public readonly value: string) {}

  static create(raw: string): Email {
    if (typeof raw !== 'string') {
      throw new Error('Email must be a string');
    }
    const trimmed = raw.trim().toLowerCase();
    if (trimmed.length === 0) {
      throw new Error('Email cannot be empty');
    }
    if (trimmed.length > MAX_EMAIL_LENGTH) {
      throw new Error('Email too long');
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      throw new Error('Invalid email format');
    }
    return new Email(trimmed);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
