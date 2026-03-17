import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

export async function getCalendarClient(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      googleCalendarAccessToken: true,
      googleCalendarRefreshToken: true,
      googleCalendarId: true,
    },
  });
  if (!company?.googleCalendarAccessToken) return null;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({
    access_token: company.googleCalendarAccessToken,
    refresh_token: company.googleCalendarRefreshToken,
  });

  return {
    calendar: google.calendar({ version: "v3", auth: oauth2Client }),
    calendarId: company.googleCalendarId || "primary",
  };
}
