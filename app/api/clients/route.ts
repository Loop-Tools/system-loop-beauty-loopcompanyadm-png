import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");

  const where = search
    ? {
        OR: [
          { name: { contains: search } },
          { phone: { contains: search } },
          { email: { contains: search } },
        ],
      }
    : undefined;

  const clients = await prisma.client.findMany({
    where,
    include: {
      appointments: {
        include: { service: true, employee: true, room: true },
        orderBy: { date: "desc" },
        take: 10,
      },
      _count: { select: { appointments: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, email, phone, address, nif, birthday, referredBy, notes, credit, cashback } = body;

  if (!name || !phone) {
    return NextResponse.json({ error: "name and phone are required" }, { status: 400 });
  }

  const client = await prisma.client.create({
    data: {
      name,
      email: email || null,
      phone,
      address: address || null,
      nif: nif || null,
      birthday: birthday ? new Date(birthday) : null,
      referredBy: referredBy || null,
      notes: notes || null,
      credit: credit ?? 0,
      cashback: cashback ?? 0,
    },
  });

  return NextResponse.json(client);
}
