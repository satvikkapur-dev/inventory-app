import { useState, useEffect, useMemo } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import {
  Plus, Package, AlertTriangle, Trash2, X, ChevronDown, ChevronUp,
  Truck, Clock, ArrowDownCircle, ArrowUpCircle, RotateCcw, Gauge, User, History as HistoryIcon,
  Shield, LogIn, Lock, Pencil, Factory, Layers, UploadCloud,
} from "lucide-react";

const BRANDS = {
  urbnfettch: {
    label: "UrbnFettch",
    sub: "Anti-tack solutions · Rubber industry",
    accent: "#E8A33D",
    accentDim: "#E8A33D33",
  },
  homecare: {
    label: "Homecare",
    sub: "Handwash · Dishwash · Tile cleaner",
    accent: "#4FA8A0",
    accentDim: "#4FA8A033",
  },
};

const CATEGORIES = ["Raw material", "Packaging", "Finished good"];
const UNITS = ["g", "kg", "ml", "L", "units", "drums", "cartons"];

// Add/edit your team here. role "boss" can delete/edit items, "staff" cannot.
const USERS = [
  { name: "Satvik", pin: "8941", role: "boss" },
  { name: "Ravi", pin: "2814", role: "staff" },
  { name: "Vijay", pin: "2314", role: "staff" },
  { name: "Jyoti", pin: "3214", role: "staff" },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + " · " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
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
      await setDoc(doc(db, "inventory", brand), { items: next });
    } catch (e) {
      console.error("Failed to save inventory", e);
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
      await setDoc(doc(db, "production", brand), { batches: next });
    } catch (e) {
      console.error("Failed to save production log", e);
    }
  };

  return { batches, save };
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
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ffffff14" strokeWidth="4" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={accent} strokeWidth="4"
        strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

const inputCls =
  "w-full bg-[#15181e] text-sm text-zinc-100 rounded-lg px-3 py-2 outline-none border border-transparent focus:border-zinc-600 placeholder:text-zinc-500";

function PinGate({ accent, onLogin }) {
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
    <div className="min-h-screen w-full flex items-center justify-center px-6" style={{ background: "#15181e", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="w-full max-w-xs text-center">
        <Lock size={24} style={{ color: accent }} className="mx-auto mb-3" />
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif" }} className="text-lg font-bold text-zinc-100 mb-1">Enter your PIN</h1>
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
          style={{ background: accent, color: "#15181e" }}
        >
          <LogIn size={14} /> Continue
        </button>
      </div>
    </div>
  );
}

function ItemForm({ accent, name, onAdd, onClose }) {
  const [nm, setNm] = useState("");
  const [category, setCategory] = useState("Raw material");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("kg");
  const [threshold, setThreshold] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [leadTime, setLeadTime] = useState("");

  const submit = () => {
    if (!nm.trim() || !qty || !threshold) return;
    onAdd({
      id: uid(),
      name: nm.trim(),
      category,
      qty: Number(qty),
      unit,
      threshold: Number(threshold),
      supplier: {
        name: supplierName.trim(),
        contact: supplierContact.trim(),
        leadTime: leadTime ? Number(leadTime) : null,
      },
      history: [
        { id: uid(), type: "in", qty: Number(qty), date: new Date().toISOString(), note: "Initial stock", by: name },
      ],
    });
    onClose();
  };

  return (
    <div className="rounded-xl p-4 mb-3" style={{ background: "#20242c", border: "1px solid #ffffff14" }}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-semibold tracking-wide" style={{ color: accent }}>NEW ITEM</span>
        <button onClick={onClose} aria-label="Close form"><X size={16} className="text-zinc-500" /></button>
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

        <div className="col-span-2 text-[10px] uppercase tracking-wide text-zinc-500 mb-1 mt-1">Supplier (optional)</div>
        <div className="col-span-2"><input placeholder="Supplier name" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className={inputCls} /></div>
        <input placeholder="Phone / email" value={supplierContact} onChange={(e) => setSupplierContact(e.target.value)} className={inputCls} />
        <input placeholder="Lead time (days)" type="number" value={leadTime} onChange={(e) => setLeadTime(e.target.value)} className={inputCls} />
      </div>
      <button onClick={submit} className="mt-3 w-full rounded-lg py-2 text-sm font-semibold" style={{ background: accent, color: "#15181e" }}>
        Add item
      </button>
    </div>
  );
}

function EditItemForm({ accent, item, onSave, onClose }) {
  const [nm, setNm] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [unit, setUnit] = useState(item.unit);
  const [threshold, setThreshold] = useState(String(item.threshold));
  const [supplierName, setSupplierName] = useState(item.supplier?.name || "");
  const [supplierContact, setSupplierContact] = useState(item.supplier?.contact || "");
  const [leadTime, setLeadTime] = useState(item.supplier?.leadTime != null ? String(item.supplier.leadTime) : "");

  const submit = () => {
    if (!nm.trim() || !threshold) return;
    onSave({
      ...item,
      name: nm.trim(),
      category,
      unit,
      threshold: Number(threshold),
      supplier: {
        name: supplierName.trim(),
        contact: supplierContact.trim(),
        leadTime: leadTime ? Number(leadTime) : null,
      },
    });
    onClose();
  };

  return (
    <div className="rounded-xl p-4 mt-3" style={{ background: "#20242c", border: "1px solid #ffffff14" }}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-semibold tracking-wide" style={{ color: accent }}>EDIT ITEM</span>
        <button onClick={onClose} aria-label="Close form"><X size={16} className="text-zinc-500" /></button>
      </div>
      <p className="text-[10px] text-zinc-500 mb-2">Current quantity and history are untouched — this only edits item details.</p>
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

        <div className="col-span-2 text-[10px] uppercase tracking-wide text-zinc-500 mb-1 mt-1">Supplier (optional)</div>
        <div className="col-span-2"><input placeholder="Supplier name" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className={inputCls} /></div>
        <input placeholder="Phone / email" value={supplierContact} onChange={(e) => setSupplierContact(e.target.value)} className={inputCls} />
        <input placeholder="Lead time (days)" type="number" value={leadTime} onChange={(e) => setLeadTime(e.target.value)} className={inputCls} />
      </div>
      <button onClick={submit} className="mt-3 w-full rounded-lg py-2 text-sm font-semibold" style={{ background: accent, color: "#15181e" }}>
        Save changes
      </button>
    </div>
  );
}

function MovementRow({ h, showItem }) {
  const icon = h.type === "in" ? ArrowDownCircle : h.type === "out" ? ArrowUpCircle : Truck;
  const color = h.type === "in" ? "#6FCF97" : h.type === "out" ? "#E2574C" : "#4FA8A0";
  const Icon = icon;
  return (
    <div className="flex items-center gap-2 py-1.5">
      <Icon size={13} style={{ color }} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-zinc-400 truncate">
          {showItem && <span className="text-zinc-300 font-medium">{showItem} · </span>}
          {h.note || h.type}
        </div>
        <div className="text-[10px] text-zinc-600 flex items-center gap-1">
          <User size={9} /> {h.by || "Unknown"} · {fmtDate(h.date)}
        </div>
      </div>
      <span className="mono-font text-xs shrink-0" style={{ color }}>
        {h.type === "out" ? "−" : "+"}{h.qty}
      </span>
    </div>
  );
}

function ItemCard({ item, accent, name, isBoss, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  const [moveQty, setMoveQty] = useState("");
  const [editing, setEditing] = useState(false);
  const low = item.qty <= item.threshold;
  const pct = item.threshold > 0 ? Math.min(100, (item.qty / (item.threshold * 2)) * 100) : 100;

  const move = (type) => {
    const q = Number(moveQty);
    if (!q || q <= 0) return;
    const nextQty = type === "out" ? Math.max(0, item.qty - q) : item.qty + q;
    onUpdate({
      ...item,
      qty: nextQty,
      history: [{ id: uid(), type, qty: q, date: new Date().toISOString(), note: type === "in" ? "Stock in" : "Stock out", by: name }, ...item.history],
    });
    setMoveQty("");
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
    } else {
      setActiveAction(action);
      setMoveQty("");
    }
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#1c1f26", border: `1px solid ${low ? "#E2574C40" : "#ffffff0f"}` }}>
      <button className="w-full px-3.5 py-3 flex items-center gap-3 text-left" onClick={() => setOpen(!open)}>
        <GaugeDot pct={pct} accent={low ? "#E2574C" : accent} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-zinc-100 truncate">{item.name}</div>
          <div className="text-xs text-zinc-500 mt-0.5 truncate">
            {item.category}{item.supplier?.name ? ` · ${item.supplier.name}` : ""}
          </div>
        </div>
        <span className="mono-font text-xs shrink-0" style={{ color: low ? "#E2574C" : "#e4e4e7" }}>
          {item.qty}{item.unit}
        </span>
        {open ? <ChevronUp size={16} className="text-zinc-600" /> : <ChevronDown size={16} className="text-zinc-600" />}
      </button>

      {open && (
        <div className="px-3.5 pb-3.5" style={{ borderTop: "1px solid #ffffff0f" }}>
          {low && (
            <div className="flex items-center gap-1.5 mt-3 mb-1 text-[11px]" style={{ color: "#E2574C" }}>
              <AlertTriangle size={11} /> Below reorder point ({item.threshold}{item.unit})
            </div>
          )}

          {item.supplier?.name && (
            <div className="mt-3 rounded-lg px-3 py-2 text-xs text-zinc-400" style={{ background: "#15181e" }}>
              <div className="flex items-center gap-1.5 text-zinc-300 font-medium"><Truck size={12} /> {item.supplier.name}</div>
              {item.supplier.contact && <div className="mt-0.5">{item.supplier.contact}</div>}
              {item.supplier.leadTime != null && <div className="mt-0.5 flex items-center gap-1"><Clock size={11} /> {item.supplier.leadTime} day lead time</div>}
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button onClick={() => toggleAction("in")} className="flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium" style={{ background: activeAction === "in" ? "#6FCF9740" : "#6FCF9720", color: "#6FCF97" }}>
              <ArrowDownCircle size={13} /> Stock in
            </button>
            <button onClick={() => toggleAction("out")} className="flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium" style={{ background: activeAction === "out" ? "#E2574C40" : "#E2574C20", color: "#E2574C" }}>
              <ArrowUpCircle size={13} /> Stock out
            </button>
            <button onClick={() => toggleAction("reorder")} className="flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium" style={{ background: activeAction === "reorder" ? "#4FA8A040" : "#4FA8A020", color: "#4FA8A0" }}>
              <RotateCcw size={13} /> Reorder
            </button>
          </div>

          {activeAction && (
            <div className="flex gap-2 mt-2">
              <input
                autoFocus
                placeholder={`Qty in ${item.unit}`}
                type="number"
                inputMode="decimal"
                value={moveQty}
                onChange={(e) => setMoveQty(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (activeAction === "reorder") logReorder();
                    else move(activeAction);
                  }
                }}
                className={inputCls}
              />
              <button
                onClick={() => (activeAction === "reorder" ? logReorder() : move(activeAction))}
                className="px-4 rounded-lg text-xs font-semibold shrink-0"
                style={{ background: accent, color: "#15181e" }}
              >
                Confirm
              </button>
            </div>
          )}

          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">History</div>
            {item.history.length === 0 ? (
              <div className="text-xs text-zinc-600 py-1">No movements yet.</div>
            ) : (
              item.history.slice(0, 8).map((h) => <MovementRow key={h.id} h={h} />)
            )}
          </div>

          {isBoss && !editing && (
            <div className="mt-3 flex items-center gap-4">
              <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Pencil size={12} /> Edit item
              </button>
              <button onClick={() => onDelete(item.id)} className="flex items-center gap-1.5 text-xs text-zinc-600">
                <Trash2 size={12} /> Remove item
              </button>
            </div>
          )}

          {isBoss && editing && (
            <EditItemForm
              accent={accent}
              item={item}
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
    <div className="rounded-xl p-4 mb-3" style={{ background: "#20242c", border: "1px solid #ffffff14" }}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-semibold tracking-wide" style={{ color: accent }}>BULK IMPORT ITEMS</span>
        <button onClick={onClose} aria-label="Close form"><X size={16} className="text-zinc-500" /></button>
      </div>
      <p className="text-[10px] text-zinc-500 mb-2">
        One item per line: <span className="text-zinc-400">Name, Category, Qty, Unit, Reorder threshold</span><br />
        Category must be exactly: Raw material / Packaging / Finished good
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"SLURRY, Raw material, 3026, kg, 700\nUREA, Raw material, 2168, kg, 700"}
        rows={8}
        className={inputCls + " font-mono text-xs resize-none"}
      />
      {result && (
        <p className="text-xs mt-2" style={{ color: result.added > 0 ? "#6FCF97" : "#E2574C" }}>
          Added {result.added} item{result.added !== 1 ? "s" : ""}{result.skipped > 0 ? `, skipped ${result.skipped} (bad format)` : ""}.
        </p>
      )}
      <button onClick={submit} className="mt-3 w-full rounded-lg py-2 text-sm font-semibold" style={{ background: accent, color: "#15181e" }}>
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
      by: name,
      createdAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="rounded-xl p-4 mb-3" style={{ background: "#20242c", border: "1px solid #ffffff14" }}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-semibold tracking-wide" style={{ color: accent }}>NEW PRODUCTION BATCH</span>
        <button onClick={onClose} aria-label="Close form"><X size={16} className="text-zinc-500" /></button>
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
      </div>

      <div className="mt-3">
        <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1.5">Raw materials used</div>
        {rawMaterials.length === 0 && (
          <p className="text-xs text-zinc-600 mb-2">No raw materials tracked yet for this brand — add some in the Items tab first.</p>
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
                    <X size={16} className="text-zinc-600" />
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

      <button onClick={submit} className="mt-4 w-full rounded-lg py-2 text-sm font-semibold" style={{ background: accent, color: "#15181e" }}>
        Log production &amp; update stock
      </button>
    </div>
  );
}

function ProductionCard({ batch, accent, isBoss, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#1c1f26", border: "1px solid #ffffff0f" }}>
      <button className="w-full px-3.5 py-3 flex items-center gap-3 text-left" onClick={() => setOpen(!open)}>
        <Factory size={18} style={{ color: accent }} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-zinc-100 truncate">{batch.productName}</div>
          <div className="text-xs text-zinc-500 mt-0.5 truncate">
            Batch {batch.batchNumber} · {batch.date}{batch.machineNumber ? ` · Machine ${batch.machineNumber}` : ""}
          </div>
        </div>
        <span className="mono-font text-xs shrink-0 text-zinc-200">+{batch.outputQty}{batch.outputUnit}</span>
        {open ? <ChevronUp size={16} className="text-zinc-600" /> : <ChevronDown size={16} className="text-zinc-600" />}
      </button>
      {open && (
        <div className="px-3.5 pb-3.5" style={{ borderTop: "1px solid #ffffff0f" }}>
          <div className="mt-3 text-[10px] uppercase tracking-wide text-zinc-500 mb-1">Materials consumed</div>
          <div className="space-y-1">
            {batch.materials.map((m, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">{m.itemName}</span>
                <span className="mono-font" style={{ color: "#E2574C" }}>−{m.qty}{m.unit}</span>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-zinc-600 flex items-center gap-1 mt-3">
            <User size={9} /> Logged by {batch.by} · {fmtDate(batch.createdAt)}
          </div>
          {isBoss && (
            <button onClick={() => onDelete(batch.id)} className="mt-3 flex items-center gap-1.5 text-xs text-zinc-600">
              <Trash2 size={12} /> Remove log entry (stock changes stay as-is)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [brand, setBrand] = useState("urbnfettch");
  const [tab, setTab] = useState("items");
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showProdForm, setShowProdForm] = useState(false);
  const [filter, setFilter] = useState("All");
  const { items, save, loading } = useInventory(brand);
  const { batches, save: saveBatches } = useProduction(brand);
  const { session, save: saveSession } = useSession();
  const { logins, record } = useLoginLog();
  const meta = BRANDS[brand];

  const isBoss = session?.role === "boss";

  const handleLogin = (user) => {
    saveSession({ name: user.name, role: user.role });
    record(user.name, user.role);
  };

  const lowStock = items.filter((i) => i.qty <= i.threshold);
  const visible = filter === "All" ? items : filter === "Low stock" ? lowStock : items.filter((i) => i.category === filter);
  const rawMaterials = items.filter((i) => i.category === "Raw material");

  const allHistory = useMemo(() => {
    const rows = [];
    items.forEach((i) => i.history.forEach((h) => rows.push({ ...h, itemName: i.name })));
    return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [items]);

  const updateItem = (updated) => save(items.map((i) => (i.id === updated.id ? updated : i)));
  const deleteItem = (id) => {
    if (!isBoss) return;
    save(items.filter((i) => i.id !== id));
  };
  const addItem = (item) => save([item, ...items]);
  const bulkAddItems = (newItems) => save([...newItems, ...items]);

  const logProduction = (batch) => {
    let nextItems = items.map((item) => {
      const used = batch.materials.find((m) => m.itemId === item.id);
      if (!used) return item;
      return {
        ...item,
        qty: Math.max(0, item.qty - used.qty),
        history: [
          { id: uid(), type: "out", qty: used.qty, date: new Date().toISOString(), note: `Used in batch ${batch.batchNumber} (${batch.productName})`, by: batch.by },
          ...item.history,
        ],
      };
    });

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
    saveBatches([batch, ...batches]);
  };

  const deleteBatch = (id) => {
    if (!isBoss) return;
    saveBatches(batches.filter((b) => b.id !== id));
  };

  if (!session) return <PinGate accent={meta.accent} onLogin={handleLogin} />;

  return (
    <div className="min-h-screen w-full" style={{ background: "#15181e", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="px-4 pt-6 pb-4" style={{ borderBottom: "1px solid #ffffff0f" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Gauge size={18} style={{ color: meta.accent }} />
            <h1 className="text-lg font-bold text-zinc-100 tracking-tight">Inventory</h1>
          </div>
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
                background: brand === key ? b.accentDim : "#1c1f26",
                border: `1px solid ${brand === key ? b.accent : "#ffffff14"}`,
              }}
            >
              <div className="text-sm font-bold" style={{ color: brand === key ? b.accent : "#a1a1aa" }}>
                {b.label}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{b.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="mx-4 mt-3 rounded-lg px-3 py-2 flex items-center gap-2" style={{ background: "#E2574C1a", border: "1px solid #E2574C40" }}>
          <AlertTriangle size={14} style={{ color: "#E2574C" }} />
          <span className="text-xs text-zinc-300">
            {lowStock.length} item{lowStock.length > 1 ? "s" : ""} at or below reorder point
          </span>
        </div>
      )}

      <div className="flex gap-1 px-4 mt-4 overflow-x-auto">
        {[
          { key: "items", label: "Items", icon: Package },
          { key: "production", label: "Production", icon: Factory },
          { key: "history", label: "History", icon: HistoryIcon },
          ...(isBoss ? [{ key: "logins", label: "Logins", icon: Shield }] : []),
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
            style={{ background: tab === key ? meta.accent : "transparent", color: tab === key ? "#15181e" : "#a1a1aa" }}
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
                  color: filter === f ? "#15181e" : "#a1a1aa",
                  border: filter === f ? "none" : "1px solid #ffffff14",
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
        {loading ? (
          <div className="text-center text-zinc-500 text-sm py-10">Loading…</div>
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
            {showForm && <ItemForm accent={meta.accent} name={session.name} onClose={() => setShowForm(false)} onAdd={addItem} />}
            {visible.length === 0 && !showForm && (
              <div className="text-center py-14">
                <Package size={28} className="mx-auto text-zinc-700 mb-2" />
                <p className="text-sm text-zinc-500">
                  {items.length === 0 ? `No inventory tracked for ${meta.label} yet.` : "Nothing matches this filter."}
                </p>
                {items.length === 0 && <p className="text-xs text-zinc-600 mt-1">Tap + to add your first item.</p>}
              </div>
            )}
            <div className="space-y-2">
              {visible.map((item) => (
                <ItemCard key={item.id} item={item} accent={meta.accent} name={session.name} isBoss={isBoss} onUpdate={updateItem} onDelete={deleteItem} />
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
                <Factory size={28} className="mx-auto text-zinc-700 mb-2" />
                <p className="text-sm text-zinc-500">No production logged yet for {meta.label}.</p>
                <p className="text-xs text-zinc-600 mt-1">Tap + to log your first batch.</p>
              </div>
            )}
            <div className="space-y-2">
              {batches.map((batch) => (
                <ProductionCard key={batch.id} batch={batch} accent={meta.accent} isBoss={isBoss} onDelete={deleteBatch} />
              ))}
            </div>
          </>
        ) : tab === "history" ? (
          <div className="rounded-xl px-3.5 py-2" style={{ background: "#1c1f26", border: "1px solid #ffffff0f" }}>
            {allHistory.length === 0 ? (
              <div className="text-center py-10">
                <HistoryIcon size={24} className="mx-auto text-zinc-700 mb-2" />
                <p className="text-sm text-zinc-500">No activity logged yet for {meta.label}.</p>
              </div>
            ) : (
              <div>
                {allHistory.map((h) => (
                  <div key={h.id + h.itemName}>
                    <MovementRow h={h} showItem={h.itemName} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl px-3.5 py-2" style={{ background: "#1c1f26", border: "1px solid #ffffff0f" }}>
            {logins.length === 0 ? (
              <div className="text-center py-10">
                <Shield size={24} className="mx-auto text-zinc-700 mb-2" />
                <p className="text-sm text-zinc-500">No logins recorded yet.</p>
              </div>
            ) : (
              <div>
                {logins.map((l) => (
                  <div key={l.id} className="flex items-center gap-2 py-1.5">
                    {l.role === "boss" ? <Shield size={13} style={{ color: meta.accent }} className="shrink-0" /> : <User size={13} className="text-zinc-500 shrink-0" />}
                    <span className="text-xs text-zinc-300 flex-1">{l.name}</span>
                    <span className="text-[10px] text-zinc-600">{fmtDate(l.date)}</span>
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
          <Plus size={22} color="#15181e" strokeWidth={2.5} />
        </button>
      )}

      {tab === "production" && (
        <button
          onClick={() => setShowProdForm(true)}
          className="fixed bottom-6 right-6 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: meta.accent }}
          aria-label="Log new production batch"
        >
          <Plus size={22} color="#15181e" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
