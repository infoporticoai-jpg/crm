import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  total: z.number(),
});

const createSchema = z.object({
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
  subtotal: z.number(),
  tax: z.number().optional(),
  total: z.number(),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).optional(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  jobId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where: any = { companyId: session.user.companyId };
  if (status) where.status = status;

  const invoices = await prisma.invoice.findMany({
    where,
    include: { customer: true, job: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invoices);
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

    const { lineItems, dueDate, ...rest } = parsed.data;

    const invoice = await prisma.invoice.create({
      data: {
        ...rest,
        lineItems: JSON.stringify(lineItems),
        dueDate: dueDate ? new Date(dueDate) : null,
        companyId: session.user.companyId,
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Invoice create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
