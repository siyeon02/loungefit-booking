import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthed } from "@/lib/auth";

export async function GET() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });
  if (branches.length === 0) {
    // 고객사(라운지핏) 상담 내용 기준 3개 지점으로 최초 시드
    await prisma.branch.createMany({
      data: [{ name: "강남점" }, { name: "성수점" }, { name: "홍대점" }],
    });
    branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });
  }
  return NextResponse.json({ branches });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "name은 필수입니다." }, { status: 400 });
  const branch = await prisma.branch.create({ data: { name } });
  return NextResponse.json({ branch });
}
