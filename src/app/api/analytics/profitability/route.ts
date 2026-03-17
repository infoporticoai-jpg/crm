import { NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = session.user.companyId;

  const [costs, paidInvoices] = await Promise.all([
    prisma.cost.findMany({
      where: { companyId },
      select: { price: true, type: true, date: true },
    }),
    prisma.invoice.findMany({
      where: { companyId, status: "paid" },
      select: { total: true, paidDate: true, createdAt: true },
    }),
  ]);

  const totalCosts = costs
    .filter((c) => c.type === "cost")
    .reduce((sum, c) => sum + c.price, 0);

  const totalRevenueFromCosts = costs
    .filter((c) => c.type === "revenue")
    .reduce((sum, c) => sum + c.price, 0);

  const totalRevenueFromInvoices = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);

  const totalRevenue = totalRevenueFromInvoices + totalRevenueFromCosts;
  const profit = totalRevenue - totalCosts;
  const margin = totalRevenue > 0 ? Math.round((profit / totalRevenue) * 100 * 10) / 10 : 0;

  // Monthly breakdown (last 6 months)
  const monthly: { month: string; revenue: number; costs: number; profit: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const month = d.getMonth();
    const label = `${year}-${String(month + 1).padStart(2, "0")}`;

    const monthRevenue = paidInvoices
      .filter((inv) => {
        const dt = inv.paidDate || inv.createdAt;
        return dt.getFullYear() === year && dt.getMonth() === month;
      })
      .reduce((sum, inv) => sum + inv.total, 0);

    const monthCosts = costs
      .filter((c) => c.type === "cost" && c.date.getFullYear() === year && c.date.getMonth() === month)
      .reduce((sum, c) => sum + c.price, 0);

    monthly.push({
      month: label,
      revenue: Math.round(monthRevenue * 100) / 100,
      costs: Math.round(monthCosts * 100) / 100,
      profit: Math.round((monthRevenue - monthCosts) * 100) / 100,
    });
  }

  return NextResponse.json({
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalCosts: Math.round(totalCosts * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    margin,
    monthly,
  });
}
