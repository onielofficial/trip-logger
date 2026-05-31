import { useState, useEffect } from "react";

const SUPABASE_URL = "https://rqcnavvgvmvlgebqjygm.supabase.co";
const SUPABASE_KEY = "sb_publishable_HQi5Q-97sd4PG_2JqmadKw_3A0xp-xI";

const h = (token) => ({
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${token || SUPABASE_KEY}`,
});

const authFetch = async (path, opts = {}, token) => {
  const res = await fetch(`${SUPABASE_URL}${path}`, { ...opts, headers: { ...h(token), ...(opts.headers || {}) } });
  return res.json();
};

const api = {
  get: (table, params = "", token) =>
    fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, { headers: h(token) }).then(r => r.json()),
  post: (table, body, token) =>
    fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: { ...h(token), "Prefer": "return=representation" }, body: JSON.stringify(body) }).then(r => r.json()),
  delete: (table, id, token) =>
    fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers: h(token) }).then(r => r.ok),
  upsert: (table, body, token) =>
    fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: { ...h(token), "Prefer": "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(body) }).then(r => r.json()),
};

const formatTime = (d) => d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
const formatDate = (d) => d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
const todayKey = () => new Date().toISOString().slice(0, 10);
const fakeEmail = (u) => `${u.toLowerCase().replace(/\s+/g, "_")}@trip.app`;

// ─── Auth Page ───────────────────────────────────────────────────────────────
function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!username.trim() || !password.trim()) return setError("กรอก username และ password ด้วยนะคะ");
    if (password.length < 6) return setError("password ต้องมีอย่างน้อย 6 ตัวอักษรค่ะ");
    setLoading(true); setError("");
    const email = fakeEmail(username);
    const body = JSON.stringify({ email, password });
    const endpoint = mode === "login" ? "/auth/v1/token?grant_type=password" : "/auth/v1/signup";
    const res = await authFetch(endpoint, { method: "POST", body });
    setLoading(false);
    if (res.error || res.msg) return setError(mode === "login" ? "username หรือ password ไม่ถูกต้องค่ะ" : "สมัครไม่สำเร็จ ลอง username อื่นดูนะคะ");
    const token = res.access_token;
    const userId = res.user?.id;
    localStorage.setItem("trip_token", token);
    localStorage.setItem("trip_user", JSON.stringify({ id: userId, username }));
    onLogin({ token, id: userId, username });
  };

  return (
    <div style={A.root}>
      <div style={A.card}>
        <div style={A.logo}>🚐</div>
        <div style={A.title}>Trip Logger</div>
        <div style={A.subtitle}>ระบบบันทึกเที่ยวรถรับส่ง</div>

        <div style={A.toggle}>
          <button style={{ ...A.toggleBtn, ...(mode === "login" ? A.toggleActive : {}) }} onClick={() => { setMode("login"); setError(""); }}>เข้าสู่ระบบ</button>
          <button style={{ ...A.toggleBtn, ...(mode === "signup" ? A.toggleActive : {}) }} onClick={() => { setMode("signup"); setError(""); }}>สมัครสมาชิก</button>
        </div>

        <div style={A.field}>
          <label style={A.label}>Username</label>
          <input style={A.input} value={username} onChange={e => setUsername(e.target.value)} placeholder="ชื่อที่ใช้เข้าระบบ" autoComplete="username" />
        </div>
        <div style={A.field}>
          <label style={A.label}>Password</label>
          <input style={A.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="อย่างน้อย 6 ตัวอักษร"
            onKeyDown={e => e.key === "Enter" && handle()} autoComplete={mode === "login" ? "current-password" : "new-password"} />
        </div>

        {error && <div style={A.error}>{error}</div>}

        <button style={{ ...A.btn, opacity: loading ? 0.7 : 1 }} onClick={handle} disabled={loading}>
          {loading ? "กำลังโหลด..." : mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
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
};

// ─── Main App ─────────────────────────────────────────────────────────────────
const DEFAULT_PLACES = ["ตลาด", "โรงงาน", "บ้านพัก", "ออฟฟิศ"];

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("trip_user")); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem("trip_token") || null);

  const [trips, setTrips] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [places, setPlaces] = useState([]);
  const [defaultPrice, setDefaultPrice] = useState("");
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState("income");
  const [showForm, setShowForm] = useState(false);
  const [tripType, setTripType] = useState("normal");
  const [form, setForm] = useState({ from: "", to: "", count: "", price: "", charterPrice: "", time: formatTime(new Date()) });
  const [expenseForm, setExpenseForm] = useState({ note: "", amount: "", time: formatTime(new Date()) });
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [deletingExpId, setDeletingExpId] = useState(null);
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsPrice, setSettingsPrice] = useState("");
  const [newPlace, setNewPlace] = useState("");
  const [deletingPlace, setDeletingPlace] = useState(null);

  const loadData = async (tok, uid) => {
    setLoading(true);
    try {
      const [t, e, p, s] = await Promise.all([
        api.get("trips", `date=eq.${todayKey()}&user_id=eq.${uid}&order=created_at.desc`, tok),
        api.get("expenses", `date=eq.${todayKey()}&user_id=eq.${uid}&order=created_at.desc`, tok),
        api.get("places", `user_id=eq.${uid}&order=name.asc`, tok),
        api.get("settings", `user_id=eq.${uid}`, tok),
      ]);
      setTrips(Array.isArray(t) ? t : []);
      setExpenses(Array.isArray(e) ? e : []);
      if (Array.isArray(p) && p.length > 0) {
        setPlaces(p.map(x => x.name));
      } else {
        await Promise.all(DEFAULT_PLACES.map(name => api.post("places", { name, user_id: uid }, tok)));
        setPlaces(DEFAULT_PLACES);
      }
      if (Array.isArray(s)) {
        const dp = s.find(x => x.key === "default_price");
        if (dp) { setDefaultPrice(dp.value); setSettingsPrice(dp.value); }
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { if (user && token) loadData(token, user.id); else setLoading(false); }, []);

  const handleLogin = (u) => { setUser(u); setToken(u.token); loadData(u.token, u.id); };

  const handleLogout = () => {
    localStorage.removeItem("trip_token");
    localStorage.removeItem("trip_user");
    setUser(null); setToken(null); setTrips([]); setExpenses([]); setPlaces([]); setDefaultPrice("");
  };

  const todayTrips = trips;
  const todayExpenses = expenses;
  const totalRevenue = todayTrips.reduce((s, t) => s + Number(t.total), 0);
  const totalExpense = todayExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalPassengers = todayTrips.reduce((s, t) => s + (t.count || 0), 0);
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
      if (!form.charterPrice || isNaN(form.charterPrice) || +form.charterPrice < 0) return setError("ระบุราคาเหมาด้วยนะคะ");
      body = { date: todayKey(), time: form.time, from_point: form.from, to_point: form.to, type: "charter", total: +form.charterPrice, user_id: user.id };
    } else {
      if (!form.count || isNaN(form.count) || +form.count < 1) return setError("จำนวนผู้โดยสารไม่ถูกต้อง");
      if (!form.price || isNaN(form.price) || +form.price < 0) return setError("ราคาต่อหัวไม่ถูกต้อง");
      body = { date: todayKey(), time: form.time, from_point: form.from, to_point: form.to, type: "normal", count: +form.count, price: +form.price, total: +form.count * +form.price, user_id: user.id };
    }
    const res = await api.post("trips", body, token);
    if (Array.isArray(res) && res[0]) setTrips(prev => [res[0], ...prev]);
    setError(""); setShowForm(false);
  };

  const handleSubmitExpense = async () => {
    if (!expenseForm.note.trim()) return setError("ระบุรายการด้วยนะคะ");
    if (!expenseForm.amount || isNaN(expenseForm.amount) || +expenseForm.amount <= 0) return setError("จำนวนเงินไม่ถูกต้อง");
    const res = await api.post("expenses", { date: todayKey(), time: expenseForm.time, note: expenseForm.note.trim(), amount: +expenseForm.amount, user_id: user.id }, token);
    if (Array.isArray(res) && res[0]) setExpenses(prev => [res[0], ...prev]);
    setError(""); setShowForm(false);
  };

  const saveSettings = async () => {
    await api.upsert("settings", { key: "default_price", value: settingsPrice, user_id: user.id }, token);
    setDefaultPrice(settingsPrice); setShowSettings(false);
  };

  const addPlace = async () => {
    const p = newPlace.trim();
    if (!p || places.includes(p)) return;
    await api.post("places", { name: p, user_id: user.id }, token);
    setPlaces(prev => [...prev, p].sort()); setNewPlace("");
  };

  const removePlace = async (name) => {
    await fetch(`${SUPABASE_URL}/rest/v1/places?name=eq.${encodeURIComponent(name)}&user_id=eq.${user.id}`, { method: "DELETE", headers: h(token) });
    setPlaces(prev => prev.filter(x => x !== name)); setDeletingPlace(null);
  };

  if (!user) return <AuthPage onLogin={handleLogin} />;

  if (loading) return (
    <div style={{ ...S.root, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: 40, marginBottom: 12 }}>🚐</div><div style={{ color: "#888", fontSize: 14 }}>กำลังโหลด...</div></div>
    </div>
  );

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

  return (
    <div style={S.root} onClick={() => { setFromOpen(false); setToOpen(false); }}>
      <div style={S.header}>
        <div style={S.headerTop}>
          <div>
            <div style={S.headerLabel}>วันนี้</div>
            <div style={S.headerDate}>{formatDate(new Date())}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={S.headerStats}>
              <div style={S.statBox}><span style={S.statNum}>{todayTrips.length}</span><span style={S.statLabel}>เที่ยว</span></div>
              <div style={S.statDivider} />
              <div style={S.statBox}><span style={S.statNum}>{totalPassengers}</span><span style={S.statLabel}>คน</span></div>
            </div>
            <button style={S.settingsBtn} onClick={() => setShowSettings(true)}>⚙️</button>
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
          <button style={{ ...S.tabBtn, ...(tab === "income" ? S.tabBtnActive : {}) }} onClick={() => { setTab("income"); setShowForm(false); }}>
            รายรับ {todayTrips.length > 0 && <span style={S.tabBadge}>{todayTrips.length}</span>}
          </button>
          <button style={{ ...S.tabBtn, ...(tab === "expense" ? S.tabBtnExpense : {}) }} onClick={() => { setTab("expense"); setShowForm(false); }}>
            รายจ่าย {todayExpenses.length > 0 && <span style={{ ...S.tabBadge, background: "#E0500044", color: "#E07070" }}>{todayExpenses.length}</span>}
          </button>
        </div>
      </div>

      <div style={S.body}>
        {tab === "income" && todayTrips.length === 0 && !showForm && (
          <div style={S.empty}><div style={S.emptyIcon}>🚐</div><div style={S.emptyText}>ยังไม่มีเที่ยววันนี้</div><div style={S.emptySubtext}>กด + เพื่อเพิ่มเที่ยวแรก</div></div>
        )}
        {tab === "expense" && todayExpenses.length === 0 && !showForm && (
          <div style={S.empty}><div style={S.emptyIcon}>🧾</div><div style={S.emptyText}>ยังไม่มีรายจ่ายวันนี้</div><div style={S.emptySubtext}>กด + เพื่อบันทึกรายจ่าย</div></div>
        )}

        {showForm && tab === "income" && (
          <div style={S.card} onClick={e => e.stopPropagation()}>
            <div style={S.cardHeader}><span style={S.cardTitle}>เพิ่มเที่ยวใหม่</span><button style={S.closeBtn} onClick={() => { setShowForm(false); setError(""); }}>✕</button></div>
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
                {form.count && form.price && (
                  <div style={S.calcPreview}><span style={S.calcText}>{form.count} คน × ฿{form.price} =</span><span style={S.calcTotal}>฿{(+form.count * +form.price).toLocaleString()}</span></div>
                )}
              </>
            )}
            {tripType === "charter" && (
              <div style={{ marginBottom: 12 }}><label style={S.label}>ราคาเหมา (฿)</label><input style={{ ...S.input, fontSize: 16, fontWeight: 700, border: "1px solid #C9963A44", background: "#C9963A0A" }} type="number" inputMode="decimal" value={form.charterPrice} onChange={e => setForm(p => ({ ...p, charterPrice: e.target.value }))} placeholder="ระบุราคารวม" /></div>
            )}
            {error && <div style={S.error}>{error}</div>}
            <button style={tripType === "charter" ? { ...S.submitBtn, background: "linear-gradient(135deg,#7A5A20,#C9963A)" } : S.submitBtn} onClick={handleSubmitTrip}>บันทึกเที่ยว</button>
          </div>
        )}

        {showForm && tab === "expense" && (
          <div style={{ ...S.card, border: "1px solid #E0505033" }} onClick={e => e.stopPropagation()}>
            <div style={S.cardHeader}><span style={S.cardTitle}>เพิ่มรายจ่าย</span><button style={S.closeBtn} onClick={() => { setShowForm(false); setError(""); }}>✕</button></div>
            <div style={{ marginBottom: 12 }}><label style={S.label}>เวลา</label><input style={S.input} value={expenseForm.time} onChange={e => setExpenseForm(p => ({ ...p, time: e.target.value }))} /></div>
            <div style={{ marginBottom: 12 }}><label style={S.label}>รายการ</label><input style={S.input} value={expenseForm.note} onChange={e => setExpenseForm(p => ({ ...p, note: e.target.value }))} placeholder="เช่น ค่าน้ำมัน" /></div>
            <div style={{ marginBottom: 12 }}><label style={S.label}>จำนวนเงิน (฿)</label><input style={{ ...S.input, fontSize: 16, fontWeight: 700, border: "1px solid #E0505044", background: "#E050500A" }} type="number" inputMode="decimal" value={expenseForm.amount} onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" /></div>
            {error && <div style={S.error}>{error}</div>}
            <button style={{ ...S.submitBtn, background: "linear-gradient(135deg,#8B2020,#E05050)" }} onClick={handleSubmitExpense}>บันทึกรายจ่าย</button>
          </div>
        )}

        {tab === "income" && todayTrips.map((trip, i) => (
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
                    <span style={trip.type === "charter" ? S.tripBadgeCharter : S.tripBadge}>{trip.type === "charter" ? "🚐 เหมา" : `เที่ยวที่ ${todayTrips.length - i}`}</span>
                    <span style={S.tripTime}>{trip.time}</span>
                  </div>
                  <button style={S.deleteBtn} onClick={() => setDeletingId(trip.id)}>✕</button>
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

        {tab === "expense" && todayExpenses.map(exp => (
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
                  <button style={S.deleteBtn} onClick={() => setDeletingExpId(exp.id)}>✕</button>
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

      {!showForm && !showSettings && (
        <button style={{ ...S.fab, ...(tab === "expense" ? { background: "linear-gradient(135deg,#8B2020,#E05050)", boxShadow: "0 4px 24px #E0505055" } : {}) }} onClick={openForm}>+</button>
      )}

      {showSettings && (
        <div style={S.overlay} onClick={() => setShowSettings(false)}>
          <div style={S.sheet} onClick={e => e.stopPropagation()}>
            <div style={S.sheetHandle} />
            <div style={S.sheetHeader}>
              <div>
                <div style={S.sheetTitle}>การตั้งค่า</div>
                <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>👤 {user.username}</div>
              </div>
              <button style={S.closeBtn} onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <div style={S.settingSection}>
              <label style={S.settingLabel}>ราคาต่อหัว default (฿)</label>
              <div style={S.settingRow}>
                <input style={{ ...S.input, flex: 1 }} type="number" inputMode="decimal" value={settingsPrice} onChange={e => setSettingsPrice(e.target.value)} placeholder="เช่น 30" />
                <button style={S.saveBtn} onClick={saveSettings}>บันทึก</button>
              </div>
              <div style={S.settingHint}>ใส่อัตโนมัติตอนเพิ่มเที่ยว แก้ได้ทีหลัง</div>
            </div>
            <div style={S.settingSection}>
              <label style={S.settingLabel}>จัดการสถานที่</label>
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
            <button style={{ ...S.saveBtn, width: "100%", background: "#E0505022", color: "#E07070", border: "1px solid #E0505044", marginTop: 8 }} onClick={handleLogout}>ออกจากระบบ</button>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  root: { minHeight: "100vh", background: "#0F1117", color: "#F0EDE6", fontFamily: "'Sarabun', sans-serif", width: "100%", margin: "0 auto", position: "relative", paddingBottom: 100 },
  header: { background: "linear-gradient(160deg,#1A1D27 0%,#141720 100%)", borderBottom: "1px solid #2A2D3A", padding: "clamp(16px,4vw,24px) clamp(12px,4vw,20px) 14px", position: "sticky", top: 0, zIndex: 10 },
  headerTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  headerLabel: { fontSize: 11, color: "#666", letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 },
  headerDate: { fontSize: "clamp(15px,4vw,18px)", fontWeight: 700, color: "#F0EDE6" },
  headerStats: { display: "flex", alignItems: "center", gap: 12, background: "#1F2231", borderRadius: 12, padding: "8px 16px" },
  statBox: { display: "flex", flexDirection: "column", alignItems: "center" },
  statNum: { fontSize: "clamp(16px,4vw,20px)", fontWeight: 800, color: "#F0EDE6", lineHeight: 1 },
  statLabel: { fontSize: 10, color: "#888", marginTop: 2 },
  statDivider: { width: 1, height: 28, background: "#2A2D3A" },
  settingsBtn: { background: "#1F2231", border: "1px solid #2A2D3A", borderRadius: 10, width: 38, height: 38, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
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
  fab: { position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#C9963A,#E8B86D)", border: "none", color: "#0F1117", fontSize: 28, cursor: "pointer", boxShadow: "0 4px 24px #C9963A55", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20 },
  overlay: { position: "fixed", inset: 0, background: "#00000088", zIndex: 30, display: "flex", alignItems: "flex-end" },
  sheet: { background: "#1A1D27", borderRadius: "20px 20px 0 0", width: "100%", margin: "0 auto", padding: "12px clamp(16px,4vw,24px) 40px", maxHeight: "80vh", overflowY: "auto" },
  sheetHandle: { width: 36, height: 4, background: "#2A2D3A", borderRadius: 2, margin: "0 auto 16px" },
  sheetHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  sheetTitle: { fontSize: 16, fontWeight: 700, color: "#F0EDE6" },
  settingSection: { marginBottom: 24 },
  settingLabel: { fontSize: 12, color: "#888", letterSpacing: 0.5, marginBottom: 8, display: "block" },
  settingRow: { display: "flex", gap: 8, marginBottom: 6 },
  settingHint: { fontSize: 11, color: "#555" },
  saveBtn: { background: "#C9963A", border: "none", borderRadius: 8, padding: "10px 14px", color: "#0F1117", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Sarabun', sans-serif", whiteSpace: "nowrap" },
  placeList: { display: "flex", flexDirection: "column", gap: 6, marginTop: 10 },
  placeItem: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0F1117", border: "1px solid #2A2D3A", borderRadius: 8, padding: "10px 14px" },
  placeName: { fontSize: 14, color: "#D0CCB8" },
  placeDeleteBtn: { background: "none", border: "none", color: "#555", fontSize: 13, cursor: "pointer", padding: 4 },
};
