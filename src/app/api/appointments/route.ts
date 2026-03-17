import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getCalendarClient } from "@/lib/google-calendar";

const createSchema = z.object({
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  propertyAddress: z.string().optional().nullable(),
  damageType: z.string().optional().nullable(),
  severity: z.string().optional().nullable(),
  estimatedValue: z.number().optional().nullable(),
  scheduledAt: z.string().min(1, "Scheduled date is required"),
  duration: z.number().int().positive().optional(),
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
  customerId: z.string().optional().nullable(),
  technicianId: z.string().optional().nullable(),
  jobId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const limit = parseInt(searchParams.get("limit") || "200");

  const where: any = { companyId: session.user.companyId };

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    where.scheduledAt = { gte: start, lte: end };
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: { customer: true, technician: true },
    orderBy: { scheduledAt: "asc" },
    take: limit,
  });

  return NextResponse.json(appointments);
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

    const { scheduledAt, ...rest } = parsed.data;
    const scheduledDate = new Date(scheduledAt);

    const appointment = await prisma.appointment.create({
      data: {
        ...rest,
        scheduledAt: scheduledDate,
        companyId: session.user.companyId,
      },
    });

    // Sync to Google Calendar
    try {
      const cal = await getCalendarClient(session.user.companyId);
      if (cal) {
        const endDate = new Date(scheduledDate);
        endDate.setMinutes(endDate.getMinutes() + (rest.duration || 60));
        const event = await cal.calendar.events.insert({
          calendarId: cal.calendarId,
          requestBody: {
            summary: `${rest.customerName || "Appointment"} - ${rest.damageType || "Service"}`,
            location: rest.propertyAddress || undefined,
            start: { dateTime: scheduledDate.toISOString() },
            end: { dateTime: endDate.toISOString() },
          },
        });
        if (event?.data?.id) {
          await prisma.appointment.update({
            where: { id: appointment.id },
            data: { googleEventId: event.data.id },
          });
        }
      }
    } catch (err) {
      console.error("Google Calendar sync failed:", err);
    }

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error("Appointment create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
