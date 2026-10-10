import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WebhookEventRepository } from '@app/ports/webhook-event-repository';

/**
 * Idempotency table for inbound webhooks. Stores event_id + source; primary
 * key violation means the event was already processed.
 */
export class SupabaseWebhookEventRepository implements WebhookEventRepository {
  constructor(private readonly db: SupabaseClient) {}

  async hasProcessed(eventId: string, source: string): Promise<boolean> {
    const { data, error } = await this.db
      .from('processed_webhook_events')
      .select('event_id')
      .eq('source', source)
      .eq('event_id', eventId)
      .maybeSingle();
    if (error) return false;
    return data !== null;
  }

  async markProcessed(eventId: string, source: string): Promise<boolean> {
    const { error } = await this.db.from('processed_webhook_events').insert({
      source,
      event_id: eventId,
    });
    if (error) {
      // 23505 = unique_violation → already processed
      if (error.code === '23505') return false;
      throw new Error(`Failed to mark webhook processed: ${error.message}`);
    }
    return true;
  }
}
