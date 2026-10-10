import type { SessionRepository } from '@app/ports/session-repository';
import type { CoachRepository } from '@app/ports/coach-repository';
import type { ClientRepository } from '@app/ports/client-repository';
import type { MembershipRepository } from '@app/ports/membership-repository';
import type { IdGenerator } from '@app/ports/id-generator';
import type { Clock } from '@app/ports/clock';
import { Session } from '@domain/entities/session';
import type { ClientId, CoachId, CompanyId, UserId } from '@domain/value-objects/branded-id';
import { ForbiddenError, NotFoundError } from '@domain/errors/domain-error';

export interface BookSessionInput {
  readonly companyId: CompanyId;
  readonly actorId: UserId;
  readonly coachId: CoachId;
  readonly clientId: ClientId;
  readonly scheduledAt: string;
  readonly durationMinutes: number;
}

export class BookSession {
  constructor(
    private readonly deps: {
      sessions: SessionRepository;
      coaches: CoachRepository;
      clients: ClientRepository;
      memberships: MembershipRepository;
      ids: IdGenerator;
      clock: Clock;
    },
  ) {}

  async execute(input: BookSessionInput) {
    const coach = await this.deps.coaches.findById(input.coachId);
    if (!coach) throw new NotFoundError('Coach', input.coachId.toString());
    if (!coach.belongsToCompany(input.companyId)) {
      throw new ForbiddenError('Coach does not belong to this workspace');
    }
    if (!coach.isActive) {
      throw new ForbiddenError('Coach is not active');
    }
    const client = await this.deps.clients.findById(input.clientId);
    if (!client) throw new NotFoundError('Client', input.clientId.toString());
    if (client.isDeleted()) {
      throw new ForbiddenError('Cannot book a session with a deleted client');
    }
    if (!client.belongsToCompany(input.companyId)) {
      throw new ForbiddenError('Client does not belong to this workspace');
    }
    const isOwner = await this.isOwner(input.companyId, input.actorId);
    if (!isOwner && !coach.userId.equals(input.actorId)) {
      throw new ForbiddenError(
        'Only the assigned coach or the workspace owner can book this session',
      );
    }
    const now = this.deps.clock.now();
    const session = Session.create({
      id: this.deps.ids.newSessionId(),
      companyId: input.companyId,
      coachId: input.coachId,
      clientId: input.clientId,
      scheduledAt: input.scheduledAt,
      durationMinutes: input.durationMinutes,
      now,
    });
    await this.deps.sessions.save(session);
    return session;
  }

  private async isOwner(companyId: CompanyId, userId: UserId): Promise<boolean> {
    const m = await this.deps.memberships.findByCompanyAndUser(companyId, userId);
    return m?.isOwner() ?? false;
  }
}
