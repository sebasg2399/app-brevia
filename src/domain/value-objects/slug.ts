const MAX_SLUG_LENGTH = 63;
const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export class Slug {
  private constructor(public readonly value: string) {}

  static create(raw: string): Slug {
    if (typeof raw !== 'string' || raw.length === 0) {
      throw new Error('Slug cannot be empty');
    }
    if (raw.length > MAX_SLUG_LENGTH) {
      throw new Error(`Slug too long (max ${MAX_SLUG_LENGTH})`);
    }
    if (!SLUG_REGEX.test(raw)) {
      if (raw.startsWith('-') || raw.endsWith('-')) {
        throw new Error('Slug cannot start or end with a hyphen');
      }
      if (raw.includes('--')) {
        throw new Error('Slug cannot have consecutive hyphens');
      }
      throw new Error('Slug must be lowercase kebab-case');
    }
    return new Slug(raw);
  }

  static fromString(raw: string): Slug {
    const normalized = raw
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, MAX_SLUG_LENGTH);

    if (normalized.length === 0) {
      return new Slug('workspace');
    }
    return new Slug(normalized);
  }

  equals(other: Slug): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
