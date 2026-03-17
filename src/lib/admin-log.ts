import { prisma } from "@/lib/prisma";

export async function logAdminAction({
  action,
  detail,
  adminEmail,
  targetCompanyId,
}: {
  action: string;
  detail?: string;
  adminEmail: string;
  targetCompanyId?: string;
}) {
  return prisma.adminLog.create({
    data: { action, detail, adminEmail, targetCompanyId },
  });
}
