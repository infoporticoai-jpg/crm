import { NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = session.user.companyId;

  const [totalCalls, totalJobs, completedJobs, totalAppointments, invoices] = await Promise.all([
    prisma.call.count({ where: { companyId } }),
    prisma.job.count({ where: { companyId } }),
    prisma.job.count({ where: { companyId, status: "completed" } }),
    prisma.appointment.count({ where: { companyId } }),
    prisma.invoice.findMany({
      where: { companyId, status: { in: ["sent", "paid"] } },
      select: { total: true },
    }),
  ]);

  const estimatedRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const conversionRate = totalCalls > 0 ? Math.round((completedJobs / totalCalls) * 100 * 10) / 10 : 0;

  return NextResponse.json({
    totalCalls,
    totalJobs,
    completedJobs,
    conversionRate,
    estimatedRevenue: Math.round(estimatedRevenue * 100) / 100,
    totalAppointments,
  });
}
