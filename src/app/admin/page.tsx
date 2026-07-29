"use client";

import { useEffect, useState } from "react";

type Branch = { id: string; name: string };
type Member = { id: string; name: string; phone: string; totalRemaining: number; passCount: number };
type ClassItem = {
  id: string; title: string; instructor: string; startTime: string; endTime: string;
  capacity: number; booked: number; branch: { id: string; name: string };
};
type AdminBooking = {
  id: string; status: string;
  member: { id: string; name: string; phone: string };
  classSession: { id: string; title: string; startTime: string; branch: string };
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"members" | "classes" | "bookings">("members");

  useEffect(() => {
    fetch("/api/admin/members").then((r) => setAuthed(r.ok));
  }, []);

  if (authed === null) return null;
  if (!authed) return <LoginForm onSuccess={() => setAuthed(true)} />;

  return (
    <div className="admin-shell">
      <div className="topbar">
        <div className="container topbar-inner">
          <div className="brand">lounge<span>fit</span> 관리자</div>
          <div style={{ display: "flex", gap: 10 }}>
            {(["members", "classes", "bookings"] as const).map((t) => (
              <button
                key={t}
                className="btn"
                style={{ background: tab === t ? "white" : "transparent", color: tab === t ? "#1f2b24" : "#cdd8d0", borderColor: "#4a6357" }}
                onClick={() => setTab(t)}
              >
                {t === "members" ? "회원 관리" : t === "classes" ? "수업 관리" : "예약 관리"}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="container section">
        {tab === "members" && <MembersPanel />}
        {tab === "classes" && <ClassesPanel />}
        {tab === "bookings" && <BookingsPanel />}
      </div>
    </div>
  );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) onSuccess();
    else setError("비밀번호가 올바르지 않습니다.");
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <form onSubmit={submit} className="card" style={{ padding: 32, width: 320 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>관리자 로그인</div>
        <div className="form-field">
          <label>비밀번호</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn primary block">로그인</button>
      </form>
    </div>
  );
}

function MembersPanel() {
  const [members, setMembers] = useState<Member[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [initialSessions, setInitialSessions] = useState("10");
  const [error, setError] = useState("");

  const [passTargetId, setPassTargetId] = useState<string | null>(null);
  const [passSessions, setPassSessions] = useState("10");

  async function load() {
    const res = await fetch("/api/admin/members");
    const data = await res.json();
    setMembers(data.members || []);
  }
  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, initialSessions: Number(initialSessions) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "등록에 실패했습니다.");
      return;
    }
    setName("");
    setPhone("");
    setInitialSessions("10");
    setShowForm(false);
    load();
  }

  async function issuePass(memberId: string) {
    await fetch(`/api/admin/members/${memberId}/passes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalSessions: Number(passSessions) }),
    });
    setPassTargetId(null);
    setPassSessions("10");
    load();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>회원 관리</h2>
        <button className="btn accent" onClick={() => setShowForm((s) => !s)}>{showForm ? "닫기" : "+ 회원 등록"}</button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div className="form-field"><label>이름</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="form-field"><label>전화번호</label><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01012345678" required /></div>
          <div className="form-field"><label>초기 이용권 횟수</label><input type="number" min={0} value={initialSessions} onChange={(e) => setInitialSessions(e.target.value)} /></div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn primary">등록</button>
        </form>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead><tr><th>이름</th><th>전화번호</th><th>잔여 횟수</th><th></th></tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{m.phone}</td>
                <td>{m.totalRemaining}회 ({m.passCount}개 이용권)</td>
                <td>
                  {passTargetId === m.id ? (
                    <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="number" min={1} value={passSessions} onChange={(e) => setPassSessions(e.target.value)}
                        style={{ width: 60, padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 6 }}
                      />
                      <button className="btn primary" onClick={() => issuePass(m.id)}>부여</button>
                      <button className="btn" onClick={() => setPassTargetId(null)}>취소</button>
                    </span>
                  ) : (
                    <button className="btn" onClick={() => setPassTargetId(m.id)}>이용권 추가</button>
                  )}
                </td>
              </tr>
            ))}
            {members.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", padding: 24, color: "#888" }}>등록된 회원이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClassesPanel() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [title, setTitle] = useState("");
  const [instructor, setInstructor] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [capacity, setCapacity] = useState("10");
  const [error, setError] = useState("");

  async function load() {
    const [cRes, bRes] = await Promise.all([fetch("/api/admin/classes"), fetch("/api/admin/branches")]);
    setClasses((await cRes.json()).classes || []);
    const bData = await bRes.json();
    setBranches(bData.branches || []);
    if (bData.branches?.[0]) setBranchId((prev) => prev || bData.branches[0].id);
  }
  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId, title, instructor, startTime, endTime, capacity: Number(capacity) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "생성에 실패했습니다.");
      return;
    }
    setTitle(""); setInstructor(""); setStartTime(""); setEndTime("");
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>수업 관리</h2>
        <button className="btn accent" onClick={() => setShowForm((s) => !s)}>{showForm ? "닫기" : "+ 수업 등록"}</button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div className="form-field">
            <label>지점</label>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="form-field"><label>수업명</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 필라테스 기초반" required /></div>
          <div className="form-field"><label>강사명</label><input value={instructor} onChange={(e) => setInstructor(e.target.value)} required /></div>
          <div className="form-field"><label>시작 시각</label><input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required /></div>
          <div className="form-field"><label>종료 시각</label><input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required /></div>
          <div className="form-field"><label>정원</label><input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} required /></div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn primary">등록</button>
        </form>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead><tr><th>지점</th><th>수업명</th><th>강사</th><th>일시</th><th>예약/정원</th></tr></thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.id}>
                <td>{c.branch.name}</td>
                <td>{c.title}</td>
                <td>{c.instructor}</td>
                <td>{fmtDateTime(c.startTime)}</td>
                <td>{c.booked} / {c.capacity}</td>
              </tr>
            ))}
            {classes.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: 24, color: "#888" }}>등록된 수업이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BookingsPanel() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);

  async function load() {
    const res = await fetch("/api/admin/bookings");
    const data = await res.json();
    setBookings(data.bookings || []);
  }
  useEffect(() => {
    load();
  }, []);

  async function setStatus(id: string, status: string) {
    await fetch(`/api/admin/bookings/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  const statusLabel: Record<string, string> = { BOOKED: "예약완료", CANCELLED: "취소됨", ATTENDED: "출석완료", NO_SHOW: "노쇼" };

  return (
    <div>
      <h2 style={{ fontSize: 18, marginBottom: 16 }}>예약 관리</h2>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead><tr><th>회원</th><th>수업</th><th>지점</th><th>일시</th><th>상태</th><th></th></tr></thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td>{b.member.name} ({b.member.phone})</td>
                <td>{b.classSession.title}</td>
                <td>{b.classSession.branch}</td>
                <td>{fmtDateTime(b.classSession.startTime)}</td>
                <td><span className={`badge ${b.status.toLowerCase()}`}>{statusLabel[b.status]}</span></td>
                <td>
                  {b.status === "BOOKED" && (
                    <span style={{ display: "flex", gap: 6 }}>
                      <button className="btn" onClick={() => setStatus(b.id, "ATTENDED")}>출석</button>
                      <button className="btn danger" onClick={() => setStatus(b.id, "NO_SHOW")}>노쇼</button>
                      <button className="btn" onClick={() => setStatus(b.id, "CANCELLED")}>취소</button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {bookings.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#888" }}>예약 내역이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
