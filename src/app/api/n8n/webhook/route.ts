import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";

async function authenticateN8n(req: NextRequest): Promise<string | null> {
  const url = new URL(req.url);
  const key =
    req.headers.get("authorization")?.replace("Bearer ", "") ||
    url.searchParams.get("key") ||
    req.headers.get("x-api-key");

  if (!key) return null;

  const company = await prisma.company.findUnique({
    where: { n8nWebhookKey: key },
    select: { id: true },
  });

  return company?.id ?? null;
}

// Handle Solatheque events
async function handleSolathequeEvent(event: string, body: any, companyId: string) {
  const projectRef = body.projectRef || body.project_ref || body.reference;
  if (!projectRef) {
    return NextResponse.json({ error: "projectRef is required" }, { status: 400 });
  }

  const projectName = body.projectName || body.project_name || projectRef;

  switch (event) {
    case "nouveau_projet_complete": {
      const customer = body.contactName || body.contact_name
        ? await prisma.customer.upsert({
            where: {
              id: body.customerId || "new",
            },
            create: {
              name: body.contactName || body.contact_name || projectName,
              phone: body.contactPhone ? normalizePhone(body.contactPhone) : null,
              email: body.contactEmail || null,
              address: body.location || null,
              companyId,
            },
            update: {},
          })
        : null;

      await prisma.flooringProject.upsert({
        where: { companyId_projectRef: { companyId, projectRef } },
        create: {
          projectRef,
          projectName,
          location: body.location || null,
          contactName: body.contactName || body.contact_name || null,
          driveFolderId: body.driveFolderId || body.drive_folder_id || null,
          soumissionSheetId: body.soumissionSheetId || body.soumission_sheet_id || null,
          status: "PRÊT_POUR_SOUMISSION",
          companyId,
          customerId: customer?.id || null,
          lastN8nSync: new Date(),
        },
        update: {
          projectName,
          location: body.location || undefined,
          contactName: body.contactName || body.contact_name || undefined,
          driveFolderId: body.driveFolderId || body.drive_folder_id || undefined,
          soumissionSheetId: body.soumissionSheetId || body.soumission_sheet_id || undefined,
          status: "PRÊT_POUR_SOUMISSION",
          customerId: customer?.id || undefined,
          lastN8nSync: new Date(),
        },
      });

      return NextResponse.json({ success: true, status: "PRÊT_POUR_SOUMISSION" });
    }

    case "soumission_complete": {
      await prisma.flooringProject.update({
        where: { companyId_projectRef: { companyId, projectRef } },
        data: {
          soumissionPdfUrl: body.soumissionPdfUrl || body.soumission_pdf_url || null,
          bdcSheetId: body.bdcSheetId || body.bdc_sheet_id || null,
          bdcGid: body.bdcGid || body.bdc_gid || null,
          status: "PRÊT_POUR_BON_DE_COMMANDE",
          lastN8nSync: new Date(),
        },
      });
      return NextResponse.json({ success: true, status: "PRÊT_POUR_BON_DE_COMMANDE" });
    }

    case "bdc_complete": {
      await prisma.flooringProject.update({
        where: { companyId_projectRef: { companyId, projectRef } },
        data: {
          bdcPdfUrl: body.bdcPdfUrl || body.bdc_pdf_url || null,
          fdpSheetId: body.fdpSheetId || body.fdp_sheet_id || null,
          fdpGid: body.fdpGid || body.fdp_gid || null,
          status: "PRÊT_POUR_FEUILLE_DE_POSE",
          lastN8nSync: new Date(),
        },
      });
      return NextResponse.json({ success: true, status: "PRÊT_POUR_FEUILLE_DE_POSE" });
    }

    case "fdp_complete": {
      await prisma.flooringProject.update({
        where: { companyId_projectRef: { companyId, projectRef } },
        data: {
          fdpPdfUrl: body.fdpPdfUrl || body.fdp_pdf_url || null,
          status: "COMPLÉTÉ",
          lastN8nSync: new Date(),
        },
      });
      return NextResponse.json({ success: true, status: "COMPLÉTÉ" });
    }

    default:
      return NextResponse.json({ error: `Unknown Solatheque event: ${event}` }, { status: 400 });
  }
}

// Handle default events
async function handleDefaultEvent(event: string, body: any, companyId: string) {
  switch (event) {
    case "new_customer": {
      const phone = body.phone ? normalizePhone(body.phone) : null;
      let customer = null;

      if (phone || body.email) {
        customer = await prisma.customer.findFirst({
          where: {
            companyId,
            OR: [
              ...(phone ? [{ phone: { contains: phone.slice(-10) } }] : []),
              ...(body.email ? [{ email: body.email }] : []),
            ],
          },
        });
      }

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            name: body.name || "Unknown",
            phone,
            email: body.email || null,
            address: body.address || null,
            notes: body.notes || null,
            companyId,
          },
        });
      }

      return NextResponse.json({ success: true, customerId: customer.id });
    }

    case "new_appointment": {
      if (!body.scheduledAt && !body.scheduled_at) {
        return NextResponse.json({ error: "scheduledAt is required" }, { status: 400 });
      }

      const appointment = await prisma.appointment.create({
        data: {
          customerName: body.customerName || body.customer_name || body.name || null,
          customerPhone: body.customerPhone || body.customer_phone || body.phone ? normalizePhone(body.customerPhone || body.customer_phone || body.phone) : null,
          propertyAddress: body.propertyAddress || body.property_address || body.address || null,
          damageType: body.damageType || body.damage_type || null,
          severity: body.severity || null,
          scheduledAt: new Date(body.scheduledAt || body.scheduled_at),
          duration: body.duration || 60,
          companyId,
          customerId: body.customerId || body.customer_id || null,
        },
      });

      return NextResponse.json({ success: true, appointmentId: appointment.id });
    }

    case "new_job": {
      const job = await prisma.job.create({
        data: {
          title: body.title || "New Job",
          description: body.description || null,
          propertyAddress: body.propertyAddress || body.property_address || null,
          damageType: body.damageType || body.damage_type || null,
          customerId: body.customerId || body.customer_id || null,
          technicianId: body.technicianId || body.technician_id || null,
          companyId,
        },
      });

      return NextResponse.json({ success: true, jobId: job.id });
    }

    case "new_lead": {
      const phone = body.phone ? normalizePhone(body.phone) : null;

      const customer = await prisma.customer.upsert({
        where: { id: body.customerId || "new" },
        create: {
          name: body.name || "New Lead",
          phone,
          email: body.email || null,
          address: body.address || null,
          notes: `Lead source: ${body.source || "n8n"}\n${body.notes || ""}`.trim(),
          companyId,
        },
        update: {
          ...(body.name ? { name: body.name } : {}),
          ...(phone ? { phone } : {}),
          ...(body.email ? { email: body.email } : {}),
        },
      });

      await prisma.notification.create({
        data: {
          type: "new_call",
          title: "New Lead",
          message: `New lead: ${body.name || phone || body.email || "Unknown"}`,
          link: `/customers/${customer.id}`,
          companyId,
        },
      });

      return NextResponse.json({ success: true, customerId: customer.id });
    }

    default:
      return NextResponse.json({ error: `Unknown event: ${event}` }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await authenticateN8n(req);
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Check for Solatheque events via header
    const solathequeEvent = req.headers.get("x-n8n-event");
    if (solathequeEvent) {
      return handleSolathequeEvent(solathequeEvent, body, companyId);
    }

    // Default event routing
    const event = body.event;
    if (!event) {
      return NextResponse.json({ error: "Missing event field" }, { status: 400 });
    }

    return handleDefaultEvent(event, body, companyId);
  } catch (error) {
    console.error("n8n webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
