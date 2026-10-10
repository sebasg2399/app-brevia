export interface WebhookEventRepository {
  /** Returns true if the event was already processed (idempotency check). */
  hasProcessed(eventId: string, source: string): Promise<boolean>;
  /** Atomically marks the event as processed. Returns true on first mark, false on duplicate. */
  markProcessed(eventId: string, source: string): Promise<boolean>;
}
