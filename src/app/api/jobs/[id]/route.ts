import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const job = await prisma.job.findFirst({
    where: { id: params.id, companyId: session.user.companyId },
    include: { customer: true, technician: true, appointments: true, invoices: true },
  });

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json(job);
}

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  propertyAddress: z.string().optional().nullable(),
  damageType: z.string().optional().nullable(),
  status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional(),
  customerId: z.string().optional().nullable(),
  technicianId: z.string().optional().nullable(),
  laborCost: z.number().optional(),
  materialCost: z.number().optional(),
  equipmentCost: z.number().optional(),
  subcontractorCost: z.number().optional(),
  insuranceCarrier: z.string().optional().nullable(),
  insurancePolicyNumber: z.string().optional().nullable(),
  claimNumber: z.string().optional().nullable(),
  claimStatus: z.string().optional().nullable(),
  waterCategory: z.number().int().min(1).max(3).optional().nullable(),
  affectedArea: z.number().optional().nullable(),
  photos: z.string().optional(),
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

    const existing = await prisma.job.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!existing) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const job = await prisma.job.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return NextResponse.json(job);
  } catch (error) {
    console.error("Job update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.job.findFirst({
    where: { id: params.id, companyId: session.user.companyId },
  });
  if (!existing) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  await prisma.job.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
