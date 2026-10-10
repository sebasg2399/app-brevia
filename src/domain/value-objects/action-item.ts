import { ValidationError } from '@domain/errors/domain-error';

export interface ActionItemProps {
  readonly title: string;
  readonly dueDate: string | null;
}

const MAX_TITLE_LENGTH = 200;
const MAX_ACTION_ITEMS = 7;

export class ActionItem {
  private constructor(public readonly title: string, public readonly dueDate: string | null) {}

  static create(input: ActionItemProps): ActionItem {
    if (typeof input.title !== 'string') {
      throw new ValidationError('Action item title must be a string');
    }
    const trimmed = input.title.trim();
    if (trimmed.length === 0) {
      throw new ValidationError('Action item title cannot be empty');
    }
    if (trimmed.length > MAX_TITLE_LENGTH) {
      throw new ValidationError(`Action item title too long (max ${MAX_TITLE_LENGTH})`);
    }
    let dueDate: string | null = null;
    if (input.dueDate !== null) {
      const ts = Date.parse(input.dueDate);
      if (!Number.isFinite(ts)) {
        throw new ValidationError(`Invalid dueDate: ${input.dueDate}`);
      }
      dueDate = new Date(ts).toISOString();
    }
    return new ActionItem(trimmed, dueDate);
  }

  static fromJSON(raw: unknown): ActionItem {
    if (!raw || typeof raw !== 'object') {
      throw new ValidationError('Action item must be an object');
    }
    const obj = raw as Record<string, unknown>;
    return ActionItem.create({
      title: String(obj['title'] ?? ''),
      dueDate: (obj['dueDate'] as string | null | undefined) ?? null,
    });
  }

  toJSON(): ActionItemProps {
    return { title: this.title, dueDate: this.dueDate };
  }
}

export const MAX_SUMMARY_WORDS = 500;
export const MAX_BRIEF_WORDS = 300;
export const MIN_ACTION_ITEMS = 1;

export function countWords(s: string): number {
  const trimmed = s.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/u).length;
}

export function assertActionItemsShape(raw: unknown): readonly ActionItem[] {
  if (!Array.isArray(raw)) {
    throw new ValidationError('actionItems must be an array');
  }
  if (raw.length < MIN_ACTION_ITEMS || raw.length > MAX_ACTION_ITEMS) {
    throw new ValidationError(
      `actionItems must have ${MIN_ACTION_ITEMS}-${MAX_ACTION_ITEMS} items`,
    );
  }
  return raw.map((r) => ActionItem.fromJSON(r));
}

export function assertSummaryShape(s: unknown): string {
  if (typeof s !== 'string') throw new ValidationError('summary must be a string');
  if (countWords(s) > MAX_SUMMARY_WORDS) {
    throw new ValidationError(`summary too long (max ${MAX_SUMMARY_WORDS} words)`);
  }
  return s;
}

export function assertBriefShape(s: unknown): string {
  if (typeof s !== 'string') throw new ValidationError('nextSessionBrief must be a string');
  if (countWords(s) > MAX_BRIEF_WORDS) {
    throw new ValidationError(`nextSessionBrief too long (max ${MAX_BRIEF_WORDS} words)`);
  }
  return s;
}