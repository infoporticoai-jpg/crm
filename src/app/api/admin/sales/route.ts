import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const months = parseInt(searchParams.get("months") || "6");

    // MRR by plan
    const activeSubscriptions = await prisma.company.findMany({
      where: {
        subscriptionStatus: { in: ["active", "trialing"] },
        subscriptionPlan: { not: null },
      },
      select: { subscriptionPlan: true, createdAt: true },
    });

    const planPricing: Record<string, number> = {
      starter: 49,
      growth: 99,
      custom: 199,
    };

    const mrr = activeSubscriptions.reduce((sum, c) => {
      return sum + (planPricing[c.subscriptionPlan || ""] || 0);
    }, 0);

    // Monthly signup trend
    const monthlySignups: { month: string; signups: number; churn: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = `${year}-${String(month + 1).padStart(2, "0")}`;

      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

      const signups = await prisma.company.count({
        where: { createdAt: { gte: monthStart, lte: monthEnd } },
      });

      const churn = await prisma.company.count({
        where: {
          subscriptionStatus: "canceled",
          updatedAt: { gte: monthStart, lte: monthEnd },
        },
      });

      monthlySignups.push({ month: label, signups, churn });
    }

    // Admin invoices (platform revenue)
    const adminInvoices = await prisma.adminInvoice.findMany({
      where: { status: "paid" },
      select: { amount: true },
    });
    const totalPlatformRevenue = adminInvoices.reduce((sum, inv) => sum + inv.amount, 0);

    // Conversion funnel
    const totalSignups = await prisma.company.count();
    const paidCompanies = await prisma.company.count({
      where: { subscriptionStatus: { in: ["active", "trialing"] } },
    });
    const conversionRate = totalSignups > 0 ? Math.round((paidCompanies / totalSignups) * 100 * 10) / 10 : 0;

    return NextResponse.json({
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(mrr * 12 * 100) / 100,
      totalPlatformRevenue: Math.round(totalPlatformRevenue * 100) / 100,
      activeSubscriptions: activeSubscriptions.length,
      totalSignups,
      paidCompanies,
      conversionRate,
      monthlySignups,
    });
  } catch (error) {
    console.error("Admin sales error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
