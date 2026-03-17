import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
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

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pickups = await prisma.tapisPickup.findMany({
    where: { companyId: session.user.companyId },
    orderBy: { pickupDate: "desc" },
  });

  return NextResponse.json(pickups);
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

    const { orderDate, pickupDate, ...rest } = parsed.data;
    const pickup = await prisma.tapisPickup.create({
      data: {
        ...rest,
        orderDate: orderDate ? new Date(orderDate) : null,
        pickupDate: pickupDate ? new Date(pickupDate) : null,
        companyId: session.user.companyId,
      },
    });

    return NextResponse.json(pickup, { status: 201 });
  } catch (error) {
    console.error("TapisPickup create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
