import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const technician = await prisma.technician.findFirst({
    where: { id: params.id, companyId: session.user.companyId },
    include: {
      appointments: { orderBy: { scheduledAt: "desc" }, take: 20 },
      jobs: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!technician) return NextResponse.json({ error: "Technician not found" }, { status: 404 });
  return NextResponse.json(technician);
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  certifications: z.string().optional(),
  hourlyRate: z.number().optional().nullable(),
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

    const existing = await prisma.technician.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!existing) return NextResponse.json({ error: "Technician not found" }, { status: 404 });

    const technician = await prisma.technician.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return NextResponse.json(technician);
  } catch (error) {
    console.error("Technician update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.technician.findFirst({
    where: { id: params.id, companyId: session.user.companyId },
  });
  if (!existing) return NextResponse.json({ error: "Technician not found" }, { status: 404 });

  await prisma.technician.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
