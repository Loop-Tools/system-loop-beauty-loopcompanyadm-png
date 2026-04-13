import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const settings = await prisma.clinicSettings.findFirst();
  const businessHours = await prisma.businessHours.findMany({
    orderBy: { dayOfWeek: "asc" },
  });

  return NextResponse.json({ settings, businessHours });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { settings: settingsData, businessHours: hoursData } = body;

  if (settingsData) {
    await prisma.clinicSettings.upsert({
      where: { id: "singleton" },
      update: settingsData,
      create: { id: "singleton", ...settingsData },
    });
  }

  if (hoursData && Array.isArray(hoursData)) {
    for (const hour of hoursData) {
      await prisma.businessHours.upsert({
        where: { dayOfWeek: hour.dayOfWeek },
        update: {
          openTime: hour.openTime,
          closeTime: hour.closeTime,
          isOpen: hour.isOpen,
        },
        create: {
          dayOfWeek: hour.dayOfWeek,
          openTime: hour.openTime,
          closeTime: hour.closeTime,
          isOpen: hour.isOpen,
        },
      });
    }
  }

  const settings = await prisma.clinicSettings.findFirst();
  const businessHours = await prisma.businessHours.findMany({
    orderBy: { dayOfWeek: "asc" },
  });

  return NextResponse.json({ settings, businessHours });
}
