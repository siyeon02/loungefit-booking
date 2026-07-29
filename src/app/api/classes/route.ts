import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || undefined;

  const sessions = await prisma.classSession.findMany({
    where: {
      startTime: { gte: new Date() },
      ...(branchId ? { branchId } : {}),
    },
    include: {
      branch: true,
      _count: { select: { bookings: { where: { status: "BOOKED" } } } },
    },
    orderBy: { startTime: "asc" },
    take: 100,
  });

  return NextResponse.json({
    classes: sessions.map((s) => ({
      id: s.id,
      title: s.title,
      instructor: s.instructor,
      startTime: s.startTime,
      endTime: s.endTime,
      capacity: s.capacity,
      booked: s._count.bookings,
      remaining: s.capacity - s._count.bookings,
      branch: { id: s.branch.id, name: s.branch.name },
    })),
  });
}
