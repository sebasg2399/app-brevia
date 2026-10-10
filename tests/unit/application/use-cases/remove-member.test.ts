import { describe, it, expect, beforeEach } from 'vitest';
import { RemoveMember } from '@app/use-cases/remove-member';
import { Company } from '@domain/entities/company';
import { Membership } from '@domain/entities/membership';
import { CompanyId, MembershipId, UserId } from '@domain/value-objects/branded-id';
import { Slug } from '@domain/value-objects/slug';
import { FakeIdGenerator, InMemoryMembershipRepository } from '../__support__/fakes';

describe('RemoveMember', () => {
  const ownerId = UserId.fromString('12345678-1234-4234-8234-123456789012');
  const coachId = UserId.fromString('22345678-1234-4234-8234-123456789012');
  const coach2Id = UserId.fromString('32345678-1234-4234-8234-123456789012');
  const companyId = CompanyId.fromString('42345678-1234-4234-8234-123456789012');

  let memberships: InMemoryMembershipRepository;
  let ownerMembershipId: MembershipId;
  let coachMembershipId: MembershipId;

  beforeEach(async () => {
    memberships = new InMemoryMembershipRepository();
    const ids = new FakeIdGenerator();
    const now = '2026-01-01T00:00:00.000Z';

    ownerMembershipId = ids.newMembershipId();
    coachMembershipId = ids.newMembershipId();

    await memberships.save(
      Membership.create({
        id: ownerMembershipId,
        companyId,
        userId: ownerId,
        role: 'owner',
        now,
      }),
    );
    await memberships.save(
      Membership.create({
        id: coachMembershipId,
        companyId,
        userId: coachId,
        role: 'coach',
        now,
      }),
    );
  });

  it('owner can remove a coach', async () => {
    const sut = new RemoveMember({ memberships });
    await sut.execute({ companyId, actorId: ownerId, membershipId: coachMembershipId });
    const found = await memberships.findById(coachMembershipId);
    expect(found).toBeNull();
  });

  it('non-owner cannot remove members', async () => {
    const sut = new RemoveMember({ memberships });
    await memberships.save(
      Membership.create({
        id: new FakeIdGenerator().newMembershipId(),
        companyId,
        userId: coach2Id,
        role: 'coach',
        now: '2026-01-01T00:00:00.000Z',
      }),
    );

    const coach2Membership = (await memberships.listByCompany(companyId)).find((m) =>
      m.userId.equals(coach2Id),
    );
    expect(coach2Membership).toBeDefined();

    await expect(
      sut.execute({ companyId, actorId: coachId, membershipId: coach2Membership!.id }),
    ).rejects.toThrow(/only the workspace owner/i);
  });

  it('cannot remove the owner', async () => {
    const sut = new RemoveMember({ memberships });
    await expect(
      sut.execute({ companyId, actorId: ownerId, membershipId: ownerMembershipId }),
    ).rejects.toThrow(/cannot remove the workspace owner/i);
  });

  it('cannot remove a member from another company', async () => {
    const otherCompanyId = CompanyId.fromString('52345678-1234-4234-8234-123456789012');
    const sut = new RemoveMember({ memberships });
    await expect(
      sut.execute({ companyId: otherCompanyId, actorId: ownerId, membershipId: coachMembershipId }),
    ).rejects.toThrow(/only the workspace owner/i);
  });

  it('removing non-existent membership throws not found', async () => {
    const sut = new RemoveMember({ memberships });
    const ghostId = new FakeIdGenerator().newMembershipId();
    await expect(
      sut.execute({ companyId, actorId: ownerId, membershipId: ghostId }),
    ).rejects.toThrow(/not found/i);
  });

  it('after removal, coach loses access to company', async () => {
    const sut = new RemoveMember({ memberships });
    await sut.execute({ companyId, actorId: ownerId, membershipId: coachMembershipId });
    const remaining = await memberships.listByUser(coachId);
    expect(remaining).toHaveLength(0);
  });

  // suppress unused import warning for Company/Slug used by setup elsewhere
  void Company;
  void Slug;
});
