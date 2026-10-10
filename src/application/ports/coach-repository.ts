import type { Coach } from '@domain/entities/coach';
import type { CoachId, CompanyId, UserId } from '@domain/value-objects/branded-id';

export interface CoachRepository {
  findById(id: CoachId): Promise<Coach | null>;
  findByUserId(userId: UserId): Promise<Coach | null>;
  listByCompany(companyId: CompanyId): Promise<ReadonlyArray<Coach>>;
  save(coach: Coach): Promise<void>;
}
