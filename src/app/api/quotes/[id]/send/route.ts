import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const quote = await prisma.quote.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
      include: { customer: true },
    });

    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    if (!quote.customer?.email) {
      return NextResponse.json({ error: "Customer has no email address" }, { status: 400 });
    }

    await prisma.quote.update({
      where: { id: params.id },
      data: { status: "sent" },
    });

    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { name: true },
    });

    const lineItems = JSON.parse(quote.lineItems || "[]");
    const itemsHtml = lineItems
      .map((item: any) => `<tr><td>${item.description}</td><td>${item.quantity}</td><td>$${item.unitPrice.toFixed(2)}</td><td>$${item.total.toFixed(2)}</td></tr>`)
      .join("");

    await sendEmail({
      to: quote.customer.email,
      subject: `Quote from ${company?.name || "Portico"}`,
      html: `
        <h2>Quote</h2>
        <p>Dear ${quote.customer.name},</p>
        <p>Please find your quote below:</p>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
          <tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
          ${itemsHtml}
        </table>
        <p><strong>Subtotal:</strong> $${quote.subtotal.toFixed(2)}</p>
        <p><strong>Tax:</strong> $${quote.tax.toFixed(2)}</p>
        <p><strong>Total:</strong> $${quote.total.toFixed(2)}</p>
        ${quote.expiryDate ? `<p><strong>Valid until:</strong> ${new Date(quote.expiryDate).toLocaleDateString()}</p>` : ""}
        ${quote.notes ? `<p><strong>Notes:</strong> ${quote.notes}</p>` : ""}
        <p>Thank you!</p>
        <p>${company?.name || "Portico"}</p>
      `,
    });

    return NextResponse.json({ success: true, message: "Quote sent" });
  } catch (error) {
    console.error("Quote send error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
