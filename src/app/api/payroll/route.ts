import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // Get technicians with their jobs for the period
  const technicians = await prisma.technician.findMany({
    where: { companyId: session.user.companyId },
    include: {
      jobs: {
        where: {
          status: "completed",
          ...(from || to
            ? {
                updatedAt: {
                  ...(from ? { gte: new Date(from) } : {}),
                  ...(to ? { lte: new Date(to) } : {}),
                },
              }
            : {}),
        },
      },
    },
  });

  const payroll = technicians.map((tech) => {
    const totalHours = tech.jobs.reduce((sum, job) => {
      return sum + (job.laborCost > 0 && tech.hourlyRate ? job.laborCost / tech.hourlyRate : 0);
    }, 0);
    const totalPay = tech.hourlyRate ? totalHours * tech.hourlyRate : 0;

    return {
      technicianId: tech.id,
      technicianName: tech.name,
      email: tech.email,
      hourlyRate: tech.hourlyRate,
      jobsCompleted: tech.jobs.length,
      totalHours: Math.round(totalHours * 100) / 100,
      totalPay: Math.round(totalPay * 100) / 100,
    };
  });

  return NextResponse.json(payroll);
}

const createSchema = z.object({
  technicianId: z.string().min(1),
  hours: z.number().positive(),
  rate: z.number().positive(),
  bonus: z.number().optional(),
  deductions: z.number().optional(),
  notes: z.string().optional().nullable(),
  periodStart: z.string(),
  periodEnd: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const technician = await prisma.technician.findFirst({
      where: { id: parsed.data.technicianId, companyId: session.user.companyId },
    });
    if (!technician) return NextResponse.json({ error: "Technician not found" }, { status: 404 });

    const grossPay = parsed.data.hours * parsed.data.rate + (parsed.data.bonus || 0);
    const netPay = grossPay - (parsed.data.deductions || 0);

    // Store as a cost entry
    const cost = await prisma.cost.create({
      data: {
        name: `Payroll - ${technician.name} (${parsed.data.periodStart} to ${parsed.data.periodEnd})`,
        price: netPay,
        date: new Date(),
        type: "cost",
        notes: JSON.stringify({
          technicianId: technician.id,
          hours: parsed.data.hours,
          rate: parsed.data.rate,
          bonus: parsed.data.bonus || 0,
          deductions: parsed.data.deductions || 0,
          grossPay,
          netPay,
          periodStart: parsed.data.periodStart,
          periodEnd: parsed.data.periodEnd,
          notes: parsed.data.notes,
        }),
        companyId: session.user.companyId,
      },
    });

    return NextResponse.json({
      id: cost.id,
      technicianName: technician.name,
      grossPay,
      netPay,
      ...parsed.data,
    }, { status: 201 });
  } catch (error) {
    console.error("Payroll create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
