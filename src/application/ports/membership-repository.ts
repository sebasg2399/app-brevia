import type { Membership, Role } from '@domain/entities/membership';
import type { CompanyId, MembershipId, UserId } from '@domain/value-objects/branded-id';

export interface MembershipRepository {
  findById(id: MembershipId): Promise<Membership | null>;
  findByCompanyAndUser(companyId: CompanyId, userId: UserId): Promise<Membership | null>;
  listByCompany(companyId: CompanyId): Promise<ReadonlyArray<Membership>>;
  listByUser(userId: UserId): Promise<ReadonlyArray<Membership>>;
  save(membership: Membership): Promise<void>;
  delete(id: MembershipId): Promise<void>;
  countByRole(companyId: CompanyId, role: Role): Promise<number>;
}
