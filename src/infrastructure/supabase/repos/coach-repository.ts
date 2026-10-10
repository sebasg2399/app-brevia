import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CoachRepository } from '@app/ports/coach-repository';
import { Coach } from '@domain/entities/coach';
import { CoachId, CompanyId, UserId } from '@domain/value-objects/branded-id';

interface CoachRow {
  id: string;
  user_id: string;
  company_id: string;
  display_name: string;
  bio: string;
  focus_areas: string[];
  hourly_rate_cents: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class SupabaseCoachRepository implements CoachRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findById(id: CoachId): Promise<Coach | null> {
    const { data, error } = await this.db
      .from('coaches')
      .select('*')
      .eq('id', id.toString())
      .maybeSingle<CoachRow>();
    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findByUserId(userId: UserId): Promise<Coach | null> {
    const { data, error } = await this.db
      .from('coaches')
      .select('*')
      .eq('user_id', userId.toString())
      .maybeSingle<CoachRow>();
    if (error || !data) return null;
    return this.toDomain(data);
  }

  async listByCompany(companyId: CompanyId): Promise<ReadonlyArray<Coach>> {
    const { data, error } = await this.db
      .from('coaches')
      .select('*')
      .eq('company_id', companyId.toString());
    if (error || !data) return [];
    return data.map((row) => this.toDomain(row as CoachRow));
  }

  async save(coach: Coach): Promise<void> {
    const row = {
      id: coach.id.toString(),
      user_id: coach.userId.toString(),
      company_id: coach.companyId.toString(),
      display_name: coach.displayName,
      bio: coach.bio,
      focus_areas: [...coach.focusAreas],
      hourly_rate_cents: coach.hourlyRateCents,
      is_active: coach.isActive,
      created_at: coach.createdAt,
      updated_at: coach.updatedAt,
    };
    const { error } = await this.db.from('coaches').upsert(row);
    if (error) throw new Error(`Failed to save coach: ${error.message}`);
  }

  private toDomain(row: CoachRow): Coach {
    return Coach.reconstruct({
      id: CoachId.fromString(row.id),
      userId: UserId.fromString(row.user_id),
      companyId: CompanyId.fromString(row.company_id),
      displayName: row.display_name,
      bio: row.bio,
      focusAreas: row.focus_areas,
      hourlyRateCents: row.hourly_rate_cents,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
