import { test, expect } from '@playwright/test';

/**
 * Smoke E2E tests that verify the public marketing/auth pages render without
 * server errors. These do NOT exercise the auth flow end-to-end — that
 * requires a live Supabase project (see README "E2E against real Supabase"
 * section).
 *
 * These tests run the Next.js dev server and hit the pages; they catch
 * build/runtime errors in the marketing surface and the auth forms.
 */

test.describe('public marketing', () => {
  test('home page renders', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: /Brevia/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Sign in/i })).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Create a workspace|Create account/i }),
    ).toBeVisible();
  });

  test('sign-in page renders with form', async ({ page }) => {
    const response = await page.goto('/sign-in');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in/i })).toBeVisible();
  });

  test('sign-up page renders with form', async ({ page }) => {
    const response = await page.goto('/sign-up');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: /Create your workspace/i })).toBeVisible();
    await expect(page.getByLabel(/Workspace name/i)).toBeVisible();
    await expect(page.getByLabel(/Your email/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Create workspace/i })).toBeVisible();
  });

  test('accept-invitation page renders', async ({ page }) => {
    const response = await page.goto('/accept-invitation?token=abc');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: /Accept invitation/i })).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
  });
});

test.describe('protected routes redirect when unauthenticated', () => {
  test('dashboard redirects to /sign-in', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('coaches redirects to /sign-in', async ({ page }) => {
    await page.goto('/coaches');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('clients redirects to /sign-in', async ({ page }) => {
    await page.goto('/clients');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('sessions redirects to /sign-in', async ({ page }) => {
    await page.goto('/sessions');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('settings/members redirects to /sign-in', async ({ page }) => {
    await page.goto('/settings/members');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('settings/billing redirects to /sign-in', async ({ page }) => {
    await page.goto('/settings/billing');
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

/**
 * E2E against a real Supabase
 *
 * The following flow requires:
 *  - A live Supabase project with migrations applied
 *  - ANTHROPIC_API_KEY set in .env.local (or stub gateway)
 *  - SUPABASE_SERVICE_ROLE_KEY in .env.local
 *  - Two pre-created test users (owner + coach) with known credentials
 *
 * It is NOT run by `pnpm test:e2e` by default — run explicitly with:
 *   RUN_E2E_FULL=1 pnpm test:e2e e2e/full-happy-path.spec.ts
 */
test.describe('full happy path (requires live Supabase)', () => {
  test.skip('owner signs up, creates workspace, invites coach, books session, AI notes flow', async () => {
    // Intentionally skipped. See README for setup instructions and how to
    // enable. The test is left as a template — copy and adapt for your env.
  });
});
