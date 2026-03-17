import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.number(),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional().nullable(),
  photos: z.string().optional().nullable(),
  type: z.enum(["cost", "revenue"]).optional(),
  sourceId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  const where: any = { companyId: session.user.companyId };
  if (type) where.type = type;

  const costs = await prisma.cost.findMany({
    where,
    orderBy: { date: "desc" },
  });

  return NextResponse.json(costs);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const { date, ...rest } = parsed.data;

    const cost = await prisma.cost.create({
      data: {
        ...rest,
        date: new Date(date),
        companyId: session.user.companyId,
      },
    });

    return NextResponse.json(cost, { status: 201 });
  } catch (error) {
    console.error("Cost create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
