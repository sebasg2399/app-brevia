import type {
  ClientId,
  CoachId,
  CompanyId,
  InvitationId,
  MembershipId,
  SessionId,
  UserId,
} from '@domain/value-objects/branded-id';

export interface IdGenerator {
  newUserId(): UserId;
  newCompanyId(): CompanyId;
  newMembershipId(): MembershipId;
  newInvitationId(): InvitationId;
  newCoachId(): CoachId;
  newClientId(): ClientId;
  newSessionId(): SessionId;
}