import { randomUUID } from 'node:crypto';
import type { IdGenerator } from '@app/ports/id-generator';
import {
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

export class NodeIdGenerator implements IdGenerator {
  newUserId(): UserId {
    return UserId.fromString(randomUUID());
  }
  newCompanyId(): CompanyId {
    return CompanyId.fromString(randomUUID());
  }
  newMembershipId(): MembershipId {
    return MembershipId.fromString(randomUUID());
  }
  newInvitationId(): InvitationId {
    return InvitationId.fromString(randomUUID());
  }
  newCoachId(): CoachId {
    return CoachId.fromString(randomUUID());
  }
  newClientId(): ClientId {
    return ClientId.fromString(randomUUID());
  }
  newSessionId(): SessionId {
    return SessionId.fromString(randomUUID());
  }
  newTranscriptId(): TranscriptId {
    return TranscriptId.fromString(randomUUID());
  }
  newAINoteId(): AINoteId {
    return AINoteId.fromString(randomUUID());
  }
}