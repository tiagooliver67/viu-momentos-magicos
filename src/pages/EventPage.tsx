import { useState } from "react";
import { Calendar, MapPin, Camera, ScanFace, Search, ShoppingCart, X, Heart } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const photos = Array.from({ length: 24 }, (_, i) => ({
  id: String(i + 1),
  url: `https://images.unsplash.com/photo-${[
    "1552674605-db6ffd4facb5", "1571008887538-b36bb32f4571", "1513593771513-7b58b6c4af38",
    "1486218119243-13883505764c", "1517649763962-0c623066013b", "1461896836934-bd45ba24e7af",
    "1476480862126-209bfaa8edc8", "1544899489-a083461b088c", "1530143584546-02191bc84eb5",
    "1558618666-fcd25c85f82e", "1507035895480-2b3156c31fc8", "1541625602330-2277a4c46182",
  ][i % 12]}?w=400&q=80`,
  bibNumber: String(1000 + i * 7),
  price: i % 3 === 0 ? 18.90 : 15.00,
}));

const EventPage = () => {
  const [selectedPhoto, setSelectedPhoto] = useState<typeof photos[0] | null>(null);
  const [searchBib, setSearchBib] = useState("");

  const filteredPhotos = searchBib
    ? photos.filter(p => p.bibNumber.includes(searchBib))
    : photos;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-14 sm:pt-20">
        {/* Event Header */}
        <div className="relative h-48 sm:h-64 overflow-hidden">
          <img src="https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1200&q=80" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute bottom-4 sm:bottom-6 left-0 right-0 container mx-auto px-4">
            <span className="badge-live mb-2 sm:mb-3">AO VIVO</span>
            <h1 className="text-xl sm:text-3xl md:text-4xl font-black text-foreground mt-2">VERÃO RUN IRECÊ 22.03.2026</h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3 sm:w-4 sm:h-4" /> domingo - 22.03.26</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3 sm:w-4 sm:h-4" /> Irecê, BA</span>
              <span className="flex items-center gap-1"><Camera className="w-3 h-3 sm:w-4 sm:h-4" /> 2.615 fotos</span>
            </div>
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

          {/* Photo Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                className="relative group cursor-pointer rounded-lg overflow-hidden aspect-square"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img src={photo.url} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" loading="lazy" />
                <div className="absolute inset-0 bg-background/0 group-hover:bg-background/40 transition-all flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-1">
                    <span className="text-foreground font-bold text-xs sm:text-sm">#{photo.bibNumber}</span>
                    <span className="text-primary font-bold text-[10px] sm:text-xs">R$ {photo.price.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox - fully mobile optimized */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex items-end sm:items-center justify-center" onClick={() => setSelectedPhoto(null)}>
          <div className="relative w-full sm:max-w-4xl sm:mx-4 max-h-[100dvh] sm:max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedPhoto(null)} className="absolute top-3 right-3 sm:-top-12 sm:right-0 p-2 text-muted-foreground hover:text-foreground z-10 min-w-[44px] min-h-[44px] flex items-center justify-center bg-background/50 sm:bg-transparent rounded-full">
              <X className="w-6 h-6" />
            </button>
            <div className="glass-card overflow-hidden rounded-t-2xl sm:rounded-xl flex flex-col sm:flex-row max-h-[90dvh] sm:max-h-none">
              <div className="flex-1 relative">
                <img src={selectedPhoto.url.replace("w=400", "w=800")} alt="" className="w-full h-48 sm:h-full object-cover sm:min-h-[300px]" />
              </div>
              <div className="w-full sm:w-80 p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto">
                <h3 className="font-bold text-foreground text-base sm:text-lg">Foto Selecionada</h3>
                <p className="text-sm text-muted-foreground">Atleta #{selectedPhoto.bibNumber}</p>

                <div className="space-y-2 sm:space-y-3">
                  <div className="glass-card p-3 sm:p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Alta resolução</p>
                      <p className="text-xs text-muted-foreground">Download em HD</p>
                    </div>
                    <span className="text-primary font-bold">R$ {selectedPhoto.price.toFixed(2)}</span>
                  </div>
                  <div className="glass-card p-3 sm:p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Baixa resolução</p>
                      <p className="text-xs text-muted-foreground">Download digital</p>
                    </div>
                    <span className="text-primary font-bold">R$ 11,00</span>
                  </div>
                </div>

                <button className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all hover:shadow-[0_0_20px_rgba(255,77,0,0.3)] flex items-center justify-center gap-2 min-h-[48px]">
                  <ShoppingCart className="w-5 h-5" />
                  Adicionar ao Carrinho
                </button>
                <button className="w-full py-3 rounded-xl border border-border text-muted-foreground font-medium text-sm hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 min-h-[48px]">
                  <Heart className="w-5 h-5" />
                  Favoritar
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
