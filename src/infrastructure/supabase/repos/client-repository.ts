import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClientRepository } from '@app/ports/client-repository';
import { Client } from '@domain/entities/client';
import { ClientId, CompanyId } from '@domain/value-objects/branded-id';
import { Email } from '@domain/value-objects/email';

interface ClientRow {
  id: string;
  company_id: string;
  name: string;
  email: string | null;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export class SupabaseClientRepository implements ClientRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findById(id: ClientId): Promise<Client | null> {
    const { data, error } = await this.db
      .from('clients')
      .select('*')
      .eq('id', id.toString())
      .maybeSingle<ClientRow>();
    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findActiveByCompanyAndEmail(companyId: CompanyId, email: Email): Promise<Client | null> {
    const { data, error } = await this.db
      .from('clients')
      .select('*')
      .eq('company_id', companyId.toString())
      .eq('email', email.value)
      .is('deleted_at', null)
      .maybeSingle<ClientRow>();
    if (error || !data) return null;
    return this.toDomain(data);
  }

  async listByCompany(
    companyId: CompanyId,
    includeDeleted = false,
  ): Promise<ReadonlyArray<Client>> {
    let query = this.db.from('clients').select('*').eq('company_id', companyId.toString());
    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((row) => this.toDomain(row as ClientRow));
  }

  async save(client: Client): Promise<void> {
    const row = {
      id: client.id.toString(),
      company_id: client.companyId.toString(),
      name: client.name,
      email: client.email?.value ?? null,
      notes: client.notes,
      deleted_at: client.deletedAt,
      created_at: client.createdAt,
      updated_at: client.updatedAt,
    };
    const { error } = await this.db.from('clients').upsert(row);
    if (error) throw new Error(`Failed to save client: ${error.message}`);
  }

  private toDomain(row: ClientRow): Client {
    return Client.reconstruct({
      id: ClientId.fromString(row.id),
      companyId: CompanyId.fromString(row.company_id),
      name: row.name,
      email: row.email ? Email.create(row.email) : null,
      notes: row.notes,
      deletedAt: row.deleted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
