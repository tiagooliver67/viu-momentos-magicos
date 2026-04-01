import { Search, Camera, ScanFace } from "lucide-react";
import { useState } from "react";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"text" | "face">("text");

  return (
    <section className="relative min-h-[70vh] sm:min-h-[85vh] flex items-center justify-center overflow-hidden pt-14 sm:pt-0">
      <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover" width={1920} height={1080} />
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background" />

      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6" style={{ animation: "fade-in-up 0.6s ease-out" }}>
          <Camera className="w-4 h-4" />
          Plataforma #1 de fotos esportivas do Brasil
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-foreground leading-tight mb-4 glow-text" style={{ animation: "fade-in-up 0.6s ease-out 0.1s", animationFillMode: "both" }}>
          Viu sua foto?<br />
          <span className="text-primary">Agora é só levar pra casa!</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10" style={{ animation: "fade-in-up 0.6s ease-out 0.2s", animationFillMode: "both" }}>
          Encontre suas fotos e vídeos de corridas, ciclismo, triathlon e muito mais.
        </p>

        <div className="max-w-2xl mx-auto" style={{ animation: "fade-in-up 0.6s ease-out 0.3s", animationFillMode: "both" }}>
          <div className="glass-card p-2 flex items-center gap-2 neon-border">
            <div className="flex items-center gap-1 pl-2">
              <button
                onClick={() => setSearchMode("text")}
                className={`p-2 rounded-lg transition-all ${searchMode === "text" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Search className="w-5 h-5" />
              </button>
              <button
                onClick={() => setSearchMode("face")}
                className={`p-2 rounded-lg transition-all ${searchMode === "face" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <ScanFace className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              placeholder={searchMode === "text" ? "Digite o nome do evento ou nº de peito..." : "Envie sua selfie para encontrar suas fotos..."}
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm md:text-base py-3 px-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="px-4 sm:px-6 py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all hover:shadow-[0_0_20px_rgba(255,77,0,0.4)] min-h-[44px]">
              Buscar
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Não sabe o nome do evento? <button className="text-accent hover:underline">Clique aqui</button>
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
