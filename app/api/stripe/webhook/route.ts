import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { sendPaymentConfirmation } from '../../../../src/lib/email';

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !stripeWebhookSecret) {
    return NextResponse.json({ error: 'Stripe webhook environment variables are missing' }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16' as any,
  });

  const body = await req.text();
  const sig = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, stripeWebhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { userId, planName } = session.metadata || {};

    if (userId && planName) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceRoleKey) {
        return NextResponse.json({ error: 'Supabase admin environment variables are missing' }, { status: 500 });
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
      // Mettre à jour le PLAN de l'utilisateur (bug corrigé : ça écrivait dans
      // profile_type — qui devrait rester 'job_seeker'/'freelance' — au lieu
      // de la colonne plan. Les paiements Stripe ne débloquaient donc jamais
      // le compte payant.)
      const { data: updated, error } = await supabaseAdmin
        .from('users_profiles')
        .update({
          plan: planName.toLowerCase(),
          verification_status: 'verified', // Par défaut quand on paye
        })
        .eq('id', userId)
        .select('email, full_name')
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        // Paiement Stripe encaissé mais plan non activé — alerte critique,
        // le fondateur doit intervenir manuellement (voir dashboard /founder).
        fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/monitoring`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'system_error', source: 'stripe_webhook', severity: 'critical',
            message: `Paiement Stripe reçu (session ${session.id}, plan ${planName}, user ${userId}) mais activation du plan échouée: ${error.message}`,
          }),
        }).catch(() => {})
      } else if (updated?.email) {
        const amount = session.amount_total ? (session.amount_total / 100).toFixed(2) : '0'
        sendPaymentConfirmation({
          to:         updated.email,
          name:       updated.full_name || '',
          plan:       planName,
          amount,
          currency:   (session.currency || 'usd').toUpperCase(),
          paymentRef: session.id,
          method:     'stripe',
        }).catch(() => {})
      }
    }
  }

  return NextResponse.json({ received: true });
}
