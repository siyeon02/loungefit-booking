import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthed } from "@/lib/auth";

// 노쇼(NO_SHOW)와 출석완료(ATTENDED)는 이미 차감된 이용권 횟수를 되돌리지 않습니다.
// 관리자 취소(CANCELLED)만 이용권을 환급합니다 (회원 직접 취소와 동일 정책).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { status } = await req.json();
  if (!["ATTENDED", "NO_SHOW", "CANCELLED"].includes(status)) {
    return NextResponse.json({ error: "유효하지 않은 상태입니다." }, { status: 400 });
  }

  const booking = await prisma.$transaction(async (tx) => {
    const current = await tx.booking.findUnique({ where: { id: params.id } });
    if (!current) throw new Error("not found");
    if (current.status !== "BOOKED") throw new Error("already processed");

    if (status === "CANCELLED") {
      await tx.pass.update({ where: { id: current.passId }, data: { usedSessions: { decrement: 1 } } });
    }
    return tx.booking.update({ where: { id: params.id }, data: { status } });
  }).catch((e) => {
    if (e.message === "not found") return null;
    throw e;
  });

  if (!booking) return NextResponse.json({ error: "이미 처리되었거나 존재하지 않는 예약입니다." }, { status: 409 });
  return NextResponse.json({ booking });
}
