import { NextRequest, NextResponse } from "next/server";
import { resolveCompany } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getCalendarClient } from "@/lib/google-calendar";
import { normalizePhone } from "@/lib/phone";
import { z } from "zod";

const bookSchema = z.object({
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional(),
  propertyAddress: z.string().optional(),
  damageType: z.string().optional(),
  severity: z.string().optional(),
  estimatedValue: z.number().optional(),
  scheduledAt: z.string().min(1, "scheduledAt is required"),
  duration: z.number().int().positive().optional(),
  technicianId: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const companyId = await resolveCompany(req);
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = bookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const { scheduledAt, customerPhone, customerEmail, ...rest } = parsed.data;
    const normalizedPhone = customerPhone ? normalizePhone(customerPhone) : null;
    const scheduledDate = new Date(scheduledAt);

    // Find or create customer
    let customerId: string | null = null;
    if (normalizedPhone || customerEmail) {
      const existing = await prisma.customer.findFirst({
        where: {
          companyId,
          OR: [
            ...(normalizedPhone ? [{ phone: { contains: normalizedPhone.slice(-10) } }] : []),
            ...(customerEmail ? [{ email: customerEmail }] : []),
          ],
        },
      });

      if (existing) {
        customerId = existing.id;
      } else {
        const customer = await prisma.customer.create({
          data: {
            name: rest.customerName || "Unknown",
            phone: normalizedPhone,
            email: customerEmail || null,
            address: rest.propertyAddress || null,
            companyId,
          },
        });
        customerId = customer.id;
      }
    }

    const appointment = await prisma.appointment.create({
      data: {
        customerName: rest.customerName || null,
        customerPhone: normalizedPhone,
        propertyAddress: rest.propertyAddress || null,
        damageType: rest.damageType || null,
        severity: rest.severity || null,
        estimatedValue: rest.estimatedValue || null,
        scheduledAt: scheduledDate,
        duration: rest.duration || 60,
        technicianId: rest.technicianId || null,
        companyId,
        customerId,
      },
    });

    // Sync to Google Calendar
    try {
      const cal = await getCalendarClient(companyId);
      if (cal) {
        const endDate = new Date(scheduledDate);
        endDate.setMinutes(endDate.getMinutes() + (rest.duration || 60));
        const event = await cal.createEvent({
          summary: `${rest.customerName || "Appointment"} - ${rest.damageType || "Service"}`,
          location: rest.propertyAddress,
          start: scheduledDate.toISOString(),
          end: endDate.toISOString(),
          description: rest.notes,
        });
        if (event?.id) {
          await prisma.appointment.update({
            where: { id: appointment.id },
            data: { googleEventId: event.id },
          });
        }
      }
    } catch (err) {
      console.error("Google Calendar sync failed:", err);
    }

    // Create notification
    await prisma.notification.create({
      data: {
        type: "new_appointment",
        title: "New Booking",
        message: `Appointment booked for ${rest.customerName || "Unknown"} on ${scheduledDate.toLocaleDateString()}`,
        link: `/appointments`,
        companyId,
      },
    });

    return NextResponse.json({
      success: true,
      appointmentId: appointment.id,
      customerId,
    }, { status: 201 });
  } catch (error) {
    console.error("n8n book error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
