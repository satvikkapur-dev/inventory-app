import { useState, useEffect, useMemo } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import {
  Plus, Package, AlertTriangle, Trash2, X, ChevronDown, ChevronUp,
  Truck, Clock, ArrowDownCircle, ArrowUpCircle, RotateCcw, Gauge, User, History as HistoryIcon,
  Shield, LogIn, Lock, Pencil,
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
    <div className="min-h-screen w-full flex items-center justify-center px-6" style={{ background: "#15181e", fontFamil
