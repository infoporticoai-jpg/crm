import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { getCalendarClient } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const cal = await getCalendarClient(session.user.companyId);
    if (!cal) {
      return NextResponse.json({ error: "Google Calendar not connected" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const timeMin = searchParams.get("timeMin") || new Date().toISOString();
    const timeMax = searchParams.get("timeMax") || (() => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d.toISOString();
    })();

    const result = await cal.listEvents(timeMin, timeMax);

    return NextResponse.json(result.items || []);
  } catch (error) {
    console.error("Google events error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
