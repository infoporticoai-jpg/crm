import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { logAdminAction } from "@/lib/admin-log";
import { z } from "zod";

const broadcastSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
  targetStatus: z.string().optional(), // filter by company status
  targetPlan: z.string().optional(), // filter by plan
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const parsed = broadcastSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const { subject, message, targetStatus, targetPlan } = parsed.data;

    // Get target companies
    const where: any = {};
    if (targetStatus) where.status = targetStatus;
    if (targetPlan) where.subscriptionPlan = targetPlan;

    const companies = await prisma.company.findMany({
      where,
      include: {
        users: {
          where: { role: "owner" },
          select: { email: true, name: true },
        },
      },
    });

    // Send notification to each company
    const notifications = companies.map((company) => ({
      type: "new_call" as const,
      title: subject,
      message,
      link: null,
      companyId: company.id,
    }));

    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications });
    }

    // Send emails to owners
    let emailsSent = 0;
    for (const company of companies) {
      for (const user of company.users) {
        if (user.email) {
          try {
            await sendEmail({
              to: user.email,
              subject: `[Portico] ${subject}`,
              html: `
                <h2>${subject}</h2>
                <p>Hi ${user.name},</p>
                <div>${message.replace(/\n/g, "<br/>")}</div>
                <p>- The Portico Team</p>
              `,
            });
            emailsSent++;
          } catch (emailErr) {
            console.error(`Failed to send broadcast to ${user.email}:`, emailErr);
          }
        }
      }
    }

    await logAdminAction(
      "broadcast",
      session.user.email!,
      `Broadcast "${subject}" to ${companies.length} companies (${emailsSent} emails sent)`
    );

    return NextResponse.json({
      success: true,
      companiesNotified: companies.length,
      emailsSent,
    });
  } catch (error) {
    console.error("Broadcast error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
