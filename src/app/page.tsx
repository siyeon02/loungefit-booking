"use client";

import { useEffect, useState } from "react";

type Pass = { id: string; totalSessions: number; usedSessions: number; remaining: number; expiresAt: string | null };
type MemberInfo = { member: { id: string; name: string; phone: string }; passes: Pass[]; totalRemaining: number };
type ClassItem = {
  id: string; title: string; instructor: string; startTime: string; endTime: string;
  capacity: number; booked: number; remaining: number; branch: { id: string; name: string };
};
type MyBooking = {
  id: string; status: string;
  classSession: { id: string; title: string; instructor: string; startTime: string; endTime: string; branch: string };
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export default function HomePage() {
  const [checking, setChecking] = useState(true);
  const [me, setMe] = useState<MemberInfo | null>(null);
  const [tab, setTab] = useState<"book" | "my">("book");

  useEffect(() => {
    refreshMe().finally(() => setChecking(false));
  }, []);

  async function refreshMe() {
    const res = await fetch("/api/me");
    if (res.ok) setMe(await res.json());
    else setMe(null);
  }

  if (checking) return null;

  return (
    <>
      <div className="topbar">
        <div className="container topbar-inner">
          <div className="brand">lounge<span>fit</span></div>
          <a href="/admin" style={{ fontSize: 13, color: "#cdd8d0" }}>관리자</a>
        </div>
      </div>

      {!me ? (
        <LoginView onSuccess={refreshMe} />
      ) : (
        <div className="container section">
          <div className="pass-summary">
            <div>
              <div className="num">{me.totalRemaining}회</div>
              <div className="label">{me.member.name}님의 잔여 이용권</div>
            </div>
            <div style={{ fontSize: 13, color: "#cdd8d0" }}>{me.passes.length}개 이용권 보유</div>
          </div>

          <div className="tabs">
            <button className={`tab-btn ${tab === "book" ? "active" : ""}`} onClick={() => setTab("book")}>수업 예약</button>
            <button className={`tab-btn ${tab === "my" ? "active" : ""}`} onClick={() => setTab("my")}>내 예약</button>
          </div>

          {tab === "book" ? (
            <ClassList onBooked={refreshMe} hasRemaining={me.totalRemaining > 0} />
          ) : (
            <MyBookings onChanged={refreshMe} />
          )}
        </div>
      )}
    </>
  );
}

function LoginView({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "로그인에 실패했습니다.");
      onSuccess();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="hero" style={{ paddingBottom: 0 }}>
        <div className="eyebrow">Member Booking</div>
        <h1>수업 예약, 이제 앱에서<br />간편하게</h1>
        <p>이름과 전화번호로 본인 확인 후 예약할 수 있어요. 이용권 잔여 횟수도 자동으로 관리됩니다.</p>
      </div>
      <form onSubmit={submit} className="card login-card">
        <div className="form-field">
          <label>이름</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="form-field">
          <label>전화번호</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01012345678" required />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn primary block" disabled={loading}>{loading ? "확인 중..." : "로그인"}</button>
        <p className="muted" style={{ marginTop: 10 }}>* 신규 회원 등록은 지점 데스크에서 도와드려요.</p>
      </form>
    </div>
  );
}

function ClassList({ onBooked, hasRemaining }: { onBooked: () => void; hasRemaining: boolean }) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [branchFilter, setBranchFilter] = useState("");
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/classes${branchFilter ? `?branchId=${branchFilter}` : ""}`);
    const data = await res.json();
    setClasses(data.classes || []);
    const uniqueBranches = Array.from(
      new Map((data.classes || []).map((c: ClassItem) => [c.branch.id, c.branch])).values()
    ) as { id: string; name: string }[];
    setBranches(uniqueBranches);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchFilter]);

  async function book(classSessionId: string) {
    setMsg(null);
    setBookingId(classSessionId);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classSessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "예약에 실패했습니다.");
      setMsg({ type: "success", text: "예약이 완료됐어요!" });
      await load();
      onBooked();
    } catch (e: any) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setBookingId(null);
    }
  }

  return (
    <div>
      {branches.length > 0 && (
        <div className="tabs">
          <button className={`tab-btn ${!branchFilter ? "active" : ""}`} onClick={() => setBranchFilter("")}>전체</button>
          {branches.map((b) => (
            <button key={b.id} className={`tab-btn ${branchFilter === b.id ? "active" : ""}`} onClick={() => setBranchFilter(b.id)}>
              {b.name}
            </button>
          ))}
        </div>
      )}

      {!hasRemaining && (
        <p className="error-text" style={{ marginBottom: 12 }}>잔여 이용권이 없습니다. 지점 데스크에서 이용권을 추가해주세요.</p>
      )}
      {msg && <p className={msg.type === "error" ? "error-text" : "muted"} style={{ color: msg.type === "success" ? "var(--success)" : undefined, marginBottom: 12 }}>{msg.text}</p>}

      <div className="class-list">
        {classes.map((c) => (
          <div key={c.id} className="card class-row">
            <div className="time">
              <div className="date-badge">{fmtDate(c.startTime)}</div>
              {fmtTime(c.startTime)}
            </div>
            <div className="meta">
              <div className="title">{c.title} <span className="tag">{c.branch.name}</span></div>
              <div className="sub">{c.instructor} 강사 · {fmtTime(c.startTime)}~{fmtTime(c.endTime)}</div>
            </div>
            <div className={`capacity ${c.remaining <= 0 ? "full" : ""}`}>
              {c.remaining <= 0 ? "정원마감" : `잔여 ${c.remaining}자리`}
            </div>
            <button
              className="btn accent"
              disabled={c.remaining <= 0 || !hasRemaining || bookingId === c.id}
              onClick={() => book(c.id)}
            >
              {bookingId === c.id ? "예약 중..." : "예약"}
            </button>
          </div>
        ))}
        {classes.length === 0 && <p className="muted">예정된 수업이 없습니다.</p>}
      </div>
    </div>
  );
}

function MyBookings({ onChanged }: { onChanged: () => void }) {
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/bookings");
    const data = await res.json();
    setBookings(data.bookings || []);
  }
  useEffect(() => {
    load();
  }, []);

  async function cancel(id: string) {
    setCancelingId(id);
    try {
      await fetch(`/api/bookings/${id}/cancel`, { method: "POST" });
      await load();
      onChanged();
    } finally {
      setCancelingId(null);
    }
  }

  const statusLabel: Record<string, string> = { BOOKED: "예약완료", CANCELLED: "취소됨", ATTENDED: "출석완료", NO_SHOW: "노쇼" };

  return (
    <div className="class-list">
      {bookings.map((b) => (
        <div key={b.id} className="card class-row">
          <div className="time">
            <div className="date-badge">{fmtDate(b.classSession.startTime)}</div>
            {fmtTime(b.classSession.startTime)}
          </div>
          <div className="meta">
            <div className="title">{b.classSession.title} <span className="tag">{b.classSession.branch}</span></div>
            <div className="sub">{b.classSession.instructor} 강사</div>
          </div>
          <span className={`badge ${b.status.toLowerCase()}`}>{statusLabel[b.status]}</span>
          {b.status === "BOOKED" && (
            <button className="btn danger" disabled={cancelingId === b.id} onClick={() => cancel(b.id)}>
              {cancelingId === b.id ? "취소 중..." : "취소"}
            </button>
          )}
        </div>
      ))}
      {bookings.length === 0 && <p className="muted">예약 내역이 없습니다.</p>}
    </div>
  );
}
