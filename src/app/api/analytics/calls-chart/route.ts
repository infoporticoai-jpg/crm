import { NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = session.user.companyId;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const calls = await prisma.call.findMany({
    where: {
      companyId,
      timestamp: { gte: thirtyDaysAgo },
    },
    select: { timestamp: true },
    orderBy: { timestamp: "asc" },
  });

  // Build 30-day map
  const dateMap: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().split("T")[0];
    dateMap[key] = 0;
  }

  for (const call of calls) {
    const key = call.timestamp.toISOString().split("T")[0];
    if (dateMap[key] !== undefined) {
      dateMap[key]++;
    }
  }

  const chart = Object.entries(dateMap).map(([date, count]) => ({
    date,
    calls: count,
  }));

  return NextResponse.json(chart);
}
