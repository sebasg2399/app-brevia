export function currentYearMonth(now: string): string {
  // ISO format: YYYY-MM (UTC)
  return now.slice(0, 7);
}
