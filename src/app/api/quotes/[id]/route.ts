import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quote = await prisma.quote.findFirst({
    where: { id: params.id, companyId: session.user.companyId },
    include: { customer: true },
  });

  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  return NextResponse.json(quote);
}

const updateSchema = z.object({
  mode: z.enum(["hourly", "sqft"]).optional(),
  lineItems: z.string().optional(),
  subtotal: z.number().optional(),
  tax: z.number().optional(),
  total: z.number().optional(),
  status: z.enum(["draft", "sent", "accepted", "declined", "expired"]).optional(),
  expiryDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const existing = await prisma.quote.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!existing) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

    const data: any = { ...parsed.data };
    if (data.expiryDate) data.expiryDate = new Date(data.expiryDate);

    const quote = await prisma.quote.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(quote);
  } catch (error) {
    console.error("Quote update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.quote.findFirst({
    where: { id: params.id, companyId: session.user.companyId },
  });
  if (!existing) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  await prisma.quote.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
