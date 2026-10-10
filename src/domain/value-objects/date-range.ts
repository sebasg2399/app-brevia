function isIsoDatetime(value: string): boolean {
  const ts = Date.parse(value);
  return Number.isFinite(ts) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value);
}

export class DateRange {
  private constructor(
    public readonly start: string,
    public readonly end: string,
  ) {}

  static create(start: string, end: string): DateRange {
    if (!isIsoDatetime(start)) {
      throw new Error(`Invalid ISO datetime: ${start}`);
    }
    if (!isIsoDatetime(end)) {
      throw new Error(`Invalid ISO datetime: ${end}`);
    }
    if (Date.parse(start) > Date.parse(end)) {
      throw new Error('DateRange start must be before or equal to end');
    }
    return new DateRange(start, end);
  }

  contains(isoDatetime: string): boolean {
    const t = Date.parse(isoDatetime);
    return t >= Date.parse(this.start) && t <= Date.parse(this.end);
  }

  overlaps(other: DateRange): boolean {
    const a = Date.parse(this.start);
    const b = Date.parse(this.end);
    const c = Date.parse(other.start);
    const d = Date.parse(other.end);
    return a <= d && c <= b;
  }
}