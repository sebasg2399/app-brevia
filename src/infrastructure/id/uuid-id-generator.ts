import { randomUUID } from 'node:crypto';
import type { IdGenerator } from '@app/ports/id-generator';
import {
  CompanyId,
  InvitationId,
  MembershipId,
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
}