import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    include: {
      _count: { select: { customers: true, jobs: true, users: true, invoices: true, technicians: true } },
    },
  });

  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  return NextResponse.json(company);
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  tpsNumber: z.string().optional().nullable(),
  tvqNumber: z.string().optional().nullable(),
  tax1Name: z.string().optional().nullable(),
  tax1Rate: z.number().optional().nullable(),
  tax1Number: z.string().optional().nullable(),
  tax2Name: z.string().optional().nullable(),
  tax2Rate: z.number().optional().nullable(),
  tax2Number: z.string().optional().nullable(),
  serviceArea: z.string().optional().nullable(),
  businessHours: z.string().optional().nullable(),
  language: z.enum(["en", "fr"]).optional(),
  aiGreeting: z.string().optional().nullable(),
  aiSettings: z.string().optional().nullable(),
  googleCalendarId: z.string().optional().nullable(),
  zapierWebhookUrl: z.string().optional().nullable(),
}).strict();

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const company = await prisma.company.update({
      where: { id: session.user.companyId },
      data: parsed.data,
    });

    return NextResponse.json(company);
  } catch (error) {
    console.error("Company update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
