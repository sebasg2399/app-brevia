import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TranscriptRepository } from '@app/ports/transcript-repository';
import { Transcript } from '@domain/entities/transcript';
import { CompanyId, SessionId, TranscriptId } from '@domain/value-objects/branded-id';

interface TranscriptRow {
  id: string;
  company_id: string;
  session_id: string;
  text: string;
  created_at: string;
}

export class SupabaseTranscriptRepository implements TranscriptRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findById(id: TranscriptId): Promise<Transcript | null> {
    const { data, error } = await this.db
      .from('transcripts')
      .select('*')
      .eq('id', id.toString())
      .maybeSingle<TranscriptRow>();
    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findBySessionId(sessionId: SessionId): Promise<Transcript | null> {
    const { data, error } = await this.db
      .from('transcripts')
      .select('*')
      .eq('session_id', sessionId.toString())
      .maybeSingle<TranscriptRow>();
    if (error || !data) return null;
    return this.toDomain(data);
  }

  async save(transcript: Transcript): Promise<void> {
    const row = {
      id: transcript.id.toString(),
      company_id: transcript.companyId.toString(),
      session_id: transcript.sessionId.toString(),
      text: transcript.text,
      created_at: transcript.createdAt,
    };
    const { error } = await this.db.from('transcripts').upsert(row);
    if (error) throw new Error(`Failed to save transcript: ${error.message}`);
  }

  async countByCompanyInMonth(): Promise<number> {
    return 0;
  }

  async countByCompanyInMonthWithNotes(): Promise<number> {
    return 0;
  }

  private toDomain(row: TranscriptRow): Transcript {
    return Transcript.reconstruct({
      id: TranscriptId.fromString(row.id),
      companyId: CompanyId.fromString(row.company_id),
      sessionId: SessionId.fromString(row.session_id),
      text: row.text,
      createdAt: row.created_at,
    });
  }
}