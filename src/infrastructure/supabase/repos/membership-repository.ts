import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MembershipRepository } from '@app/ports/membership-repository';
import { Membership, type Role } from '@domain/entities/membership';
import { CompanyId, MembershipId, UserId } from '@domain/value-objects/branded-id';

interface MembershipRow {
  id: string;
  company_id: string;
  user_id: string;
  role: Role;
  created_at: string;
  updated_at: string;
}

export class SupabaseMembershipRepository implements MembershipRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findById(id: MembershipId): Promise<Membership | null> {
    const { data, error } = await this.db
      .from('memberships')
      .select('*')
      .eq('id', id.toString())
      .maybeSingle<MembershipRow>();
    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findByCompanyAndUser(companyId: CompanyId, userId: UserId): Promise<Membership | null> {
    const { data, error } = await this.db
      .from('memberships')
      .select('*')
      .eq('company_id', companyId.toString())
      .eq('user_id', userId.toString())
      .maybeSingle<MembershipRow>();
    if (error || !data) return null;
    return this.toDomain(data);
  }

  async listByCompany(companyId: CompanyId): Promise<ReadonlyArray<Membership>> {
    const { data, error } = await this.db
      .from('memberships')
      .select('*')
      .eq('company_id', companyId.toString());
    if (error || !data) return [];
    return data.map((row) => this.toDomain(row as MembershipRow));
  }

  async listByUser(userId: UserId): Promise<ReadonlyArray<Membership>> {
    const { data, error } = await this.db
      .from('memberships')
      .select('*')
      .eq('user_id', userId.toString());
    if (error || !data) return [];
    return data.map((row) => this.toDomain(row as MembershipRow));
  }

  async save(membership: Membership): Promise<void> {
    const row = {
      id: membership.id.toString(),
      company_id: membership.companyId.toString(),
      user_id: membership.userId.toString(),
      role: membership.role,
      created_at: membership.createdAt,
      updated_at: membership.updatedAt,
    };
    const { error } = await this.db.from('memberships').upsert(row);
    if (error) throw new Error(`Failed to save membership: ${error.message}`);
  }

  async delete(id: MembershipId): Promise<void> {
    const { error } = await this.db.from('memberships').delete().eq('id', id.toString());
    if (error) throw new Error(`Failed to delete membership: ${error.message}`);
  }

  async countByRole(companyId: CompanyId, role: Role): Promise<number> {
    const { count, error } = await this.db
      .from('memberships')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId.toString())
      .eq('role', role);
    if (error) throw new Error(`Failed to count memberships: ${error.message}`);
    return count ?? 0;
  }

  private toDomain(row: MembershipRow): Membership {
    return Membership.reconstruct({
      id: MembershipId.fromString(row.id),
      companyId: CompanyId.fromString(row.company_id),
      userId: UserId.fromString(row.user_id),
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}