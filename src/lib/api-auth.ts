import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function getSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return session as any;
}

export async function resolveCompany(req: NextRequest): Promise<string | null> {
  const url = new URL(req.url);
  const apiKey = req.headers.get("x-api-key") || url.searchParams.get("key");
  if (!apiKey) return null;
  const company = await prisma.company.findFirst({
    where: { n8nWebhookKey: apiKey },
  });
  return company?.id || null;
}
