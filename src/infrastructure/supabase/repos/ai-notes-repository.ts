import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AINotesRepository } from '@app/ports/ai-notes-repository';
import { AINotes, type AINotesStatus } from '@domain/entities/ai-notes';
import { AINoteId, CompanyId, TranscriptId } from '@domain/value-objects/branded-id';
import { ActionItem } from '@domain/value-objects/action-item';

interface ActionItemJson {
  title: string;
  dueDate: string | null;
}

interface AINotesRow {
  id: string;
  company_id: string;
  transcript_id: string;
  status: AINotesStatus;
  summary: string;
  action_items: ActionItemJson[];
  next_session_brief: string;
  model: string | null;
  raw_response: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export class SupabaseAINotesRepository implements AINotesRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findById(id: AINoteId): Promise<AINotes | null> {
    const { data, error } = await this.db
      .from('ai_notes')
      .select('*')
      .eq('id', id.toString())
      .maybeSingle<AINotesRow>();
    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findByTranscriptId(transcriptId: TranscriptId): Promise<AINotes | null> {
    const { data, error } = await this.db
      .from('ai_notes')
      .select('*')
      .eq('transcript_id', transcriptId.toString())
      .maybeSingle<AINotesRow>();
    if (error || !data) return null;
    return this.toDomain(data);
  }

  async save(notes: AINotes): Promise<void> {
    const row = {
      id: notes.id.toString(),
      company_id: notes.companyId.toString(),
      transcript_id: notes.transcriptId.toString(),
      status: notes.status,
      summary: notes.summary,
      action_items: notes.actionItems.map((a) => a.toJSON()),
      next_session_brief: notes.nextSessionBrief,
      model: notes.model,
      raw_response: notes.rawResponse,
      error_message: notes.errorMessage,
      created_at: notes.createdAt,
      updated_at: notes.updatedAt,
    };
    const { error } = await this.db.from('ai_notes').upsert(row);
    if (error) throw new Error(`Failed to save AI notes: ${error.message}`);
  }

  async countGeneratedByCompanyInMonth(companyId: CompanyId, yearMonth: string): Promise<number> {
    const { count, error } = await this.db
      .from('ai_notes')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId.toString())
      .eq('status', 'ready')
      .gte('created_at', `${yearMonth}-01T00:00:00.000Z`)
      .lt('created_at', `${yearMonth}-32T00:00:00.000Z`);
    if (error) throw new Error(`Failed to count AI notes: ${error.message}`);
    return count ?? 0;
  }

  private toDomain(row: AINotesRow): AINotes {
    return AINotes.reconstruct({
      id: AINoteId.fromString(row.id),
      companyId: CompanyId.fromString(row.company_id),
      transcriptId: TranscriptId.fromString(row.transcript_id),
      status: row.status,
      summary: row.summary,
      actionItems: (row.action_items ?? []).map((j) =>
        ActionItem.create({ title: j.title, dueDate: j.dueDate }),
      ),
      nextSessionBrief: row.next_session_brief,
      model: row.model,
      rawResponse: row.raw_response,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}