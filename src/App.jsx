import { useState, useEffect, useMemo } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import {
  Plus, Package, AlertTriangle, Trash2, X, ChevronDown, ChevronUp,
  Truck, Clock, ArrowDownCircle, ArrowUpCircle, RotateCcw, User, History as HistoryIcon,
  Shield, LogIn, Pencil, Factory, UploadCloud, Layers, ShoppingCart, LayoutDashboard, TrendingUp,
  FlaskConical, CheckCircle2, XCircle, Download,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

const DARK_GREEN = "#155830";
const LIGHT_GREEN = "#59A249";

const BRANDS = {
  urbnfettch: {
    label: "Rubber Div",
    sub: "Anti-tack solutions · Rubber industry",
    accent: DARK_GREEN,
    accentDim: "#15583022",
  },
  homecare: {
    label: "Homecare",
    sub: "Handwash · Dishwash · Tile cleaner",
    accent: LIGHT_GREEN,
    accentDim: "#59A24922",
  },
};

const CATEGORIES = ["Raw material", "Packaging", "Finished good"];
const UNITS = ["g", "kg", "ml", "L", "units", "drums", "cartons"];
const LABOR_RATE = 0.15;
const CAN_RATES = { old: 3.5, new: 6 };
const GST_RATE = 0.18;

const USERS = [
  { name: "Satvik", pin: "8942", role: "boss", canViewCosting: true },
  { name: "SCPL", pin: "8941", role: "staff", canViewCosting: true },
  { name: "Vijay", pin: "2314", role: "staff", canViewCosting: false },
  { name: "Jyoti", pin: "3214", role: "staff", canViewCosting: false },
  { name: "Mohit", pin: "4213", role: "lab", canViewCosting: false },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    const out = {};
    for (const k in value) {
      const v = value[k];
      if (v !== undefined) out[k] = sanitize(v);
    }
    return out;
  }
  return value;
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + " · " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

// Builds a full, print-ready HTML document for a lab test — opened in a new
// tab so the user can "Print / Save as PDF" a professional-looking report.
function buildLabReportHTML(test, brandLabel) {
  const rows = test.parameters
    .map(
      (p) => `
        <tr>
          <td>${p.name}</td>
          <td class="num">${p.result}${p.unit || ""}</td>
          <td class="num">${p.specMin != null ? p.specMin : "–"} – ${p.specMax != null ? p.specMax : "–"}${p.unit || ""}</td>
          <td class="status ${p.pass ? "pass" : "fail"}">${p.pass ? "PASS" : "FAIL"}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Certificate of Analysis — ${test.testingNumber}</title>
<style>
  @page { margin: 24mm 18mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; margin: 0; padding: 40px; }
  .wordmark { font-family: Arial, sans-serif; font-weight: 800; font-size: 22px; letter-spacing: 0.5px; }
  .wordmark .a { color: #155830; }
  .wordmark .b { color: #59A249; }
  .tagline { font-family: Arial, sans-serif; font-size: 10px; color: #666; letter-spacing: 1px; margin-top: 2px; }
  .doc-title { font-family: Arial, sans-serif; font-size: 15px; font-weight: 700; letter-spacing: 2px; text-align: center; margin: 36px 0 4px; text-transform: uppercase; color: #155830; }
  .doc-sub { font-family: Arial, sans-serif; font-size: 11px; text-align: center; color: #888; margin-bottom: 32px; letter-spacing: 1px; }
  .rule { border: none; border-top: 2px solid #155830; margin: 0 0 24px; }
  .meta { width: 100%; border-collapse: collapse; margin-bottom: 28px; font-family: Arial, sans-serif; font-size: 12px; }
  .meta td { padding: 6px 0; }
  .meta td.label { color: #888; width: 140px; text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; }
  .meta td.value { font-weight: 600; color: #1a1a1a; }
  table.results { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; margin-bottom: 28px; }
  table.results th { text-align: left; background: #F3F5F4; padding: 10px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #555; border-bottom: 2px solid #155830; }
  table.results td { padding: 10px 12px; border-bottom: 1px solid #e5e5e5; }
  table.results td.num { font-family: 'Courier New', monospace; }
  table.results td.status { font-weight: 700; letter-spacing: 0.5px; }
  table.results td.status.pass { color: #2E9E5B; }
  table.results td.status.fail { color: #D1453B; }
  .overall { font-family: Arial, sans-serif; text-align: center; margin: 36px 0; }
  .overall .badge { display: inline-block; padding: 10px 32px; border-radius: 4px; font-weight: 800; letter-spacing: 3px; font-size: 16px; }
  .overall .badge.pass { background: #2E9E5B15; color: #2E9E5B; border: 2px solid #2E9E5B; }
  .overall .badge.fail { background: #D1453B15; color: #D1453B; border: 2px solid #D1453B; }
  .footer { margin-top: 60px; font-family: Arial, sans-serif; font-size: 10px; color: #999; display: flex; justify-content: space-between; border-top: 1px solid #eee; padding-top: 14px; }
  .sig { margin-top: 50px; display: flex; justify-content: space-between; font-family: Arial, sans-serif; font-size: 11px; }
  .sig div { width: 45%; }
  .sig .line { border-top: 1px solid #333; margin-top: 40px; padding-top: 6px; color: #666; font-size: 10px; }
  .print-bar { text-align: center; margin-bottom: 24px; }
  .print-bar button { font-family: Arial, sans-serif; background: #155830; color: #fff; border: none; padding: 10px 22px; border-radius: 6px; font-size: 13px; cursor: pointer; }
  @media print { .print-bar { display: none; } body { padding: 0; } }
</style>
</head>
<body>
  <div class="print-bar"><button onclick="window.print()">Print / Save as PDF</button></div>

  <div class="wordmark"><span class="a">URBN</span><span class="b">FETTCH</span></div>
  <div class="tagline">A UNIT OF SANIL CHEMICALS &nbsp;·&nbsp; ${brandLabel.toUpperCase()}</div>

  <hr class="rule" />

  <div class="doc-title">Certificate of Analysis</div>
  <div class="doc-sub">Laboratory Test Report</div>

  <table class="meta">
    <tr><td class="label">Testing No.</td><td class="value">${test.testingNumber}</td></tr>
    ${test.batchNumber ? `<tr><td class="label">Batch No.</td><td class="value">${test.batchNumber}</td></tr>` : ""}
    <tr><td class="label">Product / Sample</td><td class="value">${test.productName}</td></tr>
    <tr><td class="label">Date of Testing</td><td class="value">${test.date}</td></tr>
  </table>

  <table class="results">
    <thead>
      <tr><th>Test Parameter</th><th>Result</th><th>Specification</th><th>Status</th></tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="overall">
    <div class="badge ${test.overallPass ? "pass" : "fail"}">OVERALL RESULT: ${test.overallPass ? "PASS" : "FAIL"}</div>
  </div>

  <div class="sig">
    <div><div class="line">Tested By — ${test.by}</div></div>
    <div><div class="line">Authorized Signatory</div></div>
  </div>

  <div class="footer">
    <span>Generated ${fmtDate(new Date().toISOString())}</span>
    <span>System-generated report — URBNFETTCH Inventory Tracker</span>
  </div>
</body>
</html>`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function avgCostOf(item) {
  if (item.lots && item.lots.length > 0) {
    const totalQty = item.lots.reduce((s, l) => s + l.qty, 0);
    const totalCost = item.lots.reduce((s, l) => s + l.qty * l.price, 0);
    return totalQty > 0 ? totalCost / totalQty : 0;
  }
  return item.costPerUnit || 0;
}

function consumeLotsFIFO(lots, qtyNeeded) {
  let remaining = qtyNeeded;
  let cost = 0;
  const newLots = [];
  for (const lot of lots) {
    if (remaining <= 0) {
      newLots.push(lot);
      continue;
    }
    if (lot.qty <= remaining) {
      cost += lot.qty * lot.price;
      remaining -= lot.qty;
    } else {
      cost += remaining * lot.price;
      newLots.push({ ...lot, qty: lot.qty - remaining });
      remaining = 0;
    }
  }
  return { cost, remainingLots: newLots, shortfall: Math.max(0, remaining) };
}

function consumeMaterial(item, qtyNeeded) {
  if (item.lots && item.lots.length > 0) {
    const { cost, remainingLots, shortfall } = consumeLotsFIFO(item.lots, qtyNeeded);
    const consumedQty = qtyNeeded - shortfall;
    return {
      cost,
      newQty: Math.max(0, item.qty - consumedQty),
      newLots: remainingLots,
      unitCostUsed: consumedQty > 0 ? cost / consumedQty : 0,
    };
  }
  const cpu = item.costPerUnit || 0;
  return {
    cost: qtyNeeded * cpu,
    newQty: Math.max(0, item.qty - qtyNeeded),
    newLots: item.lots || [],
    unitCostUsed: cpu,
  };
}

function addStockInLot(item, qty, price) {
  if (item.category !== "Raw material") {
    return { qty: item.qty + qty, lots: item.lots || null };
  }
  let lots = item.lots ? [...item.lots] : [];
  if (price) {
    lots.push({ id: uid(), qty, price: Number(price), date: new Date().toISOString() });
  } else if (lots.length > 0) {
    const last = { ...lots[lots.length - 1] };
    last.qty += qty;
    lots[lots.length - 1] = last;
  } else {
    lots.push({ id: uid(), qty, price: 0, date: new Date().toISOString() });
  }
  const newQty = lots.reduce((s, l) => s + l.qty, 0);
  return { qty: newQty, lots };
}

function Wordmark({ size = "text-lg" }) {
  return (
    <span className={`font-bold tracking-tight ${size}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      <span style={{ color: DARK_GREEN }}>URBN</span><span style={{ color: LIGHT_GREEN }}>FETTCH</span>
    </span>
  );
}

function useInventory(brand) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const ref = doc(db, "inventory", brand);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setItems(snap.exists() ? snap.data().items || [] : []);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore read failed", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [brand]);

  const save = async (next) => {
    setItems(next);
    try {
      await setDoc(doc(db, "inventory", brand), { items: sanitize(next) });
    } catch (e) {
      console.error("Failed to save inventory", e);
    }
  };

  return { items, save, loading };
}

function useSharedInventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const ref = doc(db, "inventory", "shared");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setItems(snap.exists() ? snap.data().items || [] : []);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore read failed", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const save = async (next) => {
    setItems(next);
    try {
      await setDoc(doc(db, "inventory", "shared"), { items: sanitize(next) });
    } catch (e) {
      console.error("Failed to save shared inventory", e);
    }
  };

  return { items, save, loading };
}

function useProduction(brand) {
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    const ref = doc(db, "production", brand);
    const unsub = onSnapshot(ref, (snap) => {
      setBatches(snap.exists() ? snap.data().batches || [] : []);
    });
    return () => unsub();
  }, [brand]);

  const save = async (next) => {
    setBatches(next);
    try {
      await setDoc(doc(db, "production", brand), { batches: sanitize(next) });
    } catch (e) {
      console.error("Failed to save production log", e);
    }
  };

  return { batches, save };
}

function useSales(brand) {
  const [sales, setSales] = useState([]);

  useEffect(() => {
    const ref = doc(db, "sales", brand);
    const unsub = onSnapshot(ref, (snap) => {
      setSales(snap.exists() ? snap.data().sales || [] : []);
    });
    return () => unsub();
  }, [brand]);

  const save = async (next) => {
    setSales(next);
    try {
      await setDoc(doc(db, "sales", brand), { sales: sanitize(next) });
    } catch (e) {
      console.error("Failed to save sales log", e);
    }
  };

  return { sales, save };
}

function useLab(brand) {
  const [tests, setTests] = useState([]);

  useEffect(() => {
    const ref = doc(db, "lab", brand);
    const unsub = onSnapshot(ref, (snap) => {
      setTests(snap.exists() ? snap.data().tests || [] : []);
    });
    return () => unsub();
  }, [brand]);

  const save = async (next) => {
    setTests(next);
    try {
      await setDoc(doc(db, "lab", brand), { tests: sanitize(next) });
    } catch (e) {
      console.error("Failed to save lab log", e);
    }
  };

  return { tests, save };
}

function useLoginLog() {
  const [logins, setLogins] = useState([]);

  useEffect(() => {
    const ref = doc(db, "activity", "logins");
    const unsub = onSnapshot(ref, (snap) => {
      setLogins(snap.exists() ? snap.data().entries || [] : []);
    });
    return () => unsub();
  }, []);

  const record = async (name, role) => {
    const entry = { id: uid(), name, role, date: new Date().toISOString() };
    const next = [entry, ...logins].slice(0, 200);
    setLogins(next);
    try {
      await setDoc(doc(db, "activity", "logins"), { entries: next });
    } catch (e) {
      console.error("Failed to log login", e);
    }
  };

  return { logins, record };
}

function useSession() {
  const [session, setSession] = useState(() => {
    try {
      const raw = localStorage.getItem("my-session");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const save = (s) => {
    try {
      if (s === null) localStorage.removeItem("my-session");
      else localStorage.setItem("my-session", JSON.stringify(s));
    } catch {
      /* ignore */
    }
    setSession(s);
  };

  return { session, save };
}

function GaugeDot({ pct, accent, size = 36 }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(100, pct)) / 100 * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#00000014" strokeWidth="4" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={accent} strokeWidth="4"
        strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

const inputCls =
  "w-full bg-white text-sm text-zinc-900 rounded-lg px-3 py-2 outline-none border border-zinc-200 focus:border-zinc-400 placeholder:text-zinc-400";

function PinGate({ onLogin }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    const user = USERS.find((u) => u.pin === pin.trim());
    if (!user) {
      setError("PIN not recognized. Try again.");
      setPin("");
      return;
    }
    onLogin(user);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6" style={{ background: "#ffffff", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="w-full max-w-xs text-center">
        <div className="mb-4"><Wordmark size="text-2xl" /></div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif" }} className="text-lg font-bold text-zinc-900 mb-1">Enter your PIN</h1>
        <p className="text-xs text-zinc-500 mb-4">Your PIN identifies you — every entry you make gets tagged with your name automatically.</p>
        <input
          autoFocus
          placeholder="4-digit PIN"
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => { setPin(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className={inputCls + " text-center tracking-[0.3em] text-lg"}
          maxLength={6}
        />
        {error && <p className="text-xs mt-2" style={{ color: "#E2574C" }}>{error}</p>}
        <button
          onClick={submit}
          className="mt-3 w-full rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-1.5"
          style={{ background: DARK_GREEN, color: "#ffffff" }}
        >
          <LogIn size={14} /> Continue
        </button>
      </div>
    </div>
  );
}

function ItemForm({ accent, name, canViewCosting, onAdd, onClose }) {
  const [nm, setNm] = useState("");
  const [category, setCategory] = useState("Raw material");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("kg");
  const [threshold, setThreshold] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [leadTime, setLeadTime] = useState("");
  const [shared, setShared] = useState(false);
  const [costPerUnit, setCostPerUnit] = useState("");

  const submit = () => {
    if (!nm.trim() || !qty || !threshold) return;
    const q = Number(qty);
    const isRaw = category === "Raw material";
    const price = costPerUnit ? Number(costPerUnit) : 0;
    onAdd({
      id: uid(),
      name: nm.trim(),
      category,
      qty: q,
      unit,
      threshold: Number(threshold),
      shared,
      costPerUnit: price,
      lots: isRaw && price ? [{ id: uid(), qty: q, price, date: new Date().toISOString() }] : null,
      supplier: {
        name: supplierName.trim(),
        contact: supplierContact.trim(),
        leadTime: leadTime ? Number(leadTime) : null,
      },
      history: [
        { id: uid(), type: "in", qty: q, date: new Date().toISOString(), note: "Initial stock", by: name },
      ],
    });
    onClose();
  };

  return (
    <div className="rounded-xl p-4 mb-3" style={{ background: "#F3F5F4", border: "1px solid #00000012" }}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-semibold tracking-wide" style={{ color: accent }}>NEW ITEM</span>
        <button onClick={onClose} aria-label="Close form"><X size={16} className="text-zinc-400" /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2"><input placeholder="Item name" value={nm} onChange={(e) => setNm(e.target.value)} className={inputCls} /></div>
        <div className="col-span-2">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <input placeholder="Current qty" type="number" value={qty} onChange={(e) => setQty(e.target.value)} className={inputCls} />
        <select value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls}>
          {UNITS.map((u) => <option key={u}>{u}</option>)}
        </select>
        <div className="col-span-2"><input placeholder="Reorder below" type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} className={inputCls} /></div>

        {canViewCosting && (
          <div className="col-span-2">
            <input placeholder="Price for this stock (₹ per unit)" type="number" value={costPerUnit} onChange={(e) => setCostPerUnit(e.target.value)} className={inputCls} />
            {category === "Raw material" && (
              <p className="text-[10px] text-zinc-400 mt-1">This becomes the first lot. Future stock-ins at a different price add a new lot, consumed oldest-first.</p>
            )}
          </div>
        )}

        <label className="col-span-2 flex items-center gap-2 text-xs text-zinc-600 mt-1">
          <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} className="w-3.5 h-3.5" />
          Shared material — same stock used by both Rubber Div and Homecare
        </label>

        <div className="col-span-2 text-[10px] uppercase tracking-wide text-zinc-400 mb-1 mt-1">Supplier (optional)</div>
        <div className="col-span-2"><input placeholder="Supplier name" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className={inputCls} /></div>
        <input placeholder="Phone / email" value={supplierContact} onChange={(e) => setSupplierContact(e.target.value)} className={inputCls} />
        <input placeholder="Lead time (days)" type="number" value={leadTime} onChange={(e) => setLeadTime(e.target.value)} className={inputCls} />
      </div>
      <button onClick={submit} className="mt-3 w-full rounded-lg py-2 text-sm font-semibold" style={{ background: accent, color: "#ffffff" }}>
        Add item
      </button>
    </div>
  );
}

function EditItemForm({ accent, item, canViewCosting, onSave, onClose }) {
  const [nm, setNm] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [unit, setUnit] = useState(item.unit);
  const [threshold, setThreshold] = useState(String(item.threshold));
  const [supplierName, setSupplierName] = useState(item.supplier?.name || "");
  const [supplierContact, setSupplierContact] = useState(item.supplier?.contact || "");
  const [leadTime, setLeadTime] = useState(item.supplier?.leadTime != null ? String(item.supplier.leadTime) : "");
  const [shared, setShared] = useState(!!item.shared);
  const [costPerUnit, setCostPerUnit] = useState(item.costPerUnit != null ? String(item.costPerUnit) : "");
  const [lots, setLots] = useState(item.lots ? item.lots.map((l) => ({ ...l })) : []);
  const [newLotQty, setNewLotQty] = useState("");
  const [newLotPrice, setNewLotPrice] = useState("");

  const showLots = canViewCosting && category === "Raw material";

  const addLot = () => {
    if (!newLotQty || !newLotPrice) return;
    setLots([...lots, { id: uid(), qty: Number(newLotQty), price: Number(newLotPrice), date: new Date().toISOString() }]);
    setNewLotQty("");
    setNewLotPrice("");
  };
  const removeLot = (id) => setLots(lots.filter((l) => l.id !== id));
  const updateLot = (id, patch) => setLots(lots.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const submit = () => {
    if (!nm.trim() || !threshold) return;
    const usingLots = showLots && lots.length > 0;
    const totalLotQty = lots.reduce((s, l) => s + Number(l.qty || 0), 0);
    onSave({
      ...item,
      name: nm.trim(),
      category,
      unit,
      threshold: Number(threshold),
      shared,
      qty: usingLots ? totalLotQty : item.qty,
      costPerUnit: costPerUnit ? Number(costPerUnit) : item.costPerUnit || 0,
      lots: showLots ? lots.map((l) => ({ ...l, qty: Number(l.qty), price: Number(l.price) })) : (item.lots || null),
      supplier: {
        name: supplierName.trim(),
        contact: supplierContact.trim(),
        leadTime: leadTime ? Number(leadTime) : null,
      },
    });
    onClose();
  };

  return (
    <div className="rounded-xl p-4 mt-3" style={{ background: "#F3F5F4", border: "1px solid #00000012" }}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-semibold tracking-wide" style={{ color: accent }}>EDIT ITEM</span>
        <button onClick={onClose} aria-label="Close form"><X size={16} className="text-zinc-400" /></button>
      </div>
      <p className="text-[10px] text-zinc-500 mb-2">History is untouched — this edits item details{showLots ? " and lots" : ""}.</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2"><input placeholder="Item name" value={nm} onChange={(e) => setNm(e.target.value)} className={inputCls} /></div>
        <div className="col-span-2">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <select value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls}>
          {UNITS.map((u) => <option key={u}>{u}</option>)}
        </select>
        <input placeholder="Reorder below" type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} className={inputCls} />

        {!showLots && canViewCosting && (
          <div className="col-span-2"><input placeholder="Cost per unit (₹)" type="number" value={costPerUnit} onChange={(e) => setCostPerUnit(e.target.value)} className={inputCls} /></div>
        )}

        <label className="col-span-2 flex items-center gap-2 text-xs text-zinc-600 mt-1">
          <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} className="w-3.5 h-3.5" />
          Shared material — same stock used by both Rubber Div and Homecare
        </label>

        <div className="col-span-2 text-[10px] uppercase tracking-wide text-zinc-400 mb-1 mt-1">Supplier (optional)</div>
        <div className="col-span-2"><input placeholder="Supplier name" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className={inputCls} /></div>
        <input placeholder="Phone / email" value={supplierContact} onChange={(e) => setSupplierContact(e.target.value)} className={inputCls} />
        <input placeholder="Lead time (days)" type="number" value={leadTime} onChange={(e) => setLeadTime(e.target.value)} className={inputCls} />
      </div>

      {showLots && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1.5">
            Lots (oldest at top — consumed first) · Total: {lots.reduce((s, l) => s + Number(l.qty || 0), 0)}{unit}
          </div>
          <div className="space-y-1.5">
            {lots.map((l) => (
              <div key={l.id} className="flex gap-2 items-center">
                <input
                  type="number" value={l.qty}
                  onChange={(e) => updateLot(l.id, { qty: e.target.value })}
                  className={inputCls} placeholder="Qty"
                />
                <input
                  type="number" value={l.price}
                  onChange={(e) => updateLot(l.id, { price: e.target.value })}
                  className={inputCls} placeholder="₹/unit"
                />
                <button onClick={() => removeLot(l.id)} aria-label="Remove lot" className="shrink-0">
                  <X size={16} className="text-zinc-400" />
                </button>
              </div>
            ))}
            {lots.length === 0 && (
              <p className="text-xs text-zinc-500">No lots set up yet — add your current stock below, oldest first.</p>
            )}
          </div>
          <div className="flex gap-2 mt-2">
            <input placeholder="Qty" type="number" value={newLotQty} onChange={(e) => setNewLotQty(e.target.value)} className={inputCls} />
            <input placeholder="₹/unit" type="number" value={newLotPrice} onChange={(e) => setNewLotPrice(e.target.value)} className={inputCls} />
            <button onClick={addLot} className="px-3 rounded-lg text-xs font-semibold shrink-0" style={{ background: accent, color: "#ffffff" }}>
              Add lot
            </button>
          </div>
        </div>
      )}

      <button onClick={submit} className="mt-3 w-full rounded-lg py-2 text-sm font-semibold" style={{ background: accent, color: "#ffffff" }}>
        Save changes
      </button>
    </div>
  );
}

function MovementRow({ h, showItem, canViewCosting }) {
  const icon = h.type === "in" ? ArrowDownCircle : h.type === "out" ? ArrowUpCircle : Truck;
  const color = h.type === "in" ? "#2E9E5B" : h.type === "out" ? "#D1453B" : "#3E8E86";
  const Icon = icon;
  return (
    <div className="flex items-center gap-2 py-1.5">
      <Icon size={13} style={{ color }} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-zinc-600 truncate">
          {showItem && <span className="text-zinc-800 font-medium">{showItem} · </span>}
          {h.note || h.type}
          {canViewCosting && h.priceNote ? ` · ${h.priceNote}` : ""}
        </div>
        <div className="text-[10px] text-zinc-400 flex items-center gap-1">
          <User size={9} /> {h.by || "Unknown"} · {fmtDate(h.date)}
        </div>
      </div>
      <span className="mono-font text-xs shrink-0" style={{ color }}>
        {h.type === "out" ? "−" : "+"}{h.qty}
      </span>
    </div>
  );
}

function ItemCard({ item, accent, name, isBoss, canViewCosting, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  const [moveQty, setMoveQty] = useState("");
  const [lotPrice, setLotPrice] = useState("");
  const [editing, setEditing] = useState(false);
  const low = item.qty <= item.threshold;
  const pct = item.threshold > 0 ? Math.min(100, (item.qty / (item.threshold * 2)) * 100) : 100;
  const isRawWithLots = item.category === "Raw material" && item.lots && item.lots.length > 0;

  const move = (type) => {
    const q = Number(moveQty);
    if (!q || q <= 0) return;

    if (type === "in") {
      const { qty: newQty, lots: newLots } = addStockInLot(item, q, canViewCosting ? lotPrice : "");
      const priceNote = canViewCosting && lotPrice ? `₹${lotPrice}/${item.unit} (new lot)` : null;
      onUpdate({
        ...item,
        qty: newQty,
        lots: newLots,
        costPerUnit: newLots ? avgCostOf({ ...item, lots: newLots }) : (item.costPerUnit || 0),
        history: [{ id: uid(), type, qty: q, date: new Date().toISOString(), note: "Stock in", priceNote, by: name }, ...item.history],
      });
    } else {
      const { newQty, newLots, unitCostUsed } = consumeMaterial(item, q);
      const priceNote = canViewCosting && unitCostUsed ? `₹${unitCostUsed.toFixed(2)}/${item.unit} (FIFO)` : null;
      onUpdate({
        ...item,
        qty: newQty,
        lots: newLots,
        history: [{ id: uid(), type, qty: q, date: new Date().toISOString(), note: "Stock out", priceNote, by: name }, ...item.history],
      });
    }
    setMoveQty("");
    setLotPrice("");
    setActiveAction(null);
  };

  const logReorder = () => {
    const q = Number(moveQty);
    if (!q || q <= 0) return;
    onUpdate({
      ...item,
      history: [
        { id: uid(), type: "reorder", qty: q, date: new Date().toISOString(), note: `Ordered from ${item.supplier?.name || "supplier"}`, by: name },
        ...item.history,
      ],
    });
    setMoveQty("");
    setActiveAction(null);
  };

  const toggleAction = (action) => {
    if (activeAction === action) {
      setActiveAction(null);
      setMoveQty("");
      setLotPrice("");
    } else {
      setActiveAction(action);
      setMoveQty("");
      setLotPrice("");
    }
  };

  const avg = avgCostOf(item);

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: `1px solid ${low ? "#D1453B55" : "#00000014"}` }}>
      <button className="w-full px-3.5 py-3 flex items-center gap-3 text-left" onClick={() => setOpen(!open)}>
        <GaugeDot pct={pct} accent={low ? "#D1453B" : accent} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-zinc-900 truncate">{item.name}</div>
          <div className="text-xs text-zinc-500 mt-0.5 truncate flex items-center gap-1">
            {item.category}{item.supplier?.name ? ` · ${item.supplier.name}` : ""}
            {item.shared && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "#3E8E8618", color: "#3E8E86" }}>SHARED</span>
            )}
            {canViewCosting && avg > 0 && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "#15583014", color: DARK_GREEN }}>
                ₹{avg.toFixed(2)}/{item.unit}{isRawWithLots ? ` · ${item.lots.length} lot${item.lots.length > 1 ? "s" : ""}` : ""}
              </span>
            )}
          </div>
        </div>
        <span className="mono-font text-xs shrink-0" style={{ color: low ? "#D1453B" : "#27292E" }}>
          {item.qty}{item.unit}
        </span>
        {open ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
      </button>

      {open && (
        <div className="px-3.5 pb-3.5" style={{ borderTop: "1px solid #00000010" }}>
          {low && (
            <div className="flex items-center gap-1.5 mt-3 mb-1 text-[11px]" style={{ color: "#D1453B" }}>
              <AlertTriangle size={11} /> Below reorder point ({item.threshold}{item.unit})
            </div>
          )}

          {item.supplier?.name && (
            <div className="mt-3 rounded-lg px-3 py-2 text-xs text-zinc-600" style={{ background: "#F7F8F7" }}>
              <div className="flex items-center gap-1.5 text-zinc-800 font-medium"><Truck size={12} /> {item.supplier.name}</div>
              {item.supplier.contact && <div className="mt-0.5">{item.supplier.contact}</div>}
              {item.supplier.leadTime != null && <div className="mt-0.5 flex items-center gap-1"><Clock size={11} /> {item.supplier.leadTime} day lead time</div>}
            </div>
          )}

          {canViewCosting && isRawWithLots && (
            <div className="mt-3 rounded-lg px-3 py-2" style={{ background: "#F7F8F7" }}>
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-zinc-400 mb-1.5"><Layers size={11} /> Lots (oldest first)</div>
              <div className="space-y-1">
                {item.lots.map((l) => (
                  <div key={l.id} className="flex justify-between text-xs text-zinc-600">
                    <span>{l.qty}{item.unit}</span>
                    <span className="mono-font">₹{l.price}/{item.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button onClick={() => toggleAction("in")} className="flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium" style={{ background: activeAction === "in" ? "#2E9E5B2a" : "#2E9E5B15", color: "#2E9E5B" }}>
              <ArrowDownCircle size={13} /> Stock in
            </button>
            <button onClick={() => toggleAction("out")} className="flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium" style={{ background: activeAction === "out" ? "#D1453B2a" : "#D1453B15", color: "#D1453B" }}>
              <ArrowUpCircle size={13} /> Stock out
            </button>
            <button onClick={() => toggleAction("reorder")} className="flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium" style={{ background: activeAction === "reorder" ? "#3E8E862a" : "#3E8E8615", color: "#3E8E86" }}>
              <RotateCcw size={13} /> Reorder
            </button>
          </div>

          {activeAction && (
            <div className="mt-2 space-y-2">
              <div className="flex gap-2">
                <input
                  autoFocus
                  placeholder={`Qty in ${item.unit}`}
                  type="number"
                  inputMode="decimal"
                  value={moveQty}
                  onChange={(e) => setMoveQty(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !(activeAction === "in" && canViewCosting && item.category === "Raw material")) {
                      if (activeAction === "reorder") logReorder();
                      else move(activeAction);
                    }
                  }}
                  className={inputCls}
                />
                <button
                  onClick={() => (activeAction === "reorder" ? logReorder() : move(activeAction))}
                  className="px-4 rounded-lg text-xs font-semibold shrink-0"
                  style={{ background: accent, color: "#ffffff" }}
                >
                  Confirm
                </button>
              </div>
              {activeAction === "in" && canViewCosting && item.category === "Raw material" && (
                <input
                  placeholder={`Price for this lot, ₹/${item.unit} (blank = adds to most recent lot)`}
                  type="number"
                  inputMode="decimal"
                  value={lotPrice}
                  onChange={(e) => setLotPrice(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && move("in")}
                  className={inputCls}
                />
              )}
            </div>
          )}

          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1">History</div>
            {item.history.length === 0 ? (
              <div className="text-xs text-zinc-400 py-1">No movements yet.</div>
            ) : (
              item.history.slice(0, 8).map((h) => <MovementRow key={h.id} h={h} canViewCosting={canViewCosting} />)
            )}
          </div>

          {isBoss && !editing && (
            <div className="mt-3 flex items-center gap-4">
              <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Pencil size={12} /> Edit item
              </button>
              <button onClick={() => onDelete(item.id)} className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Trash2 size={12} /> Remove item
              </button>
            </div>
          )}

          {isBoss && editing && (
            <EditItemForm
              accent={accent}
              item={item}
              canViewCosting={canViewCosting}
              onClose={() => setEditing(false)}
              onSave={(updated) => onUpdate(updated)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function BulkImportForm({ accent, name, onImport, onClose }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);

  const submit = () => {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const newItems = [];
    let skipped = 0;

    for (const line of lines) {
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length < 5) { skipped++; continue; }
      const [nm, category, qtyStr, unit, thresholdStr] = parts;
      const qty = Number(qtyStr);
      const threshold = Number(thresholdStr);
      if (!nm || !CATEGORIES.includes(category) || isNaN(qty) || isNaN(threshold)) { skipped++; continue; }
      newItems.push({
        id: uid(),
        name: nm,
        category,
        qty,
        unit: unit || "kg",
        threshold,
        supplier: { name: "", contact: "", leadTime: null },
        history: [
          { id: uid(), type: "in", qty, date: new Date().toISOString(), note: "Bulk import", by: name },
        ],
      });
    }

    if (newItems.length > 0) onImport(newItems);
    setResult({ added: newItems.length, skipped });
  };

  return (
    <div className="rounded-xl p-4 mb-3" style={{ background: "#F3F5F4", border: "1px solid #00000012" }}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-semibold tracking-wide" style={{ color: accent }}>BULK IMPORT ITEMS</span>
        <button onClick={onClose} aria-label="Close form"><X size={16} className="text-zinc-400" /></button>
      </div>
      <p className="text-[10px] text-zinc-500 mb-2">
        One item per line: <span className="text-zinc-600">Name, Category, Qty, Unit, Reorder threshold</span><br />
        Category must be exactly: Raw material / Packaging / Finished good. Bulk-imported items don't get lot tracking — add lots later via Edit item if you want FIFO costing on them.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"SLURRY, Raw material, 3026, kg, 700\nUREA, Raw material, 2168, kg, 700"}
        rows={8}
        className={inputCls + " font-mono text-xs resize-none"}
      />
      {result && (
        <p className="text-xs mt-2" style={{ color: result.added > 0 ? "#2E9E5B" : "#D1453B" }}>
          Added {result.added} item{result.added !== 1 ? "s" : ""}{result.skipped > 0 ? `, skipped ${result.skipped} (bad format)` : ""}.
        </p>
      )}
      <button onClick={submit} className="mt-3 w-full rounded-lg py-2 text-sm font-semibold" style={{ background: accent, color: "#ffffff" }}>
        Import items
      </button>
    </div>
  );
}

function ProductionForm({ accent, name, rawMaterials, onSubmit, onClose }) {
  const [productName, setProductName] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [date, setDate] = useState(todayStr());
  const [machineNumber, setMachineNumber] = useState("");
  const [outputQty, setOutputQty] = useState("");
  const [outputUnit, setOutputUnit] = useState("kg");
  const [canUsed, setCanUsed] = useState("none");
  const [rows, setRows] = useState([{ id: uid(), itemId: "", qty: "" }]);

  const addRow = () => setRows([...rows, { id: uid(), itemId: "", qty: "" }]);
  const removeRow = (id) => setRows(rows.filter((r) => r.id !== id));
  const updateRow = (id, patch) => setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const submit = () => {
    if (!productName.trim() || !batchNumber.trim() || !outputQty) return;
    const materials = rows
      .filter((r) => r.itemId && r.qty)
      .map((r) => {
        const item = rawMaterials.find((m) => m.id === r.itemId);
        return item ? { itemId: item.id, itemName: item.name, qty: Number(r.qty), unit: item.unit } : null;
      })
      .filter(Boolean);
    if (materials.length === 0) return;

    onSubmit({
      id: uid(),
      productName: productName.trim(),
      batchNumber: batchNumber.trim(),
      date,
      machineNumber: machineNumber.trim(),
      outputQty: Number(outputQty),
      outputUnit,
      materials,
      canUsed,
      by: name,
      createdAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="rounded-xl p-4 mb-3" style={{ background: "#F3F5F4", border: "1px solid #00000012" }}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-semibold tracking-wide" style={{ color: accent }}>NEW PRODUCTION BATCH</span>
        <button onClick={onClose} aria-label="Close form"><X size={16} className="text-zinc-400" /></button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2"><input placeholder="Product name" value={productName} onChange={(e) => setProductName(e.target.value)} className={inputCls} /></div>
        <input placeholder="Batch number" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} className={inputCls} />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        <input placeholder="Machine number" value={machineNumber} onChange={(e) => setMachineNumber(e.target.value)} className={inputCls} />
        <div className="flex gap-2">
          <input placeholder="Output qty" type="number" value={outputQty} onChange={(e) => setOutputQty(e.target.value)} className={inputCls} />
          <select value={outputUnit} onChange={(e) => setOutputUnit(e.target.value)} className={inputCls} style={{ maxWidth: "5.5rem" }}>
            {UNITS.map((u) => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <select value={canUsed} onChange={(e) => setCanUsed(e.target.value)} className={inputCls}>
            <option value="none">No can / not applicable</option>
            <option value="old">Old can (₹{CAN_RATES.old}/kg)</option>
            <option value="new">New can (₹{CAN_RATES.new}/kg)</option>
          </select>
        </div>
      </div>

      <div className="mt-3">
        <div className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1.5">Raw materials used</div>
        {rawMaterials.length === 0 && (
          <p className="text-xs text-zinc-500 mb-2">No raw materials tracked yet for this brand — add some in the Items tab first.</p>
        )}
        <div className="space-y-2">
          {rows.map((row) => {
            const selected = rawMaterials.find((m) => m.id === row.itemId);
            return (
              <div key={row.id} className="flex gap-2">
                <select
                  value={row.itemId}
                  onChange={(e) => updateRow(row.id, { itemId: e.target.value })}
                  className={inputCls + " flex-1"}
                >
                  <option value="">Select material…</option>
                  {rawMaterials.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.qty}{m.unit} available)</option>
                  ))}
                </select>
                <input
                  placeholder={selected ? selected.unit : "qty"}
                  type="number"
                  value={row.qty}
                  onChange={(e) => updateRow(row.id, { qty: e.target.value })}
                  className={inputCls}
                  style={{ maxWidth: "5.5rem" }}
                />
                {rows.length > 1 && (
                  <button onClick={() => removeRow(row.id)} aria-label="Remove row" className="shrink-0">
                    <X size={16} className="text-zinc-400" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <button onClick={addRow} className="mt-2 text-xs flex items-center gap-1" style={{ color: accent }}>
          <Plus size={12} /> Add material
        </button>
      </div>

      <button onClick={submit} className="mt-4 w-full rounded-lg py-2 text-sm font-semibold" style={{ background: accent, color: "#ffffff" }}>
        Log production &amp; update stock
      </button>
    </div>
  );
}

function ProductionCard({ batch, accent, isBoss, canViewCosting, onDelete }) {
  const [open, setOpen] = useState(false);
  const c = batch.costing || {};
  const materialCost = c.materialCost || 0;
  const laborCost = c.laborCost || 0;
  const canCost = c.canCost || 0;
  const totalCost = c.totalCost || (materialCost + laborCost + canCost);
  const costPerKg = c.costPerKg || (batch.outputQty > 0 ? totalCost / batch.outputQty : 0);
  const gstAmount = c.gstAmount != null ? c.gstAmount : totalCost * GST_RATE;
  const costPerKgWithGst = c.costPerKgWithGst != null
    ? c.costPerKgWithGst
    : (batch.outputQty > 0 ? (totalCost + gstAmount) / batch.outputQty : 0);

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #00000014" }}>
      <button className="w-full px-3.5 py-3 flex items-center gap-3 text-left" onClick={() => setOpen(!open)}>
        <Factory size={18} style={{ color: accent }} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-zinc-900 truncate">{batch.productName}</div>
          <div className="text-xs text-zinc-500 mt-0.5 truncate">
            Batch {batch.batchNumber} · {batch.date}{batch.machineNumber ? ` · Machine ${batch.machineNumber}` : ""}
          </div>
        </div>
        <span className="mono-font text-xs shrink-0 text-zinc-700">+{batch.outputQty}{batch.outputUnit}</span>
        {open ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
      </button>
      {open && (
        <div className="px-3.5 pb-3.5" style={{ borderTop: "1px solid #00000010" }}>
          <div className="mt-3 text-[10px] uppercase tracking-wide text-zinc-400 mb-1">Materials consumed</div>
          <div className="space-y-1">
            {(batch.materials || []).map((m, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-zinc-600">
                  {m.itemName}
                  {canViewCosting && m.unitCostUsed != null && (
                    <span className="text-zinc-400"> (₹{m.unitCostUsed.toFixed(2)}/{m.unit})</span>
                  )}
                </span>
                <span className="mono-font" style={{ color: "#D1453B" }}>−{m.qty}{m.unit}</span>
              </div>
            ))}
          </div>

          {canViewCosting && (
            <div className="mt-3 rounded-lg px-3 py-2.5" style={{ background: "#F7F8F7" }}>
              <div className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1.5">Costing</div>
              <div className="space-y-1 text-xs text-zinc-600">
                <div className="flex justify-between"><span>Material cost (FIFO)</span><span className="mono-font">₹{materialCost.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Labor (15%)</span><span className="mono-font">₹{laborCost.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Can / packaging</span><span className="mono-font">₹{canCost.toFixed(2)}</span></div>
                <div className="flex justify-between font-semibold text-zinc-800 pt-1" style={{ borderTop: "1px solid #00000010" }}>
                  <span>Total cost</span><span className="mono-font">₹{totalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Cost / {batch.outputUnit}</span><span className="mono-font">₹{costPerKg.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-1" style={{ borderTop: "1px solid #00000010" }}>
                  <span>GST (18%)</span><span className="mono-font">₹{gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold" style={{ color: accent }}>
                  <span>Cost / {batch.outputUnit} incl. GST</span><span className="mono-font">₹{costPerKgWithGst.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-3">
            <User size={9} /> Logged by {batch.by} · {fmtDate(batch.createdAt)}
          </div>
          {isBoss && (
            <button onClick={() => onDelete(batch.id)} className="mt-3 flex items-center gap-1.5 text-xs text-zinc-400">
              <Trash2 size={12} /> Remove log entry (stock changes stay as-is)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SalesForm({ accent, name, finishedGoods, onSubmit, onClose }) {
  const [customerName, setCustomerName] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [date, setDate] = useState(todayStr());

  const submit = () => {
    const product = finishedGoods.find((p) => p.id === productId);
    if (!customerName.trim() || !product || !qty || !pricePerUnit) return;
    const q = Number(qty);
    const price = Number(pricePerUnit);
    onSubmit({
      id: uid(),
      customerName: customerName.trim(),
      productId: product.id,
      productName: product.name,
      qty: q,
      unit: product.unit,
      pricePerUnit: price,
      totalAmount: q * price,
      date,
      by: name,
      createdAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="rounded-xl p-4 mb-3" style={{ background: "#F3F5F4", border: "1px solid #00000012" }}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-semibold tracking-wide" style={{ color: accent }}>NEW SALE</span>
        <button onClick={onClose} aria-label="Close form"><X size={16} className="text-zinc-400" /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2"><input placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputCls} /></div>
        <div className="col-span-2">
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className={inputCls}>
            <option value="">Select product…</option>
            {finishedGoods.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.qty}{p.unit} available)</option>
            ))}
          </select>
        </div>
        {finishedGoods.length === 0 && (
          <p className="col-span-2 text-xs text-zinc-500">No finished goods yet — log a production batch first.</p>
        )}
        <input placeholder="Qty sold" type="number" value={qty} onChange={(e) => setQty(e.target.value)} className={inputCls} />
        <input placeholder="Price per unit (₹)" type="number" value={pricePerUnit} onChange={(e) => setPricePerUnit(e.target.value)} className={inputCls} />
        <div className="col-span-2"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></div>
      </div>
      <button onClick={submit} className="mt-3 w-full rounded-lg py-2 text-sm font-semibold" style={{ background: accent, color: "#ffffff" }}>
        Log sale &amp; deduct stock
      </button>
    </div>
  );
}

function SalesCard({ sale, accent, isBoss, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #00000014" }}>
      <button className="w-full px-3.5 py-3 flex items-center gap-3 text-left" onClick={() => setOpen(!open)}>
        <ShoppingCart size={18} style={{ color: accent }} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-zinc-900 truncate">{sale.customerName}</div>
          <div className="text-xs text-zinc-500 mt-0.5 truncate">{sale.productName} · {sale.qty}{sale.unit} · {sale.date}</div>
        </div>
        <span className="mono-font text-xs shrink-0 text-zinc-700">₹{sale.totalAmount.toFixed(0)}</span>
        {open ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
      </button>
      {open && (
        <div className="px-3.5 pb-3.5" style={{ borderTop: "1px solid #00000010" }}>
          <div className="mt-3 space-y-1 text-xs text-zinc-600">
            <div className="flex justify-between"><span>Price per {sale.unit}</span><span className="mono-font">₹{sale.pricePerUnit}</span></div>
            <div className="flex justify-between"><span>Quantity</span><span className="mono-font">{sale.qty}{sale.unit}</span></div>
            <div className="flex justify-between font-semibold text-zinc-800 pt-1" style={{ borderTop: "1px solid #00000010" }}>
              <span>Total</span><span className="mono-font">₹{sale.totalAmount.toFixed(2)}</span>
            </div>
          </div>
          <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-3">
            <User size={9} /> Logged by {sale.by} · {fmtDate(sale.createdAt)}
          </div>
          {isBoss && (
            <button onClick={() => onDelete(sale.id)} className="mt-3 flex items-center gap-1.5 text-xs text-zinc-400">
              <Trash2 size={12} /> Remove log entry (stock changes stay as-is)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function LabForm({ accent, name, onSubmit, onClose, hideClose }) {
  const [testingNumber, setTestingNumber] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [productName, setProductName] = useState("");
  const [date, setDate] = useState(todayStr());
  const [params, setParams] = useState([{ id: uid(), name: "", result: "", unit: "", specMin: "", specMax: "" }]);

  const addParam = () => setParams([...params, { id: uid(), name: "", result: "", unit: "", specMin: "", specMax: "" }]);
  const removeParam = (id) => setParams(params.filter((p) => p.id !== id));
  const updateParam = (id, patch) => setParams(params.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const submit = () => {
    if (!testingNumber.trim() || !productName.trim()) return;
    const finalParams = params
      .filter((p) => p.name.trim() && p.result !== "")
      .map((p) => {
        const result = Number(p.result);
        const min = p.specMin !== "" ? Number(p.specMin) : null;
        const max = p.specMax !== "" ? Number(p.specMax) : null;
        const pass = (min === null || result >= min) && (max === null || result <= max);
        return { id: p.id, name: p.name.trim(), result, unit: p.unit.trim(), specMin: min, specMax: max, pass };
      });
    if (finalParams.length === 0) return;
    const overallPass = finalParams.every((p) => p.pass);

    onSubmit({
      id: uid(),
      testingNumber: testingNumber.trim(),
      batchNumber: batchNumber.trim(),
      productName: productName.trim(),
      date,
      parameters: finalParams,
      overallPass,
      by: name,
      createdAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="rounded-xl p-4 mb-3" style={{ background: "#F3F5F4", border: "1px solid #00000012" }}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-semibold tracking-wide" style={{ color: accent }}>NEW LAB TEST</span>
        {!hideClose && <button onClick={onClose} aria-label="Close form"><X size={16} className="text-zinc-400" /></button>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input placeholder="Testing number" value={testingNumber} onChange={(e) => setTestingNumber(e.target.value)} className={inputCls} />
        <input placeholder="Batch number (optional)" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} className={inputCls} />
        <div className="col-span-2"><input placeholder="Product / sample name" value={productName} onChange={(e) => setProductName(e.target.value)} className={inputCls} /></div>
        <div className="col-span-2"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></div>
      </div>

      <div className="mt-3">
        <div className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1.5">Test parameters</div>
        <div className="space-y-2">
          {params.map((p) => (
            <div key={p.id} className="rounded-lg p-2" style={{ background: "#FFFFFF", border: "1px solid #00000012" }}>
              <div className="flex gap-2 mb-1.5">
                <input placeholder="Test name (e.g. Viscosity)" value={p.name} onChange={(e) => updateParam(p.id, { name: e.target.value })} className={inputCls + " flex-1"} />
                {params.length > 1 && (
                  <button onClick={() => removeParam(p.id)} aria-label="Remove parameter" className="shrink-0">
                    <X size={16} className="text-zinc-400" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <input placeholder="Result" type="number" value={p.result} onChange={(e) => updateParam(p.id, { result: e.target.value })} className={inputCls} />
                <input placeholder="Unit (e.g. cP)" value={p.unit} onChange={(e) => updateParam(p.id, { unit: e.target.value })} className={inputCls} />
                <input placeholder="Spec min" type="number" value={p.specMin} onChange={(e) => updateParam(p.id, { specMin: e.target.value })} className={inputCls} />
                <input placeholder="Spec max" type="number" value={p.specMax} onChange={(e) => updateParam(p.id, { specMax: e.target.value })} className={inputCls} />
              </div>
            </div>
          ))}
        </div>
        <button onClick={addParam} className="mt-2 text-xs flex items-center gap-1" style={{ color: accent }}>
          <Plus size={12} /> Add test parameter
        </button>
      </div>

      <button onClick={submit} className="mt-4 w-full rounded-lg py-2 text-sm font-semibold" style={{ background: accent, color: "#ffffff" }}>
        Log test result
      </button>
    </div>
  );
}

function LabCard({ test, accent, brandLabel, isBoss, onDelete }) {
  const [open, setOpen] = useState(false);
  const downloadReport = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(buildLabReportHTML(test, brandLabel));
    win.document.close();
  };
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: `1px solid ${test.overallPass ? "#00000014" : "#D1453B55"}` }}>
      <button className="w-full px-3.5 py-3 flex items-center gap-3 text-left" onClick={() => setOpen(!open)}>
        <FlaskConical size={18} style={{ color: accent }} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-zinc-900 truncate">{test.productName}</div>
          <div className="text-xs text-zinc-500 mt-0.5 truncate">
            Test #{test.testingNumber}{test.batchNumber ? ` · Batch ${test.batchNumber}` : ""} · {test.date}
          </div>
        </div>
        <span
          className="text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 flex items-center gap-1"
          style={{ background: test.overallPass ? "#2E9E5B18" : "#D1453B18", color: test.overallPass ? "#2E9E5B" : "#D1453B" }}
        >
          {test.overallPass ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
          {test.overallPass ? "PASS" : "FAIL"}
        </span>
        {open ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
      </button>
      {open && (
        <div className="px-3.5 pb-3.5" style={{ borderTop: "1px solid #00000010" }}>
          <div className="mt-3 text-[10px] uppercase tracking-wide text-zinc-400 mb-1.5">Parameters</div>
          <div className="space-y-1.5">
            {test.parameters.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  {p.pass ? <CheckCircle2 size={12} style={{ color: "#2E9E5B" }} /> : <XCircle size={12} style={{ color: "#D1453B" }} />}
                  <span className="text-zinc-700">{p.name}</span>
                </div>
                <div className="text-right">
                  <span className="mono-font font-semibold" style={{ color: p.pass ? "#2E9E5B" : "#D1453B" }}>{p.result}{p.unit}</span>
                  {(p.specMin != null || p.specMax != null) && (
                    <span className="text-zinc-400 ml-1">
                      (spec {p.specMin != null ? p.specMin : "–"}–{p.specMax != null ? p.specMax : "–"})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-3">
            <User size={9} /> Logged by {test.by} · {fmtDate(test.createdAt)}
          </div>
          <div className="mt-3 flex items-center gap-4">
            <button onClick={downloadReport} className="flex items-center gap-1.5 text-xs" style={{ color: accent }}>
              <Download size={12} /> Download report
            </button>
            {isBoss && (
              <button onClick={() => onDelete(test.id)} className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Trash2 size={12} /> Remove test record
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Dashboard({ meta, items, batches, sales, canViewCosting }) {
  const lowStockItems = items.filter((i) => i.qty <= i.threshold);
  const rawCount = items.filter((i) => i.category === "Raw material").length;
  const packCount = items.filter((i) => i.category === "Packaging").length;
  const fgCount = items.filter((i) => i.category === "Finished good").length;

  const totalOutput = batches.reduce((s, b) => s + (b.outputQty || 0), 0);
  const totalProdCost = batches.reduce((s, b) => s + (b.costing?.totalCost || 0), 0);

  const totalRevenue = sales.reduce((s, x) => s + (x.totalAmount || 0), 0);
  const totalUnitsSold = sales.reduce((s, x) => s + (x.qty || 0), 0);
  const revenueByProduct = {};
  sales.forEach((x) => {
    revenueByProduct[x.productName] = (revenueByProduct[x.productName] || 0) + x.totalAmount;
  });
  const topProducts = Object.entries(revenueByProduct).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topProductsChart = topProducts.map(([name, revenue]) => ({ name, revenue }));

  const outputByDate = {};
  batches.forEach((b) => {
    outputByDate[b.date] = (outputByDate[b.date] || 0) + (b.outputQty || 0);
  });
  const productionChart = Object.entries(outputByDate)
    .map(([date, output]) => ({ date, output }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const revenueByDate = {};
  sales.forEach((s) => {
    revenueByDate[s.date] = (revenueByDate[s.date] || 0) + (s.totalAmount || 0);
  });
  const salesChart = Object.entries(revenueByDate)
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const cardStyle = { background: "#FFFFFF", border: "1px solid #00000014" };
  const shortDate = (d) => {
    const dt = new Date(d);
    return dt.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl p-4" style={cardStyle}>
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-zinc-400 mb-2">
          <Package size={12} /> Stock overview
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-zinc-900">{rawCount}</div>
            <div className="text-[10px] text-zinc-500">Raw materials</div>
          </div>
          <div>
            <div className="text-lg font-bold text-zinc-900">{packCount}</div>
            <div className="text-[10px] text-zinc-500">Packaging</div>
          </div>
          <div>
            <div className="text-lg font-bold text-zinc-900">{fgCount}</div>
            <div className="text-[10px] text-zinc-500">Finished goods</div>
          </div>
        </div>
        {lowStockItems.length > 0 && (
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid #00000010" }}>
            <div className="flex items-center gap-1.5 text-xs mb-1.5" style={{ color: "#D1453B" }}>
              <AlertTriangle size={12} /> {lowStockItems.length} item{lowStockItems.length > 1 ? "s" : ""} at or below reorder point
            </div>
            {lowStockItems.slice(0, 4).map((i) => (
              <div key={i.id} className="flex justify-between text-xs text-zinc-600 py-0.5">
                <span>{i.name}</span>
                <span className="mono-font" style={{ color: "#D1453B" }}>{i.qty}{i.unit}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl p-4" style={cardStyle}>
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-zinc-400 mb-2">
          <Factory size={12} /> Production
        </div>
        <div className="grid grid-cols-2 gap-2 text-center mb-2">
          <div>
            <div className="text-lg font-bold text-zinc-900">{batches.length}</div>
            <div className="text-[10px] text-zinc-500">Batches logged</div>
          </div>
          <div>
            <div className="text-lg font-bold text-zinc-900">{totalOutput.toFixed(0)}</div>
            <div className="text-[10px] text-zinc-500">Total output (kg)</div>
          </div>
        </div>
        {canViewCosting && (
          <div className="pb-2 text-center">
            <div className="text-sm font-semibold" style={{ color: meta.accent }}>₹{totalProdCost.toFixed(2)}</div>
            <div className="text-[10px] text-zinc-500">Total production cost</div>
          </div>
        )}
        {productionChart.length > 0 ? (
          <div style={{ width: "100%", height: 160 }}>
            <ResponsiveContainer>
              <BarChart data={productionChart} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#00000010" vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  labelFormatter={shortDate}
                  formatter={(v) => [`${v} kg`, "Output"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #00000014" }}
                />
                <Bar dataKey="output" fill={meta.accent} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-zinc-400 text-center py-4">No production data yet to chart.</p>
        )}
      </div>

      <div className="rounded-xl p-4" style={cardStyle}>
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-zinc-400 mb-2">
          <TrendingUp size={12} /> Sales
        </div>
        <div className="grid grid-cols-2 gap-2 text-center mb-2">
          <div>
            <div className="text-lg font-bold text-zinc-900">{totalUnitsSold.toFixed(0)}</div>
            <div className="text-[10px] text-zinc-500">Units sold</div>
          </div>
          <div>
            <div className="text-lg font-bold" style={{ color: meta.accent }}>₹{totalRevenue.toFixed(0)}</div>
            <div className="text-[10px] text-zinc-500">Total revenue</div>
          </div>
        </div>
        {salesChart.length > 0 ? (
          <div style={{ width: "100%", height: 160 }}>
            <ResponsiveContainer>
              <LineChart data={salesChart} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#00000010" vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  labelFormatter={shortDate}
                  formatter={(v) => [`₹${v.toFixed(0)}`, "Revenue"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #00000014" }}
                />
                <Line type="monotone" dataKey="revenue" stroke={meta.accent} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-zinc-400 text-center py-4">No sales data yet to chart.</p>
        )}

        {topProductsChart.length > 0 && (
          <div className="mt-2 pt-3" style={{ borderTop: "1px solid #00000010" }}>
            <div className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1.5">Revenue by product</div>
            <div style={{ width: "100%", height: Math.max(120, topProductsChart.length * 32) }}>
              <ResponsiveContainer>
                <BarChart data={topProductsChart} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#00000010" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#4B5563" }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip
                    formatter={(v) => [`₹${v.toFixed(0)}`, "Revenue"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #00000014" }}
                  />
                  <Bar dataKey="revenue" fill={meta.accent} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [brand, setBrand] = useState("urbnfettch");
  const [tab, setTab] = useState("items");
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showProdForm, setShowProdForm] = useState(false);
  const [showSalesForm, setShowSalesForm] = useState(false);
  const [showLabForm, setShowLabForm] = useState(false);
  const [filter, setFilter] = useState("All");
  const { items, save, loading } = useInventory(brand);
  const { items: sharedItems, save: saveShared, loading: sharedLoading } = useSharedInventory();
  const { batches, save: saveBatches } = useProduction(brand);
  const { sales, save: saveSales } = useSales(brand);
  const { tests, save: saveTests } = useLab(brand);
  const { session, save: saveSession } = useSession();
  const { logins, record } = useLoginLog();
  const meta = BRANDS[brand];

  const isBoss = session?.role === "boss";
  const canViewCosting = !!session?.canViewCosting;
  const isLabOnly = session?.role === "lab";
  const canSeeLabTab = canViewCosting || isLabOnly;
  const [labResetKey, setLabResetKey] = useState(0);

  useEffect(() => {
    if (session?.role === "lab") setTab("lab");
  }, [session]);

  const handleLogin = (user) => {
    saveSession({ name: user.name, role: user.role, canViewCosting: !!user.canViewCosting });
    record(user.name, user.role);
  };

  const combined = [...items, ...sharedItems];

  const lowStock = combined.filter((i) => i.qty <= i.threshold);
  const visible = filter === "All" ? combined : filter === "Low stock" ? lowStock : combined.filter((i) => i.category === filter);
  const rawMaterials = combined.filter((i) => i.category === "Raw material");
  const finishedGoods = combined.filter((i) => i.category === "Finished good");

  const allHistory = useMemo(() => {
    const rows = [];
    combined.forEach((i) => i.history.forEach((h) => rows.push({ ...h, itemName: i.name })));
    return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [items, sharedItems]);

  const updateItem = (updated) => {
    const inBrand = items.some((i) => i.id === updated.id);
    const inShared = sharedItems.some((i) => i.id === updated.id);

    if (updated.shared) {
      if (inShared) {
        saveShared(sharedItems.map((i) => (i.id === updated.id ? updated : i)));
      } else if (inBrand) {
        save(items.filter((i) => i.id !== updated.id));
        saveShared([updated, ...sharedItems]);
      }
    } else {
      if (inBrand) {
        save(items.map((i) => (i.id === updated.id ? updated : i)));
      } else if (inShared) {
        saveShared(sharedItems.filter((i) => i.id !== updated.id));
        save([updated, ...items]);
      }
    }
  };

  const deleteItem = (id) => {
    if (!isBoss) return;
    if (items.some((i) => i.id === id)) save(items.filter((i) => i.id !== id));
    else if (sharedItems.some((i) => i.id === id)) saveShared(sharedItems.filter((i) => i.id !== id));
  };

  const addItem = (item) => {
    if (item.shared) saveShared([item, ...sharedItems]);
    else save([item, ...items]);
  };
  const bulkAddItems = (newItems) => save([...newItems, ...items]);

  const logProduction = (batch) => {
    let materialCost = 0;
    const finalMaterials = [];
    let nextItems = [...items];
    let nextSharedItems = [...sharedItems];

    for (const m of batch.materials) {
      const inBrandIdx = nextItems.findIndex((i) => i.id === m.itemId);
      const inSharedIdx = nextSharedItems.findIndex((i) => i.id === m.itemId);
      const list = inBrandIdx >= 0 ? nextItems : inSharedIdx >= 0 ? nextSharedItems : null;
      const idx = inBrandIdx >= 0 ? inBrandIdx : inSharedIdx;
      if (!list || idx < 0) continue;

      const original = list[idx];
      const { cost, newQty, newLots, unitCostUsed } = consumeMaterial(original, m.qty);
      materialCost += cost;
      finalMaterials.push({ ...m, unitCostUsed });

      const updatedItem = {
        ...original,
        qty: newQty,
        lots: newLots,
        history: [
          { id: uid(), type: "out", qty: m.qty, date: new Date().toISOString(), note: `Used in batch ${batch.batchNumber} (${batch.productName})`, priceNote: unitCostUsed ? `₹${unitCostUsed.toFixed(2)}/${m.unit}` : null, by: batch.by },
          ...original.history,
        ],
      };
      if (inBrandIdx >= 0) nextItems[idx] = updatedItem;
      else nextSharedItems[idx] = updatedItem;
    }

    const laborCost = materialCost * LABOR_RATE;
    const canRate = batch.canUsed === "old" ? CAN_RATES.old : batch.canUsed === "new" ? CAN_RATES.new : 0;
    const canCost = batch.outputQty * canRate;
    const totalCost = materialCost + laborCost + canCost;
    const costPerKg = batch.outputQty > 0 ? totalCost / batch.outputQty : 0;
    const gstAmount = totalCost * GST_RATE;
    const costPerKgWithGst = batch.outputQty > 0 ? (totalCost + gstAmount) / batch.outputQty : 0;

    const finalBatch = {
      ...batch,
      materials: finalMaterials,
      costing: { materialCost, laborCost, canCost, totalCost, costPerKg, gstAmount, costPerKgWithGst },
    };

    const existingFG = nextItems.find(
      (i) => i.category === "Finished good" && i.name.trim().toLowerCase() === batch.productName.trim().toLowerCase()
    );

    if (existingFG) {
      nextItems = nextItems.map((i) =>
        i.id === existingFG.id
          ? {
              ...i,
              qty: i.qty + batch.outputQty,
              history: [
                { id: uid(), type: "in", qty: batch.outputQty, date: new Date().toISOString(), note: `Produced — batch ${batch.batchNumber}`, by: batch.by },
                ...i.history,
              ],
            }
          : i
      );
    } else {
      nextItems = [
        {
          id: uid(),
          name: batch.productName,
          category: "Finished good",
          qty: batch.outputQty,
          unit: batch.outputUnit,
          threshold: 0,
          supplier: { name: "", contact: "", leadTime: null },
          history: [
            { id: uid(), type: "in", qty: batch.outputQty, date: new Date().toISOString(), note: `Produced — batch ${batch.batchNumber}`, by: batch.by },
          ],
        },
        ...nextItems,
      ];
    }

    save(nextItems);
    saveShared(nextSharedItems);
    saveBatches([finalBatch, ...batches]);
  };

  const deleteBatch = (id) => {
    if (!isBoss) return;
    saveBatches(batches.filter((b) => b.id !== id));
  };

  const sellStock = (sale) => {
    const inBrandIdx = items.findIndex((i) => i.id === sale.productId);
    const inSharedIdx = sharedItems.findIndex((i) => i.id === sale.productId);

    const applyDeduction = (product) => ({
      ...product,
      qty: Math.max(0, product.qty - sale.qty),
      history: [
        { id: uid(), type: "out", qty: sale.qty, date: new Date().toISOString(), note: `Sold to ${sale.customerName}`, by: sale.by },
        ...product.history,
      ],
    });

    if (inBrandIdx >= 0) {
      const nextItems = [...items];
      nextItems[inBrandIdx] = applyDeduction(nextItems[inBrandIdx]);
      save(nextItems);
    } else if (inSharedIdx >= 0) {
      const nextShared = [...sharedItems];
      nextShared[inSharedIdx] = applyDeduction(nextShared[inSharedIdx]);
      saveShared(nextShared);
    }

    saveSales([sale, ...sales]);
  };

  const deleteSale = (id) => {
    if (!isBoss) return;
    saveSales(sales.filter((s) => s.id !== id));
  };

  const addLabTest = (test) => {
    saveTests([test, ...tests]);
    setLabResetKey((k) => k + 1);
  };
  const deleteLabTest = (id) => {
    if (!isBoss) return;
    saveTests(tests.filter((t) => t.id !== id));
  };

  if (!session) return <PinGate onLogin={handleLogin} />;

  return (
    <div className="min-h-screen w-full" style={{ background: "#ffffff", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="px-4 pt-6 pb-4" style={{ borderBottom: "1px solid #00000010" }}>
        <div className="flex items-center justify-between mb-4">
          <Wordmark />
          <button onClick={() => saveSession(null)} className="flex items-center gap-1 text-[11px] text-zinc-500">
            {isBoss && <Shield size={11} style={{ color: meta.accent }} />}
            <User size={11} /> {session.name}
          </button>
        </div>
        <div className="flex gap-2">
          {Object.entries(BRANDS).map(([key, b]) => (
            <button
              key={key}
              onClick={() => { setBrand(key); setFilter("All"); }}
              className="flex-1 text-left rounded-xl px-3 py-2.5 transition-colors"
              style={{
                background: brand === key ? b.accentDim : "#F7F8F7",
                border: `1px solid ${brand === key ? b.accent : "#00000012"}`,
              }}
            >
              <div className="text-sm font-bold" style={{ color: brand === key ? b.accent : "#6B7280" }}>
                {b.label}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{b.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="mx-4 mt-3 rounded-lg px-3 py-2 flex items-center gap-2" style={{ background: "#D1453B14", border: "1px solid #D1453B30" }}>
          <AlertTriangle size={14} style={{ color: "#D1453B" }} />
          <span className="text-xs text-zinc-700">
            {lowStock.length} item{lowStock.length > 1 ? "s" : ""} at or below reorder point
          </span>
        </div>
      )}

      <div className="flex gap-1 px-4 mt-4 overflow-x-auto">
        {(isLabOnly
          ? [{ key: "lab", label: "Lab", icon: FlaskConical }]
          : [
              { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
              { key: "items", label: "Items", icon: Package },
              { key: "production", label: "Production", icon: Factory },
              { key: "sales", label: "Sales", icon: ShoppingCart },
              ...(canSeeLabTab ? [{ key: "lab", label: "Lab", icon: FlaskConical }] : []),
              { key: "history", label: "History", icon: HistoryIcon },
              ...(isBoss ? [{ key: "logins", label: "Logins", icon: Shield }] : []),
            ]
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
            style={{ background: tab === key ? meta.accent : "transparent", color: tab === key ? "#ffffff" : "#6B7280" }}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {tab === "items" && (
        <div className="flex items-center justify-between gap-2 px-4 mt-3">
          <div className="flex gap-1.5 overflow-x-auto">
            {["All", "Low stock", ...CATEGORIES].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
                style={{
                  background: filter === f ? meta.accent : "transparent",
                  color: filter === f ? "#ffffff" : "#6B7280",
                  border: filter === f ? "none" : "1px solid #00000014",
                }}
              >
                {f}
              </button>
            ))}
          </div>
          {isBoss && (
            <button
              onClick={() => setShowBulkImport(!showBulkImport)}
              className="flex items-center gap-1 text-[11px] shrink-0 text-zinc-500"
            >
              <UploadCloud size={13} /> Bulk import
            </button>
          )}
        </div>
      )}

      <div className="px-4 py-4 pb-24">
        {loading || sharedLoading ? (
          <div className="text-center text-zinc-400 text-sm py-10">Loading…</div>
        ) : tab === "dashboard" ? (
          <Dashboard meta={meta} items={combined} batches={batches} sales={sales} canViewCosting={canViewCosting} />
        ) : tab === "items" ? (
          <>
            {showBulkImport && (
              <BulkImportForm
                accent={meta.accent}
                name={session.name}
                onClose={() => setShowBulkImport(false)}
                onImport={bulkAddItems}
              />
            )}
            {showForm && <ItemForm accent={meta.accent} name={session.name} canViewCosting={canViewCosting} onClose={() => setShowForm(false)} onAdd={addItem} />}
            {visible.length === 0 && !showForm && (
              <div className="text-center py-14">
                <Package size={28} className="mx-auto text-zinc-300 mb-2" />
                <p className="text-sm text-zinc-500">
                  {combined.length === 0 ? `No inventory tracked for ${meta.label} yet.` : "Nothing matches this filter."}
                </p>
                {combined.length === 0 && <p className="text-xs text-zinc-400 mt-1">Tap + to add your first item.</p>}
              </div>
            )}
            <div className="space-y-2">
              {visible.map((item) => (
                <ItemCard key={item.id} item={item} accent={meta.accent} name={session.name} isBoss={isBoss} canViewCosting={canViewCosting} onUpdate={updateItem} onDelete={deleteItem} />
              ))}
            </div>
          </>
        ) : tab === "production" ? (
          <>
            {showProdForm && (
              <ProductionForm
                accent={meta.accent}
                name={session.name}
                rawMaterials={rawMaterials}
                onClose={() => setShowProdForm(false)}
                onSubmit={logProduction}
              />
            )}
            {batches.length === 0 && !showProdForm && (
              <div className="text-center py-14">
                <Factory size={28} className="mx-auto text-zinc-300 mb-2" />
                <p className="text-sm text-zinc-500">No production logged yet for {meta.label}.</p>
                <p className="text-xs text-zinc-400 mt-1">Tap + to log your first batch.</p>
              </div>
            )}
            <div className="space-y-2">
              {batches.map((batch) => (
                <ProductionCard key={batch.id} batch={batch} accent={meta.accent} isBoss={isBoss} canViewCosting={canViewCosting} onDelete={deleteBatch} />
              ))}
            </div>
          </>
        ) : tab === "sales" ? (
          <>
            {showSalesForm && (
              <SalesForm
                accent={meta.accent}
                name={session.name}
                finishedGoods={finishedGoods}
                onClose={() => setShowSalesForm(false)}
                onSubmit={sellStock}
              />
            )}
            {sales.length === 0 && !showSalesForm && (
              <div className="text-center py-14">
                <ShoppingCart size={28} className="mx-auto text-zinc-300 mb-2" />
                <p className="text-sm text-zinc-500">No sales logged yet for {meta.label}.</p>
                <p className="text-xs text-zinc-400 mt-1">Tap + to log your first sale.</p>
              </div>
            )}
            <div className="space-y-2">
              {sales.map((sale) => (
                <SalesCard key={sale.id} sale={sale} accent={meta.accent} isBoss={isBoss} onDelete={deleteSale} />
              ))}
            </div>
          </>
        ) : tab === "lab" ? (
          <>
            {showLabForm && (
              <LabForm
                accent={meta.accent}
                name={session.name}
                onClose={() => setShowLabForm(false)}
                onSubmit={addLabTest}
              />
            )}
            {tests.length === 0 && !showLabForm && (
              <div className="text-center py-14">
                <FlaskConical size={28} className="mx-auto text-zinc-300 mb-2" />
                <p className="text-sm text-zinc-500">No lab tests logged yet for {meta.label}.</p>
                <p className="text-xs text-zinc-400 mt-1">Tap + to log your first test.</p>
              </div>
            )}
            <div className="space-y-2">
              {tests.map((test) => (
                <LabCard key={test.id} test={test} accent={meta.accent} brandLabel={meta.label} isBoss={isBoss} onDelete={deleteLabTest} />
              ))}
            </div>
          </>
        ) : tab === "history" ? (
          <div className="rounded-xl px-3.5 py-2" style={{ background: "#FFFFFF", border: "1px solid #00000014" }}>
            {allHistory.length === 0 ? (
              <div className="text-center py-10">
                <HistoryIcon size={24} className="mx-auto text-zinc-300 mb-2" />
                <p className="text-sm text-zinc-500">No activity logged yet for {meta.label}.</p>
              </div>
            ) : (
              <div>
                {allHistory.map((h) => (
                  <div key={h.id + h.itemName}>
                    <MovementRow h={h} showItem={h.itemName} canViewCosting={canViewCosting} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl px-3.5 py-2" style={{ background: "#FFFFFF", border: "1px solid #00000014" }}>
            {logins.length === 0 ? (
              <div className="text-center py-10">
                <Shield size={24} className="mx-auto text-zinc-300 mb-2" />
                <p className="text-sm text-zinc-500">No logins recorded yet.</p>
              </div>
            ) : (
              <div>
                {logins.map((l) => (
                  <div key={l.id} className="flex items-center gap-2 py-1.5">
                    {l.role === "boss" ? <Shield size={13} style={{ color: meta.accent }} className="shrink-0" /> : <User size={13} className="text-zinc-400 shrink-0" />}
                    <span className="text-xs text-zinc-700 flex-1">{l.name}</span>
                    <span className="text-[10px] text-zinc-400">{fmtDate(l.date)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {tab === "items" && (
        <button
          onClick={() => setShowForm(true)}
          className="fixed bottom-6 right-6 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: meta.accent }}
          aria-label="Add new item"
        >
          <Plus size={22} color="#ffffff" strokeWidth={2.5} />
        </button>
      )}

      {tab === "production" && (
        <button
          onClick={() => setShowProdForm(true)}
          className="fixed bottom-6 right-6 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: meta.accent }}
          aria-label="Log new production batch"
        >
          <Plus size={22} color="#ffffff" strokeWidth={2.5} />
        </button>
      )}

      {tab === "sales" && (
        <button
          onClick={() => setShowSalesForm(true)}
          className="fixed bottom-6 right-6 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: meta.accent }}
          aria-label="Log new sale"
        >
          <Plus size={22} color="#ffffff" strokeWidth={2.5} />
        </button>
      )}

      {tab === "lab" && (
        <button
          onClick={() => setShowLabForm(true)}
          className="fixed bottom-6 right-6 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: meta.accent }}
          aria-label="Log new lab test"
        >
          <Plus size={22} color="#ffffff" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
