import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createUntypedClient } from "@/lib/supabase/server";
import logger from "@/lib/logger";

// Lazy initialization to avoid build-time errors
let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error({}, "Stripe webhook: STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    logger.warn({}, "Stripe webhook: Missing signature");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    logger.error({ err }, "Stripe webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Use untyped client since stripe_members isn't in generated types yet
  const supabase = createUntypedClient();

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(
          subscription.customer as string
        );

        if ("email" in customer && customer.email) {
          const { error } = await supabase.from("stripe_members").upsert(
            {
              email: customer.email.toLowerCase(),
              stripe_customer_id: customer.id,
              stripe_subscription_id: subscription.id,
              subscription_status: subscription.status,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "email" }
          );

          if (error) {
            logger.error(
              { err: error, email: customer.email },
              "Failed to upsert stripe member"
            );
          } else {
            logger.info(
              { email: customer.email, status: subscription.status },
              "Subscription updated"
            );
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const { error } = await supabase
          .from("stripe_members")
          .update({
            subscription_status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          logger.error(
            { err: error, subscriptionId: subscription.id },
            "Failed to update canceled subscription"
          );
        } else {
          logger.info(
            { subscriptionId: subscription.id },
            "Subscription canceled"
          );
        }
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.customer && session.customer_email) {
          const { error } = await supabase.from("stripe_members").upsert(
            {
              email: session.customer_email.toLowerCase(),
              stripe_customer_id: session.customer as string,
              subscription_status: "active",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "email" }
          );

          if (error) {
            logger.error(
              { err: error, email: session.customer_email },
              "Failed to upsert member from checkout"
            );
          } else {
            logger.info(
              { email: session.customer_email },
              "Checkout session completed"
            );
          }
        }
        break;
      }

      default:
        logger.debug({ eventType: event.type }, "Unhandled Stripe event type");
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error(
      { err: error, eventType: event.type },
      "Stripe webhook processing failed"
    );
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
