import type { Invitation } from '@domain/entities/invitation';
import type { CompanyId, InvitationId } from '@domain/value-objects/branded-id';
import type { Email } from '@domain/value-objects/email';

export interface InvitationRepository {
  findById(id: InvitationId): Promise<Invitation | null>;
  findByTokenHash(tokenHash: string): Promise<Invitation | null>;
  findPendingByCompanyAndEmail(companyId: CompanyId, email: Email): Promise<Invitation | null>;
  save(invitation: Invitation): Promise<void>;
  deleteExpired(now: string): Promise<number>;
}