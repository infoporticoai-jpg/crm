import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  certifications: z.string().optional(),
  hourlyRate: z.number().optional().nullable(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const technicians = await prisma.technician.findMany({
    where: { companyId: session.user.companyId },
    include: {
      _count: { select: { appointments: true, jobs: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(technicians);
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

    const technician = await prisma.technician.create({
      data: { ...parsed.data, companyId: session.user.companyId },
    });

    return NextResponse.json(technician, { status: 201 });
  } catch (error) {
    console.error("Technician create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
