import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  serviceCategory: z.string().min(1, "Service category is required"),
  serviceName: z.string().min(1, "Service name is required"),
  pricePerUnit: z.number(),
  unit: z.string().min(1, "Unit is required"),
  bracket: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  year: z.number().int(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const category = searchParams.get("category");

  const where: any = { companyId: session.user.companyId };
  if (year) where.year = parseInt(year, 10);
  if (category) where.serviceCategory = category;

  const pricing = await prisma.tapisPricing.findMany({
    where,
    orderBy: [{ year: "desc" }, { serviceCategory: "asc" }, { serviceName: "asc" }],
  });

  return NextResponse.json(pricing);
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

    const record = await prisma.tapisPricing.create({
      data: { ...parsed.data, companyId: session.user.companyId },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("TapisPricing create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
