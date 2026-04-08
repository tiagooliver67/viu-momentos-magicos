import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Calendar, MapPin, Camera, ScanFace, Search, ShoppingCart, X, Heart, Lock, Share2, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WatermarkCanvas from "@/components/WatermarkCanvas";
import CartDrawer from "@/components/CartDrawer";
import { useCart } from "@/hooks/useCart";
import { useFavorites } from "@/hooks/useFavorites";
import { toast } from "sonner";

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
        .select("watermark_url, display_name, slug")
        .eq("user_id", event.organizer_id)
        .maybeSingle();
      return data;
    },
    enabled: !!event?.organizer_id,
  });

  const highPrice = priceGrid?.photo_high_price ?? 15;
  const lowPrice = priceGrid?.photo_low_price ?? 11;
  const photoList = photos || [];

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
      photoUrl: photo.file_url,
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

          {/* Photo Grid with watermarks */}
          {photoList.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Camera className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma foto publicada neste evento ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
              {photoList.map((photo: any) => {
                const fav = isFavorite(photo.id);
                return (
                  <div
                    key={photo.id}
                    className="relative group cursor-pointer rounded-lg overflow-hidden aspect-[3/4] bg-secondary/30"
                  >
                    <div onClick={() => setSelectedPhoto(photo)} className="w-full h-full">
                      <WatermarkCanvas
                        src={photo.file_url}
                        watermarkUrl={photographerSite?.watermark_url || undefined}
                        watermarkText={photographerSite?.display_name || "VIUFOTO"}
                        className="w-full h-full"
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = `${window.location.origin}/foto/${photo.id}`;
                          navigator.clipboard.writeText(url);
                          toast.success("Link copiado!");
                        }}
                        className="p-2 rounded-full bg-black/40 text-white/80 hover:bg-black/60 backdrop-blur-sm transition-all transform active:scale-90"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(photo.id);
                          toast.success(fav ? "Removido dos favoritos" : "Adicionado aos favoritos ❤️");
                        }}
                        className={`p-2 rounded-full backdrop-blur-sm transition-all transform active:scale-90 ${
                          fav
                            ? "bg-red-500/80 text-white shadow-lg shadow-red-500/30"
                            : "bg-black/40 text-white/80 hover:bg-black/60 hover:text-white"
                        }`}
                      >
                        <Heart className={`w-4 h-4 transition-all ${fav ? "fill-current scale-110" : ""}`} />
                      </button>
                    </div>

                    <div className="absolute inset-0 bg-background/0 group-hover:bg-background/40 transition-all flex items-end p-2 pointer-events-none">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity w-full">
                        <span className="text-primary font-bold text-xs bg-background/80 px-2 py-1 rounded">
                          R$ {highPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex items-end sm:items-center justify-center" onClick={() => setSelectedPhoto(null)}>
          <div className="relative w-full sm:max-w-4xl sm:mx-4 max-h-[100dvh] sm:max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedPhoto(null)} className="absolute top-3 right-3 sm:-top-12 sm:right-0 p-2 text-muted-foreground hover:text-foreground z-10 min-w-[44px] min-h-[44px] flex items-center justify-center bg-background/50 sm:bg-transparent rounded-full">
              <X className="w-6 h-6" />
            </button>
            <div className="glass-card overflow-hidden rounded-t-2xl sm:rounded-xl flex flex-col sm:flex-row max-h-[90dvh] sm:max-h-none">
              <div className="flex-1 relative bg-black/20">
                <WatermarkCanvas
                  src={selectedPhoto.file_url}
                  watermarkUrl={photographerSite?.watermark_url || undefined}
                  watermarkText={photographerSite?.display_name || "VIUFOTO"}
                  className="w-full h-48 sm:h-full sm:min-h-[400px]"
                />
                {/* Favorite in lightbox */}
                <button
                  onClick={() => {
                    const fav = isFavorite(selectedPhoto.id);
                    toggleFavorite(selectedPhoto.id);
                    toast.success(fav ? "Removido dos favoritos" : "Adicionado aos favoritos ❤️");
                  }}
                  className={`absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-sm transition-all transform active:scale-90 ${
                    isFavorite(selectedPhoto.id)
                      ? "bg-red-500/80 text-white shadow-lg shadow-red-500/30"
                      : "bg-black/40 text-white/80 hover:bg-black/60"
                  }`}
                >
                  <Heart className={`w-5 h-5 transition-all ${isFavorite(selectedPhoto.id) ? "fill-current" : ""}`} />
                </button>
              </div>
              <div className="w-full sm:w-80 p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto">
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
                      <span className="text-sm">Foto digital em alta resolução</span>
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
                      <span className="text-sm">Foto digital em baixa resolução</span>
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
                  <button className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all">
                    Ir para o carrinho
                  </button>
                </div>
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
