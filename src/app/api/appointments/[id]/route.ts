import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getCalendarClient } from "@/lib/google-calendar";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appointment = await prisma.appointment.findFirst({
    where: { id, companyId: session.user.companyId },
    include: { customer: true, technician: true, calls: true },
  });

  if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  return NextResponse.json(appointment);
}

const updateSchema = z.object({
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  propertyAddress: z.string().optional().nullable(),
  damageType: z.string().optional().nullable(),
  severity: z.string().optional().nullable(),
  estimatedValue: z.number().optional().nullable(),
  scheduledAt: z.string().optional(),
  duration: z.number().int().positive().optional(),
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
  customerId: z.string().optional().nullable(),
  technicianId: z.string().optional().nullable(),
  jobId: z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const existing = await prisma.appointment.findFirst({
      where: { id, companyId: session.user.companyId },
    });
    if (!existing) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    const data: any = { ...parsed.data };
    if (data.scheduledAt) data.scheduledAt = new Date(data.scheduledAt);

    const appointment = await prisma.appointment.update({
      where: { id },
      data,
    });

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("Appointment update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.appointment.findFirst({
    where: { id, companyId: session.user.companyId },
  });
  if (!existing) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

  // Delete Google Calendar event
  if (existing.googleEventId) {
    try {
      const cal = await getCalendarClient(session.user.companyId);
      if (cal) await cal.calendar.events.delete({ calendarId: cal.calendarId, eventId: existing.googleEventId });
    } catch (err) {
      console.error("Google Calendar delete failed:", err);
    }
  }

  await prisma.appointment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
