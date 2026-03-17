import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  clientId: z.string().optional(),
  jobId: z.string().optional().nullable(),
  channel: z.enum(["email", "sms"]).optional(),
  type: z.enum(["confirmation_request", "reminder", "final_reminder", "manual"]).optional(),
  status: z.enum(["pending", "sent", "delivered", "confirmed", "no_response", "failed"]).optional(),
  scheduledFor: z.string().optional(),
  sentAt: z.string().optional().nullable(),
  confirmedAt: z.string().optional().nullable(),
  recipientEmail: z.string().optional().nullable(),
  recipientPhone: z.string().optional().nullable(),
  subject: z.string().optional().nullable(),
  body: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const existing = await prisma.tapisOutreach.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { scheduledFor, sentAt, confirmedAt, ...rest } = parsed.data;
    const data: any = { ...rest };
    if (scheduledFor !== undefined) data.scheduledFor = new Date(scheduledFor);
    if (sentAt !== undefined) data.sentAt = sentAt ? new Date(sentAt) : null;
    if (confirmedAt !== undefined) data.confirmedAt = confirmedAt ? new Date(confirmedAt) : null;

    const record = await prisma.tapisOutreach.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error("TapisOutreach update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.tapisOutreach.findFirst({
    where: { id: params.id, companyId: session.user.companyId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.tapisOutreach.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
