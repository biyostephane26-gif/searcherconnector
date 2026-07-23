import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

// Placeholder non-vide pour que `new Stripe()` ne plante PAS au build quand
// STRIPE_SECRET_KEY est absent (build Render sans les secrets). La vraie clé
// est fournie au runtime. Sans ça : "Neither apiKey nor config.authenticator
// provided" → build cassé → .next incomplet → deploy Render échoue.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_placeholder_build', {
  apiVersion: '2023-10-16' as any,
});

export async function POST(req: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Paiement Stripe non configuré' }, { status: 503 });
    }
    const { planName, priceId, userId, email } = await req.json();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin') || 'http://localhost:3000'}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin') || 'http://localhost:3000'}/pricing`,
      customer_email: email,
      metadata: {
        userId,
        planName,
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
