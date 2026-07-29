import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthedMemberId } from "@/lib/auth";
import { createBooking, BookingError } from "@/lib/booking";

export async function GET() {
  const memberId = await getAuthedMemberId();
  if (!memberId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const bookings = await prisma.booking.findMany({
    where: { memberId },
    include: { classSession: { include: { branch: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    bookings: bookings.map((b) => ({
      id: b.id,
      status: b.status,
      classSession: {
        id: b.classSession.id,
        title: b.classSession.title,
        instructor: b.classSession.instructor,
        startTime: b.classSession.startTime,
        endTime: b.classSession.endTime,
        branch: b.classSession.branch.name,
      },
    })),
  });
}

export async function POST(req: NextRequest) {
  const memberId = await getAuthedMemberId();
  if (!memberId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { classSessionId } = await req.json();
  if (!classSessionId) {
    return NextResponse.json({ error: "classSessionId는 필수입니다." }, { status: 400 });
  }

  try {
    const booking = await createBooking(memberId, classSessionId);
    return NextResponse.json({ booking });
  } catch (e) {
    if (e instanceof BookingError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "예약 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
