import { NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session?.user.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [
    totalCompanies,
    activeCompanies,
    totalUsers,
    totalJobs,
    totalCalls,
    totalInvoices,
    paidInvoices,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.company.count({ where: { status: "active" } }),
    prisma.user.count(),
    prisma.job.count(),
    prisma.call.count(),
    prisma.invoice.count(),
    prisma.invoice.findMany({ where: { status: "paid" }, select: { total: true } }),
  ]);

  const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);

  // Companies by plan
  const planBreakdown = await prisma.company.groupBy({
    by: ["subscriptionPlan"],
    _count: true,
  });

  // Companies by status
  const statusBreakdown = await prisma.company.groupBy({
    by: ["status"],
    _count: true,
  });

  // Recent signups (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentSignups = await prisma.company.count({
    where: { createdAt: { gte: thirtyDaysAgo } },
  });

  return NextResponse.json({
    totalCompanies,
    activeCompanies,
    totalUsers,
    totalJobs,
    totalCalls,
    totalInvoices,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    recentSignups,
    planBreakdown: planBreakdown.map((p) => ({ plan: p.subscriptionPlan || "none", count: p._count })),
    statusBreakdown: statusBreakdown.map((s) => ({ status: s.status, count: s._count })),
  });
}
