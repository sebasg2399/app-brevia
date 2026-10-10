import type { AuthGateway, AuthSession } from '@app/ports/auth-gateway';
import type { CompanyRepository } from '@app/ports/company-repository';
import type { MembershipRepository } from '@app/ports/membership-repository';
import { Email } from '@domain/value-objects/email';
import type { CompanyId } from '@domain/value-objects/branded-id';

export interface SignInInput {
  readonly email: string;
  readonly password: string;
}

export interface SignInResult {
  readonly session: AuthSession;
  readonly memberships: ReadonlyArray<{ companyId: CompanyId; role: 'owner' | 'coach' | 'client' }>;
  readonly primaryCompanyId: CompanyId | null;
}

export class SignIn {
  constructor(
    private readonly deps: {
      auth: AuthGateway;
      memberships: MembershipRepository;
      companies: CompanyRepository;
    },
  ) {}

  async execute(input: SignInInput): Promise<SignInResult> {
    const email = Email.create(input.email);
    const session = await this.deps.auth.signIn({ email, password: input.password });

    const memberships = await this.deps.memberships.listByUser(session.userId);

    const owned = memberships.find((m) => m.isOwner());
    const primaryCompanyId = owned ? owned.companyId : null;

    void this.deps.companies;

    return {
      session,
      memberships: memberships.map((m) => ({ companyId: m.companyId, role: m.role })),
      primaryCompanyId,
    };
  }
}