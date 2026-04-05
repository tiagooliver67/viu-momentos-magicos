import { useState, useEffect, useCallback } from "react";

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

function getSessionId() {
  let id = localStorage.getItem("viufoto_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("viufoto_session_id", id);
  }
  return id;
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((item: Omit<CartItem, "id">) => {
    setItems(prev => {
      const exists = prev.find(i => i.photoId === item.photoId && i.resolution === item.resolution);
      if (exists) return prev;
      return [...prev, { ...item, id: crypto.randomUUID() }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = items.reduce((sum, i) => sum + i.price, 0);
  const sessionId = getSessionId();

  return { items, addItem, removeItem, clearCart, total, count: items.length, sessionId };
}
