import { prisma } from "./db";

export class BookingError extends Error {}

/**
 * 예약 생성. 아래 조건을 트랜잭션 안에서 원자적으로 확인합니다:
 * 1. 정원이 남아있는지
 * 2. 같은 시간대에 이미 다른 예약이 있는지 (지점 무관, 시간 겹치면 차단)
 * 3. 사용 가능한(잔여 횟수 > 0, 만료 안 된) 이용권이 있는지
 * 정원/이용권 관련 레이스 컨디션 방지를 위해 하나의 트랜잭션으로 처리합니다.
 */
export async function createBooking(memberId: string, classSessionId: string) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.classSession.findUnique({
      where: { id: classSessionId },
      include: { _count: { select: { bookings: { where: { status: "BOOKED" } } } } },
    });
    if (!session) throw new BookingError("존재하지 않는 수업입니다.");
    if (session.startTime < new Date()) throw new BookingError("이미 지난 수업은 예약할 수 없습니다.");
    if (session._count.bookings >= session.capacity) {
      throw new BookingError("정원이 마감된 수업입니다.");
    }

    // 같은 시간대 중복 예약 방지 (겹치는 시간대에 이미 예약이 있는지)
    const overlapping = await tx.booking.findFirst({
      where: {
        memberId,
        status: "BOOKED",
        classSession: {
          startTime: { lt: session.endTime },
          endTime: { gt: session.startTime },
        },
      },
    });
    if (overlapping) throw new BookingError("같은 시간에 이미 다른 예약이 있습니다.");

    // 사용 가능한 이용권 탐색 (만료 안 되고 잔여 횟수 있는 것 중 가장 먼저 만료되는 것부터 소진)
    const pass = await tx.pass.findFirst({
      where: {
        memberId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: [{ expiresAt: { sort: "asc", nulls: "last" } }],
    });
    const usablePass = pass && pass.usedSessions < pass.totalSessions ? pass : null;
    if (!usablePass) {
      // 잔여 횟수 있는 다른 이용권이 있는지 넓게 재탐색 (findFirst의 orderBy 제약 우회)
      const allPasses = await tx.pass.findMany({
        where: { memberId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      });
      const candidate = allPasses.find((p) => p.usedSessions < p.totalSessions);
      if (!candidate) throw new BookingError("사용 가능한 이용권(잔여 횟수)이 없습니다.");
      await tx.pass.update({ where: { id: candidate.id }, data: { usedSessions: { increment: 1 } } });
      return tx.booking.create({
        data: { memberId, classSessionId, passId: candidate.id, status: "BOOKED" },
      });
    }

    await tx.pass.update({ where: { id: usablePass.id }, data: { usedSessions: { increment: 1 } } });
    return tx.booking.create({
      data: { memberId, classSessionId, passId: usablePass.id, status: "BOOKED" },
    });
  });
}

/**
 * 예약 취소. 취소 시 사용했던 이용권 회차를 환급합니다.
 * (노쇼 처리된 예약은 별도 관리자 액션이므로 이 함수로 취소되지 않음)
 */
export async function cancelBooking(memberId: string, bookingId: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.memberId !== memberId) {
      throw new BookingError("예약을 찾을 수 없습니다.");
    }
    if (booking.status !== "BOOKED") {
      throw new BookingError("이미 처리된 예약입니다.");
    }
    await tx.pass.update({ where: { id: booking.passId }, data: { usedSessions: { decrement: 1 } } });
    return tx.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED" } });
  });
}
