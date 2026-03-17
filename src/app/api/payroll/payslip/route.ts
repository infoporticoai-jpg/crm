import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { z } from "zod";

const payslipSchema = z.object({
  technicianId: z.string().min(1),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  hours: z.number().positive(),
  rate: z.number().positive(),
  bonus: z.number().optional(),
  deductions: z.number().optional(),
  notes: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = payslipSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const technician = await prisma.technician.findFirst({
      where: { id: parsed.data.technicianId, companyId: session.user.companyId },
    });
    if (!technician) return NextResponse.json({ error: "Technician not found" }, { status: 404 });

    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { name: true, address: true, phone: true, email: true },
    });

    const grossPay = parsed.data.hours * parsed.data.rate + (parsed.data.bonus || 0);
    const netPay = grossPay - (parsed.data.deductions || 0);

    const payslipHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:Arial,sans-serif;padding:40px;max-width:600px;margin:0 auto;">
        <h1 style="color:#333;">Payslip</h1>
        <h3>${company?.name || "Company"}</h3>
        ${company?.address ? `<p>${company.address}</p>` : ""}
        <hr/>
        <p><strong>Employee:</strong> ${technician.name}</p>
        <p><strong>Period:</strong> ${parsed.data.periodStart} to ${parsed.data.periodEnd}</p>
        <hr/>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px;">Hours worked</td><td style="text-align:right;padding:8px;">${parsed.data.hours}</td></tr>
          <tr><td style="padding:8px;">Hourly rate</td><td style="text-align:right;padding:8px;">$${parsed.data.rate.toFixed(2)}</td></tr>
          <tr><td style="padding:8px;">Base pay</td><td style="text-align:right;padding:8px;">$${(parsed.data.hours * parsed.data.rate).toFixed(2)}</td></tr>
          ${parsed.data.bonus ? `<tr><td style="padding:8px;">Bonus</td><td style="text-align:right;padding:8px;">$${parsed.data.bonus.toFixed(2)}</td></tr>` : ""}
          <tr style="border-top:1px solid #ddd;"><td style="padding:8px;"><strong>Gross Pay</strong></td><td style="text-align:right;padding:8px;"><strong>$${grossPay.toFixed(2)}</strong></td></tr>
          ${parsed.data.deductions ? `<tr><td style="padding:8px;">Deductions</td><td style="text-align:right;padding:8px;">-$${parsed.data.deductions.toFixed(2)}</td></tr>` : ""}
          <tr style="border-top:2px solid #333;"><td style="padding:8px;"><strong>Net Pay</strong></td><td style="text-align:right;padding:8px;"><strong>$${netPay.toFixed(2)}</strong></td></tr>
        </table>
        ${parsed.data.notes ? `<p style="margin-top:20px;"><strong>Notes:</strong> ${parsed.data.notes}</p>` : ""}
        <p style="margin-top:40px;color:#888;font-size:12px;">Generated on ${new Date().toLocaleDateString()}</p>
      </body>
      </html>
    `;

    // Email payslip if technician has email
    if (technician.email) {
      try {
        await sendEmail({
          to: technician.email,
          subject: `Payslip - ${parsed.data.periodStart} to ${parsed.data.periodEnd}`,
          html: payslipHtml,
        });
      } catch (emailErr) {
        console.error("Failed to send payslip email:", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      technicianName: technician.name,
      grossPay,
      netPay,
      emailSent: !!technician.email,
    });
  } catch (error) {
    console.error("Payslip error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
