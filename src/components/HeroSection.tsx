import { Search, Camera, ScanFace } from "lucide-react";
import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import heroBg from "@/assets/hero-bg.jpg";
import { supabase } from "@/integrations/supabase/client";
import { cdnUrl } from "@/lib/cdnConfig";

interface HeroSettings {
  title: string;
  highlight: string;
  title_color: string;
  highlight_color: string;
  transition_type: string;
  transition_duration_ms: number;
  interval_seconds: number;
  autoplay: boolean;
}

const DEFAULT_SETTINGS: HeroSettings = {
  title: "Sua superação imortalizada",
  highlight: "em alta definição.",
  title_color: "#FFFFFF",
  highlight_color: "#673DE6",
  transition_type: "fade",
  transition_duration_ms: 1000,
  interval_seconds: 6,
  autoplay: true,
};

const HeroSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"text" | "face">("text");
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<HeroSettings>(DEFAULT_SETTINGS);
  const [slides, setSlides] = useState<string[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  // Load hero settings + slides
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [s, sl] = await Promise.all([
        supabase.from("hero_settings").select("*").limit(1).maybeSingle(),
        supabase
          .from("hero_slides")
          .select("image_path")
          .eq("active", true)
          .order("sort_order", { ascending: true }),
      ]);
      if (cancelled) return;
      if (s.data) setSettings(s.data as any);
      if (sl.data) {
        const urls = sl.data
          .map((row: any) => cdnUrl(row.image_path))
          .filter((u: string | null): u is string => !!u);
        setSlides(urls);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Autoplay rotation
  useEffect(() => {
    if (!settings.autoplay || slides.length <= 1) return;
    const id = setInterval(() => {
      setCurrentSlide((c) => (c + 1) % slides.length);
    }, Math.max(2, settings.interval_seconds) * 1000);
    return () => clearInterval(id);
  }, [settings.autoplay, settings.interval_seconds, slides.length]);

  const handleSearch = (e?: FormEvent) => {
    e?.preventDefault();
    const q = searchQuery.trim();
    navigate(q ? `/buscar?q=${encodeURIComponent(q)}` : "/buscar");
  };

  const transitionMs = settings.transition_duration_ms;
  const slidesToRender = slides.length > 0 ? slides : [heroBg];

  return (
    <section className="relative min-h-[70vh] sm:min-h-[85vh] flex items-center justify-center overflow-hidden pt-14 sm:pt-0">
      {/* Background slider */}
      <div className="absolute inset-0 overflow-hidden">
        {slidesToRender.map((src, i) => {
          const isActive = i === currentSlide % slidesToRender.length;
          let extraStyle: React.CSSProperties = {
            transitionDuration: `${transitionMs}ms`,
          };
          let className =
            "absolute inset-0 w-full h-full object-cover brightness-[0.6] contrast-[1.1] transition-all ease-out";

          if (settings.transition_type === "slide") {
            extraStyle.transform = isActive
              ? "translateX(0)"
              : i < currentSlide
              ? "translateX(-100%)"
              : "translateX(100%)";
            className += " opacity-100";
          } else if (settings.transition_type === "kenburns") {
            extraStyle.opacity = isActive ? 1 : 0;
            extraStyle.transform = isActive ? "scale(1.1)" : "scale(1)";
            extraStyle.transitionDuration = `${Math.max(transitionMs, settings.interval_seconds * 1000)}ms`;
          } else {
            // fade
            extraStyle.opacity = isActive ? 1 : 0;
          }

          return (
            <img
              key={src + i}
              src={src}
              alt=""
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : "low"}
              className={className}
              style={extraStyle}
              width={1920}
              height={1080}
            />
          );
        })}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/61" />

      {/* Animated gradient overlay */}
      <div className="absolute inset-0 hero-gradient-animated opacity-40" />

      {/* Gradient bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/61 to-black/90" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={mounted ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-bold uppercase tracking-[0.18em] mb-6"
        >
          <Camera className="w-4 h-4" />
          A revolução da fotografia esportiva
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={mounted ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-5"
          style={{ color: settings.title_color }}
        >
          {settings.title} <br className="hidden sm:block" />
          <span style={{ color: settings.highlight_color }}>{settings.highlight}</span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={mounted ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          className="text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-10"
        >
          Encontre suas fotos de eventos esportivos em segundos com nossa
          inteligência de busca facial e OCR de número de peito.
        </motion.p>

        {/* Search */}
        <motion.form
          onSubmit={handleSearch}
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={mounted ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.45 }}
          className="max-w-2xl mx-auto"
        >
          <div className="glass-card p-1.5 sm:p-2 flex items-center gap-1 sm:gap-2 overflow-hidden">
            <div className="flex items-center gap-0.5 sm:gap-1 pl-1 sm:pl-2 shrink-0">
              <button
                type="button"
                onClick={() => setSearchMode("text")}
                aria-label="Buscar por texto"
                className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 ${
                  searchMode === "text"
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                }`}
              >
                <Search className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                type="button"
                onClick={() => setSearchMode("face")}
                aria-label="Buscar por reconhecimento facial"
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

            <button
              type="submit"
              className="btn-premium px-3 sm:px-6 py-2.5 sm:py-3 rounded-lg bg-primary text-primary-foreground font-bold text-xs sm:text-sm min-h-[40px] sm:min-h-[44px] shrink-0"
            >
              Buscar
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-3">
            Não sabe o nome do evento?{" "}
            <button
              type="button"
              onClick={() => navigate("/buscar")}
              className="text-primary hover:underline"
            >
              Clique aqui
            </button>
          </p>
        </motion.form>
      </div>
    </section>
  );
};

export default HeroSection;
