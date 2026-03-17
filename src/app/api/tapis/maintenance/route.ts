import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  poNumber: z.string().optional().nullable(),
  rollNumber: z.number().int().optional().nullable(),
  quantityPL: z.number().int().optional().nullable(),
  location: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const records = await prisma.tapisMaintenance.findMany({
    where: { companyId: session.user.companyId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(records);
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
    const record = await prisma.tapisMaintenance.create({
      data: {
        ...rest,
        date: date ? new Date(date) : null,
        companyId: session.user.companyId,
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("TapisMaintenance create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
