import { Search, Camera, ScanFace, Users } from "lucide-react";
import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import heroRunners from "@/assets/hero-runners.jpg";
import { supabase } from "@/integrations/supabase/client";
import { cdnUrl } from "@/lib/cdnConfig";
import { getSignedReadUrls } from "@/hooks/useS3Upload";

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
  title_color: "#111827",
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
        const paths = sl.data.map((row: any) => row.image_path as string);
        const cdnUrls = paths.map((p) => cdnUrl(p));
        const needsSigning = paths.filter((_, i) => !cdnUrls[i]);
        let signedMap: Record<string, string> = {};
        if (needsSigning.length > 0) {
          try {
            signedMap = await getSignedReadUrls(needsSigning);
          } catch (e) {
            console.warn("[Hero] Falha ao assinar URLs dos slides:", e);
          }
        }
        const urls = paths
          .map((p, i) => cdnUrls[i] || signedMap[p] || null)
          .filter((u): u is string => !!u);
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
  const slidesToRender = slides.length > 0 ? slides : [heroRunners];

  return (
    <section className="relative bg-background overflow-visible">
      {/* Right-side image fills the entire hero on desktop */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={mounted ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        className="hidden lg:block absolute top-0 right-0 bottom-0 w-[58%] z-0"
      >
        {slidesToRender.map((src, i) => {
          const isActive = i === currentSlide % slidesToRender.length;
          return (
            <img
              key={src + i}
              src={src}
              alt="Atletas em corrida"
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : "low"}
              className="absolute inset-0 w-full h-full object-cover transition-opacity ease-out"
              style={{ transitionDuration: `${transitionMs}ms`, opacity: isActive ? 1 : 0 }}
              width={1920}
              height={1080}
            />
          );
        })}
        {/* Soft fade from background on the left edge to blend with text */}
        <div
          className="absolute inset-y-0 left-0 w-1/3 pointer-events-none"
          style={{
            background:
              "linear-gradient(to right, hsl(var(--background)) 0%, hsl(var(--background)/0.55) 45%, transparent 100%)",
          }}
        />
        {/* Floating social proof badge */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={mounted ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
          className="absolute bottom-32 right-8 flex items-center gap-3 rounded-2xl px-4 py-3 backdrop-blur-md border border-white/20"
          style={{ background: "hsla(256, 76%, 57%, 0.55)" }}
        >
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div className="text-white leading-tight">
            <div className="font-black text-sm sm:text-base">+2 milhões</div>
            <div className="text-[11px] sm:text-xs text-white/85">
              de fotos entregues
              <br />
              em todo o Brasil
            </div>
          </div>
        </motion.div>
      </motion.div>

      <div className="container mx-auto px-4 pt-20 sm:pt-24 pb-32 sm:pb-44 relative">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-12 items-center">
          {/* Left: content */}
          <div className="relative z-10 max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={mounted ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/25 bg-primary/5 text-primary text-[11px] sm:text-xs font-bold uppercase tracking-[0.18em] mb-6"
            >
              <Camera className="w-3.5 h-3.5" />
              A revolução da fotografia esportiva
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={mounted ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.02] tracking-tight mb-5"
              style={{ color: settings.title_color }}
            >
              {settings.title}{" "}
              <span style={{ color: settings.highlight_color }}>
                {settings.highlight}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={mounted ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              className="text-base sm:text-lg text-muted-foreground max-w-md mb-8"
            >
              Encontre suas fotos de eventos esportivos em segundos com nossa
              inteligência de busca facial e OCR de número de peito.
            </motion.p>

            <motion.form
              onSubmit={handleSearch}
              initial={{ opacity: 0, y: 18 }}
              animate={mounted ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
              className="max-w-xl"
            >
              <div className="bg-card border border-border rounded-2xl shadow-[0_20px_50px_-20px_hsl(220_39%_11%/0.18)] p-1.5 sm:p-2 flex items-center gap-1 sm:gap-2">
                <div className="flex items-center gap-0.5 sm:gap-1 pl-1 sm:pl-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSearchMode("text")}
                    aria-label="Buscar por texto"
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      searchMode === "text"
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                        : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                    }`}
                  >
                    <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchMode("face")}
                    aria-label="Buscar por reconhecimento facial"
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      searchMode === "face"
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                        : "text-muted-foreground hover:text-primary hover:bg-primary/5"
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
                  className="flex-1 min-w-0 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm sm:text-base py-2.5 sm:py-3 px-2"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="submit"
                  className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm min-h-[44px] shrink-0 hover:bg-primary/90 transition-colors shadow-[0_8px_20px_-6px_hsl(var(--primary)/0.45)]"
                >
                  Buscar
                </button>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-3 ml-1">
                Não sabe o nome do evento?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/buscar")}
                  className="text-primary font-semibold hover:underline"
                >
                  Clique aqui
                </button>
              </p>
            </motion.form>
          </div>

          {/* Right: mobile/tablet image (desktop uses absolute fill above) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={mounted ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            className="relative h-[340px] sm:h-[440px] rounded-3xl overflow-hidden lg:hidden"
          >
            {slidesToRender.map((src, i) => {
              const isActive = i === currentSlide % slidesToRender.length;
              return (
                <img
                  key={src + i}
                  src={src}
                  alt="Atletas em corrida"
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-opacity ease-out"
                  style={{ transitionDuration: `${transitionMs}ms`, opacity: isActive ? 1 : 0 }}
                  width={1920}
                  height={1080}
                />
              );
            })}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={mounted ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
              className="absolute bottom-5 right-5 flex items-center gap-3 rounded-2xl px-4 py-3 backdrop-blur-md border border-white/20"
              style={{ background: "hsla(256, 76%, 57%, 0.55)" }}
            >
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="text-white leading-tight">
                <div className="font-black text-sm">+2 milhões</div>
                <div className="text-[11px] text-white/85">
                  de fotos entregues
                  <br />
                  em todo o Brasil
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
