import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthed } from "@/lib/auth";

export async function GET() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const classes = await prisma.classSession.findMany({
    include: { branch: true, _count: { select: { bookings: { where: { status: "BOOKED" } } } } },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json({
    classes: classes.map((c) => ({
      id: c.id,
      title: c.title,
      instructor: c.instructor,
      startTime: c.startTime,
      endTime: c.endTime,
      capacity: c.capacity,
      booked: c._count.bookings,
      branch: { id: c.branch.id, name: c.branch.name },
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { branchId, title, instructor, startTime, endTime, capacity } = await req.json();
  if (!branchId || !title || !instructor || !startTime || !endTime || !capacity) {
    return NextResponse.json({ error: "모든 필드를 입력해주세요." }, { status: 400 });
  }

  const classSession = await prisma.classSession.create({
    data: {
      branchId,
      title,
      instructor,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      capacity: Number(capacity),
    },
  });
  return NextResponse.json({ classSession });
}
