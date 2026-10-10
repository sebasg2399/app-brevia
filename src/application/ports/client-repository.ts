import type { Client } from '@domain/entities/client';
import type { ClientId, CompanyId } from '@domain/value-objects/branded-id';
import type { Email } from '@domain/value-objects/email';

export interface ClientRepository {
  findById(id: ClientId): Promise<Client | null>;
  findActiveByCompanyAndEmail(companyId: CompanyId, email: Email): Promise<Client | null>;
  listByCompany(companyId: CompanyId, includeDeleted?: boolean): Promise<ReadonlyArray<Client>>;
  save(client: Client): Promise<void>;
}
