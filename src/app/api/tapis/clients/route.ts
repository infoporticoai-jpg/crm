import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  projectNumber: z.string().min(1, "Project number is required"),
  name: z.string().min(1, "Name is required"),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  contact: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  buildingType: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  seasonHistory: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";

  const where: any = { companyId: session.user.companyId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { projectNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  const clients = await prisma.tapisClient.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { jobs: true, outreach: true } },
    },
  });

  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const client = await prisma.tapisClient.create({
      data: { ...parsed.data, companyId: session.user.companyId },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("TapisClient create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
