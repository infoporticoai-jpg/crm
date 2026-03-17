import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  serviceCategory: z.string().optional(),
  serviceName: z.string().optional(),
  pricePerUnit: z.number().optional(),
  unit: z.string().optional(),
  bracket: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  year: z.number().int().optional(),
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

    const existing = await prisma.tapisPricing.findFirst({
      where: { id, companyId: session.user.companyId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const record = await prisma.tapisPricing.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error("TapisPricing update error:", error);
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

  const existing = await prisma.tapisPricing.findFirst({
    where: { id, companyId: session.user.companyId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.tapisPricing.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
