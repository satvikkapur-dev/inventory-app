// Standalone Node script for the scheduled inventory watcher (see Routine set up
// alongside this commit). Reads live Firestore data and reports anything that
// needs a human: items at/below reorder point, and orders past their due date.
//
// Run with: node scripts/inventory-watch.mjs
import { getDoc, doc } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { db, auth } from "../src/firebase.js";

const BRANDS = ["urbnfettch", "homecare"];

async function loadItems(scope) {
  const snap = await getDoc(doc(db, "inventory", scope));
  return snap.exists() ? snap.data().items || [] : [];
}

async function loadOrders(brand) {
  const snap = await getDoc(doc(db, "orders", brand));
  return snap.exists() ? snap.data().orders || [] : [];
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  return Math.round((due - today) / 86400000);
}

async function main() {
  await signInAnonymously(auth);

  const lowStock = [];
  const overdueOrders = [];

  for (const scope of [...BRANDS, "shared"]) {
    const items = await loadItems(scope);
    for (const item of items) {
      if (item.qty <= item.threshold) {
        lowStock.push({ scope, name: item.name, qty: item.qty, unit: item.unit, threshold: item.threshold });
      }
    }
  }

  for (const brand of BRANDS) {
    const orders = await loadOrders(brand);
    for (const order of orders) {
      const dLeft = daysUntil(order.dueDate);
      if (dLeft != null && dLeft < 0 && order.status !== "completed") {
        overdueOrders.push({ brand, customerName: order.customerName, dueDate: order.dueDate, daysOverdue: -dLeft });
      }
    }
  }

  const report = { checkedAt: new Date().toISOString(), lowStock, overdueOrders };
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error("Inventory watch failed:", err);
  process.exit(1);
});
