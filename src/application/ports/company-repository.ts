import type { Company } from '@domain/entities/company';
import type { CompanyId, UserId } from '@domain/value-objects/branded-id';
import type { Slug } from '@domain/value-objects/slug';

export interface CompanyRepository {
  findById(id: CompanyId): Promise<Company | null>;
  findBySlug(slug: Slug): Promise<Company | null>;
  findByOwnerId(ownerId: UserId): Promise<Company | null>;
  save(company: Company): Promise<void>;
}
