import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const importSchema = z.object({
  type: z.enum(["clients", "jobs", "inventory", "orders", "pickups", "pricing", "maintenance"]),
  data: z.array(z.record(z.any())).min(1, "Data array must not be empty"),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = importSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const { type, data } = parsed.data;
    const companyId = session.user.companyId;

    // Inject companyId into every record
    const records = data.map((row: any) => ({ ...row, companyId }));

    let result: { count: number };

    switch (type) {
      case "clients":
        result = await prisma.tapisClient.createMany({
          data: records,
          skipDuplicates: true,
        });
        break;

      case "jobs":
        // Convert date strings to Date objects
        result = await prisma.tapisJob.createMany({
          data: records.map((r: any) => ({
            ...r,
            scheduledDate: r.scheduledDate ? new Date(r.scheduledDate) : null,
          })),
          skipDuplicates: true,
        });
        break;

      case "inventory":
        result = await prisma.tapisInventory.createMany({
          data: records.map((r: any) => ({
            ...r,
            date: r.date ? new Date(r.date) : new Date(),
          })),
          skipDuplicates: true,
        });
        break;

      case "orders":
        result = await prisma.tapisSupplierOrder.createMany({
          data: records.map((r: any) => ({
            ...r,
            date: r.date ? new Date(r.date) : null,
          })),
          skipDuplicates: true,
        });
        break;

      case "pickups":
        result = await prisma.tapisPickup.createMany({
          data: records.map((r: any) => ({
            ...r,
            orderDate: r.orderDate ? new Date(r.orderDate) : null,
            pickupDate: r.pickupDate ? new Date(r.pickupDate) : null,
          })),
          skipDuplicates: true,
        });
        break;

      case "pricing":
        result = await prisma.tapisPricing.createMany({
          data: records,
          skipDuplicates: true,
        });
        break;

      case "maintenance":
        result = await prisma.tapisMaintenance.createMany({
          data: records.map((r: any) => ({
            ...r,
            date: r.date ? new Date(r.date) : null,
          })),
          skipDuplicates: true,
        });
        break;

      default:
        return NextResponse.json({ error: "Invalid import type" }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, type, imported: result.count },
      { status: 201 }
    );
  } catch (error) {
    console.error("Tapis import error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
