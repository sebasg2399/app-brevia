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

export const createCoachSchema = z.object({
  companyId: z.string().uuid(),
  userId: z.string().uuid(),
  displayName: z.string().min(1).max(120),
  bio: z.string().max(2000).default(''),
  focusAreas: z
    .array(z.string().min(1).max(40))
    .min(1)
    .max(8),
  hourlyRateCents: z.coerce.number().int().min(0).default(0),
});
export type CreateCoachInput = z.infer<typeof createCoachSchema>;

export const updateCoachBioSchema = z.object({
  companyId: z.string().uuid(),
  coachId: z.string().uuid(),
  bio: z.string().max(2000),
});
export type UpdateCoachBioInput = z.infer<typeof updateCoachBioSchema>;

export const createClientSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1).max(120),
  email: z
    .string()
    .email()
    .max(254)
    .transform((s) => s.toLowerCase().trim())
    .optional()
    .or(z.literal('').transform(() => undefined)),
  notes: z.string().max(2000).optional(),
});
export type CreateClientInput = z.infer<typeof createClientSchema>;

export const deleteClientSchema = z.object({
  companyId: z.string().uuid(),
  clientId: z.string().uuid(),
});
export type DeleteClientInput = z.infer<typeof deleteClientSchema>;

export const bookSessionSchema = z.object({
  companyId: z.string().uuid(),
  coachId: z.string().uuid(),
  clientId: z.string().uuid(),
  scheduledAt: z.string().min(1),
  durationMinutes: z.coerce.number().int().refine((n) => [15, 30, 45, 60, 90].includes(n), {
    message: 'Duration must be 15, 30, 45, 60, or 90',
  }),
});
export type BookSessionInput = z.infer<typeof bookSessionSchema>;

export const sessionActionSchema = z.object({
  companyId: z.string().uuid(),
  sessionId: z.string().uuid(),
});
export type SessionActionInput = z.infer<typeof sessionActionSchema>;

export const completeSessionActionSchema = sessionActionSchema;
export const cancelSessionActionSchema = sessionActionSchema;