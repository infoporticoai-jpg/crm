import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invoice = await prisma.invoice.findFirst({
    where: { id, companyId: session.user.companyId },
    include: { customer: true, job: true },
  });

  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  return NextResponse.json(invoice);
}

const updateSchema = z.object({
  lineItems: z.string().optional(),
  subtotal: z.number().optional(),
  tax: z.number().optional(),
  total: z.number().optional(),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).optional(),
  dueDate: z.string().optional().nullable(),
  paidDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  jobId: z.string().optional().nullable(),
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

    const existing = await prisma.invoice.findFirst({
      where: { id, companyId: session.user.companyId },
    });
    if (!existing) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const data: any = { ...parsed.data };
    if (data.dueDate) data.dueDate = new Date(data.dueDate);
    if (data.paidDate) data.paidDate = new Date(data.paidDate);

    const invoice = await prisma.invoice.update({
      where: { id },
      data,
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Invoice update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.invoice.findFirst({
    where: { id, companyId: session.user.companyId },
  });
  if (!existing) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  await prisma.invoice.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
