import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" })
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature")!;

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Stripe signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const companyId = session.metadata?.companyId;

        if (companyId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

          await prisma.company.update({
            where: { id: companyId },
            data: {
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: subscription.id,
              subscriptionStatus: subscription.status,
              subscriptionPlan: session.metadata?.plan || "starter",
              subscriptionPeriodEnd: new Date(subscription.current_period_end * 1000),
              status: "active",
            },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        const company = await prisma.company.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (company) {
          await prisma.company.update({
            where: { id: company.id },
            data: {
              subscriptionStatus: subscription.status,
              subscriptionPeriodEnd: new Date(subscription.current_period_end * 1000),
              status: subscription.status === "active" || subscription.status === "trialing" ? "active" : company.status,
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const company = await prisma.company.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (company) {
          await prisma.company.update({
            where: { id: company.id },
            data: {
              subscriptionStatus: "canceled",
              status: "suspended",
            },
          });
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;

        if (invoice.subscription) {
          const company = await prisma.company.findFirst({
            where: { stripeSubscriptionId: invoice.subscription as string },
          });

          if (company) {
            await prisma.company.update({
              where: { id: company.id },
              data: { subscriptionStatus: "active", status: "active" },
            });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        if (invoice.subscription) {
          const company = await prisma.company.findFirst({
            where: { stripeSubscriptionId: invoice.subscription as string },
          });

          if (company) {
            await prisma.company.update({
              where: { id: company.id },
              data: { subscriptionStatus: "past_due" },
            });

            // Notify company
            await prisma.notification.create({
              data: {
                type: "overdue",
                title: "Payment Failed",
                message: "Your subscription payment failed. Please update your payment method.",
                link: "/settings/billing",
                companyId: company.id,
              },
            });
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
