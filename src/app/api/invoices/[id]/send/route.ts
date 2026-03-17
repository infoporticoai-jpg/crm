import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
      include: { customer: true, job: true },
    });

    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (!invoice.customer?.email) {
      return NextResponse.json({ error: "Customer has no email address" }, { status: 400 });
    }

    // Mark as sent
    await prisma.invoice.update({
      where: { id: params.id },
      data: { status: "sent" },
    });

    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { name: true, email: true },
    });

    const lineItems = JSON.parse(invoice.lineItems || "[]");
    const itemsHtml = lineItems
      .map((item: any) => `<tr><td>${item.description}</td><td>${item.quantity}</td><td>$${item.unitPrice.toFixed(2)}</td><td>$${item.total.toFixed(2)}</td></tr>`)
      .join("");

    await sendEmail({
      to: invoice.customer.email,
      subject: `Invoice from ${company?.name || "Portico"}`,
      html: `
        <h2>Invoice</h2>
        <p>Dear ${invoice.customer.name},</p>
        <p>Please find your invoice below:</p>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
          <tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
          ${itemsHtml}
        </table>
        <p><strong>Subtotal:</strong> $${invoice.subtotal.toFixed(2)}</p>
        <p><strong>Tax:</strong> $${invoice.tax.toFixed(2)}</p>
        <p><strong>Total:</strong> $${invoice.total.toFixed(2)}</p>
        ${invoice.dueDate ? `<p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>` : ""}
        ${invoice.notes ? `<p><strong>Notes:</strong> ${invoice.notes}</p>` : ""}
        <p>Thank you for your business!</p>
        <p>${company?.name || "Portico"}</p>
      `,
    });

    return NextResponse.json({ success: true, message: "Invoice sent" });
  } catch (error) {
    console.error("Invoice send error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
