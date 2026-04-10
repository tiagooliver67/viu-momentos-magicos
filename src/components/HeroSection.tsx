import { Search, Camera, ScanFace } from "lucide-react";
import { useState, useEffect } from "react";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"text" | "face">("text");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  return (
    <section className="relative min-h-[70vh] sm:min-h-[85vh] flex items-center justify-center overflow-hidden pt-14 sm:pt-0">
      {/* Background image with subtle zoom */}
      <img
        src={heroBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover brightness-[0.6] contrast-[1.1] transition-transform duration-[20s] ease-out"
        style={{ transform: mounted ? "scale(1.05)" : "scale(1)" }}
        width={1920}
        height={1080}
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/61" />

      {/* Animated gradient overlay */}
      <div className="absolute inset-0 hero-gradient-animated opacity-40" />

      {/* Gradient bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/61 to-black/90" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s",
          }}
        >
          <Camera className="w-4 h-4" />
          Conectando atletas às suas melhores fotos.
        </div>

        {/* Headline */}
        <h1
          className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-4"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(24px)",
            transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.2s",
          }}
        >
          Reviva seu momento. <br />
          <span className="text-primary">Encontre suas fotos agora.</span>
        </h1>

        {/* Sub */}
        <p
          className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-10"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.35s",
          }}
        >
          Encontre suas fotos e vídeos em segundos.
        </p>

        {/* Search */}
        <div
          className="max-w-2xl mx-auto"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0) scale(1)" : "translateY(20px) scale(0.98)",
            transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.5s",
          }}
        >
          <div className="glass-card p-1.5 sm:p-2 flex items-center gap-1 sm:gap-2 overflow-hidden">
            <div className="flex items-center gap-0.5 sm:gap-1 pl-1 sm:pl-2 shrink-0">
              <button
                onClick={() => setSearchMode("text")}
                className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 ${
                  searchMode === "text"
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                }`}
              >
                <Search className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                onClick={() => setSearchMode("face")}
                className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 ${
                  searchMode === "face"
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                }`}
              >
                <ScanFace className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <input
              type="text"
              placeholder={
                searchMode === "text"
                  ? "Digite o nome do evento..."
                  : "Envie sua selfie..."
              }
              className="flex-1 min-w-0 bg-transparent text-white placeholder:text-gray-400 outline-none text-xs sm:text-sm md:text-base py-2.5 sm:py-3 px-1 sm:px-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <button className="btn-premium px-3 sm:px-6 py-2.5 sm:py-3 rounded-lg bg-primary text-primary-foreground font-bold text-xs sm:text-sm min-h-[40px] sm:min-h-[44px] shrink-0">
              Buscar
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-3">
            Não sabe o nome do evento? <button className="text-primary hover:underline">Clique aqui</button>
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
