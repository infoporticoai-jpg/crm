import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  orderRef: z.string().optional().nullable(),
  matTechRef: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  quantity: z.number().optional().nullable(),
  unit: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  emailSent: z.boolean().optional(),
  pickupLocation: z.string().optional().nullable(),
  pickupDone: z.boolean().optional(),
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

    const existing = await prisma.tapisSupplierOrder.findFirst({
      where: { id, companyId: session.user.companyId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { date, ...rest } = parsed.data;
    const data: any = { ...rest };
    if (date !== undefined) data.date = date ? new Date(date) : null;

    const order = await prisma.tapisSupplierOrder.update({
      where: { id },
      data,
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("TapisSupplierOrder update error:", error);
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

  const existing = await prisma.tapisSupplierOrder.findFirst({
    where: { id, companyId: session.user.companyId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.tapisSupplierOrder.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
