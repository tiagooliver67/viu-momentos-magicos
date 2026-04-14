import { useState, useEffect, useCallback, useSyncExternalStore } from "react";

interface CartItem {
  id: string;
  photoId?: string;
  videoId?: string;
  photoUrl: string;
  eventId?: string;
  eventName: string;
  resolution: "high" | "low";
  price: number;
}

const CART_KEY = "viufoto_cart";
const CART_CHANGE_EVENT = "viufoto_cart_change";

function getSessionId() {
  let id = localStorage.getItem("viufoto_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("viufoto_session_id", id);
  }
  return id;
}

// Shared external store so all useCart() instances stay in sync
let cartSnapshot: CartItem[] = (() => {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
})();

function getSnapshot() {
  return cartSnapshot;
}

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function setCart(next: CartItem[] | ((prev: CartItem[]) => CartItem[])) {
  const value = typeof next === "function" ? next(cartSnapshot) : next;
  cartSnapshot = value;
  localStorage.setItem(CART_KEY, JSON.stringify(value));
  listeners.forEach(cb => cb());
  window.dispatchEvent(new Event(CART_CHANGE_EVENT));
}

// Listen for changes from other tabs
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === CART_KEY) {
      try {
        cartSnapshot = JSON.parse(e.newValue || "[]");
      } catch {
        cartSnapshot = [];
      }
      listeners.forEach(cb => cb());
    }
  });
}

export function useCart() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const addItem = useCallback((item: Omit<CartItem, "id">) => {
    setCart(prev => {
      const exists = prev.find(i => i.photoId === item.photoId && i.resolution === item.resolution);
      if (exists) return prev;
      return [...prev, { ...item, id: crypto.randomUUID() }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const total = items.reduce((sum, i) => sum + i.price, 0);
  const sessionId = getSessionId();

  return { items, addItem, removeItem, clearCart, total, count: items.length, sessionId };
}
