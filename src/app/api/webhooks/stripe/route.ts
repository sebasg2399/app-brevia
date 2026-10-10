import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { HandleStripeWebhook } from '@app/use-cases/handle-stripe-webhook';
import { StripeSdkGateway } from '@infra/stripe/stripe-sdk-gateway';
import { SupabaseWebhookEventRepository } from '@infra/supabase/repos/webhook-event-repository';
import { SupabaseSubscriptionRepository } from '@infra/supabase/repos/subscription-repository';
import { systemClock } from '@app/ports/clock';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }
  const rawBody = Buffer.from(await req.arrayBuffer());

  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY ? await createServiceClient() : null;
  if (!svc) {
    return NextResponse.json({ error: 'Supabase service role not configured' }, { status: 503 });
  }
  const stripe = new StripeSdkGateway(secret);
  const subscriptions = new SupabaseSubscriptionRepository(svc);
  const events = new SupabaseWebhookEventRepository(svc);
  const sut = new HandleStripeWebhook({
    stripe,
    subscriptions,
    events,
    clock: systemClock,
  });

  try {
    const result = await sut.execute({ rawBody, signature: sig });
    return NextResponse.json({ received: true, ...result }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// Late import to avoid loading service-role client on edge
async function createServiceClient() {
  const { createSupabaseServiceClient } = await import('@infra/supabase/client');
  return createSupabaseServiceClient();
}
