import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingCart, Trash2, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import ClientNavbar from "@/components/ClientNavbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { toThumbPath, getSignedReadUrls } from "@/hooks/useS3Upload";
import { getThumbCdnUrl, IS_LAMBDA_PIPELINE_ACTIVE } from "@/lib/cdnConfig";

interface FavPhoto {
  id: string;
  file_url: string;
  file_name: string | null;
  event_id: string;
  event_name?: string;
  high_price?: number;
  low_price?: number;
}

export default function Favoritos() {
  const { favorites, toggleFavorite, count } = useFavorites();
  const { addItem } = useCart();
  const { user } = useAuth();
  const [photos, setPhotos] = useState<FavPhoto[]>([]);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (favorites.length === 0) {
      setPhotos([]);
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      const { data: photoData } = await supabase
        .from("event_photos")
        .select("id, file_url, file_name, event_id")
        .in("id", favorites);

      if (!photoData || photoData.length === 0) {
        setPhotos([]);
        setLoading(false);
        return;
      }

      const eventIds = [...new Set(photoData.map(p => p.event_id))];
      const { data: events } = await supabase
        .from("events")
        .select("id, name")
        .in("id", eventIds);
      const { data: prices } = await supabase
        .from("price_grids")
        .select("event_id, photo_high_price, photo_low_price")
        .in("event_id", eventIds);

      const eventMap = Object.fromEntries((events || []).map(e => [e.id, e.name]));
      const priceMap = Object.fromEntries((prices || []).map(p => [p.event_id, p]));

      const enriched = photoData.map(p => ({
        ...p,
        event_name: eventMap[p.event_id] || "Evento",
        high_price: priceMap[p.event_id]?.photo_high_price ?? 15,
        low_price: priceMap[p.event_id]?.photo_low_price ?? 11,
      }));

      setPhotos(enriched);

      // Thumbnails via CloudFront CDN (no signed URL roundtrip when pipeline active)
      try {
        if (IS_LAMBDA_PIPELINE_ACTIVE) {
          const map: Record<string, string> = {};
          for (const p of enriched) {
            const u = getThumbCdnUrl(p.file_url);
            if (u) map[toThumbPath(p.file_url)] = u;
          }
          setThumbUrls(map);
        } else {
          const thumbPaths = enriched.map(p => toThumbPath(p.file_url));
          const urls = await getSignedReadUrls(thumbPaths);
          setThumbUrls(urls);
        }
      } catch (err) {
        console.error("Failed to fetch thumb URLs for favorites:", err);
      }

      setLoading(false);
    };
    load();
  }, [favorites]);

  const getThumbUrl = (photo: FavPhoto) => {
    return thumbUrls[toThumbPath(photo.file_url)] || "";
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === photos.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(photos.map(p => p.id)));
    }
  };

  const addSelectedToCart = () => {
    const toAdd = photos.filter(p => selected.has(p.id));
    if (toAdd.length === 0) {
      toast.error("Selecione fotos para adicionar");
      return;
    }
    toAdd.forEach(p => {
      addItem({
        photoId: p.id,
        photoUrl: getThumbUrl(p),
        eventId: p.event_id,
        eventName: p.event_name || "Evento",
        resolution: "high",
        price: p.high_price || 15,
      });
    });
    toast.success(`${toAdd.length} foto(s) adicionada(s) ao carrinho!`);
    setSelected(new Set());
  };

  const addAllToCart = () => {
    photos.forEach(p => {
      addItem({
        photoId: p.id,
        photoUrl: getThumbUrl(p),
        eventId: p.event_id,
        eventName: p.event_name || "Evento",
        resolution: "high",
        price: p.high_price || 15,
      });
    });
    toast.success(`${photos.length} foto(s) adicionada(s) ao carrinho!`);
  };

  const totalValue = photos.reduce((sum, p) => sum + (p.high_price || 15), 0);

  return (
    <div className="min-h-screen bg-background">
      <ClientNavbar />
      <div className="pt-20 sm:pt-24 pb-12 container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground flex items-center gap-2">
              <Heart className="w-7 h-7 text-red-500 fill-red-500" />
              Meus Favoritos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {count} foto(s) salva(s)
            </p>
          </div>
          {photos.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                {selected.size === photos.length ? "Desmarcar todas" : "Selecionar todas"}
              </button>
              {selected.size > 0 && (
                <button
                  onClick={addSelectedToCart}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Adicionar {selected.size} ao carrinho
                </button>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-24">
            <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-xl font-bold text-foreground mb-2">Nenhum favorito ainda</h2>
            <p className="text-muted-foreground mb-6">
              Navegue pelos eventos e clique no ❤️ para salvar suas fotos favoritas
            </p>
            <Link
              to="/buscar"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all"
            >
              <Camera className="w-5 h-5" /> Explorar eventos
            </Link>
          </div>
        ) : (
          <>
            {/* Buy All Banner */}
            <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <p className="font-bold text-foreground">
                  Comprar todas as {photos.length} fotos
                </p>
                <p className="text-sm text-muted-foreground">
                  Total: <span className="text-primary font-bold">R$ {totalValue.toFixed(2)}</span>
                </p>
              </div>
              <button
                onClick={addAllToCart}
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold flex items-center gap-2 hover:bg-primary/90 transition-all whitespace-nowrap"
              >
                <ShoppingCart className="w-5 h-5" /> Comprar todas
              </button>
            </div>

            {/* Photo Grid — watermark baked into thumbnails */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {photos.map(photo => (
                <div
                  key={photo.id}
                  className={`relative group rounded-xl overflow-hidden aspect-[3/4] bg-secondary/30 border-2 transition-all ${
                    selected.has(photo.id) ? "border-primary" : "border-transparent"
                  }`}
                >
                  <div className="relative w-full h-full">
                    <img src={getThumbUrl(photo)} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>

                  {/* Select checkbox */}
                  <button
                    onClick={() => toggleSelect(photo.id)}
                    className={`absolute top-2 left-2 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                      selected.has(photo.id)
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-white/70 bg-black/30 backdrop-blur-sm"
                    }`}
                  >
                    {selected.has(photo.id) && <span className="text-xs font-bold">✓</span>}
                  </button>

                  {/* Remove favorite */}
                  <button
                    onClick={() => toggleFavorite(photo.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 backdrop-blur-sm text-red-400 hover:text-red-300 hover:bg-black/60 transition-all"
                  >
                    <Heart className="w-4 h-4 fill-current" />
                  </button>

                  {/* Bottom info */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
                    <p className="text-white text-xs truncate">{photo.event_name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-primary font-bold text-sm">
                        R$ {(photo.high_price || 15).toFixed(2)}
                      </span>
                      <button
                        onClick={() => {
                          addItem({
                            photoId: photo.id,
                            photoUrl: getThumbUrl(photo),
                            eventId: photo.event_id,
                            eventName: photo.event_name || "Evento",
                            resolution: "high",
                            price: photo.high_price || 15,
                          });
                          toast.success("Adicionada ao carrinho!");
                        }}
                        className="p-1.5 rounded-lg bg-primary/90 text-primary-foreground hover:bg-primary transition-all"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
