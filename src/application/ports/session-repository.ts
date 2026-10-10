import type { Session, SessionStatus } from '@domain/entities/session';
import type {
  ClientId,
  CoachId,
  CompanyId,
  SessionId,
} from '@domain/value-objects/branded-id';

export interface SessionRepository {
  findById(id: SessionId): Promise<Session | null>;
  listByCompany(companyId: CompanyId, status?: SessionStatus): Promise<ReadonlyArray<Session>>;
  listByCoach(coachId: CoachId, status?: SessionStatus): Promise<ReadonlyArray<Session>>;
  listByClient(clientId: ClientId, status?: SessionStatus): Promise<ReadonlyArray<Session>>;
  listByCoachAndClient(coachId: CoachId, clientId: ClientId): Promise<ReadonlyArray<Session>>;
  save(session: Session): Promise<void>;
}