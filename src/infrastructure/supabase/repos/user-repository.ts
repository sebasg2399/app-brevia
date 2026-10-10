import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserRepository } from '@app/ports/user-repository';
import { User } from '@domain/entities/user';
import { UserId } from '@domain/value-objects/branded-id';
import { Email } from '@domain/value-objects/email';

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export class SupabaseUserRepository implements UserRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findById(id: UserId): Promise<User | null> {
    const { data, error } = await this.db
      .from('users_profile')
      .select('*')
      .eq('id', id.toString())
      .maybeSingle<UserRow>();
    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findByEmail(email: Email): Promise<User | null> {
    const { data, error } = await this.db
      .from('users_profile')
      .select('*')
      .eq('email', email.value)
      .maybeSingle<UserRow>();
    if (error || !data) return null;
    return this.toDomain(data);
  }

  async save(user: User): Promise<void> {
    const row = {
      id: user.id.toString(),
      email: user.email.value,
      full_name: user.fullName,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
    const { error } = await this.db.from('users_profile').upsert(row);
    if (error) throw new Error(`Failed to save user: ${error.message}`);
  }

  private toDomain(row: UserRow): User {
    return User.reconstruct({
      id: UserId.fromString(row.id),
      email: Email.create(row.email),
      fullName: row.full_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
