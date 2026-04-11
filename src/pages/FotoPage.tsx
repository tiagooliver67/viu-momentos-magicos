import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Calendar, MapPin, Camera, ShoppingCart, Heart, Share2, ArrowLeft, Check, Copy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { useCart } from "@/hooks/useCart";
import { useFavorites } from "@/hooks/useFavorites";
import { toast } from "sonner";
import { toThumbPath, toMediumPath } from "@/hooks/useS3Upload";

/** Fetch signed read URLs without requiring auth */
async function getPublicSignedUrls(paths: string[]): Promise<Record<string, string>> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const res = await fetch(`${supabaseUrl}/functions/v1/s3-presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: supabaseKey },
    body: JSON.stringify({ action: "sign_read_batch", objects: paths.map(p => ({ path: p })) }),
  });
  if (!res.ok) throw new Error("Erro ao carregar imagens");
  const data = await res.json();
  const urlMap: Record<string, string> = {};
  for (const r of data.results || []) {
    if (r.url) urlMap[r.path] = r.url;
  }
  return urlMap;
}

const FotoPage = () => {
  const { photoId } = useParams<{ photoId: string }>();
  const navigate = useNavigate();
  const [resolution, setResolution] = useState<"high" | "low">("high");
  const [copied, setCopied] = useState(false);
  const { addItem } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();

  // Fetch photo
  const { data: photo, isLoading: photoLoading } = useQuery({
    queryKey: ["shared-photo", photoId],
    queryFn: async () => {
      if (!photoId) return null;
      const { data, error } = await supabase
        .from("event_photos")
        .select("*")
        .eq("id", photoId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!photoId,
  });

  // Fetch event
  const { data: event } = useQuery({
    queryKey: ["shared-photo-event", photo?.event_id],
    queryFn: async () => {
      if (!photo?.event_id) return null;
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", photo.event_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!photo?.event_id,
  });

  // Fetch price grid
  const { data: priceGrid } = useQuery({
    queryKey: ["shared-photo-price", photo?.event_id],
    queryFn: async () => {
      if (!photo?.event_id) return null;
      const { data } = await supabase
        .from("price_grids")
        .select("*")
        .eq("event_id", photo.event_id)
        .maybeSingle();
      return data;
    },
    enabled: !!photo?.event_id,
  });

  // Fetch photographer site for display name/slug only
  const { data: photographerSite } = useQuery({
    queryKey: ["shared-photo-photographer", event?.organizer_id],
    queryFn: async () => {
      if (!event?.organizer_id) return null;
      const { data } = await supabase
        .from("photographer_sites")
        .select("display_name, slug")
        .eq("user_id", event.organizer_id)
        .maybeSingle();
      return data;
    },
    enabled: !!event?.organizer_id,
  });

  // Fetch MEDIUM signed URL for the main photo (watermarked, NOT original)
  const { data: photoSignedUrl } = useQuery({
    queryKey: ["foto-medium-url", photo?.file_url],
    queryFn: async () => {
      if (!photo?.file_url) return "";
      const medPath = toMediumPath(photo.file_url);
      const thumbPath = toThumbPath(photo.file_url);
      // Also request original as fallback for legacy photos
      const res = await getPublicSignedUrls([medPath, thumbPath, photo.file_url]);
      return res[medPath] || res[thumbPath] || res[photo.file_url] || "";
    },
    enabled: !!photo?.file_url,
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch related photos thumbnails
  const { data: relatedPhotos } = useQuery({
    queryKey: ["related-photos", photo?.event_id, photoId],
    queryFn: async () => {
      if (!photo?.event_id) return [];
      const { data } = await supabase
        .from("event_photos")
        .select("*")
        .eq("event_id", photo.event_id)
        .neq("id", photoId!)
        .limit(8)
        .order("created_at");
      return data || [];
    },
    enabled: !!photo?.event_id,
  });

  // Fetch thumbnail signed URLs for related photos (with original fallback)
  const { data: relatedThumbUrls } = useQuery({
    queryKey: ["related-thumb-urls", relatedPhotos?.map(p => p.id).join(",")],
    queryFn: async () => {
      if (!relatedPhotos || relatedPhotos.length === 0) return {};
      const thumbPaths = relatedPhotos.map(p => toThumbPath(p.file_url));
      const originalPaths = relatedPhotos.map(p => p.file_url);
      const allPaths = [...new Set([...thumbPaths, ...originalPaths])];
      return getPublicSignedUrls(allPaths);
    },
    enabled: !!relatedPhotos && relatedPhotos.length > 0,
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const highPrice = priceGrid?.photo_high_price ?? 15;
  const lowPrice = priceGrid?.photo_low_price ?? 11;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/foto/${photoId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddToCart = () => {
    if (!photo || !event) return;
    addItem({
      photoId: photo.id,
      photoUrl: photoSignedUrl || "",
      eventId: event.id,
      eventName: event.name,
      resolution,
      price: resolution === "high" ? highPrice : lowPrice,
    });
    toast.success("Foto adicionada ao carrinho!");
  };

  if (photoLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!photo) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen text-center">
          <div>
            <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
            <h1 className="text-2xl font-bold mb-2">Foto não encontrada</h1>
            <p className="text-muted-foreground mb-4">Esta foto pode ter sido removida ou o link é inválido.</p>
            <Link to="/" className="text-primary hover:underline">Voltar à página inicial</Link>
          </div>
        </div>
      </div>
    );
  }

  const fav = isFavorite(photo.id);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-16 sm:pt-20">
        <div className="container mx-auto px-4 py-6 sm:py-10">
          {/* Back + Cart */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <CartDrawer />
          </div>

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
            {/* Photo — watermark is baked in, no overlay */}
            <div className="relative rounded-xl overflow-hidden bg-secondary/30 aspect-[4/3]">
              <img
                src={photoSignedUrl || ""}
                alt=""
                className="w-full h-full object-contain"
              />

              {/* Action buttons overlay */}
              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  onClick={() => {
                    toggleFavorite(photo.id);
                    toast.success(fav ? "Removido dos favoritos" : "Adicionado aos favoritos ❤️");
                  }}
                  className={`p-2.5 rounded-full backdrop-blur-sm transition-all transform active:scale-90 ${
                    fav
                      ? "bg-red-500/80 text-white shadow-lg shadow-red-500/30"
                      : "bg-black/40 text-white/80 hover:bg-black/60"
                  }`}
                >
                  <Heart className={`w-5 h-5 ${fav ? "fill-current" : ""}`} />
                </button>
                <button
                  onClick={handleCopyLink}
                  className="p-2.5 rounded-full bg-black/40 text-white/80 hover:bg-black/60 backdrop-blur-sm transition-all transform active:scale-90"
                >
                  {copied ? <Check className="w-5 h-5 text-green-400" /> : <Share2 className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Info + Purchase panel */}
            <div className="space-y-6">
              {/* Event info */}
              {event && (
                <div className="glass-card p-5 space-y-3">
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground">{event.name}</h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {new Date(event.event_date).toLocaleDateString("pt-BR")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {event.location}
                    </span>
                    <span className="inline-block px-2 py-0.5 rounded-full bg-secondary text-xs font-medium">
                      {event.category}
                    </span>
                  </div>
                  {photographerSite?.slug && (
                    <Link
                      to={`/fotografo/${photographerSite.slug}`}
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      {photographerSite.display_name || "Fotógrafo"}
                    </Link>
                  )}
                </div>
              )}

              {/* Purchase options */}
              <div className="glass-card p-5 space-y-4">
                <h2 className="font-bold text-foreground text-lg">Comprar esta foto</h2>

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
                  onClick={handleAddToCart}
                  className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 min-h-[48px]"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Comprar esta foto
                </button>

                {event && (
                  <Link
                    to={`/evento/${event.id}`}
                    className="block w-full py-3 rounded-xl border border-primary text-primary font-medium text-sm hover:bg-primary/10 transition-all text-center"
                  >
                    Ver mais fotos do evento →
                  </Link>
                )}
              </div>

              {/* Share */}
              <div className="glass-card p-5 space-y-3">
                <h3 className="font-semibold text-foreground text-sm">Compartilhar esta foto</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-secondary hover:bg-secondary/80 text-sm transition-all"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copiado!" : "Copiar link"}
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Olha essa foto! ${window.location.origin}/foto/${photoId}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm transition-all"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Related photos — thumbnails with watermark baked in */}
          {relatedPhotos && relatedPhotos.length > 0 && (
            <div className="mt-10 sm:mt-14">
              <h2 className="text-xl font-bold text-foreground mb-4">Mais fotos deste evento</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                {relatedPhotos.map((rp: any) => {
                  const thumbPath = toThumbPath(rp.file_url);
                  const thumbUrl = relatedThumbUrls?.[thumbPath] || relatedThumbUrls?.[rp.file_url] || "";
                  return (
                    <Link
                      key={rp.id}
                      to={`/foto/${rp.id}`}
                      className="relative rounded-lg overflow-hidden aspect-[3/4] bg-secondary/30 group"
                    >
                      <img
                        src={thumbUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-background/0 group-hover:bg-background/30 transition-all" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default FotoPage;
