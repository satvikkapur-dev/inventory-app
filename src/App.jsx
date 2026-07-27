import { useState, useEffect, useMemo } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import {
  Plus, Package, AlertTriangle, Trash2, X, ChevronDown, ChevronUp,
  Truck, Clock, ArrowDownCircle, ArrowUpCircle, RotateCcw, Gauge, User, History as HistoryIcon,
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

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + " · " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
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

function useName() {
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem("my-name");
    } catch {
      return null;
    }
  });

  const save = (n) => {
    try {
      if (n === null) localStorage.removeItem("my-name");
      else localStorage.setItem("my-name", n);
    } catch {
      /* ignore */
    }
    setName(n);
  };

  return { name, save };
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

function NameGate({ accent, onSet }) {
  const [val, setVal] = useState("");
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6" style={{ background: "#15181e", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="w-full max-w-xs text-center">
        <Gauge size={24} style={{ color: accent }} className="mx-auto mb-3" />
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif" }} className="text-lg font-bold text-zinc-100 mb-1">Who's logging in?</h1>
        <p className="text-xs text-zinc-500 mb-4">Your name gets tagged on every entry you make, so the history stays accurate.</p>
        <input
          autoFocus
          placeholder="Your name"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && val.trim() && onSet(val.trim())}
          className={inputCls}
        />
        <button
          onClick={() => val.trim() && onSet(val.trim())}
          className="mt-3 w-full rounded-lg py-2 text-sm font-semibold"
          style={{ background: accent, color: "#15181e" }}
        >
          Continue
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
          <option>kg</option><option>L</option><option>units</option><option>drums</option><option>cartons</option>
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

function ItemCard({ item, accent, name, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false);
  const [showReorder, setShowReorder] = useState(false);
  const [reorderQty, setReorderQty] = useState("");
  const low = item.qty <= item.threshold;
  const pct = item.threshold > 0 ? Math.min(100, (item.qty / (item.threshold * 2)) * 100) : 100;

  const move = (type, delta, note) => {
    const qty = Math.abs(delta);
    const nextQty = type === "out" ? Math.max(0, item.qty - qty) : item.qty + qty;
    onUpdate({
      ...item,
      qty: nextQty,
      history: [{ id: uid(), type, qty, date: new Date().toISOString(), note, by: name }, ...item.history],
    });
  };

  const logReorder = () => {
    if (!reorderQty) return;
    onUpdate({
      ...item,
      history: [
        { id: uid(), type: "reorder", qty: Number(reorderQty), date: new Date().toISOString(), note: `Ordered from ${item.supplier?.name || "supplier"}`, by: name },
        ...item.history,
      ],
    });
    setReorderQty("");
    setShowReorder(false);
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
            <button onClick={() => move("in", 1, "Stock in")} className="flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium" style={{ background: "#6FCF9720", color: "#6FCF97" }}>
              <ArrowDownCircle size={13} /> Stock in
            </button>
            <button onClick={() => move("out", 1, "Stock out")} className="flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium" style={{ background: "#E2574C20", color: "#E2574C" }}>
              <ArrowUpCircle size={13} /> Stock out
            </button>
            <button onClick={() => setShowReorder(!showReorder)} className="flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium" style={{ background: "#4FA8A020", color: "#4FA8A0" }}>
              <RotateCcw size={13} /> Reorder
            </button>
          </div>

          {showReorder && (
            <div className="flex gap-2 mt-2">
              <input placeholder={`Qty ordered (${item.unit})`} type="number" value={reorderQty}
                onChange={(e) => setReorderQty(e.target.value)} className={inputCls} />
              <button onClick={logReorder} className="px-3 rounded-lg text-xs font-semibold shrink-0" style={{ background: accent, color: "#15181e" }}>Log</button>
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

          <button onClick={() => onDelete(item.id)} className="mt-3 flex items-center gap-1.5 text-xs text-zinc-600">
            <Trash2 size={12} /> Remove item
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [brand, setBrand] = useState("urbnfettch");
  const [tab, setTab] = useState("items");
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("All");
  const { items, save, loading } = useInventory(brand);
  const { name, save: saveName } = useName();
  const meta = BRANDS[brand];

  const lowStock = items.filter((i) => i.qty <= i.threshold);
  const visible = filter === "All" ? items : filter === "Low stock" ? lowStock : items.filter((i) => i.category === filter);

  const allHistory = useMemo(() => {
    const rows = [];
    items.forEach((i) => i.history.forEach((h) => rows.push({ ...h, itemName: i.name })));
    return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [items]);

  const updateItem = (updated) => save(items.map((i) => (i.id === updated.id ? updated : i)));
  const deleteItem = (id) => save(items.filter((i) => i.id !== id));
  const addItem = (item) => save([item, ...items]);

  if (!name) return <NameGate accent={meta.accent} onSet={saveName} />;

  return (
    <div className="min-h-screen w-full" style={{ background: "#15181e", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="px-4 pt-6 pb-4" style={{ borderBottom: "1px solid #ffffff0f" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Gauge size={18} style={{ color: meta.accent }} />
            <h1 className="text-lg font-bold text-zinc-100 tracking-tight">Inventory</h1>
          </div>
          <button onClick={() => saveName(null)} className="flex items-center gap-1 text-[11px] text-zinc-500">
            <User size={11} /> {name}
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

      <div className="flex gap-1 px-4 mt-4">
        {[
          { key: "items", label: "Items", icon: Package },
          { key: "history", label: "Full history", icon: HistoryIcon },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{ background: tab === key ? meta.accent : "transparent", color: tab === key ? "#15181e" : "#a1a1aa" }}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {tab === "items" && (
        <div className="flex gap-1.5 px-4 mt-3 overflow-x-auto">
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
      )}

      <div className="px-4 py-4 pb-24">
        {loading ? (
          <div className="text-center text-zinc-500 text-sm py-10">Loading…</div>
        ) : tab === "items" ? (
          <>
            {showForm && <ItemForm accent={meta.accent} name={name} onClose={() => setShowForm(false)} onAdd={addItem} />}
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
                <ItemCard key={item.id} item={item} accent={meta.accent} name={name} onUpdate={updateItem} onDelete={deleteItem} />
              ))}
            </div>
          </>
        ) : (
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
    </div>
  );
}
