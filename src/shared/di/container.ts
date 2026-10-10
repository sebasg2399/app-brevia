import 'server-only';
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from '@infra/supabase/client';
import { SupabaseCompanyRepository } from '@infra/supabase/repos/company-repository';
import { SupabaseUserRepository } from '@infra/supabase/repos/user-repository';
import { SupabaseMembershipRepository } from '@infra/supabase/repos/membership-repository';
import { SupabaseInvitationRepository } from '@infra/supabase/repos/invitation-repository';
import { SupabaseAuthGateway } from '@infra/supabase/auth-gateway';
import { ConsoleEmailGateway } from '@infra/email/console-email-gateway';
import { NodeTokenHasher } from '@infra/auth/node-token-hasher';
import { NodeIdGenerator } from '@infra/id/uuid-id-generator';
import { clock } from '@infra/clock/system-clock';
import { SignUp } from '@app/use-cases/sign-up';
import { SignIn } from '@app/use-cases/sign-in';
import { CreateWorkspace } from '@app/use-cases/create-workspace';
import { InviteMember } from '@app/use-cases/invite-member';
import { AcceptInvitation } from '@app/use-cases/accept-invitation';
import { RemoveMember } from '@app/use-cases/remove-member';

export interface UseCases {
  signUp: SignUp;
  signIn: SignIn;
  createWorkspace: CreateWorkspace;
  inviteMember: InviteMember;
  acceptInvitation: AcceptInvitation;
  removeMember: RemoveMember;
}

export async function getUseCases(): Promise<UseCases> {
  const db = await createSupabaseServerClient();
  const companies = new SupabaseCompanyRepository(db);
  const users = new SupabaseUserRepository(db);
  const memberships = new SupabaseMembershipRepository(db);
  const invitations = new SupabaseInvitationRepository(db);
  const auth = new SupabaseAuthGateway(db);
  const email = new ConsoleEmailGateway();
  const tokens = new NodeTokenHasher();
  const ids = new NodeIdGenerator();

  return {
    signUp: new SignUp({ auth, users, companies, memberships, ids, clock }),
    signIn: new SignIn({ auth, memberships, companies }),
    createWorkspace: new CreateWorkspace({ users, companies, memberships, ids, clock }),
    inviteMember: new InviteMember({ companies, memberships, invitations, email, tokens, ids, clock }),
    acceptInvitation: new AcceptInvitation({
      auth,
      users,
      companies,
      memberships,
      invitations,
      tokens,
      ids,
      clock,
    }),
    removeMember: new RemoveMember({ memberships }),
  };
}

export { createSupabaseServiceClient };