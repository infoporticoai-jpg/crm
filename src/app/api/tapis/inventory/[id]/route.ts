import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  date: z.string().optional(),
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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const existing = await prisma.tapisInventory.findFirst({
      where: { id, companyId: session.user.companyId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { date, ...rest } = parsed.data;
    const data: any = { ...rest };
    if (date !== undefined) data.date = new Date(date);

    const record = await prisma.tapisInventory.update({
      where: { id },
      data,
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error("TapisInventory update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.tapisInventory.findFirst({
    where: { id, companyId: session.user.companyId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.tapisInventory.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
