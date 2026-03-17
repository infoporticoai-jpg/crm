import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  jobType: z.enum(["retrait", "reinstallation", "nouvelle_installation", "enlevement"]),
  season: z.enum(["printemps", "automne"]).optional().nullable(),
  year: z.number().int(),
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

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const year = searchParams.get("year");
  const season = searchParams.get("season");
  const search = searchParams.get("search") ?? "";

  const where: any = { companyId: session.user.companyId };
  if (type) where.jobType = type;
  if (year) where.year = parseInt(year, 10);
  if (season) where.season = season;
  if (search) {
    where.client = {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { projectNumber: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const jobs = await prisma.tapisJob.findMany({
    where,
    include: { client: true },
    orderBy: { scheduledDate: "desc" },
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

    // Verify client belongs to this company
    const client = await prisma.tapisClient.findFirst({
      where: { id: parsed.data.clientId, companyId: session.user.companyId },
    });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const { scheduledDate, ...rest } = parsed.data;
    const job = await prisma.tapisJob.create({
      data: {
        ...rest,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        companyId: session.user.companyId,
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error("TapisJob create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
