import type { ClientRepository } from '@app/ports/client-repository';
import type { MembershipRepository } from '@app/ports/membership-repository';
import type { Clock } from '@app/ports/clock';
import type { ClientId, CompanyId, UserId } from '@domain/value-objects/branded-id';
import { ForbiddenError, NotFoundError } from '@domain/errors/domain-error';

export class DeleteClient {
  constructor(
    private readonly deps: {
      clients: ClientRepository;
      memberships: MembershipRepository;
      clock: Clock;
    },
  ) {}

  async execute(input: {
    companyId: CompanyId;
    actorId: UserId;
    clientId: ClientId;
  }): Promise<void> {
    const actor = await this.deps.memberships.findByCompanyAndUser(input.companyId, input.actorId);
    if (!actor || !actor.isOwner()) {
      throw new ForbiddenError('Only the workspace owner can delete a client');
    }
    const client = await this.deps.clients.findById(input.clientId);
    if (!client) throw new NotFoundError('Client', input.clientId.toString());
    if (!client.belongsToCompany(input.companyId)) {
      throw new ForbiddenError('Client does not belong to this workspace');
    }
    if (client.isDeleted()) return;
    client.softDelete(this.deps.clock.now());
    await this.deps.clients.save(client);
  }
}
