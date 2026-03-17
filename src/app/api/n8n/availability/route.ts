import { NextRequest, NextResponse } from "next/server";
import { resolveCompany } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const companyId = await resolveCompany(req);
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "date query parameter is required" }, { status: 400 });
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { businessHours: true },
  });

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  // Get existing appointments
  const appointments = await prisma.appointment.findMany({
    where: {
      companyId,
      scheduledAt: { gte: dayStart, lte: dayEnd },
      status: { not: "cancelled" },
    },
    select: { scheduledAt: true, duration: true },
  });

  // Parse business hours
  let openHour = 8;
  let closeHour = 18;
  if (company?.businessHours) {
    try {
      const hours = JSON.parse(company.businessHours);
      const dayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][dayStart.getDay()];
      if (hours[dayName]) {
        openHour = parseInt(hours[dayName].open) || 8;
        closeHour = parseInt(hours[dayName].close) || 18;
      }
    } catch {}
  }

  // Generate 1-hour slots
  const slots: { start: string; end: string; available: boolean }[] = [];
  for (let hour = openHour; hour < closeHour; hour++) {
    const slotStart = new Date(date);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(date);
    slotEnd.setHours(hour + 1, 0, 0, 0);

    const isBooked = appointments.some((appt) => {
      const apptEnd = new Date(appt.scheduledAt);
      apptEnd.setMinutes(apptEnd.getMinutes() + appt.duration);
      return slotStart < apptEnd && slotEnd > appt.scheduledAt;
    });

    slots.push({
      start: slotStart.toISOString(),
      end: slotEnd.toISOString(),
      available: !isBooked,
    });
  }

  return NextResponse.json(slots);
}

const availabilitySchema = z.object({
  date: z.string().min(1),
  technicianId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const companyId = await resolveCompany(req);
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = availabilitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const dayStart = new Date(parsed.data.date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(parsed.data.date);
    dayEnd.setHours(23, 59, 59, 999);

    const where: any = {
      companyId,
      scheduledAt: { gte: dayStart, lte: dayEnd },
      status: { not: "cancelled" },
    };
    if (parsed.data.technicianId) where.technicianId = parsed.data.technicianId;

    const appointments = await prisma.appointment.findMany({
      where,
      select: { scheduledAt: true, duration: true, technicianId: true },
    });

    return NextResponse.json({
      date: parsed.data.date,
      bookedSlots: appointments.map((a) => ({
        start: a.scheduledAt.toISOString(),
        duration: a.duration,
        technicianId: a.technicianId,
      })),
    });
  } catch (error) {
    console.error("Availability error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
