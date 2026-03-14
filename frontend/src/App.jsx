import { useState, useEffect } from "react";

const API_BASE = "https://friendly-achievement-production.up.railway.app";
const VERSION = "v4.2";

const T = {
  bg: "#0D0F14",
  surface: "#13161D",
  surfaceHover: "#1A1D26",
  border: "#1E2230",
  borderLight: "#2A2E3D",
  gold: "#F5A800",
  goldDim: "rgba(245,168,0,0.12)",
  goldGlow: "rgba(245,168,0,0.25)",
  text: "#F0F0F0",
  textDim: "#8A8FA3",
  textMuted: "#5A5F73",
  green: "#34D399",
  greenDim: "rgba(52,211,153,0.12)",
  blue: "#60A5FA",
  blueDim: "rgba(96,165,250,0.12)",
  red: "#F87171",
  redDim: "rgba(248,113,113,0.12)",
  orange: "#FB923C",
  orangeDim: "rgba(251,146,60,0.12)",
};

const STATUS_MAP = {
  DELIVERED: { label: "Delivered", color: T.green, bg: T.greenDim, icon: "✓" },
  IN_TRANSIT: { label: "In Transit", color: T.blue, bg: T.blueDim, icon: "◎" },
  GREEN_LIGHT: { label: "Green Light", color: T.gold, bg: T.goldDim, icon: "★" },
  CUSTOMS_HOLD: { label: "Customs Hold", color: T.red, bg: T.redDim, icon: "⊘" },
  DOCS_PENDING: { label: "Docs Pending", color: T.orange, bg: T.orangeDim, icon: "◷" },
  CREATED: { label: "Created", color: T.textDim, bg: "rgba(138,143,163,0.12)", icon: "●" },
  BOOKED: { label: "Booked", color: T.blue, bg: T.blueDim, icon: "◈" },
  PICKED_UP: { label: "Picked Up", color: T.gold, bg: T.goldDim, icon: "↑" },
};

const getStatus = (s) => STATUS_MAP[s] || { label: s || "Unknown", color: T.textDim, bg: "rgba(138,143,163,0.12)", icon: "●" };

const MOCK_KPI = { totalPOs: 2487, delivered: 1842, inTransit: 312, greenLight: 189, customsHold: 67, docsPending: 77 };
const MOCK_POS = [
  { id: "PO-2026-0891", poNumber: "PO-2026-0891", client: "SNEPCO", description: "Subsea Wellhead Equipment", status: "IN_TRANSIT", items: 24, createdAt: "2026-02-18" },
  { id: "PO-2026-0887", poNumber: "PO-2026-0887", client: "TotalEnergies", description: "Turbine Spare Parts", status: "DELIVERED", items: 12, createdAt: "2026-02-15" },
  { id: "PO-2026-0879", poNumber: "PO-2026-0879", client: "NAOC", description: "Drilling Mud Chemicals", status: "GREEN_LIGHT", items: 8, createdAt: "2026-02-12" },
  { id: "PO-2026-0865", poNumber: "PO-2026-0865", client: "SNEPCO", description: "Safety Valves BOP Stack", status: "CUSTOMS_HOLD", items: 36, createdAt: "2026-02-08" },
  { id: "PO-2026-0854", poNumber: "PO-2026-0854", client: "TotalEnergies", description: "Pipeline Inspection Tools", status: "DOCS_PENDING", items: 6, createdAt: "2026-02-05" },
  { id: "PO-2026-0841", poNumber: "PO-2026-0841", client: "NAOC", description: "Compressor Module Assembly", status: "IN_TRANSIT", items: 18, createdAt: "2026-01-30" },
  { id: "PO-2026-0832", poNumber: "PO-2026-0832", client: "SNEPCO", description: "Electrical Switchgear Panel", status: "DELIVERED", items: 4, createdAt: "2026-01-25" },
  { id: "PO-2026-0818", poNumber: "PO-2026-0818", client: "TotalEnergies", description: "Heat Exchanger Bundle", status: "DELIVERED", items: 2, createdAt: "2026-01-20" },
];
const MOCK_DOCS = [
  { id: 1, type: "BW", reference: "BW-2026-0412", poNumber: "PO-2026-0891", client: "SNEPCO", status: "VALIDATED", createdAt: "2026-02-19" },
  { id: 2, type: "RFC", reference: "RFC-2026-0389", poNumber: "PO-2026-0887", client: "TotalEnergies", status: "SENT", createdAt: "2026-02-16" },
  { id: 3, type: "POD", reference: "POD-2026-0201", poNumber: "PO-2026-0879", client: "NAOC", status: "DRAFT", createdAt: "2026-02-13" },
  { id: 4, type: "VPL", reference: "VPL-2026-0178", poNumber: "PO-2026-0865", client: "SNEPCO", status: "PENDING", createdAt: "2026-02-09" },
  { id: 5, type: "POC", reference: "POC-2026-0155", poNumber: "PO-2026-0854", client: "TotalEnergies", status: "VALIDATED", createdAt: "2026-02-06" },
];
const MOCK_TIMELINE = [
  { event: "PO Created", date: "2026-02-18", done: true },
  { event: "BW Issued", date: "2026-02-19", done: true },
  { event: "RFC Sent", date: "2026-02-20", done: true },
  { event: "Booking Confirmed", date: "2026-02-22", done: true },
  { event: "Pickup", date: "2026-02-25", done: true },
  { event: "In Transit", date: "2026-02-26", done: true, active: true },
  { event: "Green Light", date: "—", done: false },
  { event: "Delivered", date: "—", done: false },
];

let authToken = null;

async function apiLogin(email, password) {
  try {
    const res = await fetch(API_BASE + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("Login failed");
    const data = await res.json();
    authToken = data.access_token || data.token;
    return data;
  } catch (e) {
    console.warn("API login failed, using demo mode:", e.message);
    return null;
  }
}

async function apiFetch(endpoint) {
  try {
    const headers = authToken ? { Authorization: "Bearer " + authToken } : {};
    const res = await fetch(API_BASE + endpoint, { headers });
    if (!res.ok) throw new Error("" + res.status);
    return await res.json();
  } catch (e) {
    console.warn("API fetch " + endpoint + " failed:", e.message);
    return null;
  }
}

const StatusBadge = ({ status }) => {
  const s = getStatus(status);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: s.bg, color: s.color, fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, whiteSpace: "nowrap" }}>
      <span style={{ fontSize: 10 }}>{s.icon}</span> {s.label}
    </span>
  );
};

const KPICard = ({ label, value, color, icon, trend }) => (
  <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 14, padding: "20px 22px", position: "relative", overflow: "hidden", minWidth: 0 }}>
    <div style={{ position: "absolute", top: -8, right: -8, fontSize: 48, opacity: 0.06, color: color }}>{icon}</div>
    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: T.textDim, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>{label}</div>
    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 28, fontWeight: 700, color: color, lineHeight: 1 }}>{typeof value === "number" ? value.toLocaleString() : value}</div>
    {trend && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: trend > 0 ? T.green : T.red, marginTop: 8 }}>{trend > 0 ? "▲" : "▼"} {Math.abs(trend)}% vs last month</div>}
  </div>
);

const NavItem = ({ icon, label, active, onClick, badge, collapsed }) => (
  <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: collapsed ? "11px 0" : "11px 16px", border: "none", borderRadius: 10, background: active ? T.goldDim : "transparent", color: active ? T.gold : T.textDim, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: active ? 600 : 400, textAlign: "left", justifyContent: collapsed ? "center" : "flex-start" }}>
    <span style={{ fontSize: 18, width: 24, textAlign: "center", flexShrink: 0 }}>{icon}</span>
    {!collapsed && <span>{label}</span>}
    {!collapsed && badge && <span style={{ marginLeft: "auto", background: T.red, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10, fontFamily: "'DM Mono', monospace" }}>{badge}</span>}
  </button>
);

const DonutChart = ({ data, size = 160 }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = size / 2, cy = size / 2, r = size * 0.36, sw = size * 0.09;
  let cum = 0;
  const arcs = data.map(d => {
    const frac = d.value / total;
    const start = cum * 2 * Math.PI - Math.PI / 2;
    cum += frac;
    const end = cum * 2 * Math.PI - Math.PI / 2;
    const large = frac > 0.5 ? 1 : 0;
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
    return { ...d, path: "M " + x1 + " " + y1 + " A " + r + " " + r + " 0 " + large + " 1 " + x2 + " " + y2 };
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={"0 0 " + size + " " + size} style={{ flexShrink: 0 }}>
        {arcs.map((a, i) => <path key={i} d={a.path} fill="none" stroke={a.color} strokeWidth={sw} strokeLinecap="round" />)}
        <text x={cx} y={cy - 4} textAnchor="middle" fill={T.text} fontFamily="'DM Mono', monospace" fontSize={20} fontWeight={700}>{total.toLocaleString()}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill={T.textDim} fontFamily="'DM Sans', sans-serif" fontSize={9}>TOTAL POs</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
            <span style={{ color: T.textDim, minWidth: 80 }}>{d.label}</span>
            <span style={{ color: T.text, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const BarChart = ({ data }) => {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 130, padding: "0 4px" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.text, fontWeight: 600 }}>{d.value}</span>
          <div style={{ width: "100%", maxWidth: 44, height: ((d.value / max) * 100) + "px", background: "linear-gradient(180deg, " + T.gold + ", " + T.gold + "88)", borderRadius: "6px 6px 2px 2px" }} />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: T.textDim, textAlign: "center" }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
};

const LoginScreen = ({ onLogin, loading }) => {
  const [email, setEmail] = useState("mgt@lscmltd.com");
  const [pass, setPass] = useState("admin2026");
  const [error, setError] = useState("");
  const handleSubmit = async () => {
    setError("");
    const ok = await onLogin(email, pass);
    if (!ok) setError("Connection failed — entering Demo Mode");
  };
  const inputStyle = { width: "100%", padding: "14px 16px", background: T.surface, border: "1px solid " + T.border, borderRadius: 10, color: T.text, fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" };
  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400, padding: "36px 32px", background: T.surface, borderRadius: 20, border: "1px solid " + T.border, boxShadow: "0 0 60px " + T.goldDim }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: T.gold }}>CLEAR</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.textDim, marginTop: 4 }}>ERP {VERSION} — LSCM Ltd</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: T.textDim, marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: T.textDim, marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>Password</label>
            <input type="password" value={pass} onChange={e => setPass(e.target.value)} style={inputStyle} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
          </div>
          {error && <div style={{ fontSize: 12, color: T.orange, padding: "8px 12px", background: T.orangeDim, borderRadius: 8 }}>{error}</div>}
          <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: "14px", background: loading ? T.goldDim : "linear-gradient(135deg, " + T.gold + ", #E09800)", border: "none", borderRadius: 10, color: T.bg, fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, cursor: loading ? "wait" : "pointer", marginTop: 4 }}>
            {loading ? "Connecting..." : "Sign In"}
          </button>
        </div>
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: T.textMuted }}>Freight Forwarding • Oil & Gas • Mining • Energy</div>
      </div>
    </div>
  );
};
const DashboardPage = ({ kpi, pos }) => {
  const donutData = [
    { label: "Delivered", value: kpi.delivered, color: T.green },
    { label: "In Transit", value: kpi.inTransit, color: T.blue },
    { label: "Green Light", value: kpi.greenLight, color: T.gold },
    { label: "Customs Hold", value: kpi.customsHold, color: T.red },
    { label: "Docs Pending", value: kpi.docsPending, color: T.orange },
  ];
  const clientData = [
    { label: "SNEPCO", value: 1245 },
    { label: "NAOC", value: 612 },
    { label: "Total", value: 430 },
    { label: "Agip", value: 200 },
  ];
  const recentPOs = (pos || MOCK_POS).slice(0, 6);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 12 }}>
        <KPICard label="Total POs" value={kpi.totalPOs} color={T.gold} icon="◈" trend={4.2} />
        <KPICard label="Delivered" value={kpi.delivered} color={T.green} icon="✓" trend={6.1} />
        <KPICard label="In Transit" value={kpi.inTransit} color={T.blue} icon="◎" trend={-2.3} />
        <KPICard label="Green Light" value={kpi.greenLight} color={T.gold} icon="★" />
        <KPICard label="Customs Hold" value={kpi.customsHold} color={T.red} icon="⊘" trend={-8.5} />
        <KPICard label="Docs Pending" value={kpi.docsPending} color={T.orange} icon="◷" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
        <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 14, padding: 22 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 18 }}>By Status</div>
          <DonutChart data={donutData} />
        </div>
        <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 14, padding: 22 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 18 }}>By Client</div>
          <BarChart data={clientData} />
        </div>
      </div>
      <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 14, padding: 22 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 14 }}>Recent Activity</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 600, borderCollapse: "collapse", fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
            <thead>
              <tr>
                {["PO Number", "Client", "Description", "Items", "Status", "Date"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: T.textDim, fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, borderBottom: "1px solid " + T.border }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentPOs.map((po, i) => (
                <tr key={i}>
                  <td style={{ padding: "12px", color: T.gold, fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 600 }}>{po.poNumber}</td>
                  <td style={{ padding: "12px", color: T.text }}>{po.client}</td>
                  <td style={{ padding: "12px", color: T.textDim, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{po.description}</td>
                  <td style={{ padding: "12px", color: T.text, fontFamily: "'DM Mono', monospace" }}>{po.items || "—"}</td>
                  <td style={{ padding: "12px" }}><StatusBadge status={po.status} /></td>
                  <td style={{ padding: "12px", color: T.textDim, fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{po.createdAt ? po.createdAt.slice(0, 10) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const POsPage = ({ pos }) => {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const allPos = pos || MOCK_POS;
  const filtered = allPos.filter(po => {
    if (filter !== "ALL" && po.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!po.poNumber?.toLowerCase().includes(q) && !po.description?.toLowerCase().includes(q) && !po.client?.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const statuses = ["ALL", ...Object.keys(STATUS_MAP)];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: T.text }}>Purchase Orders</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input placeholder="Search POs..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: "10px 16px", background: T.surface, border: "1px solid " + T.border, borderRadius: 10, color: T.text, fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: "none", width: 200 }} />
          <button style={{ padding: "10px 20px", background: "linear-gradient(135deg, " + T.gold + ", #E09800)", border: "none", borderRadius: 10, color: T.bg, fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>+ New PO</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {statuses.map(s => {
          const isActive = filter === s;
          const st = s === "ALL" ? { color: T.gold, bg: T.goldDim } : getStatus(s);
          return (
            <button key={s} onClick={() => setFilter(s)} style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid " + (isActive ? st.color : T.border), background: isActive ? st.bg : "transparent", color: isActive ? st.color : T.textDim, fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: isActive ? 600 : 400, cursor: "pointer" }}>
              {s === "ALL" ? "All" : getStatus(s).label}
            </button>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {filtered.map((po, i) => (
          <div key={i} style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 14, padding: 18, cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 8 }}>
              <div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: T.gold, fontWeight: 700 }}>{po.poNumber}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: T.textDim, marginTop: 2 }}>{po.client}</div>
              </div>
              <StatusBadge status={po.status} />
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: T.text, marginBottom: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{po.description}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: T.textDim }}>Items: <span style={{ color: T.text, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{po.items || "—"}</span></span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.textMuted }}>{po.createdAt ? po.createdAt.slice(0, 10) : ""}</span>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <div style={{ textAlign: "center", padding: 40, color: T.textDim }}>No POs match your criteria</div>}
    </div>
  );
};

const TrackTracePage = () => {
  const [selectedPO, setSelectedPO] = useState("PO-2026-0891");
  const [scanMode, setScanMode] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: T.text }}>Track & Trace</div>
        <button onClick={() => setScanMode(!scanMode)} style={{ padding: "10px 20px", background: scanMode ? T.goldDim : T.surface, border: "1px solid " + (scanMode ? T.gold : T.border), borderRadius: 10, color: scanMode ? T.gold : T.textDim, fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>QR Scanner</button>
      </div>
      {scanMode ? (
        <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 14, padding: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div style={{ width: 220, height: 220, border: "3px dashed " + T.gold + "44", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <div style={{ position: "absolute", top: -2, left: -2, width: 28, height: 28, borderTop: "3px solid " + T.gold, borderLeft: "3px solid " + T.gold, borderRadius: "8px 0 0 0" }} />
            <div style={{ position: "absolute", top: -2, right: -2, width: 28, height: 28, borderTop: "3px solid " + T.gold, borderRight: "3px solid " + T.gold, borderRadius: "0 8px 0 0" }} />
            <div style={{ position: "absolute", bottom: -2, left: -2, width: 28, height: 28, borderBottom: "3px solid " + T.gold, borderLeft: "3px solid " + T.gold, borderRadius: "0 0 0 8px" }} />
            <div style={{ position: "absolute", bottom: -2, right: -2, width: 28, height: 28, borderBottom: "3px solid " + T.gold, borderRight: "3px solid " + T.gold, borderRadius: "0 0 8px 0" }} />
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: T.textDim, textAlign: "center" }}>Point camera at QR sticker</div>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 14, padding: 18 }}>
              <label style={{ fontSize: 11, color: T.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "block", fontFamily: "'DM Sans', sans-serif" }}>Track Shipment</label>
              <input value={selectedPO} onChange={e => setSelectedPO(e.target.value)} style={{ width: "100%", padding: "12px 14px", background: T.bg, border: "1px solid " + T.border, borderRadius: 8, color: T.gold, fontFamily: "'DM Mono', monospace", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 14, padding: 18 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 14 }}>Shipment Details</div>
              {[["PO Number", selectedPO], ["Client", "SNEPCO"], ["Route", "Houston → Lagos"], ["Carrier", "Maersk Line"], ["Container", "MSKU-7284619"], ["ETD", "2026-02-26"], ["ETA", "2026-03-18"], ["Items", "24 packages"]].map(function(row) {
                return (
                  <div key={row[0]} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid " + T.border + "08" }}>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: T.textDim }}>{row[0]}</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: T.text, fontWeight: 500 }}>{row[1]}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 14, padding: 22 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 18 }}>Shipment Timeline</div>
            {MOCK_TIMELINE.map((ev, i) => {
              const isLast = i === MOCK_TIMELINE.length - 1;
              const dotColor = ev.active ? T.gold : ev.done ? T.green : T.textMuted;
              return (
                <div key={i} style={{ display: "flex", gap: 14 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20 }}>
                    <div style={{ width: ev.active ? 14 : 10, height: ev.active ? 14 : 10, borderRadius: "50%", background: dotColor, flexShrink: 0, marginTop: 4 }} />
                    {!isLast && <div style={{ width: 2, flex: 1, background: ev.done ? T.green + "44" : T.border, minHeight: 28 }} />}
                  </div>
                  <div style={{ paddingBottom: isLast ? 0 : 16 }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: ev.active ? T.gold : ev.done ? T.text : T.textMuted, fontWeight: ev.active ? 700 : 400 }}>{ev.event}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.textDim, marginTop: 2 }}>{ev.date}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 14, padding: 22 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 14 }}>QR Sticker Preview</div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {["ITEM-001", "ITEM-002", "ITEM-003"].map((item, i) => (
            <div key={i} style={{ width: 148, padding: 14, background: "#fff", borderRadius: 12, textAlign: "center" }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 800, color: T.bg, marginBottom: 6 }}>LSCM Ltd</div>
              <div style={{ width: 72, height: 72, margin: "0 auto 6px", background: "repeating-conic-gradient(" + T.bg + " 0% 25%, #fff 0% 50%) 0 0 / 9px 9px", borderRadius: 4 }} />
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: T.bg, fontWeight: 600 }}>{selectedPO}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#666" }}>{item}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DocumentsPage = () => {
  const [docFilter, setDocFilter] = useState("ALL");
  const docTypes = ["ALL", "BW", "RFC", "POD", "VPL", "POC", "POR"];
  const docTypeColors = { BW: T.blue, RFC: T.gold, POD: T.green, VPL: T.orange, POC: "#A78BFA", POR: T.red };
  const filtered = docFilter === "ALL" ? MOCK_DOCS : MOCK_DOCS.filter(d => d.type === docFilter);
  const docStatusColor = { VALIDATED: T.green, SENT: T.blue, DRAFT: T.textDim, PENDING: T.orange };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: T.text }}>Documents</div>
        <button style={{ padding: "10px 20px", background: "linear-gradient(135deg, " + T.gold + ", #E09800)", border: "none", borderRadius: 10, color: T.bg, fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Generate Document</button>
      </div>
      <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 14, padding: 18 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 12 }}>Document Cascade</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {["BW", "→", "RFC", "→", "VPL", "→", "POC", "→", "POR", "→", "POD"].map(function(item, i) {
            if (item === "→") return <span key={i} style={{ color: T.textMuted, fontSize: 14 }}>→</span>;
            return <div key={i} style={{ padding: "6px 14px", borderRadius: 8, background: (docTypeColors[item] || T.textDim) + "15", border: "1px solid " + (docTypeColors[item] || T.textDim) + "33", color: docTypeColors[item] || T.textDim, fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700 }}>{item}</div>;
          })}
        </div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: T.textDim, marginTop: 8 }}>BW Path: BW → RFC → draft VPL (full-service / item-level QR tracking)</div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {docTypes.map(dt => {
          const isActive = docFilter === dt;
          const c = dt === "ALL" ? T.gold : docTypeColors[dt] || T.textDim;
          return (
            <button key={dt} onClick={() => setDocFilter(dt)} style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid " + (isActive ? c : T.border), background: isActive ? c + "18" : "transparent", color: isActive ? c : T.textDim, fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: isActive ? 700 : 400, cursor: "pointer" }}>{dt}</button>
          );
        })}
      </div>
      <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 14, padding: 18, overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 580, borderCollapse: "collapse", fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
          <thead>
            <tr>
              {["Type", "Reference", "PO", "Client", "Status", "Created"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: T.textDim, fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, borderBottom: "1px solid " + T.border }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((doc, i) => (
              <tr key={i}>
                <td style={{ padding: "12px" }}>
                  <span style={{ padding: "4px 10px", borderRadius: 6, background: (docTypeColors[doc.type] || T.textDim) + "18", color: docTypeColors[doc.type] || T.textDim, fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700 }}>{doc.type}</span>
                </td>
                <td style={{ padding: "12px", color: T.gold, fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{doc.reference}</td>
                <td style={{ padding: "12px", color: T.text, fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{doc.poNumber}</td>
                <td style={{ padding: "12px", color: T.text }}>{doc.client}</td>
                <td style={{ padding: "12px" }}>
                  <span style={{ color: docStatusColor[doc.status] || T.textDim, fontWeight: 600, fontSize: 12 }}>● {doc.status}</span>
                </td>
                <td style={{ padding: "12px", color: T.textDim, fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{doc.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
const AnalyticsPage = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: T.text }}>Analytics</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
      {[
        { label: "Avg Delivery Time", value: "18.4d", sub: "Houston → Lagos", color: T.blue },
        { label: "On-Time Rate", value: "74.2%", sub: "+3.1% this quarter", color: T.green },
        { label: "Cost per Item", value: "$842", sub: "All clients avg", color: T.gold },
      ].map((m, i) => (
        <div key={i} style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 14, padding: 22, textAlign: "center" }}>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: T.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{m.label}</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 32, fontWeight: 700, color: m.color }}>{m.value}</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: T.textDim, marginTop: 6 }}>{m.sub}</div>
        </div>
      ))}
    </div>
    <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 14, padding: 22 }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 14 }}>Monthly Throughput</div>
      <BarChart data={[
        { label: "Sep", value: 186 }, { label: "Oct", value: 212 }, { label: "Nov", value: 198 },
        { label: "Dec", value: 165 }, { label: "Jan", value: 234 }, { label: "Feb", value: 247 },
      ]} />
    </div>
    <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 14, padding: 22, overflowX: "auto" }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 14 }}>Lane Performance</div>
      <table style={{ width: "100%", minWidth: 520, borderCollapse: "collapse", fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
        <thead>
          <tr>
            {["Lane", "Shipments", "Avg Days", "On-Time", "Risk"].map(h => (
              <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: T.textDim, fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, borderBottom: "1px solid " + T.border }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            ["Houston → Lagos", 142, "18.4", "76%", "Low"],
            ["Rotterdam → PH", 89, "22.1", "68%", "Medium"],
            ["Singapore → Lagos", 54, "15.2", "82%", "Low"],
            ["Aberdeen → Lagos", 38, "24.8", "61%", "High"],
          ].map(function(row, i) {
            return (
              <tr key={i}>
                <td style={{ padding: "12px", color: T.text }}>{row[0]}</td>
                <td style={{ padding: "12px", color: T.text, fontFamily: "'DM Mono', monospace" }}>{row[1]}</td>
                <td style={{ padding: "12px", color: T.text, fontFamily: "'DM Mono', monospace" }}>{row[2]}</td>
                <td style={{ padding: "12px", color: T.text, fontFamily: "'DM Mono', monospace" }}>{row[3]}</td>
                <td style={{ padding: "12px" }}>
                  <span style={{ color: row[4] === "Low" ? T.green : row[4] === "Medium" ? T.orange : T.red, fontWeight: 600, fontSize: 12 }}>● {row[4]}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [kpi, setKpi] = useState(MOCK_KPI);
  const [pos, setPos] = useState(MOCK_POS);
  const [mobileNav, setMobileNav] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [isWide, setIsWide] = useState(typeof window !== "undefined" ? window.innerWidth > 900 : true);
  useEffect(() => {
    const onResize = () => setIsWide(window.innerWidth > 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const handleLogin = async (email, password) => {
    setLoading(true);
    const result = await apiLogin(email, password);
    if (result) {
      const poData = await apiFetch("/api/purchase-orders");
      if (poData) setPos(Array.isArray(poData) ? poData : poData.data || MOCK_POS);
      setDemoMode(false);
    } else {
      setDemoMode(true);
    }
    setLoading(false);
    setAuthed(true);
    return true;
  };

  if (!authed) return <LoginScreen onLogin={handleLogin} loading={loading} />;

  const navItems = [
    { id: "dashboard", icon: "◈", label: "Dashboard" },
    { id: "pos", icon: "☰", label: "Purchase Orders", badge: "3" },
    { id: "track", icon: "◎", label: "Track & Trace" },
    { id: "docs", icon: "◧", label: "Documents", badge: "2" },
    { id: "analytics", icon: "▤", label: "Analytics" },
  ];

  const handleNav = (id) => {
    setPage(id);
    if (!isWide) setMobileNav(false);
  };

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <DashboardPage kpi={kpi} pos={pos} />;
      case "pos": return <POsPage pos={pos} />;
      case "track": return <TrackTracePage />;
      case "docs": return <DocumentsPage />;
      case "analytics": return <AnalyticsPage />;
      default: return <DashboardPage kpi={kpi} pos={pos} />;
    }
  };

  const sidebarContent = (
    <>
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid " + T.border, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, " + T.gold + ", #E09800)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif", fontWeight: 800, color: T.bg, fontSize: 14, flexShrink: 0 }}>C</div>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800, color: T.gold, lineHeight: 1 }}>CLEAR</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: T.textDim, marginTop: 2 }}>ERP {VERSION}</div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
        {navItems.map(item => (
          <NavItem key={item.id} icon={item.icon} label={item.label} active={page === item.id} onClick={() => handleNav(item.id)} badge={item.badge} collapsed={false} />
        ))}
      </nav>
      <div style={{ padding: "16px 20px", borderTop: "1px solid " + T.border }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.goldDim, display: "flex", alignItems: "center", justifyContent: "center", color: T.gold, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13 }}>M</div>
          <div>
            <div style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>Maâdiou</div>
            <div style={{ fontSize: 10, color: T.textDim }}>CEO • LSCM Ltd</div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, fontFamily: "'DM Sans', sans-serif", color: T.text }}>
      {mobileNav && !isWide && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex" }}>
          <div onClick={() => setMobileNav(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
          <aside style={{ position: "relative", width: 260, background: T.surface, borderRight: "1px solid " + T.border, display: "flex", flexDirection: "column", zIndex: 101 }}>
            {sidebarContent}
          </aside>
        </div>
      )}
      {isWide && (
        <aside style={{ width: 240, background: T.surface, borderRight: "1px solid " + T.border, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          {sidebarContent}
        </aside>
      )}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header style={{ padding: "14px 20px", borderBottom: "1px solid " + T.border, display: "flex", alignItems: "center", justifyContent: "space-between", background: T.surface, flexShrink: 0, gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {!isWide && (
              <button onClick={() => setMobileNav(true)} style={{ background: "none", border: "none", color: T.textDim, fontSize: 22, cursor: "pointer", padding: 4 }}>☰</button>
            )}
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 700, color: T.text }}>
              {(navItems.find(n => n.id === page) || {}).label || "Dashboard"}
            </div>
            {demoMode ? (
              <span style={{ padding: "4px 10px", borderRadius: 20, background: T.orangeDim, color: T.orange, fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 600 }}>DEMO</span>
            ) : (
              <span style={{ padding: "4px 10px", borderRadius: 20, background: T.greenDim, color: T.green, fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green }} /> LIVE
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <select style={{ padding: "7px 12px", background: T.bg, border: "1px solid " + T.border, borderRadius: 8, color: T.text, fontFamily: "'DM Sans', sans-serif", fontSize: 12, outline: "none", cursor: "pointer" }}>
              <option>All Clients</option>
              <option>SNEPCO</option>
              <option>NAOC</option>
              <option>TotalEnergies</option>
            </select>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: T.textDim }}>
              {currentTime.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
          </div>
        </header>
        <div style={{ flex: 1, padding: isWide ? 24 : 16, overflowY: "auto" }}>
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
