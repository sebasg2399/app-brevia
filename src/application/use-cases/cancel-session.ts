import type { SessionRepository } from '@app/ports/session-repository';
import type { CoachRepository } from '@app/ports/coach-repository';
import type { MembershipRepository } from '@app/ports/membership-repository';
import type { Clock } from '@app/ports/clock';
import type { CompanyId, SessionId, UserId } from '@domain/value-objects/branded-id';
import { ForbiddenError, NotFoundError } from '@domain/errors/domain-error';

export class CancelSession {
  constructor(
    private readonly deps: {
      sessions: SessionRepository;
      coaches: CoachRepository;
      memberships: MembershipRepository;
      clock: Clock;
    },
  ) {}

  async execute(input: {
    companyId: CompanyId;
    actorId: UserId;
    sessionId: SessionId;
  }): Promise<void> {
    const session = await this.deps.sessions.findById(input.sessionId);
    if (!session) throw new NotFoundError('Session', input.sessionId.toString());
    if (!session.belongsToCompany(input.companyId)) {
      throw new ForbiddenError('Session does not belong to this workspace');
    }
    const coach = await this.deps.coaches.findById(session.coachId);
    const isOwner = await this.isOwner(input.companyId, input.actorId);
    if (!isOwner && !(coach && coach.userId.equals(input.actorId))) {
      throw new ForbiddenError(
        'Only the assigned coach or the workspace owner can cancel this session',
      );
    }
    session.cancel(this.deps.clock.now());
    await this.deps.sessions.save(session);
  }

  private async isOwner(companyId: CompanyId, userId: UserId): Promise<boolean> {
    const m = await this.deps.memberships.findByCompanyAndUser(companyId, userId);
    return m?.isOwner() ?? false;
  }
}
