import { NextResponse } from "next/server";
import { getAuthedMemberId } from "@/lib/auth";
import { cancelBooking, BookingError } from "@/lib/booking";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const memberId = await getAuthedMemberId();
  if (!memberId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const booking = await cancelBooking(memberId, params.id);
    return NextResponse.json({ booking });
  } catch (e) {
    if (e instanceof BookingError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "취소 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
