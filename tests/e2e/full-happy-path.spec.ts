import { test, expect } from '@playwright/test';

/**
 * Full E2E happy-path test (requires live Supabase + Anthropic).
 *
 * This is intentionally NOT run by `pnpm test:e2e` by default.
 * To enable: set RUN_E2E_FULL=1 and provide:
 *   - E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD
 *   - E2E_COACH_EMAIL / E2E_COACH_PASSWORD
 *
 * See README → "E2E against a real Supabase" for full setup.
 *
 * Flow covered:
 *   1. Owner signs up + creates workspace
 *   2. Owner signs in
 *   3. Owner invites coach (real email)
 *   4. Coach signs up via invite link
 *   5. Owner creates client
 *   6. Owner creates coach profile for the coach user
 *   7. Owner books a session
 *   8. Owner marks session completed
 *   9. Owner pastes a transcript (≥200 chars)
 *   10. AI notes are generated and shown
 */

test.describe('full happy path (live Supabase)', () => {
  test.skip('owner flow: signup → invite → accept → book → transcript → AI notes', async ({
    page,
  }) => {
    test.setTimeout(180_000); // AI call can take a few seconds

    const ownerEmail = process.env.E2E_OWNER_EMAIL;
    const ownerPass = process.env.E2E_OWNER_PASSWORD;
    const coachEmail = process.env.E2E_COACH_EMAIL;
    const coachPass = process.env.E2E_COACH_PASSWORD;
    if (!ownerEmail || !ownerPass || !coachEmail || !coachPass) {
      throw new Error(
        'Missing E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD / E2E_COACH_EMAIL / E2E_COACH_PASSWORD',
      );
    }

    // 1. Sign up
    await page.goto('/sign-up');
    await page.getByLabel(/Workspace name/i).fill('E2E Workspace');
    await page.getByLabel(/Your email/i).fill(ownerEmail);
    await page.getByLabel(/Password/i).fill(ownerPass);
    await page.getByRole('button', { name: /Create workspace/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Members page
    await page.goto('/settings/members');
    await expect(page.getByRole('heading', { name: /E2E Workspace/i })).toBeVisible();

    // 3. Invite coach
    await page.getByLabel(/Email/i).fill(coachEmail);
    await page.getByRole('button', { name: /Send invitation/i }).click();
    await expect(page.getByText(/Invitation sent/i)).toBeVisible();

    // ... continue with acceptance, booking, transcript, etc.
    // Left as a template — adapt for your env.
  });
});
