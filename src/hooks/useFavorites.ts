import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const LOCAL_KEY = "viufoto_favorites";

function getLocalFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    return [];
  }
}

function setLocalFavorites(ids: string[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(ids));
}

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>(getLocalFavorites);
  const [syncing, setSyncing] = useState(false);

  // Load from DB when user logs in
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("favorites")
        .select("photo_id")
        .eq("user_id", user.id);
      const dbIds = (data || []).map((r: any) => r.photo_id);
      // Merge local favorites into DB
      const localIds = getLocalFavorites();
      const toSync = localIds.filter(id => !dbIds.includes(id));
      if (toSync.length > 0) {
        setSyncing(true);
        const rows = toSync.map(photo_id => ({ user_id: user.id, photo_id }));
        await supabase.from("favorites").upsert(rows, { onConflict: "user_id,photo_id" });
        setSyncing(false);
        localStorage.removeItem(LOCAL_KEY);
        setFavorites([...new Set([...dbIds, ...toSync])]);
      } else {
        localStorage.removeItem(LOCAL_KEY);
        setFavorites(dbIds);
      }
    };
    load();
  }, [user]);

  const isFavorite = useCallback((photoId: string) => favorites.includes(photoId), [favorites]);

  const toggleFavorite = useCallback(async (photoId: string) => {
    const isFav = favorites.includes(photoId);

    // Optimistic update
    const next = isFav ? favorites.filter(id => id !== photoId) : [...favorites, photoId];
    setFavorites(next);

    if (user) {
      if (isFav) {
        await supabase.from("favorites").delete().eq("user_id", user.id).eq("photo_id", photoId);
      } else {
        await supabase.from("favorites").insert({ user_id: user.id, photo_id: photoId });
      }
    } else {
      setLocalFavorites(next);
    }
  }, [favorites, user]);

  return { favorites, isFavorite, toggleFavorite, count: favorites.length, syncing };
}
