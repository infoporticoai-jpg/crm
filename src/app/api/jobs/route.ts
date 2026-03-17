import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  propertyAddress: z.string().optional().nullable(),
  damageType: z.string().optional().nullable(),
  status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional(),
  customerId: z.string().optional().nullable(),
  technicianId: z.string().optional().nullable(),
  insuranceCarrier: z.string().optional().nullable(),
  insurancePolicyNumber: z.string().optional().nullable(),
  claimNumber: z.string().optional().nullable(),
  claimStatus: z.string().optional().nullable(),
  waterCategory: z.number().int().min(1).max(3).optional().nullable(),
  affectedArea: z.number().optional().nullable(),
  laborCost: z.number().optional(),
  materialCost: z.number().optional(),
  equipmentCost: z.number().optional(),
  subcontractorCost: z.number().optional(),
  photos: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status");

  const where: any = { companyId: session.user.companyId };
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { propertyAddress: { contains: search, mode: "insensitive" } },
      { damageType: { contains: search, mode: "insensitive" } },
    ];
  }

  const jobs = await prisma.job.findMany({
    where,
    include: { customer: true, technician: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(jobs);
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

    const job = await prisma.job.create({
      data: { ...parsed.data, companyId: session.user.companyId },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error("Job create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
