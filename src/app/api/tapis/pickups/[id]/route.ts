import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  matTechRef: z.string().optional().nullable(),
  orderRef: z.string().optional().nullable(),
  rollCount: z.number().int().optional().nullable(),
  description: z.string().optional().nullable(),
  project: z.string().optional().nullable(),
  orderDate: z.string().optional().nullable(),
  pickupDate: z.string().optional().nullable(),
  done: z.boolean().optional(),
  moulure: z.number().int().optional().nullable(),
  tape: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const existing = await prisma.tapisPickup.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { orderDate, pickupDate, ...rest } = parsed.data;
    const data: any = { ...rest };
    if (orderDate !== undefined) data.orderDate = orderDate ? new Date(orderDate) : null;
    if (pickupDate !== undefined) data.pickupDate = pickupDate ? new Date(pickupDate) : null;

    const pickup = await prisma.tapisPickup.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(pickup);
  } catch (error) {
    console.error("TapisPickup update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.tapisPickup.findFirst({
    where: { id: params.id, companyId: session.user.companyId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.tapisPickup.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
