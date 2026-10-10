import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { InvitationRepository } from '@app/ports/invitation-repository';
import { Invitation, type InvitationStatus } from '@domain/entities/invitation';
import { CompanyId, InvitationId, UserId } from '@domain/value-objects/branded-id';
import { Email } from '@domain/value-objects/email';
import type { Role } from '@domain/entities/membership';

interface InvitationRow {
  id: string;
  company_id: string;
  email: string;
  role: Role;
  invited_by: string;
  token_hash: string;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
}

export class SupabaseInvitationRepository implements InvitationRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findById(id: InvitationId): Promise<Invitation | null> {
    const { data, error } = await this.db
      .from('invitations')
      .select('*')
      .eq('id', id.toString())
      .maybeSingle<InvitationRow>();
    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findByTokenHash(tokenHash: string): Promise<Invitation | null> {
    const { data, error } = await this.db
      .from('invitations')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle<InvitationRow>();
    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findPendingByCompanyAndEmail(companyId: CompanyId, email: Email): Promise<Invitation | null> {
    const { data, error } = await this.db
      .from('invitations')
      .select('*')
      .eq('company_id', companyId.toString())
      .eq('email', email.value)
      .eq('status', 'pending')
      .maybeSingle<InvitationRow>();
    if (error || !data) return null;
    return this.toDomain(data);
  }

  async save(invitation: Invitation): Promise<void> {
    const row = {
      id: invitation.id.toString(),
      company_id: invitation.companyId.toString(),
      email: invitation.email.value,
      role: invitation.role,
      invited_by: invitation.invitedBy.toString(),
      token_hash: invitation.tokenHash,
      status: invitation.status,
      expires_at: invitation.expiresAt,
      created_at: invitation.createdAt,
      accepted_at: invitation.acceptedAt,
      accepted_by: invitation.acceptedBy?.toString() ?? null,
    };
    const { error } = await this.db.from('invitations').upsert(row);
    if (error) throw new Error(`Failed to save invitation: ${error.message}`);
  }

  async deleteExpired(now: string): Promise<number> {
    const { data, error } = await this.db
      .from('invitations')
      .delete()
      .eq('status', 'pending')
      .lt('expires_at', now)
      .select('id');
    if (error) throw new Error(`Failed to delete expired invitations: ${error.message}`);
    return data?.length ?? 0;
  }

  private toDomain(row: InvitationRow): Invitation {
    return Invitation.reconstruct({
      id: InvitationId.fromString(row.id),
      companyId: CompanyId.fromString(row.company_id),
      email: Email.create(row.email),
      role: row.role,
      invitedBy: UserId.fromString(row.invited_by),
      tokenHash: row.token_hash,
      status: row.status,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      acceptedAt: row.accepted_at,
      acceptedBy: row.accepted_by ? UserId.fromString(row.accepted_by) : null,
    });
  }
}