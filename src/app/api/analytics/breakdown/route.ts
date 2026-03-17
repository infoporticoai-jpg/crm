import { NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = session.user.companyId;

  const jobs = await prisma.job.findMany({
    where: { companyId },
    select: { damageType: true, status: true, laborCost: true, materialCost: true, equipmentCost: true, subcontractorCost: true },
  });

  const breakdownMap: Record<string, { count: number; completed: number; totalValue: number }> = {};

  for (const job of jobs) {
    const type = job.damageType || "Other";
    if (!breakdownMap[type]) {
      breakdownMap[type] = { count: 0, completed: 0, totalValue: 0 };
    }
    breakdownMap[type].count++;
    if (job.status === "completed") breakdownMap[type].completed++;
    breakdownMap[type].totalValue += job.laborCost + job.materialCost + job.equipmentCost + job.subcontractorCost;
  }

  const breakdown = Object.entries(breakdownMap)
    .map(([damageType, data]) => ({
      damageType,
      ...data,
      totalValue: Math.round(data.totalValue * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json(breakdown);
}
