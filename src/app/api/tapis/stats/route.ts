import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const companyId = session.user.companyId;
    const currentYear = new Date().getFullYear();

    const [
      totalClients,
      clientsWithEmail,
      retraitJobs,
      reinstallationJobs,
      nouvelleInstallationJobs,
      enlevementJobs,
      faitJobs,
      pendingJobs,
      sentOutreach,
      confirmedOutreach,
      pendingOutreach,
    ] = await Promise.all([
      prisma.tapisClient.count({ where: { companyId } }),
      prisma.tapisClient.count({ where: { companyId, email: { not: null } } }),
      prisma.tapisJob.count({ where: { companyId, jobType: "retrait" } }),
      prisma.tapisJob.count({ where: { companyId, jobType: "reinstallation" } }),
      prisma.tapisJob.count({ where: { companyId, jobType: "nouvelle_installation" } }),
      prisma.tapisJob.count({ where: { companyId, jobType: "enlevement" } }),
      prisma.tapisJob.count({ where: { companyId, fait: true } }),
      prisma.tapisJob.count({ where: { companyId, fait: false } }),
      prisma.tapisOutreach.count({ where: { companyId, status: "sent" } }),
      prisma.tapisOutreach.count({ where: { companyId, status: "confirmed" } }),
      prisma.tapisOutreach.count({ where: { companyId, status: "pending" } }),
    ]);

    return NextResponse.json({
      totalClients,
      clientsWithEmail,
      jobsByType: {
        retrait: retraitJobs,
        reinstallation: reinstallationJobs,
        nouvelle_installation: nouvelleInstallationJobs,
        enlevement: enlevementJobs,
      },
      jobsByStatus: {
        fait: faitJobs,
        pending: pendingJobs,
      },
      outreachStats: {
        sent: sentOutreach,
        confirmed: confirmedOutreach,
        pending: pendingOutreach,
      },
      currentYear,
    });
  } catch (error) {
    console.error("Tapis stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
