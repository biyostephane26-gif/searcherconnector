import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

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
      // Mettre à jour le profil de l'utilisateur dans Supabase
      const { error } = await supabaseAdmin
        .from('users_profiles')
        .update({ 
          profile_type: planName.toLowerCase(),
          verification_status: 'verified' // Par défaut quand on paye
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating profile:', error);
      }
    }
  }

  return NextResponse.json({ received: true });
}
