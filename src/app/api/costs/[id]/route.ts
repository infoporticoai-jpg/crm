import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().optional(),
  date: z.string().optional(),
  notes: z.string().optional().nullable(),
  photos: z.string().optional().nullable(),
  type: z.enum(["cost", "revenue"]).optional(),
  sourceId: z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const existing = await prisma.cost.findFirst({
      where: { id, companyId: session.user.companyId },
    });
    if (!existing) return NextResponse.json({ error: "Cost not found" }, { status: 404 });

    const data: any = { ...parsed.data };
    if (data.date) data.date = new Date(data.date);

    const cost = await prisma.cost.update({
      where: { id },
      data,
    });

    return NextResponse.json(cost);
  } catch (error) {
    console.error("Cost update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.cost.findFirst({
    where: { id, companyId: session.user.companyId },
  });
  if (!existing) return NextResponse.json({ error: "Cost not found" }, { status: 404 });

  await prisma.cost.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
