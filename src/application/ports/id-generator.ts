import type {
  CompanyId,
  InvitationId,
  MembershipId,
  UserId,
} from '@domain/value-objects/branded-id';

export interface IdGenerator {
  newUserId(): UserId;
  newCompanyId(): CompanyId;
  newMembershipId(): MembershipId;
  newInvitationId(): InvitationId;
}