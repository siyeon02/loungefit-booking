import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthedMemberId } from "@/lib/auth";

export async function GET() {
  const memberId = await getAuthedMemberId();
  if (!memberId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { passes: { orderBy: { issuedAt: "desc" } } },
  });
  if (!member) return NextResponse.json({ error: "not found" }, { status: 404 });

  const passes = member.passes.map((p) => ({
    id: p.id,
    totalSessions: p.totalSessions,
    usedSessions: p.usedSessions,
    remaining: p.totalSessions - p.usedSessions,
    expiresAt: p.expiresAt,
  }));

  return NextResponse.json({
    member: { id: member.id, name: member.name, phone: member.phone },
    passes,
    totalRemaining: passes.reduce((sum, p) => sum + Math.max(0, p.remaining), 0),
  });
}
