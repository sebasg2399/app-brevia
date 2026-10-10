import type { CoachId, CompanyId, UserId } from '@domain/value-objects/branded-id';
import { ValidationError } from '@domain/errors/domain-error';

const MAX_BIO_LENGTH = 2000;
const MAX_DISPLAY_NAME_LENGTH = 120;
const MAX_FOCUS_AREAS = 8;
const MIN_FOCUS_AREAS = 1;
const MAX_FOCUS_AREA_LENGTH = 40;
const FOCUS_AREA_REGEX = /^[^\x00-\x1F\x7F]+$/;

export interface CoachProps {
  readonly id: CoachId;
  readonly userId: UserId;
  readonly companyId: CompanyId;
  readonly displayName: string;
  readonly bio: string;
  readonly focusAreas: ReadonlyArray<string>;
  readonly hourlyRateCents: number;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CoachCreateInput {
  readonly id: CoachId;
  readonly userId: UserId;
  readonly companyId: CompanyId;
  readonly displayName: string;
  readonly bio: string;
  readonly focusAreas: ReadonlyArray<string>;
  readonly hourlyRateCents: number;
  readonly now: string;
}

export class Coach {
  private constructor(private props: CoachProps) {}

  static create(input: CoachCreateInput): Coach {
    Coach.assertValidDisplayName(input.displayName);
    Coach.assertValidBio(input.bio);
    Coach.assertValidFocusAreas(input.focusAreas);
    Coach.assertValidHourlyRate(input.hourlyRateCents);
    return new Coach({
      id: input.id,
      userId: input.userId,
      companyId: input.companyId,
      displayName: input.displayName.trim(),
      bio: input.bio.trim(),
      focusAreas: [...input.focusAreas],
      hourlyRateCents: input.hourlyRateCents,
      isActive: true,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static reconstruct(props: CoachProps): Coach {
    return new Coach(props);
  }

  private static assertValidDisplayName(name: string): void {
    if (typeof name !== 'string') throw new ValidationError('Display name must be a string');
    const trimmed = name.trim();
    if (trimmed.length === 0) throw new ValidationError('Display name cannot be empty');
    if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
      throw new ValidationError(`Display name too long (max ${MAX_DISPLAY_NAME_LENGTH})`);
    }
  }

  private static assertValidBio(bio: string): void {
    if (typeof bio !== 'string') throw new ValidationError('Bio must be a string');
    if (bio.length > MAX_BIO_LENGTH) {
      throw new ValidationError(`Bio too long (max ${MAX_BIO_LENGTH})`);
    }
  }

  private static assertValidFocusAreas(areas: ReadonlyArray<string>): void {
    if (!Array.isArray(areas)) throw new ValidationError('Focus areas must be an array');
    if (areas.length < MIN_FOCUS_AREAS || areas.length > MAX_FOCUS_AREAS) {
      throw new ValidationError(
        `Focus areas must be between ${MIN_FOCUS_AREAS} and ${MAX_FOCUS_AREAS}`,
      );
    }
    for (const a of areas) {
      if (typeof a !== 'string' || a.length === 0 || a.length > MAX_FOCUS_AREA_LENGTH) {
        throw new ValidationError(`Focus area must be 1-${MAX_FOCUS_AREA_LENGTH} chars`);
      }
      if (!FOCUS_AREA_REGEX.test(a)) {
        throw new ValidationError('Focus area contains control characters');
      }
    }
  }

  private static assertValidHourlyRate(cents: number): void {
    if (!Number.isInteger(cents)) {
      throw new ValidationError('Hourly rate must be an integer (cents)');
    }
    if (cents < 0) {
      throw new ValidationError('Hourly rate cannot be negative');
    }
  }

  updateBio(newBio: string, now: string): void {
    Coach.assertValidBio(newBio);
    this.props = { ...this.props, bio: newBio.trim(), updatedAt: now };
  }

  updateFocusAreas(areas: ReadonlyArray<string>, now: string): void {
    Coach.assertValidFocusAreas(areas);
    this.props = { ...this.props, focusAreas: [...areas], updatedAt: now };
  }

  updateHourlyRate(cents: number, now: string): void {
    Coach.assertValidHourlyRate(cents);
    this.props = { ...this.props, hourlyRateCents: cents, updatedAt: now };
  }

  deactivate(now: string): void {
    this.props = { ...this.props, isActive: false, updatedAt: now };
  }

  activate(now: string): void {
    this.props = { ...this.props, isActive: true, updatedAt: now };
  }

  belongsToCompany(companyId: CompanyId): boolean {
    return this.props.companyId.equals(companyId);
  }

  get id(): CoachId {
    return this.props.id;
  }
  get userId(): UserId {
    return this.props.userId;
  }
  get companyId(): CompanyId {
    return this.props.companyId;
  }
  get displayName(): string {
    return this.props.displayName;
  }
  get bio(): string {
    return this.props.bio;
  }
  get focusAreas(): ReadonlyArray<string> {
    return this.props.focusAreas;
  }
  get hourlyRateCents(): number {
    return this.props.hourlyRateCents;
  }
  get isActive(): boolean {
    return this.props.isActive;
  }
  get createdAt(): string {
    return this.props.createdAt;
  }
  get updatedAt(): string {
    return this.props.updatedAt;
  }
}
