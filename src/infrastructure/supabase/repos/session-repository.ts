import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionRepository } from '@app/ports/session-repository';
import { Session, type SessionStatus } from '@domain/entities/session';
import { ClientId, CoachId, CompanyId, SessionId } from '@domain/value-objects/branded-id';

interface SessionRow {
  id: string;
  company_id: string;
  coach_id: string;
  client_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: SessionStatus;
  completed_at: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

export class SupabaseSessionRepository implements SessionRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findById(id: SessionId): Promise<Session | null> {
    const { data, error } = await this.db
      .from('sessions')
      .select('*')
      .eq('id', id.toString())
      .maybeSingle<SessionRow>();
    if (error || !data) return null;
    return this.toDomain(data);
  }

  async listByCompany(
    companyId: CompanyId,
    status?: SessionStatus,
  ): Promise<ReadonlyArray<Session>> {
    let query = this.db.from('sessions').select('*').eq('company_id', companyId.toString());
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((row) => this.toDomain(row as SessionRow));
  }

  async listByCoach(coachId: CoachId, status?: SessionStatus): Promise<ReadonlyArray<Session>> {
    let query = this.db.from('sessions').select('*').eq('coach_id', coachId.toString());
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((row) => this.toDomain(row as SessionRow));
  }

  async listByClient(clientId: ClientId, status?: SessionStatus): Promise<ReadonlyArray<Session>> {
    let query = this.db.from('sessions').select('*').eq('client_id', clientId.toString());
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((row) => this.toDomain(row as SessionRow));
  }

  async listByCoachAndClient(
    coachId: CoachId,
    clientId: ClientId,
  ): Promise<ReadonlyArray<Session>> {
    const { data, error } = await this.db
      .from('sessions')
      .select('*')
      .eq('coach_id', coachId.toString())
      .eq('client_id', clientId.toString());
    if (error || !data) return [];
    return data.map((row) => this.toDomain(row as SessionRow));
  }

  async save(session: Session): Promise<void> {
    const row = {
      id: session.id.toString(),
      company_id: session.companyId.toString(),
      coach_id: session.coachId.toString(),
      client_id: session.clientId.toString(),
      scheduled_at: session.scheduledAt,
      duration_minutes: session.durationMinutes,
      status: session.status,
      completed_at: session.completedAt,
      canceled_at: session.canceledAt,
      created_at: session.createdAt,
      updated_at: session.updatedAt,
    };
    const { error } = await this.db.from('sessions').upsert(row);
    if (error) throw new Error(`Failed to save session: ${error.message}`);
  }

  private toDomain(row: SessionRow): Session {
    return Session.reconstruct({
      id: SessionId.fromString(row.id),
      companyId: CompanyId.fromString(row.company_id),
      coachId: CoachId.fromString(row.coach_id),
      clientId: ClientId.fromString(row.client_id),
      scheduledAt: row.scheduled_at,
      durationMinutes: row.duration_minutes,
      status: row.status,
      completedAt: row.completed_at,
      canceledAt: row.canceled_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
