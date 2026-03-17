import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { sendEmail } from "@/lib/email";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const technician = await prisma.technician.findFirst({
      where: { id, companyId: session.user.companyId },
    });
    if (!technician) return NextResponse.json({ error: "Technician not found" }, { status: 404 });

    const normalizedEmail = parsed.data.email.toLowerCase().trim();

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashedPassword = await hash(parsed.data.password, 12);

    // Create user and link to technician
    const user = await prisma.user.create({
      data: {
        name: technician.name,
        email: normalizedEmail,
        password: hashedPassword,
        role: "technician",
        companyId: session.user.companyId,
        technicianId: technician.id,
      },
    });

    // Link technician to user
    await prisma.technician.update({
      where: { id: technician.id },
      data: { userId: user.id, email: normalizedEmail },
    });

    // Send invite email
    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { name: true },
    });

    try {
      await sendEmail({
        to: normalizedEmail,
        subject: `You're invited to ${company?.name || "Portico CRM"}`,
        html: `
          <h2>Welcome to ${company?.name || "Portico CRM"}</h2>
          <p>Hi ${technician.name},</p>
          <p>You've been invited as a technician. Here are your login credentials:</p>
          <p><strong>Email:</strong> ${normalizedEmail}</p>
          <p><strong>Password:</strong> ${parsed.data.password}</p>
          <p>Please change your password after your first login.</p>
          <p><a href="${process.env.NEXTAUTH_URL || "https://app.porticoai.net"}/login">Login here</a></p>
        `,
      });
    } catch (emailErr) {
      console.error("Failed to send invite email:", emailErr);
    }

    return NextResponse.json({ success: true, userId: user.id }, { status: 201 });
  } catch (error) {
    console.error("Technician invite error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
