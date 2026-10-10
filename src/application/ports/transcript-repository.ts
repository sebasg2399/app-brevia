import type { Transcript } from '@domain/entities/transcript';
import type { CompanyId, SessionId, TranscriptId } from '@domain/value-objects/branded-id';

export interface TranscriptRepository {
  findById(id: TranscriptId): Promise<Transcript | null>;
  findBySessionId(sessionId: SessionId): Promise<Transcript | null>;
  save(transcript: Transcript): Promise<void>;
  countByCompanyInMonth(companyId: CompanyId, yearMonth: string): Promise<number>;
  countByCompanyInMonthWithNotes(companyId: CompanyId, yearMonth: string): Promise<number>;
}
