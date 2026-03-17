import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
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

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orders = await prisma.tapisSupplierOrder.findMany({
    where: { companyId: session.user.companyId },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(orders);
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
    const order = await prisma.tapisSupplierOrder.create({
      data: {
        ...rest,
        date: date ? new Date(date) : null,
        companyId: session.user.companyId,
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("TapisSupplierOrder create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
