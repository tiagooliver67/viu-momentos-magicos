import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Footprints, Mountain, Bike, Waves, Trophy, LucideIcon } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

type Category = {
  id: string;
  label: string;
  tagline: string;
  image: string;
  icon: LucideIcon;
  accent: string; // hex
};

const categories: Category[] = [
  {
    id: "corrida_rua",
    label: "Corrida de Rua",
    tagline: "Superação, energia e milhares de histórias pra contar.",
    image: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1200&q=80",
    icon: Footprints,
    accent: "#8B5CF6",
  },
  {
    id: "futebol",
    label: "Futebol",
    tagline: "Cada lance, cada emoção, toda a paixão do jogo.",
    image: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1200&q=80",
    icon: Trophy,
    accent: "#22C55E",
  },
  {
    id: "ciclismo",
    label: "Ciclismo",
    tagline: "Velocidade, estrada e adrenalina em cada pedalada.",
    image: "https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=1200&q=80",
    icon: Bike,
    accent: "#F97316",
  },
  {
    id: "triathlon",
    label: "Triathlon",
    tagline: "Três esportes, um só desafio: você contra o impossível.",
    image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1200&q=80",
    icon: Waves,
    accent: "#0EA5E9",
  },
  {
    id: "corrida_trilha",
    label: "Corrida de Trilha",
    tagline: "Natureza, terreno bruto e a força de quem não desiste.",
    image: "https://images.unsplash.com/photo-1486218119243-13883505764c?w=1200&q=80",
    icon: Mountain,
    accent: "#65A30D",
  },
];

const CategoryCard = ({ cat, priority }: { cat: Category; priority: boolean }) => {
  const navigate = useNavigate();
  const Icon = cat.icon;

  return (
    <button
      onClick={() => navigate(`/buscar?categoria=${cat.id}`)}
      className="group relative aspect-[4/5] sm:aspect-[5/6] w-full overflow-hidden rounded-[24px] border border-white/10 bg-neutral-900 text-left transition-all duration-[250ms] ease-out hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      style={{
        boxShadow: "0 20px 40px -20px rgba(0,0,0,0.35)",
        // @ts-ignore custom prop for hover
        ["--accent" as any]: cat.accent,
      }}
      aria-label={`Explorar ${cat.label}`}
    >
      {/* Image */}
      <img
        src={cat.image}
        alt={cat.label}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "low"}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.06]"
      />

      {/* Cinematic overlays */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10 transition-opacity duration-[250ms] group-hover:opacity-95" />
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-[300ms] group-hover:opacity-100"
        style={{
          background: `radial-gradient(120% 60% at 50% 100%, ${cat.accent}33 0%, transparent 60%)`,
        }}
      />
      {/* Accent glow ring */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[28px] opacity-0 transition-opacity duration-[250ms] group-hover:opacity-100"
        style={{ boxShadow: `inset 0 0 0 1px ${cat.accent}66, 0 30px 60px -20px ${cat.accent}55` }}
      />

      {/* Top badges */}
      <div className="absolute inset-x-6 top-6 flex items-start justify-between gap-2">
        <div
          className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-md"
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{ background: `${cat.accent}26` }}
          >
            <Icon className="h-4 w-4" style={{ color: cat.accent }} />
          </span>
          <div className="leading-tight">
            <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/60">
              Modalidade
            </div>
            <div className="text-[11px] font-black uppercase tracking-wider text-white">
              {cat.label}
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-1.5 rounded-2xl border border-white/15 bg-white/10 px-2.5 py-1.5 backdrop-blur-md sm:flex">
          <Sparkles className="h-3.5 w-3.5" style={{ color: cat.accent }} />
          <div className="leading-tight">
            <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-white">
              IA Disponível
            </div>
            <div className="text-[9px] text-white/60">Busca inteligente</div>
          </div>
        </div>
      </div>

      {/* Bottom content */}
      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
        <h3 className="mb-2 text-2xl font-black leading-[1.02] tracking-tight text-white sm:text-3xl">
          {cat.label}
        </h3>
        <p className="mb-4 max-w-[90%] text-[11px] text-white/75 sm:text-xs">{cat.tagline}</p>
        <div
          className="mb-5 h-[3px] w-12 rounded-full transition-all duration-[250ms] group-hover:w-20"
          style={{ background: cat.accent }}
        />

        <div
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold text-white backdrop-blur-md transition-all duration-[250ms] group-hover:border-transparent group-hover:text-white"
          style={{
            // hover styles via inline vars — apply glow using accent
          }}
        >
          <span className="relative z-10">Explorar</span>
          <span
            className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full transition-transform duration-[250ms] group-hover:translate-x-0.5"
            style={{ background: cat.accent }}
          >
            <ArrowRight className="h-3.5 w-3.5 text-white" />
          </span>
          <span
            className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-[250ms] group-hover:opacity-100"
            style={{ background: `${cat.accent}26`, boxShadow: `0 8px 24px -6px ${cat.accent}80` }}
          />
        </div>
      </div>
    </button>
  );
};

const SportCategoryFilter = () => {
  return (
    <ScrollReveal>
      <section className="mb-16 sm:mb-24">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Explorar por modalidade
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Encontre suas fotos em eventos cinematográficos capturados por fotógrafos profissionais.
            </p>
          </div>
        </div>

        {/* Infinite marquee — one continuous horizontal track */}
        <div
          className="group relative -mx-4 overflow-hidden px-4 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] motion-reduce:overflow-x-auto motion-reduce:snap-x motion-reduce:snap-mandatory motion-reduce:[mask-image:none]"
        >
          <div className="flex w-max gap-5 animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none">
            {[...categories, ...categories].map((cat, i) => (
              <div
                key={`${cat.id}-${i}`}
                className="w-[280px] shrink-0 snap-start sm:w-[320px] lg:w-[360px]"
                aria-hidden={i >= categories.length ? true : undefined}
              >
                <CategoryCard cat={cat} priority={i === 0} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
};

export default SportCategoryFilter;
