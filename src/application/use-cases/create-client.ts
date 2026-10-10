import type { CompanyRepository } from '@app/ports/company-repository';
import type { ClientRepository } from '@app/ports/client-repository';
import type { MembershipRepository } from '@app/ports/membership-repository';
import type { IdGenerator } from '@app/ports/id-generator';
import type { Clock } from '@app/ports/clock';
import { Client } from '@domain/entities/client';
import { Email } from '@domain/value-objects/email';
import type { CompanyId, UserId } from '@domain/value-objects/branded-id';
import { ConflictError, ForbiddenError, NotFoundError } from '@domain/errors/domain-error';

export interface CreateClientInput {
  readonly companyId: CompanyId;
  readonly actorId: UserId;
  readonly name: string;
  readonly email: string | null;
  readonly notes?: string | null;
}

export class CreateClient {
  constructor(
    private readonly deps: {
      companies: CompanyRepository;
      clients: ClientRepository;
      memberships: MembershipRepository;
      ids: IdGenerator;
      clock: Clock;
    },
  ) {}

  async execute(input: CreateClientInput) {
    const actor = await this.deps.memberships.findByCompanyAndUser(
      input.companyId,
      input.actorId,
    );
    if (!actor || (!actor.isOwner() && !actor.isCoach())) {
      throw new ForbiddenError('Only owners or coaches can add clients');
    }
    const company = await this.deps.companies.findById(input.companyId);
    if (!company) throw new NotFoundError('Company', input.companyId.toString());

    const email = input.email ? Email.create(input.email) : null;
    if (email) {
      const existing = await this.deps.clients.findActiveByCompanyAndEmail(
        input.companyId,
        email,
      );
      if (existing) {
        throw new ConflictError(`A client with email ${email.value} already exists in this workspace`);
      }
    }
    const now = this.deps.clock.now();
    const client = Client.create({
      id: this.deps.ids.newClientId(),
      companyId: input.companyId,
      name: input.name,
      email,
      notes: input.notes ?? null,
      now,
    });
    await this.deps.clients.save(client);
    return client;
  }
}