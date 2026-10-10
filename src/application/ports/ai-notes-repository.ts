import type { AINotes } from '@domain/entities/ai-notes';
import type { AINoteId, CompanyId, TranscriptId } from '@domain/value-objects/branded-id';

export interface AINotesRepository {
  findById(id: AINoteId): Promise<AINotes | null>;
  findByTranscriptId(transcriptId: TranscriptId): Promise<AINotes | null>;
  save(notes: AINotes): Promise<void>;
  countGeneratedByCompanyInMonth(companyId: CompanyId, yearMonth: string): Promise<number>;
}
