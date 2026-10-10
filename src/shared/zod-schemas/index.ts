import { z } from 'zod';

export const signUpSchema = z.object({
  email: z.string().email().max(254).transform((s) => s.toLowerCase().trim()),
  password: z.string().min(8).max(128),
  workspaceName: z.string().min(1).max(80),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().email().max(254).transform((s) => s.toLowerCase().trim()),
  password: z.string().min(1).max(128),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const inviteMemberSchema = z.object({
  companyId: z.string().uuid(),
  email: z.string().email().max(254).transform((s) => s.toLowerCase().trim()),
  role: z.enum(['coach', 'client']),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const acceptInvitationSchema = z.object({
  token: z.string().min(1).max(256),
  password: z.string().min(8).max(128),
});
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

export const removeMemberSchema = z.object({
  companyId: z.string().uuid(),
  membershipId: z.string().uuid(),
});
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;