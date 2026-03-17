import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  clientId: z.string().optional(),
  jobType: z.enum(["retrait", "reinstallation", "nouvelle_installation", "enlevement"]).optional(),
  season: z.enum(["printemps", "automne"]).optional().nullable(),
  year: z.number().int().optional(),
  scheduledDate: z.string().optional().nullable(),
  hours: z.string().optional().nullable(),
  crewSize: z.number().int().optional().nullable(),
  installHours: z.number().optional().nullable(),
  carpetType: z.string().optional().nullable(),
  orderNumber: z.string().optional().nullable(),
  rollCount: z.number().int().optional().nullable(),
  moulurePL: z.number().int().optional().nullable(),
  moulureToChange: z.boolean().optional(),
  tapeCount: z.number().int().optional().nullable(),
  tapeVert: z.number().int().optional().nullable(),
  pc: z.number().optional().nullable(),
  carreaux: z.number().int().optional().nullable(),
  facDevisAsp: z.string().optional().nullable(),
  facDevisAspReinstallation: z.string().optional().nullable(),
  facDevisAspNettEntreposage: z.string().optional().nullable(),
  factNumber: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
  fdpPlan: z.boolean().optional(),
  emailSent: z.boolean().optional(),
  retraitDone: z.boolean().optional(),
  entreposage: z.boolean().optional(),
  nettoyer: z.boolean().optional(),
  rebut: z.boolean().optional(),
  pickupDone: z.boolean().optional(),
  pickupRef: z.string().optional().nullable(),
  confirmation: z.boolean().optional(),
  confirmationDates: z.boolean().optional(),
  fait: z.boolean().optional(),
  payer: z.boolean().optional(),
  solaFacture: z.boolean().optional(),
  ajustement: z.string().optional().nullable(),
  detailTapis: z.string().optional().nullable(),
  datePrevue: z.string().optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const job = await prisma.tapisJob.findFirst({
    where: { id, companyId: session.user.companyId },
    include: { client: true },
  });

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(job);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const existing = await prisma.tapisJob.findFirst({
      where: { id, companyId: session.user.companyId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { scheduledDate, ...rest } = parsed.data;
    const data: any = { ...rest };
    if (scheduledDate !== undefined) {
      data.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
    }

    const job = await prisma.tapisJob.update({
      where: { id },
      data,
    });

    return NextResponse.json(job);
  } catch (error) {
    console.error("TapisJob update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.tapisJob.findFirst({
    where: { id, companyId: session.user.companyId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.tapisJob.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
