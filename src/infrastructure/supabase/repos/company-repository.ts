import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CompanyRepository } from '@app/ports/company-repository';
import { Company } from '@domain/entities/company';
import { CompanyId, UserId } from '@domain/value-objects/branded-id';
import { Slug } from '@domain/value-objects/slug';
import type { Email as EmailVO } from '@domain/value-objects/email';

interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export class SupabaseCompanyRepository implements CompanyRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findById(id: CompanyId): Promise<Company | null> {
    const { data, error } = await this.db
      .from('companies')
      .select('*')
      .eq('id', id.toString())
      .maybeSingle<CompanyRow>();
    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findBySlug(slug: Slug): Promise<Company | null> {
    const { data, error } = await this.db
      .from('companies')
      .select('*')
      .eq('slug', slug.value)
      .maybeSingle<CompanyRow>();
    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findByOwnerId(ownerId: UserId): Promise<Company | null> {
    const { data, error } = await this.db
      .from('companies')
      .select('*')
      .eq('owner_id', ownerId.toString())
      .maybeSingle<CompanyRow>();
    if (error || !data) return null;
    return this.toDomain(data);
  }

  async save(company: Company): Promise<void> {
    const row = {
      id: company.id.toString(),
      name: company.name,
      slug: company.slug.value,
      owner_id: company.ownerId.toString(),
      created_at: company.createdAt,
      updated_at: company.updatedAt,
    };
    const { error } = await this.db.from('companies').upsert(row);
    if (error) throw new Error(`Failed to save company: ${error.message}`);
  }

  private toDomain(row: CompanyRow): Company {
    return Company.reconstruct({
      id: CompanyId.fromString(row.id),
      name: row.name,
      slug: Slug.create(row.slug),
      ownerId: UserId.fromString(row.owner_id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}

// Re-export to avoid unused import warning in environments without Supabase types
export type { EmailVO };