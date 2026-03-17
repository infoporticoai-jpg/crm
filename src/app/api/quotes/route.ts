import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  mode: z.enum(["hourly", "sqft"]).optional(),
  lineItems: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    total: z.number(),
  })).optional(),
  subtotal: z.number().optional(),
  tax: z.number().optional(),
  total: z.number().optional(),
  status: z.enum(["draft", "sent", "accepted", "declined", "expired"]).optional(),
  expiryDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where: any = { companyId: session.user.companyId };
  if (status) where.status = status;

  const quotes = await prisma.quote.findMany({
    where,
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(quotes);
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

    const { lineItems, expiryDate, ...rest } = parsed.data;

    const quote = await prisma.quote.create({
      data: {
        ...rest,
        lineItems: lineItems ? JSON.stringify(lineItems) : "[]",
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        companyId: session.user.companyId,
      },
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error("Quote create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
