import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  date: z.string().min(1, "Date is required"),
  duraDot: z.number().int().optional(),
  empire: z.number().int().optional(),
  needlePin6: z.number().int().optional(),
  needlePin4Brun: z.number().int().optional(),
  needlePin4Beige: z.number().int().optional(),
  marathon: z.number().int().optional(),
  moulureNoir: z.number().int().optional(),
  tapeEcho: z.number().int().optional(),
  tapeVert: z.number().int().optional(),
  tapeProsol: z.number().int().optional(),
  notes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const records = await prisma.tapisInventory.findMany({
    where: { companyId: session.user.companyId },
    orderBy: { date: "desc" },
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
    const record = await prisma.tapisInventory.create({
      data: { ...rest, date: new Date(date), companyId: session.user.companyId },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("TapisInventory create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
