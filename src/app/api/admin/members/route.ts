import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthed } from "@/lib/auth";

export async function GET() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const members = await prisma.member.findMany({
    orderBy: { createdAt: "desc" },
    include: { passes: true },
  });

  return NextResponse.json({
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      phone: m.phone,
      createdAt: m.createdAt,
      totalRemaining: m.passes.reduce((sum, p) => sum + Math.max(0, p.totalSessions - p.usedSessions), 0),
      passCount: m.passes.length,
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { name, phone, initialSessions } = await req.json();
  const normalizedPhone = typeof phone === "string" ? phone.replace(/[^0-9]/g, "") : "";
  if (!name || !normalizedPhone) {
    return NextResponse.json({ error: "이름과 전화번호는 필수입니다." }, { status: 400 });
  }

  const existing = await prisma.member.findUnique({ where: { phone: normalizedPhone } });
  if (existing) {
    return NextResponse.json({ error: "이미 등록된 전화번호입니다." }, { status: 409 });
  }

  const member = await prisma.member.create({
    data: {
      name,
      phone: normalizedPhone,
      ...(initialSessions && Number(initialSessions) > 0
        ? { passes: { create: { totalSessions: Number(initialSessions) } } }
        : {}),
    },
    include: { passes: true },
  });

  return NextResponse.json({ member });
}
