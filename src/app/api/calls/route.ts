import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  callerName: z.string().optional().nullable(),
  callerPhone: z.string().optional().nullable(),
  callerEmail: z.string().optional().nullable(),
  duration: z.number().int().optional().nullable(),
  recordingUrl: z.string().optional().nullable(),
  transcript: z.string().optional().nullable(),
  propertyAddress: z.string().optional().nullable(),
  damageType: z.string().optional().nullable(),
  urgencyLevel: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  disposition: z.string().optional().nullable(),
  aiConfidence: z.number().optional().nullable(),
  callSource: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  appointmentId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";

  const where: any = { companyId: session.user.companyId };
  if (search) {
    where.OR = [
      { callerName: { contains: search, mode: "insensitive" } },
      { callerPhone: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { damageType: { contains: search, mode: "insensitive" } },
    ];
  }

  const calls = await prisma.call.findMany({
    where,
    include: { customer: true },
    orderBy: { timestamp: "desc" },
  });

  return NextResponse.json(calls);
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

    const call = await prisma.call.create({
      data: { ...parsed.data, companyId: session.user.companyId },
    });

    return NextResponse.json(call, { status: 201 });
  } catch (error) {
    console.error("Call create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
