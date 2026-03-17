import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: any = { companyId: session.user.companyId };
    if (type) where.type = type;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const costs = await prisma.cost.findMany({
      where,
      orderBy: { date: "desc" },
    });

    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { name: true, address: true, phone: true, email: true, tpsNumber: true, tvqNumber: true },
    });

    const totalCosts = costs.filter((c) => c.type === "cost").reduce((sum, c) => sum + c.price, 0);
    const totalRevenue = costs.filter((c) => c.type === "revenue").reduce((sum, c) => sum + c.price, 0);

    const rowsHtml = costs
      .map(
        (c) =>
          `<tr>
            <td style="padding:6px;border:1px solid #ddd;">${new Date(c.date).toLocaleDateString()}</td>
            <td style="padding:6px;border:1px solid #ddd;">${c.name}</td>
            <td style="padding:6px;border:1px solid #ddd;">${c.type}</td>
            <td style="padding:6px;border:1px solid #ddd;text-align:right;">$${c.price.toFixed(2)}</td>
            <td style="padding:6px;border:1px solid #ddd;">${c.notes || ""}</td>
          </tr>`
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Costs Report</title></head>
      <body style="font-family:Arial,sans-serif;padding:40px;">
        <h1>${company?.name || "Company"} - Costs Report</h1>
        ${company?.address ? `<p>${company.address}</p>` : ""}
        ${company?.phone ? `<p>Phone: ${company.phone}</p>` : ""}
        <hr/>
        <table style="width:100%;border-collapse:collapse;margin-top:20px;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Date</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Name</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Type</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:right;">Amount</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Notes</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div style="margin-top:20px;">
          <p><strong>Total Costs:</strong> $${totalCosts.toFixed(2)}</p>
          <p><strong>Total Revenue:</strong> $${totalRevenue.toFixed(2)}</p>
          <p><strong>Net:</strong> $${(totalRevenue - totalCosts).toFixed(2)}</p>
        </div>
        <p style="margin-top:40px;color:#888;font-size:12px;">Generated on ${new Date().toLocaleDateString()}</p>
      </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": 'attachment; filename="costs-report.html"',
      },
    });
  } catch (error) {
    console.error("PDF export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
