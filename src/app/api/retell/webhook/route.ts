import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Auth by retellWebhookKey
    const key =
      req.headers.get("x-api-key") ||
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      new URL(req.url).searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    }

    const company = await prisma.company.findUnique({
      where: { retellWebhookKey: key },
      select: { id: true },
    });

    if (!company) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const companyId = company.id;

    // Flexible field names (Retell may send various formats)
    const callerName = body.caller_name || body.callerName || body.customer_name || body.name || null;
    const callerPhone = body.caller_phone || body.callerPhone || body.customer_phone || body.phone || body.from_number || null;
    const callerEmail = body.caller_email || body.callerEmail || body.customer_email || body.email || null;
    const propertyAddress = body.property_address || body.propertyAddress || body.address || null;
    const damageType = body.damage_type || body.damageType || body.service_type || null;
    const urgencyLevel = body.urgency_level || body.urgencyLevel || body.urgency || null;
    const description = body.description || body.summary || body.notes || null;
    const disposition = body.disposition || body.call_status || body.outcome || null;
    const transcript = body.transcript || body.transcription || null;
    const recordingUrl = body.recording_url || body.recordingUrl || null;
    const duration = body.duration || body.call_duration || null;
    const aiConfidence = body.ai_confidence || body.aiConfidence || body.confidence || null;
    const callSource = body.call_source || body.callSource || body.source || "retell";
    const scheduledAt = body.scheduled_at || body.scheduledAt || body.appointment_time || body.appointment_date || null;
    const estimatedValue = body.estimated_value || body.estimatedValue || null;
    const severity = body.severity || body.urgency || null;

    // Upsert customer
    let customerId: string | null = null;
    const normalizedPhone = callerPhone ? normalizePhone(callerPhone) : null;

    if (normalizedPhone || callerEmail) {
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          companyId,
          OR: [
            ...(normalizedPhone ? [{ phone: { contains: normalizedPhone.slice(-10) } }] : []),
            ...(callerEmail ? [{ email: callerEmail }] : []),
          ],
        },
      });

      if (existingCustomer) {
        customerId = existingCustomer.id;
        // Update customer if we have new info
        await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: {
            ...(callerName && !existingCustomer.name ? { name: callerName } : {}),
            ...(callerEmail && !existingCustomer.email ? { email: callerEmail } : {}),
            ...(propertyAddress && !existingCustomer.address ? { address: propertyAddress } : {}),
          },
        });
      } else {
        const customer = await prisma.customer.create({
          data: {
            name: callerName || "Unknown Caller",
            phone: normalizedPhone,
            email: callerEmail,
            address: propertyAddress,
            companyId,
          },
        });
        customerId = customer.id;
      }
    }

    // Create call
    const call = await prisma.call.create({
      data: {
        callerName,
        callerPhone: normalizedPhone,
        callerEmail,
        duration: duration ? parseInt(String(duration)) : null,
        recordingUrl,
        transcript,
        propertyAddress,
        damageType,
        urgencyLevel,
        description,
        disposition,
        aiConfidence: aiConfidence ? parseFloat(String(aiConfidence)) : null,
        callSource,
        companyId,
        customerId,
      },
    });

    // Create appointment if scheduled
    let appointmentId: string | null = null;
    if (scheduledAt) {
      try {
        const appointment = await prisma.appointment.create({
          data: {
            customerName: callerName,
            customerPhone: normalizedPhone,
            propertyAddress,
            damageType,
            severity,
            estimatedValue: estimatedValue ? parseFloat(String(estimatedValue)) : null,
            scheduledAt: new Date(scheduledAt),
            companyId,
            customerId,
          },
        });
        appointmentId = appointment.id;

        // Link call to appointment
        await prisma.call.update({
          where: { id: call.id },
          data: { appointmentId: appointment.id },
        });
      } catch (apptErr) {
        console.error("Failed to create appointment from Retell:", apptErr);
      }
    }

    // Create notification
    await prisma.notification.create({
      data: {
        type: "new_call",
        title: "New Call",
        message: `Call from ${callerName || normalizedPhone || "Unknown"} - ${damageType || "No damage type"}`,
        link: `/calls`,
        companyId,
      },
    });

    return NextResponse.json({
      success: true,
      callId: call.id,
      customerId,
      appointmentId,
    });
  } catch (error) {
    console.error("Retell webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
