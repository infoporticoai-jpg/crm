import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // companyId
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?error=google_denied`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?error=google_missing_params`);
    }

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/google/callback`,
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokens.access_token) {
      console.error("Google token exchange failed:", tokens);
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?error=google_token_failed`);
    }

    // Store tokens
    await prisma.company.update({
      where: { id: state },
      data: {
        googleCalendarAccessToken: tokens.access_token,
        googleCalendarRefreshToken: tokens.refresh_token || undefined,
      },
    });

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?success=google_connected`);
  } catch (error) {
    console.error("Google callback error:", error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?error=google_unknown`);
  }
}
