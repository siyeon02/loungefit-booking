import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthed } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const classSessionId = searchParams.get("classSessionId") || undefined;

  const bookings = await prisma.booking.findMany({
    where: classSessionId ? { classSessionId } : {},
    include: { member: true, classSession: { include: { branch: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    bookings: bookings.map((b) => ({
      id: b.id,
      status: b.status,
      member: { id: b.member.id, name: b.member.name, phone: b.member.phone },
      classSession: {
        id: b.classSession.id,
        title: b.classSession.title,
        startTime: b.classSession.startTime,
        branch: b.classSession.branch.name,
      },
    })),
  });
}
