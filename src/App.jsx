import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://rqcnavvgvmvlgebqjygm.supabase.co";
const SUPABASE_KEY = "sb_publishable_HQi5Q-97sd4PG_2JqmadKw_3A0xp-xI";

const h = (token) => ({
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${token || SUPABASE_KEY}`,
});

const authFetch = async (path, opts = {}) => {
  const res = await fetch(`${SUPABASE_URL}${path}`, { ...opts, headers: { ...h(), ...(opts.headers || {}) } });
  return res.json();
};

const api = {
  get: (table, params = "", token) =>
    fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, { headers: h(token) }).then(r => r.json()),
  post: (table, body, token) =>
    fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: { ...h(token), "Prefer": "return=representation" }, body: JSON.stringify(body) }).then(r => r.json()),
  patch: (table, id, body, token) =>
    fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "PATCH", headers: { ...h(token), "Prefer": "return=representation" }, body: JSON.stringify(body) }).then(r => r.json()),
  delete: (table, id, token) =>
    fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers: h(token) }).then(r => r.ok),
  upsert: (table, body, token) =>
    fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: { ...h(token), "Prefer": "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(body) }).then(r => r.json()),
};

const formatTime = (d) => d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
const formatDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
const todayKey = () => new Date().toISOString().slice(0, 10);
const fakeEmail = (u) => `${u.toLowerCase().replace(/\s+/g, "_")}@trip.app`;

const getLast5Days = () => {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().slice(0, 10);
  });
};

// Register service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// ─── Auth Page ────────────────────────────────────────────────────────────────
function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "signup" | "reset"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!username.trim()) return setError("กรอก username ด้วยนะคะ");

    // Reset password mode — username + new password (no old password required)
    if (mode === "reset") {
      if (!newPassword || newPassword.length < 6) return setError("password ใหม่ต้องมีอย่างน้อย 6 ตัวอักษรค่ะ");
      setLoading(true); setError("");
      const email = fakeEmail(username);
      // signup ด้วย email เดิม + password ใหม่ ถ้า user มีอยู่แล้ว Supabase จะ error
      // แต่เราใช้ admin endpoint ผ่าน service role ไม่ได้ใน client
      // วิธีที่ทำได้: update password โดยตรงผ่าน Supabase Auth API ด้วย anon key
      // หมายเหตุ: วิธีนี้ไม่ verify ว่าเป็นเจ้าของ account จริง ยอมรับความเสี่ยงแล้ว
      const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({ email, password: newPassword }),
      }).then(r => r.json());
      setLoading(false);
      if (updateRes.error) return setError("ไม่พบ username นี้ในระบบค่ะ");
      setSuccess("เปลี่ยนรหัสผ่านสำเร็จแล้วค่ะ 🎉");
      setTimeout(() => { setMode("login"); setSuccess(""); setNewPassword(""); }, 2000);
      return;
    }

    if (!password.trim()) return setError("กรอก password ด้วยนะคะ");
    if (password.length < 6) return setError("password ต้องมีอย่างน้อย 6 ตัวอักษรค่ะ");
    setLoading(true); setError("");
    const email = fakeEmail(username);
    const body = JSON.stringify({ email, password });
    const endpoint = mode === "login" ? "/auth/v1/token?grant_type=password" : "/auth/v1/signup";
    const res = await authFetch(endpoint, { method: "POST", body });
    setLoading(false);
    if (res.error || res.msg) return setError(mode === "login" ? "username หรือ password ไม่ถูกต้องค่ะ" : "สมัครไม่สำเร็จ ลอง username อื่นดูนะคะ");
    const token = res.access_token;
    const refreshToken = res.refresh_token;
    const userId = res.user?.id;
    localStorage.setItem("trip_token", token);
    localStorage.setItem("trip_user", JSON.stringify({ id: userId, username }));
    if (refreshToken) localStorage.setItem("trip_refresh_token", refreshToken);
    onLogin({ token, refreshToken, id: userId, username });
  };

  return (
    <div style={A.root}>
      <div style={A.card}>
        <div style={A.logo}>🚐</div>
        <div style={A.title}>Trip Logger</div>
        <div style={A.subtitle}>ระบบบันทึกเที่ยวรถรับส่ง</div>

        {mode !== "reset" && (
          <div style={A.toggle}>
            <button style={{ ...A.toggleBtn, ...(mode === "login" ? A.toggleActive : {}) }} onClick={() => { setMode("login"); setError(""); }}>เข้าสู่ระบบ</button>
            <button style={{ ...A.toggleBtn, ...(mode === "signup" ? A.toggleActive : {}) }} onClick={() => { setMode("signup"); setError(""); }}>สมัครสมาชิก</button>
          </div>
        )}

        {mode === "reset" && (
          <div style={{ marginBottom: 20, textAlign: "center" }}>
            <div style={{ fontSize: 14, color: "#C9A96E", fontWeight: 700, marginBottom: 4 }}>🔑 ตั้งรหัสผ่านใหม่</div>
            <div style={{ fontSize: 12, color: "#666" }}>กรอก username + รหัสผ่านใหม่</div>
          </div>
        )}

        <div style={A.field}>
          <label style={A.label}>Username</label>
          <input style={A.input} value={username} onChange={e => setUsername(e.target.value)} placeholder="ชื่อที่ใช้เข้าระบบ" autoComplete="username" />
        </div>

        <div style={A.field}>
          <label style={A.label}>{mode === "reset" ? "รหัสผ่านใหม่" : "Password"}</label>
          <input style={A.input} type="password"
            value={mode === "reset" ? newPassword : password}
            onChange={e => mode === "reset" ? setNewPassword(e.target.value) : setPassword(e.target.value)}
            placeholder="อย่างน้อย 6 ตัวอักษร"
            onKeyDown={e => e.key === "Enter" && handle()}
            autoComplete="new-password" />
        </div>

        {error && <div style={A.error}>{error}</div>}
        {success && <div style={{ ...A.error, background: "#2A5A3A22", border: "1px solid #2A5A3A", color: "#7ECFA0" }}>{success}</div>}

        <button style={{ ...A.btn, opacity: loading ? 0.7 : 1, ...(mode === "reset" ? { background: "linear-gradient(135deg,#7A5A20,#C9963A)" } : {}) }} onClick={handle} disabled={loading}>
          {loading ? "กำลังโหลด..." : mode === "login" ? "เข้าสู่ระบบ" : mode === "signup" ? "สมัครสมาชิก" : "เปลี่ยนรหัสผ่าน"}
        </button>

        <button style={A.resetLink} onClick={() => { setMode(mode === "reset" ? "login" : "reset"); setError(""); setSuccess(""); setPassword(""); setNewPassword(""); }}>
          {mode === "reset" ? "← กลับไปเข้าสู่ระบบ" : "ลืมรหัสผ่าน?"}
        </button>
      </div>
    </div>
  );
}

const A = {
  root: { minHeight: "100vh", background: "#0F1117", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "'Sarabun', sans-serif" },
  card: { background: "#1A1D27", border: "1px solid #2A2D3A", borderRadius: 20, padding: "32px 28px", width: "100%", maxWidth: 400 },
  logo: { fontSize: 48, textAlign: "center", marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 800, color: "#F0EDE6", textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#666", textAlign: "center", marginBottom: 28 },
  toggle: { display: "flex", background: "#0F1117", borderRadius: 10, padding: 4, marginBottom: 24, gap: 6 },
  toggleBtn: { flex: 1, background: "none", border: "none", borderRadius: 8, padding: "9px", color: "#666", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Sarabun', sans-serif" },
  toggleActive: { background: "#1F2231", color: "#F0EDE6", border: "1px solid #2A2D3A" },
  field: { marginBottom: 14 },
  label: { fontSize: 11, color: "#888", letterSpacing: 0.5, marginBottom: 6, display: "block" },
  input: { background: "#0F1117", border: "1px solid #2A2D3A", borderRadius: 8, padding: "12px 14px", color: "#F0EDE6", fontSize: 15, outline: "none", width: "100%", boxSizing: "border-box" },
  error: { fontSize: 12, color: "#E07070", marginBottom: 12, textAlign: "center", background: "#E0505011", border: "1px solid #E0505033", borderRadius: 8, padding: "8px" },
  btn: { width: "100%", background: "linear-gradient(135deg,#C9963A,#E8B86D)", border: "none", borderRadius: 10, padding: "14px", color: "#0F1117", fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "'Sarabun', sans-serif", marginTop: 8 },
  resetLink: { width: "100%", background: "none", border: "none", color: "#666", fontSize: 12, cursor: "pointer", fontFamily: "'Sarabun', sans-serif", marginTop: 12, textDecoration: "underline", textAlign: "center", display: "block" },
};

// ─── Home Page ────────────────────────────────────────────────────────────────
function HomePage({ user, token, places }) {
  const [trips, setTrips] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [defaultPrice, setDefaultPrice] = useState(() => localStorage.getItem("trip_default_price") || "");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("income");
  const [showForm, setShowForm] = useState(false);
  const [tripType, setTripType] = useState("normal");
  const [form, setForm] = useState({ from: "", to: "", count: "", price: "", charterPrice: "", time: formatTime(new Date()) });
  const [expenseForm, setExpenseForm] = useState({ note: "", amount: "", time: formatTime(new Date()) });
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [deletingExpId, setDeletingExpId] = useState(null);
  const [editingTrip, setEditingTrip] = useState(null);
  const [editingExp, setEditingExp] = useState(null);
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");

  // Thai number words to digits
  const thaiNum = { "ศูนย์":0,"หนึ่ง":1,"สอง":2,"สาม":3,"สี่":4,"ห้า":5,"หก":6,"เจ็ด":7,"แปด":8,"เก้า":9,"สิบ":10,"สิบเอ็ด":11,"สิบสอง":12,"สิบสาม":13,"สิบสี่":14,"สิบห้า":15,"สิบหก":16,"สิบเจ็ด":17,"สิบแปด":18,"สิบเก้า":19,"ยี่สิบ":20,"สามสิบ":30,"สี่สิบ":40,"ห้าสิบ":50,"หกสิบ":60,"เจ็ดสิบ":70,"แปดสิบ":80,"เก้าสิบ":90,"ร้อย":100,"พัน":1000 };

  const parseThaiNumber = (str) => {
    // ถ้าเป็นตัวเลขอยู่แล้ว return เลย
    if (/^\d+$/.test(str.trim())) return parseInt(str.trim());
    for (const [word, val] of Object.entries(thaiNum)) {
      if (str.includes(word)) return val;
    }
    return null;
  };

  const handleVoice = () => {
    if (!'webkitSpeechRecognition' in window && !'SpeechRecognition' in window) {
      return setError("browser ไม่รองรับการสั่งด้วยเสียงค่ะ");
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = "th-TH";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;
    setListening(true);
    setVoiceText("");
    // delay start เล็กน้อยให้ browser เตรียมพร้อม
    setTimeout(() => recognition.start(), 300);
    recognition.onresult = async (e) => {
      const result = e.results[e.results.length - 1];
      if (!result.isFinal) return;
      const text = result[0].transcript;
      setVoiceText(text);
      setListening(false);
      // parse: "[จุดรับ] ถึง [จุดส่ง] [จำนวน]คน"
      const match = text.match(/(.+?)\s*ถึง\s*(.+?)\s*(\S+)\s*คน/);
      if (!match) return setError(`ฟังไม่เข้าใจค่ะ ลองพูดว่า "ตลาด ถึง โรงงาน สิบคน"`);
      const fromPlace = match[1].trim();
      const toPlace = match[2].trim();
      const countStr = match[3].trim();
      const count = parseThaiNumber(countStr);
      if (!count || count < 1) return setError("จำนวนคนไม่ถูกต้องค่ะ");
      const price = defaultPrice || "0";
      const body = { date: todayKey(), time: formatTime(new Date()), from_point: fromPlace, to_point: toPlace, type: "normal", count, price: +price, total: count * +price, user_id: user.id };
      const res = await api.post("trips", body, token);
      if (Array.isArray(res) && res[0]) {
        setTrips(prev => [res[0], ...prev]);
        setVoiceText(`✓ บันทึก ${fromPlace} → ${toPlace} ${count} คน`);
        setTimeout(() => setVoiceText(""), 3000);
      }
    };
    recognition.onerror = () => { setListening(false); setError("ฟังไม่ได้ยินค่ะ ลองใหม่อีกครั้ง"); };
    recognition.onend = () => setListening(false);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [t, e, s] = await Promise.all([
        api.get("trips", `date=eq.${todayKey()}&user_id=eq.${user.id}&order=created_at.desc`, token),
        api.get("expenses", `date=eq.${todayKey()}&user_id=eq.${user.id}&order=created_at.desc`, token),
        api.get("settings", `user_id=eq.${user.id}&key=eq.default_price`, token),
      ]);
      setTrips(Array.isArray(t) ? t : []);
      setExpenses(Array.isArray(e) ? e : []);
      if (Array.isArray(s) && s[0]) { setDefaultPrice(s[0].value); localStorage.setItem("trip_default_price", s[0].value); }
      setLoading(false);
    };
    load();
  }, []);

  const totalRevenue = trips.reduce((s, t) => s + Number(t.total), 0);
  const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalPassengers = trips.reduce((s, t) => s + (t.count || 0), 0);
  const netProfit = totalRevenue - totalExpense;

  const openForm = () => {
    if (tab === "income") {
      setForm({ from: "", to: "", count: "", price: defaultPrice || "", charterPrice: "", time: formatTime(new Date()) });
      setTripType("normal");
    } else {
      setExpenseForm({ note: "", amount: "", time: formatTime(new Date()) });
    }
    setError(""); setShowForm(true);
  };

  const handleSubmitTrip = async () => {
    if (!form.from || !form.to) return setError("ระบุจุดรับและจุดส่งด้วยนะคะ");
    let body;
    if (tripType === "charter") {
      if (!form.charterPrice || isNaN(form.charterPrice)) return setError("ระบุราคาเหมาด้วยนะคะ");
      body = { date: todayKey(), time: form.time, from_point: form.from, to_point: form.to, type: "charter", total: +form.charterPrice, user_id: user.id };
    } else {
      if (!form.count || +form.count < 1) return setError("จำนวนผู้โดยสารไม่ถูกต้อง");
      if (!form.price || isNaN(form.price)) return setError("ราคาต่อหัวไม่ถูกต้อง");
      body = { date: todayKey(), time: form.time, from_point: form.from, to_point: form.to, type: "normal", count: +form.count, price: +form.price, total: +form.count * +form.price, user_id: user.id };
    }
    if (editingTrip) {
      const res = await api.patch("trips", editingTrip.id, body, token);
      if (Array.isArray(res) && res[0]) setTrips(prev => prev.map(t => t.id === editingTrip.id ? res[0] : t));
      setEditingTrip(null);
    } else {
      const res = await api.post("trips", body, token);
      if (Array.isArray(res) && res[0]) setTrips(prev => [res[0], ...prev]);
    }
    setError(""); setShowForm(false);
  };

  const handleSubmitExpense = async () => {
    if (!expenseForm.note.trim()) return setError("ระบุรายการด้วยนะคะ");
    if (!expenseForm.amount || +expenseForm.amount <= 0) return setError("จำนวนเงินไม่ถูกต้อง");
    const body = { date: todayKey(), time: expenseForm.time, note: expenseForm.note.trim(), amount: +expenseForm.amount, user_id: user.id };
    if (editingExp) {
      const res = await api.patch("expenses", editingExp.id, body, token);
      if (Array.isArray(res) && res[0]) setExpenses(prev => prev.map(e => e.id === editingExp.id ? res[0] : e));
      setEditingExp(null);
    } else {
      const res = await api.post("expenses", body, token);
      if (Array.isArray(res) && res[0]) setExpenses(prev => [res[0], ...prev]);
    }
    setError(""); setShowForm(false);
  };

  const startEditTrip = (trip) => {
    setEditingTrip(trip);
    setTripType(trip.type);
    setForm({ from: trip.from_point, to: trip.to_point, count: trip.count || "", price: trip.price || "", charterPrice: trip.type === "charter" ? trip.total : "", time: trip.time });
    setTab("income"); setError(""); setShowForm(true);
  };

  const startEditExp = (exp) => {
    setEditingExp(exp);
    setExpenseForm({ note: exp.note, amount: exp.amount, time: exp.time });
    setTab("expense"); setError(""); setShowForm(true);
  };

  const PlaceDropdown = ({ field, value, open, setOpen }) => (
    <div style={{ position: "relative" }}>
      <div style={{ ...S.input, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
        onClick={e => { e.stopPropagation(); setOpen(!open); field === "from" ? setToOpen(false) : setFromOpen(false); }}>
        <span style={{ color: value ? "#F0EDE6" : "#444" }}>{value || "เลือกสถานที่"}</span>
        <span style={{ color: "#C9A96E", fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={S.dropdown}>
          {places.map(p => (
            <div key={p} style={{ ...S.dropdownItem, background: value === p ? "#C9963A22" : "transparent" }}
              onClick={() => { setForm(prev => ({ ...prev, [field]: p })); setOpen(false); }}>{p}</div>
          ))}
          {places.length === 0 && <div style={S.dropdownEmpty}>เพิ่มสถานที่ในการตั้งค่า</div>}
        </div>
      )}
    </div>
  );

  if (loading) return <div style={S.loadWrap}><div style={S.loadIcon}>🚐</div><div style={S.loadText}>กำลังโหลด...</div></div>;

  return (
    <div style={S.page} onClick={() => { setFromOpen(false); setToOpen(false); }}>
      <div style={S.header}>
        <div style={S.headerTop}>
          <div>
            <div style={S.headerLabel}>วันนี้</div>
            <div style={S.headerDate}>{new Date().toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}</div>
          </div>
          <div style={S.headerStats}>
            <div style={S.statBox}><span style={S.statNum}>{trips.length}</span><span style={S.statLabel}>เที่ยว</span></div>
            <div style={S.statDivider} />
            <div style={S.statBox}><span style={S.statNum}>{totalPassengers}</span><span style={S.statLabel}>คน</span></div>
          </div>
        </div>
        <div style={S.summaryRow}>
          <div style={S.summaryBox}><span style={S.summaryLabel}>รายรับ</span><span style={S.summaryIncome}>฿{totalRevenue.toLocaleString()}</span></div>
          <div style={S.summaryDivider} />
          <div style={S.summaryBox}><span style={S.summaryLabel}>รายจ่าย</span><span style={S.summaryExpense}>฿{totalExpense.toLocaleString()}</span></div>
          <div style={S.summaryDivider} />
          <div style={S.summaryBox}><span style={S.summaryLabel}>คงเหลือ</span><span style={{ ...S.summaryNet, color: netProfit >= 0 ? "#7ECFA0" : "#E07070" }}>฿{netProfit.toLocaleString()}</span></div>
        </div>
        <div style={S.tabRow}>
          <button style={{ ...S.tabBtn, ...(tab === "income" ? S.tabBtnActive : {}) }} onClick={() => { setTab("income"); setShowForm(false); setEditingTrip(null); }}>
            รายรับ {trips.length > 0 && <span style={S.tabBadge}>{trips.length}</span>}
          </button>
          <button style={{ ...S.tabBtn, ...(tab === "expense" ? S.tabBtnExpense : {}) }} onClick={() => { setTab("expense"); setShowForm(false); setEditingExp(null); }}>
            รายจ่าย {expenses.length > 0 && <span style={{ ...S.tabBadge, background: "#E0500044", color: "#E07070" }}>{expenses.length}</span>}
          </button>
        </div>
      </div>

      <div style={S.body}>
        {tab === "income" && trips.length === 0 && !showForm && <div style={S.empty}><div style={S.emptyIcon}>🚐</div><div style={S.emptyText}>ยังไม่มีเที่ยววันนี้</div><div style={S.emptySubtext}>กด + เพื่อเพิ่มเที่ยวแรก</div></div>}
        {tab === "expense" && expenses.length === 0 && !showForm && <div style={S.empty}><div style={S.emptyIcon}>🧾</div><div style={S.emptyText}>ยังไม่มีรายจ่ายวันนี้</div><div style={S.emptySubtext}>กด + เพื่อบันทึกรายจ่าย</div></div>}

        {showForm && tab === "income" && (
          <div style={S.card} onClick={e => e.stopPropagation()}>
            <div style={S.cardHeader}>
              <span style={S.cardTitle}>{editingTrip ? "แก้ไขเที่ยว" : "เพิ่มเที่ยวใหม่"}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={{ ...S.closeBtn, fontSize: 20, color: listening ? "#E07070" : "#C9A96E" }} onClick={handleVoice} title="สั่งด้วยเสียง">
                  {listening ? "⏹" : "🎙"}
                </button>
                <button style={S.closeBtn} onClick={() => { setShowForm(false); setEditingTrip(null); setError(""); }}>✕</button>
              </div>
            </div>
            {voiceText && <div style={{ fontSize: 12, color: voiceText.startsWith("✓") ? "#7ECFA0" : "#C9A96E", marginBottom: 10, textAlign: "center", background: "#1F2231", borderRadius: 8, padding: "8px" }}>{listening ? "🎙 กำลังฟัง..." : voiceText}</div>}
            {listening && <div style={{ fontSize: 12, color: "#C9A96E", marginBottom: 10, textAlign: "center", background: "#C9963A11", border: "1px solid #C9963A33", borderRadius: 8, padding: "8px" }}>🎙 กำลังฟัง... พูดได้เลยค่ะ</div>}
            <div style={S.typeToggle}>
              <button style={{ ...S.typeBtn, ...(tripType === "normal" ? S.typeBtnActive : {}) }} onClick={() => setTripType("normal")}>👥 ปกติ</button>
              <button style={{ ...S.typeBtn, ...(tripType === "charter" ? S.typeBtnCharter : {}) }} onClick={() => setTripType("charter")}>🚐 เหมา</button>
            </div>
            <div style={{ marginBottom: 12 }}><label style={S.label}>เวลา</label><input style={S.input} value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} /></div>
            <div style={S.routeRow}>
              <div style={S.formGroup}><label style={S.label}>จุดรับ</label><PlaceDropdown field="from" value={form.from} open={fromOpen} setOpen={setFromOpen} /></div>
              <div style={S.arrow}>→</div>
              <div style={S.formGroup}><label style={S.label}>จุดส่ง</label><PlaceDropdown field="to" value={form.to} open={toOpen} setOpen={setToOpen} /></div>
            </div>
            {tripType === "normal" && (
              <>
                <div style={S.formRow2}>
                  <div style={S.formGroup}><label style={S.label}>จำนวนคน</label><input style={S.input} type="number" inputMode="numeric" value={form.count} onChange={e => setForm(p => ({ ...p, count: e.target.value }))} placeholder="0" /></div>
                  <div style={S.formGroup}><label style={S.label}>ราคา/หัว (฿)</label><input style={S.input} type="number" inputMode="decimal" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="0" /></div>
                </div>
                {form.count && form.price && <div style={S.calcPreview}><span style={S.calcText}>{form.count} คน × ฿{form.price} =</span><span style={S.calcTotal}>฿{(+form.count * +form.price).toLocaleString()}</span></div>}
              </>
            )}
            {tripType === "charter" && <div style={{ marginBottom: 12 }}><label style={S.label}>ราคาเหมา (฿)</label><input style={{ ...S.input, fontSize: 16, fontWeight: 700, border: "1px solid #C9963A44", background: "#C9963A0A" }} type="number" inputMode="decimal" value={form.charterPrice} onChange={e => setForm(p => ({ ...p, charterPrice: e.target.value }))} placeholder="ระบุราคารวม" /></div>}
            {error && <div style={S.error}>{error}</div>}
            <button style={tripType === "charter" ? { ...S.submitBtn, background: "linear-gradient(135deg,#7A5A20,#C9963A)" } : S.submitBtn} onClick={handleSubmitTrip}>{editingTrip ? "บันทึกการแก้ไข" : "บันทึกเที่ยว"}</button>
          </div>
        )}

        {showForm && tab === "expense" && (
          <div style={{ ...S.card, border: "1px solid #E0505033" }} onClick={e => e.stopPropagation()}>
            <div style={S.cardHeader}>
              <span style={S.cardTitle}>{editingExp ? "แก้ไขรายจ่าย" : "เพิ่มรายจ่าย"}</span>
              <button style={S.closeBtn} onClick={() => { setShowForm(false); setEditingExp(null); setError(""); }}>✕</button>
            </div>
            <div style={{ marginBottom: 12 }}><label style={S.label}>เวลา</label><input style={S.input} value={expenseForm.time} onChange={e => setExpenseForm(p => ({ ...p, time: e.target.value }))} /></div>
            <div style={{ marginBottom: 12 }}><label style={S.label}>รายการ</label><input style={S.input} value={expenseForm.note} onChange={e => setExpenseForm(p => ({ ...p, note: e.target.value }))} placeholder="เช่น ค่าน้ำมัน" /></div>
            <div style={{ marginBottom: 12 }}><label style={S.label}>จำนวนเงิน (฿)</label><input style={{ ...S.input, fontSize: 16, fontWeight: 700, border: "1px solid #E0505044", background: "#E050500A" }} type="number" inputMode="decimal" value={expenseForm.amount} onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" /></div>
            {error && <div style={S.error}>{error}</div>}
            <button style={{ ...S.submitBtn, background: "linear-gradient(135deg,#8B2020,#E05050)" }} onClick={handleSubmitExpense}>{editingExp ? "บันทึกการแก้ไข" : "บันทึกรายจ่าย"}</button>
          </div>
        )}

        {tab === "income" && trips.map((trip, i) => (
          <div key={trip.id} style={{ ...S.tripCard, ...(trip.type === "charter" ? { border: "1px solid #C9963A33" } : {}) }}>
            {deletingId === trip.id ? (
              <div style={S.deleteConfirm}>
                <span style={S.deleteText}>ลบเที่ยวนี้?</span>
                <div style={S.deleteBtns}>
                  <button style={S.deleteCancelBtn} onClick={() => setDeletingId(null)}>ยกเลิก</button>
                  <button style={S.deleteConfirmBtn} onClick={async () => { await api.delete("trips", trip.id, token); setTrips(prev => prev.filter(t => t.id !== trip.id)); setDeletingId(null); }}>ลบ</button>
                </div>
              </div>
            ) : (
              <>
                <div style={S.tripTop}>
                  <div style={S.tripMeta}>
                    <span style={trip.type === "charter" ? S.tripBadgeCharter : S.tripBadge}>{trip.type === "charter" ? "🚐 เหมา" : `เที่ยวที่ ${trips.length - i}`}</span>
                    <span style={S.tripTime}>{trip.time}</span>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button style={S.editBtn} onClick={() => startEditTrip(trip)}>✏️</button>
                    <button style={S.deleteBtn} onClick={() => setDeletingId(trip.id)}>✕</button>
                  </div>
                </div>
                <div style={S.tripRoute}><span style={S.routeText}>{trip.from_point}</span><span style={S.routeArrow}>→</span><span style={S.routeText}>{trip.to_point}</span></div>
                <div style={S.tripBottom}>
                  <span style={S.tripFormula}>{trip.type === "charter" ? "เหมาคัน" : `👥 ${trip.count} คน × ฿${Number(trip.price).toLocaleString()}`}</span>
                  <span style={S.tripTotal}>฿{Number(trip.total).toLocaleString()}</span>
                </div>
              </>
            )}
          </div>
        ))}

        {tab === "expense" && expenses.map(exp => (
          <div key={exp.id} style={{ ...S.tripCard, border: "1px solid #E0503322" }}>
            {deletingExpId === exp.id ? (
              <div style={S.deleteConfirm}>
                <span style={S.deleteText}>ลบรายการนี้?</span>
                <div style={S.deleteBtns}>
                  <button style={S.deleteCancelBtn} onClick={() => setDeletingExpId(null)}>ยกเลิก</button>
                  <button style={S.deleteConfirmBtn} onClick={async () => { await api.delete("expenses", exp.id, token); setExpenses(prev => prev.filter(e => e.id !== exp.id)); setDeletingExpId(null); }}>ลบ</button>
                </div>
              </div>
            ) : (
              <>
                <div style={S.tripTop}>
                  <div style={S.tripMeta}><span style={{ ...S.tripBadge, background: "#E0503322", border: "1px solid #E0503344", color: "#E07070" }}>🧾 รายจ่าย</span><span style={S.tripTime}>{exp.time}</span></div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button style={S.editBtn} onClick={() => startEditExp(exp)}>✏️</button>
                    <button style={S.deleteBtn} onClick={() => setDeletingExpId(exp.id)}>✕</button>
                  </div>
                </div>
                <div style={{ ...S.tripBottom, borderTop: "none", paddingTop: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#D0CCB8" }}>{exp.note}</span>
                  <span style={{ ...S.tripTotal, color: "#E07070" }}>-฿{Number(exp.amount).toLocaleString()}</span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {!showForm && (
        <button style={{ ...S.fab, ...(tab === "expense" ? { background: "linear-gradient(135deg,#8B2020,#E05050)", boxShadow: "0 4px 24px #E0505055" } : {}) }} onClick={openForm}>+</button>
      )}
    </div>
  );
}

// ─── History Page ─────────────────────────────────────────────────────────────
function HistoryPage({ user, token }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const days = getLast5Days();
      const minDate = days[days.length - 1];
      const [trips, expenses] = await Promise.all([
        api.get("trips", `user_id=eq.${user.id}&date=gte.${minDate}&order=date.desc`, token),
        api.get("expenses", `user_id=eq.${user.id}&date=gte.${minDate}&order=date.desc`, token),
      ]);
      const t = Array.isArray(trips) ? trips : [];
      const e = Array.isArray(expenses) ? expenses : [];
      const rows = days.map(date => {
        const dayTrips = t.filter(x => x.date === date);
        const dayExp = e.filter(x => x.date === date);
        const income = dayTrips.reduce((s, x) => s + Number(x.total), 0);
        const expense = dayExp.reduce((s, x) => s + Number(x.amount), 0);
        return { date, trips: dayTrips.length, passengers: dayTrips.reduce((s, x) => s + (x.count || 0), 0), income, expense, net: income - expense };
      });
      setData(rows);
      setLoading(false);
    };
    load();
  }, []);

  const totalIncome = data.reduce((s, r) => s + r.income, 0);
  const totalExpense = data.reduce((s, r) => s + r.expense, 0);
  const totalNet = totalIncome - totalExpense;
  const totalTrips = data.reduce((s, r) => s + r.trips, 0);
  const totalPassengers = data.reduce((s, r) => s + r.passengers, 0);

  if (loading) return <div style={S.loadWrap}><div style={S.loadIcon}>📋</div><div style={S.loadText}>กำลังโหลด...</div></div>;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.headerLabel}>ประวัติย้อนหลัง</div>
        <div style={S.headerDate}>5 วันล่าสุด</div>
      </div>

      <div style={S.body}>
        {/* Summary */}
        <div style={H.summaryCard}>
          <div style={H.summaryTitle}>สรุปรวม 5 วัน</div>
          <div style={H.summaryGrid}>
            <div style={H.summaryItem}><span style={H.summaryItemLabel}>เที่ยวรวม</span><span style={H.summaryItemVal}>{totalTrips}</span></div>
            <div style={H.summaryItem}><span style={H.summaryItemLabel}>คนรวม</span><span style={H.summaryItemVal}>{totalPassengers}</span></div>
            <div style={H.summaryItem}><span style={H.summaryItemLabel}>รายรับรวม</span><span style={{ ...H.summaryItemVal, color: "#C9A96E" }}>฿{totalIncome.toLocaleString()}</span></div>
            <div style={H.summaryItem}><span style={H.summaryItemLabel}>รายจ่ายรวม</span><span style={{ ...H.summaryItemVal, color: "#E07070" }}>฿{totalExpense.toLocaleString()}</span></div>
          </div>
          <div style={H.netRow}>
            <span style={H.netLabel}>คงเหลือรวม</span>
            <span style={{ ...H.netVal, color: totalNet >= 0 ? "#7ECFA0" : "#E07070" }}>฿{totalNet.toLocaleString()}</span>
          </div>
        </div>

        {/* Table */}
        <div style={H.tableWrap}>
          <div style={H.tableHeader}>
            <span style={{ ...H.th, flex: 1.5 }}>วันที่</span>
            <span style={H.th}>เที่ยว</span>
            <span style={H.th}>คน</span>
            <span style={H.th}>รายรับ</span>
            <span style={H.th}>รายจ่าย</span>
            <span style={H.th}>คงเหลือ</span>
          </div>
          {data.map(row => (
            <div key={row.date} style={{ ...H.tableRow, opacity: row.trips === 0 ? 0.4 : 1 }}>
              <span style={{ ...H.td, flex: 1.5, color: "#C9A96E", fontWeight: 600 }}>{formatDate(row.date)}</span>
              <span style={H.td}>{row.trips}</span>
              <span style={H.td}>{row.passengers}</span>
              <span style={{ ...H.td, color: "#C9A96E" }}>{row.income > 0 ? `฿${row.income.toLocaleString()}` : "-"}</span>
              <span style={{ ...H.td, color: "#E07070" }}>{row.expense > 0 ? `฿${row.expense.toLocaleString()}` : "-"}</span>
              <span style={{ ...H.td, color: row.net >= 0 ? "#7ECFA0" : "#E07070", fontWeight: 700 }}>{row.income > 0 || row.expense > 0 ? `฿${row.net.toLocaleString()}` : "-"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const H = {
  summaryCard: { background: "#1A1D27", border: "1px solid #2A2D3A", borderRadius: 16, padding: 16, marginBottom: 16 },
  summaryTitle: { fontSize: 13, color: "#888", marginBottom: 14, fontWeight: 600, letterSpacing: 0.5 },
  summaryGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 },
  summaryItem: { background: "#0F1117", borderRadius: 10, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4 },
  summaryItemLabel: { fontSize: 10, color: "#666" },
  summaryItemVal: { fontSize: 18, fontWeight: 800, color: "#F0EDE6" },
  netRow: { display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #2A2D3A", paddingTop: 12 },
  netLabel: { fontSize: 13, color: "#888" },
  netVal: { fontSize: 22, fontWeight: 800 },
  tableWrap: { background: "#1A1D27", border: "1px solid #2A2D3A", borderRadius: 16, overflow: "hidden" },
  tableHeader: { display: "flex", padding: "10px 14px", background: "#13151F", borderBottom: "1px solid #2A2D3A" },
  th: { flex: 1, fontSize: 10, color: "#666", letterSpacing: 0.5, textAlign: "center" },
  tableRow: { display: "flex", padding: "12px 14px", borderBottom: "1px solid #1F2231" },
  td: { flex: 1, fontSize: "clamp(11px,3vw,13px)", color: "#D0CCB8", textAlign: "center" },
};

// ─── Settings Page ────────────────────────────────────────────────────────────
function SettingsPage({ user, token, places, setPlaces, onLogout }) {
  const [settingsPrice, setSettingsPrice] = useState(() => localStorage.getItem("trip_default_price") || "");
  const [newPlace, setNewPlace] = useState("");
  const [deletingPlace, setDeletingPlace] = useState(null);
  const [saved, setSaved] = useState(false);

  const savePrice = async () => {
    await api.upsert("settings", { key: "default_price", value: settingsPrice, user_id: user.id }, token);
    localStorage.setItem("trip_default_price", settingsPrice);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addPlace = async () => {
    const p = newPlace.trim();
    if (!p || places.includes(p)) return;
    await api.post("places", { name: p, user_id: user.id }, token);
    setPlaces(prev => [...prev, p].sort());
    setNewPlace("");
  };

  const removePlace = async (name) => {
    await fetch(`${SUPABASE_URL}/rest/v1/places?name=eq.${encodeURIComponent(name)}&user_id=eq.${user.id}`, { method: "DELETE", headers: h(token) });
    setPlaces(prev => prev.filter(x => x !== name));
    setDeletingPlace(null);
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.headerLabel}>การตั้งค่า</div>
        <div style={S.headerDate}>👤 {user.username}</div>
      </div>
      <div style={S.body}>
        <div style={S.card}>
          <div style={S.settingLabel}>ราคาต่อหัว default (฿)</div>
          <div style={S.settingRow}>
            <input style={{ ...S.input, flex: 1 }} type="number" inputMode="decimal" value={settingsPrice} onChange={e => setSettingsPrice(e.target.value)} placeholder="เช่น 30" />
            <button style={{ ...S.saveBtn, background: saved ? "#2A5A3A" : "#C9963A", color: saved ? "#7ECFA0" : "#0F1117" }} onClick={savePrice}>{saved ? "✓ บันทึก" : "บันทึก"}</button>
          </div>
          <div style={S.settingHint}>ใส่อัตโนมัติตอนเพิ่มเที่ยว แก้ได้ทีหลัง</div>
        </div>

        <div style={S.card}>
          <div style={S.settingLabel}>จัดการสถานที่</div>
          <div style={S.settingRow}>
            <input style={{ ...S.input, flex: 1 }} value={newPlace} onChange={e => setNewPlace(e.target.value)} onKeyDown={e => e.key === "Enter" && addPlace()} placeholder="ชื่อสถานที่ใหม่" />
            <button style={S.saveBtn} onClick={addPlace}>+ เพิ่ม</button>
          </div>
          <div style={S.placeList}>
            {places.map(p => (
              <div key={p} style={S.placeItem}>
                {deletingPlace === p ? (
                  <>
                    <span style={{ fontSize: 13, color: "#E07070" }}>ลบ "{p}"?</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={S.deleteCancelBtn} onClick={() => setDeletingPlace(null)}>ยกเลิก</button>
                      <button style={S.deleteConfirmBtn} onClick={() => removePlace(p)}>ลบ</button>
                    </div>
                  </>
                ) : (
                  <><span style={S.placeName}>{p}</span><button style={S.placeDeleteBtn} onClick={() => setDeletingPlace(p)}>✕</button></>
                )}
              </div>
            ))}
          </div>
        </div>

        <button style={{ ...S.saveBtn, width: "100%", background: "#E0505022", color: "#E07070", border: "1px solid #E0505044", padding: "14px" }} onClick={onLogout}>
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
const DEFAULT_PLACES = ["ตลาด", "โรงงาน", "บ้านพัก", "ออฟฟิศ"];

export default function App() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem("trip_user")); } catch { return null; } });
  const [token, setToken] = useState(() => localStorage.getItem("trip_token") || null);
  const [places, setPlaces] = useState([]);
  const [navTab, setNavTab] = useState("home");

  const handleLogout = () => {
    localStorage.removeItem("trip_token");
    localStorage.removeItem("trip_user");
    localStorage.removeItem("trip_refresh_token");
    localStorage.removeItem("trip_default_price");
    setUser(null); setToken(null); setPlaces([]);
  };

  // Auto refresh token ทุก 50 นาที
  useEffect(() => {
    if (!user || !token) return;
    const refresh = async () => {
      const refreshToken = localStorage.getItem("trip_refresh_token");
      if (!refreshToken) return;
      const res = await authFetch("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (res.access_token) {
        localStorage.setItem("trip_token", res.access_token);
        if (res.refresh_token) localStorage.setItem("trip_refresh_token", res.refresh_token);
        setToken(res.access_token);
      } else {
        handleLogout();
      }
    };
    const interval = setInterval(refresh, 50 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, token]);

  useEffect(() => {
    if (user && token) {
      api.get("places", `user_id=eq.${user.id}&order=name.asc`, token).then(p => {
        if (Array.isArray(p) && p.length > 0) setPlaces(p.map(x => x.name));
        else {
          Promise.all(DEFAULT_PLACES.map(name => api.post("places", { name, user_id: user.id }, token)));
          setPlaces(DEFAULT_PLACES);
        }
      });
    }
  }, [user, token]);

  const handleLogin = (u) => {
    setUser(u);
    setToken(u.token);
    if (u.refreshToken) localStorage.setItem("trip_refresh_token", u.refreshToken);
  };

  if (!user) return <AuthPage onLogin={handleLogin} />;

  return (
    <div style={{ background: "#0F1117", minHeight: "100vh", fontFamily: "'Sarabun', sans-serif" }}>
      <div style={{ paddingBottom: 70 }}>
        {navTab === "home" && <HomePage user={user} token={token} places={places} />}
        {navTab === "history" && <HistoryPage user={user} token={token} />}
        {navTab === "settings" && <SettingsPage user={user} token={token} places={places} setPlaces={setPlaces} onLogout={handleLogout} />}
      </div>

      {/* Bottom Nav */}
      <div style={N.nav}>
        {[
          { id: "home", icon: "🚐", label: "หน้าหลัก" },
          { id: "history", icon: "📋", label: "ประวัติ" },
          { id: "settings", icon: "⚙️", label: "ตั้งค่า" },
        ].map(tab => (
          <button key={tab.id} style={{ ...N.navBtn, ...(navTab === tab.id ? N.navBtnActive : {}) }} onClick={() => setNavTab(tab.id)}>
            <span style={N.navIcon}>{tab.icon}</span>
            <span style={{ ...N.navLabel, color: navTab === tab.id ? "#C9A96E" : "#555" }}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const N = {
  nav: { position: "fixed", bottom: 0, left: 0, right: 0, background: "#1A1D27", borderTop: "1px solid #2A2D3A", display: "flex", zIndex: 100, paddingBottom: "env(safe-area-inset-bottom)" },
  navBtn: { flex: 1, background: "none", border: "none", padding: "10px 0", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontFamily: "'Sarabun', sans-serif" },
  navBtnActive: { borderTop: "2px solid #C9A96E" },
  navIcon: { fontSize: 20 },
  navLabel: { fontSize: 10, fontWeight: 600, letterSpacing: 0.3 },
};

const S = {
  page: { minHeight: "calc(100vh - 70px)", color: "#F0EDE6" },
  loadWrap: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh" },
  loadIcon: { fontSize: 40, marginBottom: 12 },
  loadText: { color: "#888", fontSize: 14 },
  header: { background: "linear-gradient(160deg,#1A1D27 0%,#141720 100%)", borderBottom: "1px solid #2A2D3A", padding: "clamp(16px,4vw,24px) clamp(12px,4vw,20px) 14px", position: "sticky", top: 0, zIndex: 10 },
  headerTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  headerLabel: { fontSize: 11, color: "#666", letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 },
  headerDate: { fontSize: "clamp(15px,4vw,18px)", fontWeight: 700, color: "#F0EDE6" },
  headerStats: { display: "flex", alignItems: "center", gap: 12, background: "#1F2231", borderRadius: 12, padding: "8px 16px" },
  statBox: { display: "flex", flexDirection: "column", alignItems: "center" },
  statNum: { fontSize: "clamp(16px,4vw,20px)", fontWeight: 800, color: "#F0EDE6", lineHeight: 1 },
  statLabel: { fontSize: 10, color: "#888", marginTop: 2 },
  statDivider: { width: 1, height: 28, background: "#2A2D3A" },
  summaryRow: { display: "flex", alignItems: "center", background: "#13151F", border: "1px solid #2A2D3A", borderRadius: 12, padding: "10px 0", marginBottom: 12 },
  summaryBox: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
  summaryDivider: { width: 1, height: 32, background: "#2A2D3A" },
  summaryLabel: { fontSize: "clamp(9px,2.5vw,11px)", color: "#666", letterSpacing: 0.5 },
  summaryIncome: { fontSize: "clamp(14px,4vw,17px)", fontWeight: 800, color: "#C9A96E" },
  summaryExpense: { fontSize: "clamp(14px,4vw,17px)", fontWeight: 800, color: "#E07070" },
  summaryNet: { fontSize: "clamp(14px,4vw,17px)", fontWeight: 800 },
  tabRow: { display: "flex", gap: 6, background: "#0F1117", borderRadius: 10, padding: 4 },
  tabBtn: { flex: 1, background: "none", border: "none", borderRadius: 8, padding: "9px", color: "#666", fontSize: "clamp(12px,3vw,14px)", fontWeight: 600, cursor: "pointer", fontFamily: "'Sarabun', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 },
  tabBtnActive: { background: "#1F2231", color: "#F0EDE6", border: "1px solid #2A2D3A" },
  tabBtnExpense: { background: "#E050500F", color: "#E07070", border: "1px solid #E0505033" },
  tabBadge: { background: "#C9963A33", color: "#C9A96E", fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "1px 7px" },
  body: { padding: "clamp(10px,3vw,16px)" },
  empty: { textAlign: "center", padding: "60px 0" },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: "#888", marginBottom: 4 },
  emptySubtext: { fontSize: 13, color: "#555" },
  card: { background: "#1A1D27", border: "1px solid #2A2D3A", borderRadius: 16, padding: "clamp(12px,3vw,16px)", marginBottom: 12 },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: 700, color: "#F0EDE6" },
  closeBtn: { background: "none", border: "none", color: "#666", fontSize: 16, cursor: "pointer", padding: 4 },
  typeToggle: { display: "flex", gap: 8, marginBottom: 14, background: "#0F1117", borderRadius: 10, padding: 4 },
  typeBtn: { flex: 1, background: "none", border: "none", borderRadius: 8, padding: 8, color: "#666", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Sarabun', sans-serif" },
  typeBtnActive: { background: "#1F2231", color: "#F0EDE6", border: "1px solid #2A2D3A" },
  typeBtnCharter: { background: "#3A2A1022", color: "#C9A96E", border: "1px solid #C9963A44" },
  formRow2: { display: "flex", gap: 10, marginBottom: 12 },
  routeRow: { display: "flex", gap: 6, alignItems: "flex-end", marginBottom: 12 },
  arrow: { color: "#C9A96E", fontSize: 18, paddingBottom: 10, flexShrink: 0 },
  formGroup: { flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 },
  label: { fontSize: 11, color: "#888", letterSpacing: 0.5, marginBottom: 4, display: "block" },
  input: { background: "#0F1117", border: "1px solid #2A2D3A", borderRadius: 8, padding: "10px 12px", color: "#F0EDE6", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" },
  dropdown: { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#1F2231", border: "1px solid #2A2D3A", borderRadius: 10, zIndex: 50, overflow: "hidden", boxShadow: "0 8px 24px #00000066" },
  dropdownItem: { padding: "11px 14px", fontSize: 14, color: "#D0CCB8", cursor: "pointer" },
  dropdownEmpty: { padding: "12px 14px", fontSize: 13, color: "#555", textAlign: "center" },
  calcPreview: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#C9963A15", border: "1px solid #C9963A33", borderRadius: 8, padding: "10px 14px", marginBottom: 12 },
  calcText: { fontSize: 13, color: "#C9A96E" },
  calcTotal: { fontSize: 18, fontWeight: 800, color: "#E8C47A" },
  error: { fontSize: 12, color: "#E07070", marginBottom: 10, textAlign: "center" },
  submitBtn: { width: "100%", background: "linear-gradient(135deg,#C9963A,#E8B86D)", border: "none", borderRadius: 10, padding: 13, color: "#0F1117", fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "'Sarabun', sans-serif" },
  tripCard: { background: "#1A1D27", border: "1px solid #2A2D3A", borderRadius: 14, padding: "14px clamp(10px,3vw,16px)", marginBottom: 10 },
  tripTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  tripMeta: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  tripBadge: { background: "#C9963A22", border: "1px solid #C9963A44", color: "#C9A96E", fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "2px 10px" },
  tripBadgeCharter: { background: "#7A5A2033", border: "1px solid #C9963A66", color: "#E8C47A", fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "2px 10px" },
  tripTime: { fontSize: 13, color: "#666" },
  editBtn: { background: "none", border: "none", fontSize: 13, cursor: "pointer", padding: 4 },
  deleteBtn: { background: "none", border: "none", color: "#444", fontSize: 14, cursor: "pointer", padding: 4, flexShrink: 0 },
  tripRoute: { display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" },
  routeText: { fontSize: "clamp(13px,3.5vw,15px)", fontWeight: 600, color: "#D0CCB8" },
  routeArrow: { color: "#C9A96E", fontSize: 14 },
  tripBottom: { display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #23263A", paddingTop: 10 },
  tripFormula: { fontSize: "clamp(11px,3vw,13px)", color: "#888" },
  tripTotal: { fontSize: "clamp(16px,5vw,20px)", fontWeight: 800, color: "#E8C47A" },
  deleteConfirm: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  deleteText: { fontSize: 14, color: "#E07070" },
  deleteBtns: { display: "flex", gap: 8 },
  deleteCancelBtn: { background: "#2A2D3A", border: "none", borderRadius: 8, padding: "8px 16px", color: "#888", fontSize: 13, cursor: "pointer", fontFamily: "'Sarabun', sans-serif" },
  deleteConfirmBtn: { background: "#E0505033", border: "1px solid #E0505066", borderRadius: 8, padding: "8px 16px", color: "#E07070", fontSize: 13, cursor: "pointer", fontFamily: "'Sarabun', sans-serif" },
  fab: { position: "fixed", bottom: 86, left: "50%", transform: "translateX(-50%)", width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#C9963A,#E8B86D)", border: "none", color: "#0F1117", fontSize: 28, cursor: "pointer", boxShadow: "0 4px 24px #C9963A55", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20 },
  settingLabel: { fontSize: 12, color: "#888", letterSpacing: 0.5, marginBottom: 8, display: "block" },
  settingRow: { display: "flex", gap: 8, marginBottom: 6 },
  settingHint: { fontSize: 11, color: "#555" },
  saveBtn: { background: "#C9963A", border: "none", borderRadius: 8, padding: "10px 14px", color: "#0F1117", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Sarabun', sans-serif", whiteSpace: "nowrap" },
  placeList: { display: "flex", flexDirection: "column", gap: 6, marginTop: 10 },
  placeItem: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0F1117", border: "1px solid #2A2D3A", borderRadius: 8, padding: "10px 14px" },
  placeName: { fontSize: 14, color: "#D0CCB8" },
  placeDeleteBtn: { background: "none", border: "none", color: "#555", fontSize: 13, cursor: "pointer", padding: 4 },
};
