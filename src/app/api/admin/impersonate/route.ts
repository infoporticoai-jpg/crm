import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { logAdminAction } from "@/lib/admin-log";
import { cookies } from "next/headers";
import { z } from "zod";

const impersonateSchema = z.object({
  companyId: z.string().min(1).nullable(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const parsed = impersonateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const cookieStore = await cookies();

    if (parsed.data.companyId) {
      // Set impersonation cookie
      cookieStore.set("portico_impersonate", parsed.data.companyId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 4, // 4 hours
      });

      await logAdminAction({ action: "impersonate", adminEmail: session.user.email!, detail: `Started impersonating company`, targetCompanyId: parsed.data.companyId });

      return NextResponse.json({ success: true, message: `Impersonating company ${parsed.data.companyId}` });
    } else {
      // Clear impersonation
      cookieStore.delete("portico_impersonate");

      await logAdminAction({ action: "impersonate", adminEmail: session.user.email!, detail: "Stopped impersonating" });

      return NextResponse.json({ success: true, message: "Impersonation ended" });
    }
  } catch (error) {
    console.error("Impersonate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
