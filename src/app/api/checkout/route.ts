import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-11.acacia' as any,
});

export async function POST(req: Request) {
  try {
    const { items } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'No items in checkout' },
        { status: 400 }
      );
    }

    const line_items = items.map((item: any) => {
      // Create a descriptive name
      const name = `${item.material?.name || 'Kamen'} - ${item.orderUnit || 'kom'}`;
      const description = `${item.dims?.length || 0}x${item.dims?.width || 0}x${item.dims?.height || 0} cm, ${item.finish?.name || 'Bez obrade'}, ${item.profile?.name || 'Standard'}`;

      return {
        price_data: {
          currency: 'eur',
          product_data: {
            name,
            description,
          },
          // Stripe expects amount in cents. totalCost is per item (including quantity).
          unit_amount: Math.round((item.totalCost || 0) * 100),
        },
        quantity: 1,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/checkout/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe Checkout Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
