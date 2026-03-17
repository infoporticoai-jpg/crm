import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  jobId: z.string().optional().nullable(),
  channel: z.enum(["email", "sms"]),
  type: z.enum(["confirmation_request", "reminder", "final_reminder", "manual"]),
  status: z.enum(["pending", "sent", "delivered", "confirmed", "no_response", "failed"]).optional(),
  scheduledFor: z.string().min(1, "Scheduled date is required"),
  sentAt: z.string().optional().nullable(),
  confirmedAt: z.string().optional().nullable(),
  recipientEmail: z.string().optional().nullable(),
  recipientPhone: z.string().optional().nullable(),
  subject: z.string().optional().nullable(),
  body: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const clientId = searchParams.get("clientId");
  const jobId = searchParams.get("jobId");

  const where: any = { companyId: session.user.companyId };
  if (status) where.status = status;
  if (clientId) where.clientId = clientId;
  if (jobId) where.jobId = jobId;

  const outreach = await prisma.tapisOutreach.findMany({
    where,
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(outreach);
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

    const { scheduledFor, sentAt, confirmedAt, ...rest } = parsed.data;
    const record = await prisma.tapisOutreach.create({
      data: {
        ...rest,
        scheduledFor: new Date(scheduledFor),
        sentAt: sentAt ? new Date(sentAt) : null,
        confirmedAt: confirmedAt ? new Date(confirmedAt) : null,
        companyId: session.user.companyId,
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("TapisOutreach create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
