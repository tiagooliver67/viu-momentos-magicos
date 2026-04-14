import { useState, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Calendar, MapPin, Camera, ScanFace, Search, ShoppingCart, X, Heart, Lock, Share2, RefreshCw, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import LazyPhotoCard from "@/components/LazyPhotoCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/hooks/useCart";
import { useFavorites } from "@/hooks/useFavorites";
import { toast } from "sonner";
import {
  toThumbPath as cdnToThumbPath,
  toMediumPath as cdnToMediumPath,
  getThumbCdnUrl,
  getMediumCdnUrl,
  IS_LAMBDA_PIPELINE_ACTIVE,
} from "@/lib/cdnConfig";

/** Fetch signed read URLs without requiring auth */
async function getPublicSignedUrls(paths: string[]): Promise<Record<string, string>> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const res = await fetch(`${supabaseUrl}/functions/v1/s3-presign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": supabaseKey,
    },
    body: JSON.stringify({
      action: "sign_read_batch",
      objects: paths.map((p) => ({ path: p })),
    }),
  });

  if (!res.ok) throw new Error("Erro ao carregar imagens");
  const data = await res.json();
  const urlMap: Record<string, string> = {};
  for (const r of data.results || []) {
    if (r.url) urlMap[r.path] = r.url;
  }
  return urlMap;
}

const EventPage = () => {
  const { id } = useParams<{ id: string }>();
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [searchBib, setSearchBib] = useState("");
  const [resolution, setResolution] = useState<"high" | "low">("high");
  const [passwordInput, setPasswordInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const { addItem } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();

  // Fetch event
  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["public-event", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch photos
  const { data: photos } = useQuery({
    queryKey: ["public-photos", id],
    queryFn: async () => {
      if (!id) return [];
      const { data } = await supabase
        .from("event_photos")
        .select("*")
        .eq("event_id", id)
        .order("created_at");
      return data || [];
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Stable key: only changes when photo count or IDs actually change
  const photoIds = useMemo(() => photos?.map(p => p.id).sort().join(",") || "", [photos]);

  // Use centralized path helpers
  const toThumbPath = useCallback(cdnToThumbPath, []);
  const toMediumPath = useCallback(cdnToMediumPath, []);

  // Fetch signed URLs for THUMBNAILS (grid)
  // When CDN is active, thumb/medium are public — no signed URLs needed for them
  const { data: thumbUrls, isLoading: urlsLoading, error: urlsError, refetch: refetchUrls } = useQuery({
    queryKey: ["thumb-urls", id, photoIds],
    queryFn: async () => {
      if (!photos || photos.length === 0) return {};

      // If CDN is active, build CDN URLs directly — no edge function call needed
      if (IS_LAMBDA_PIPELINE_ACTIVE) {
        const urlMap: Record<string, string> = {};
        for (const p of photos) {
          const cdnThumb = getThumbCdnUrl(p.file_url);
          if (cdnThumb) {
            urlMap[toThumbPath(p.file_url)] = cdnThumb;
          }
        }
        return urlMap;
      }

      // Fallback: S3 signed URLs — only request original paths (thumb/medium don't exist without Lambda)
      const originalPaths = photos.map((p: any) => p.file_url);
      return getPublicSignedUrls(originalPaths);
    },
    enabled: !!photos && photos.length > 0,
    staleTime: IS_LAMBDA_PIPELINE_ACTIVE ? 60 * 60 * 1000 : 15 * 60 * 1000, // CDN URLs can be cached longer
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 2,
  });

  // Fetch medium URL only when a photo is selected (lightbox)
  const { data: mediumUrl, isLoading: mediumLoading } = useQuery({
    queryKey: ["medium-url", selectedPhoto?.file_url],
    queryFn: async () => {
      if (!selectedPhoto) return "";

      // If CDN is active, return CDN URL directly
      if (IS_LAMBDA_PIPELINE_ACTIVE) {
        return getMediumCdnUrl(selectedPhoto.file_url) || "";
      }

      // Fallback: signed URLs with medium -> thumb -> original chain
      const medPath = toMediumPath(selectedPhoto.file_url);
      const thumbPath = toThumbPath(selectedPhoto.file_url);
      const res = await getPublicSignedUrls([medPath, thumbPath, selectedPhoto.file_url]);
      return res[medPath] || res[thumbPath] || res[selectedPhoto.file_url] || "";
    },
    enabled: !!selectedPhoto,
    staleTime: IS_LAMBDA_PIPELINE_ACTIVE ? 60 * 60 * 1000 : 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch price grid
  const { data: priceGrid } = useQuery({
    queryKey: ["public-price", id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase
        .from("price_grids")
        .select("*")
        .eq("event_id", id)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  // Fetch photographer site for watermark
  const { data: photographerSite } = useQuery({
    queryKey: ["photographer-site-event", event?.organizer_id],
    queryFn: async () => {
      if (!event?.organizer_id) return null;
      const { data } = await supabase
        .from("photographer_sites")
        .select("watermark_url, display_name, slug, watermark_position, watermark_opacity, watermark_size")
        .eq("user_id", event.organizer_id)
        .maybeSingle();
      return data;
    },
    enabled: !!event?.organizer_id,
  });

  const highPrice = priceGrid?.photo_high_price ?? 15;
  const lowPrice = priceGrid?.photo_low_price ?? 11;
  const photoList = photos || [];

  const getPhotoUrl = useCallback((photo: any) => {
    if (IS_LAMBDA_PIPELINE_ACTIVE) {
      const thumbPath = toThumbPath(photo.file_url);
      return thumbUrls?.[thumbPath] || thumbUrls?.[photo.file_url] || "";
    }
    // Without Lambda, only original paths exist
    return thumbUrls?.[photo.file_url] || "";
  }, [thumbUrls, toThumbPath]);

  // Password protection
  if (event?.password && !unlocked) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="glass-card p-8 max-w-sm w-full text-center space-y-4">
            <Lock className="w-12 h-12 text-primary mx-auto" />
            <h2 className="text-xl font-bold">Evento protegido</h2>
            <p className="text-sm text-muted-foreground">Digite a senha para acessar as fotos</p>
            <input
              type="password"
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              placeholder="Senha"
              className="w-full bg-secondary/50 rounded-lg px-4 py-3 text-sm outline-none border border-border focus:border-primary"
            />
            <button
              onClick={() => {
                if (passwordInput === event.password) {
                  setUnlocked(true);
                } else {
                  toast.error("Senha incorreta");
                }
              }}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold"
            >
              Acessar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (eventLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen text-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">Evento não encontrado</h1>
            <Link to="/" className="text-primary hover:underline">Voltar</Link>
          </div>
        </div>
      </div>
    );
  }

  const handleAddToCart = (photo: any, res: "high" | "low") => {
    addItem({
      photoId: photo.id,
      photoUrl: getPhotoUrl(photo),
      eventId: id,
      eventName: event.name,
      resolution: res,
      price: res === "high" ? highPrice : lowPrice,
    });
    toast.success("Foto adicionada ao carrinho!");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-14 sm:pt-20">
        {/* Event Header */}
        <div className="relative h-48 sm:h-64 overflow-hidden">
          <img src={event.cover_url || "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1200&q=80"} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute bottom-4 sm:bottom-6 left-0 right-0 container mx-auto px-4">
            {event.status === "ativo" && <span className="badge-live mb-2 sm:mb-3">AO VIVO</span>}
            <h1 className="text-xl sm:text-3xl md:text-4xl font-black text-foreground mt-2">{event.name}</h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3 sm:w-4 sm:h-4" /> {new Date(event.event_date).toLocaleDateString("pt-BR")}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3 sm:w-4 sm:h-4" /> {event.location}</span>
              <span className="flex items-center gap-1"><Camera className="w-3 h-3 sm:w-4 sm:h-4" /> {photoList.length} fotos</span>
              {photographerSite?.slug && (
                <Link to={`/fotografo/${photographerSite.slug}`} className="text-primary hover:underline">
                  # Evento por {photographerSite.display_name || "Fotógrafo"}
                </Link>
              )}
            </div>
          </div>
          {/* Cart button */}
          <div className="absolute top-4 right-4">
            <CartDrawer />
          </div>
        </div>

        <div className="container mx-auto px-4 py-4 sm:py-8">
          {/* Search */}
          <div className="glass-card p-3 sm:p-4 mb-6 sm:mb-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                placeholder="Buscar por número de peito..."
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm py-2 min-w-0"
                value={searchBib}
                onChange={(e) => setSearchBib(e.target.value)}
              />
            </div>
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/80 transition-all justify-center min-h-[44px]">
              <ScanFace className="w-5 h-5" />
              Reconhecimento Facial
            </button>
          </div>

          {/* Skeleton loading */}
          {urlsLoading && photoList.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
              {Array.from({ length: Math.min(photoList.length, 20) }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
              ))}
            </div>
          )}

          {/* Error state */}
          {urlsError && (
            <div className="text-center py-16">
              <Camera className="w-12 h-12 mx-auto mb-3 text-destructive opacity-50" />
              <p className="text-muted-foreground mb-3">Erro ao carregar imagens. Tente novamente.</p>
              <button
                onClick={() => refetchUrls()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar novamente
              </button>
            </div>
          )}

          {/* Photo Grid with watermarks */}
          {!urlsLoading && !urlsError && photoList.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Camera className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma foto publicada neste evento ainda.</p>
            </div>
          )}

          {!urlsLoading && !urlsError && photoList.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
              {photoList.map((photo: any) => (
                <LazyPhotoCard
                  key={photo.id}
                  photoId={photo.id}
                  photoUrl={getPhotoUrl(photo)}
                  isFav={isFavorite(photo.id)}
                  onToggleFavorite={toggleFavorite}
                  onClick={() => setSelectedPhoto(photo)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-end sm:justify-center"
          onClick={() => setSelectedPhoto(null)}
        >
          {/* Close button — always visible */}
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-3 right-3 z-20 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div
            className="flex flex-col sm:flex-row sm:items-center sm:justify-center w-full sm:max-w-5xl sm:mx-auto overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Image area — shrink-wrap on mobile, no flex-1 */}
            <div className="relative bg-black flex items-center justify-center p-1 sm:p-2 sm:flex-1 sm:min-h-0">
              {(() => {
                const imgSrc = mediumUrl || getPhotoUrl(selectedPhoto);
                if (mediumLoading && !imgSrc) {
                  return <Loader2 className="w-8 h-8 text-white/60 animate-spin" />;
                }
                if (!imgSrc) {
                  return (
                    <div className="text-white/40 text-center">
                      <Camera className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Não foi possível carregar a imagem</p>
                    </div>
                  );
                }
                return (
                  <img
                    src={imgSrc}
                    alt=""
                    className="max-w-full max-h-[45dvh] sm:max-h-[75vh] object-contain rounded"
                  />
                );
              })()}
              {/* Favorite & Share in lightbox */}
              <div className="absolute top-4 left-4 flex gap-2">
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/foto/${selectedPhoto.id}`;
                    navigator.clipboard.writeText(url);
                    toast.success("Link copiado!");
                  }}
                  className="p-2.5 rounded-full bg-black/50 text-white/80 hover:bg-black/70 backdrop-blur-sm transition-all active:scale-90 min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    const fav = isFavorite(selectedPhoto.id);
                    toggleFavorite(selectedPhoto.id);
                    toast.success(fav ? "Removido dos favoritos" : "Adicionado aos favoritos ❤️");
                  }}
                  className={`p-2.5 rounded-full backdrop-blur-sm transition-all active:scale-90 min-w-[44px] min-h-[44px] flex items-center justify-center ${
                    isFavorite(selectedPhoto.id)
                      ? "bg-red-500/80 text-white shadow-lg shadow-red-500/30"
                      : "bg-black/50 text-white/80 hover:bg-black/70"
                  }`}
                >
                  <Heart className={`w-5 h-5 transition-all ${isFavorite(selectedPhoto.id) ? "fill-current" : ""}`} />
                </button>
              </div>
            </div>

            {/* Purchase panel — scrollable on mobile */}
            <div className="w-full sm:w-80 p-3 sm:p-6 space-y-2 sm:space-y-4 overflow-y-auto bg-background rounded-t-2xl sm:rounded-none shrink-0 max-h-[50dvh] sm:max-h-[75vh]">
              <h3 className="font-bold text-foreground text-lg">Foto digital para download</h3>

              <div className="space-y-2">
                <label
                  onClick={() => setResolution("high")}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    resolution === "high" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      resolution === "high" ? "border-primary" : "border-muted-foreground"
                    }`}>
                      {resolution === "high" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </div>
                    <span className="text-sm">Alta resolução</span>
                  </div>
                  <span className="text-primary font-bold">R$ {highPrice.toFixed(2)}</span>
                </label>
                <label
                  onClick={() => setResolution("low")}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    resolution === "low" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      resolution === "low" ? "border-primary" : "border-muted-foreground"
                    }`}>
                      {resolution === "low" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </div>
                    <span className="text-sm">Baixa resolução</span>
                  </div>
                  <span className="text-primary font-bold">R$ {lowPrice.toFixed(2)}</span>
                </label>
              </div>

              <button
                onClick={() => handleAddToCart(selectedPhoto, resolution)}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 min-h-[48px]"
              >
                <ShoppingCart className="w-5 h-5" />
                + Adicionar ao carrinho
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="flex-1 py-3 rounded-xl border border-primary text-primary font-medium text-sm hover:bg-primary/10 transition-all"
                >
                  Continuar comprando
                </button>
                <button
                  onClick={() => {
                    setSelectedPhoto(null);
                    setTimeout(() => {
                      const cartBtn = document.querySelector('[data-cart-trigger]') as HTMLElement;
                      cartBtn?.click();
                    }, 100);
                  }}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all"
                >
                  Ir para o carrinho
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default EventPage;
