import type {
  AINoteId,
  ClientId,
  CoachId,
  CompanyId,
  InvitationId,
  MembershipId,
  SessionId,
  TranscriptId,
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
  newTranscriptId(): TranscriptId;
  newAINoteId(): AINoteId;
}