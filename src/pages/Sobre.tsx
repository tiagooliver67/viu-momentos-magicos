import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ScanFace,
  Hash,
  Image as ImageIcon,
  Lock,
  CreditCard,
  Download,
  Trophy,
  Camera,
  Users,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import ClientNavbar from "@/components/ClientNavbar";
import Footer from "@/components/Footer";
import HowItWorks from "@/components/landing/HowItWorks";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";

const CANONICAL = "https://viufoto.com/sobre";

const publicos = [
  {
    icon: Users,
    eyebrow: "Atleta",
    title: "Encontre suas fotos em segundos",
    desc: "Busca por rosto ou número de peito. Compre só as suas, baixe em alta resolução e sem marca d'água.",
    cta: "Buscar minhas fotos",
    to: "/buscar",
  },
  {
    icon: Camera,
    eyebrow: "Fotógrafo",
    title: "Transforme cliques em renda",
    desc: "Upload em massa, marca d'água automática, IA que organiza os álbuns e recebimento via Pix.",
    cta: "Quero vender minhas fotos",
    to: "/virar-fotografo",
  },
  {
    icon: Trophy,
    eyebrow: "Organizador",
    title: "Eleve a experiência da sua prova",
    desc: "Cobertura profissional, integração com cronometragem e relatórios em tempo real para o seu evento.",
    cta: "Sou organizador",
    to: "/para-organizadores",
  },
];

const diferenciais = [
  { icon: ScanFace, title: "Busca facial por IA", desc: "Reconhecimento facial encontra todas as suas fotos em segundos." },
  { icon: Hash, title: "Leitura de número de peito", desc: "OCR esportivo identifica automaticamente o seu número." },
  { icon: ImageIcon, title: "Alta resolução", desc: "Imagens originais para impressão e redes sociais." },
  { icon: Lock, title: "Proteção total", desc: "Originais ficam protegidos. Previews sempre com marca d'água." },
  { icon: CreditCard, title: "Pagamento seguro", desc: "Pix instantâneo e cartão em ambiente certificado." },
  { icon: Download, title: "Download ilimitado", desc: "Baixe quantas vezes quiser, quando quiser." },
];

const faqs = [
  {
    q: "Buscar fotos é grátis?",
    a: "Sim. Atletas só pagam pelas fotos que decidirem comprar. A busca, o cadastro e a navegação são 100% gratuitos.",
  },
  {
    q: "Minhas fotos ficam seguras?",
    a: "Os arquivos originais ficam armazenados em servidores protegidos e nunca aparecem publicamente. Todas as previews exibidas no site possuem marca d'água.",
  },
  {
    q: "Como recebo as fotos após a compra?",
    a: "Imediatamente após a confirmação do pagamento (Pix ou cartão), as fotos ficam disponíveis em alta resolução na sua área 'Meus Pedidos' para download.",
  },
  {
    q: "Sou fotógrafo. Quanto custa para vender?",
    a: "Não há mensalidade. Trabalhamos com taxa por venda: 12% no plano Início (20 mil uploads grátis) ou 10% no plano Profissional.",
  },
  {
    q: "Vocês atendem qual tipo de evento?",
    a: "Corridas de rua, trail, ciclismo, triathlon, MTB, esportes de combate, eventos corporativos e qualquer evento esportivo com múltiplos atletas.",
  },
];

function useCounts() {
  const [data, setData] = useState<{ events: number; photographers: number; photos: number } | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [ev, ph, fo] = await Promise.all([
          supabase.from("events").select("*", { count: "exact", head: true }),
          supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "photographer"),
          supabase.from("event_photos").select("*", { count: "exact", head: true }),
        ]);
        if (!alive) return;
        const events = ev.count ?? 0;
        const photographers = ph.count ?? 0;
        const photos = fo.count ?? 0;
        if (events + photographers + photos > 0) {
          setData({ events, photographers, photos });
        }
      } catch {
        // silencioso — sem mock
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  return data;
}

const fmt = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(".", ",")}k+` : `${n}`;

const Sobre = () => {
  const counts = useCounts();

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "O que é o VIUFOTO | Fotografia esportiva inteligente";

    const setMeta = (name: string, content: string, attr: "name" | "property" = "name") => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
      return el;
    };
    const desc =
      "Conheça a VIUFOTO: a plataforma que conecta atletas e fotógrafos esportivos com busca por rosto e número de peito, alta resolução e pagamento seguro.";
    const m1 = setMeta("description", desc);
    const m2 = setMeta("og:title", "O que é o VIUFOTO", "property");
    const m3 = setMeta("og:description", desc, "property");
    const m4 = setMeta("og:url", CANONICAL, "property");
    const m5 = setMeta("og:type", "website", "property");

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const createdCanonical = !canonical;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    const prevHref = canonical.href;
    canonical.href = CANONICAL;

    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "VIUFOTO",
      url: "https://viufoto.com",
      description: desc,
      sameAs: [],
    });
    document.head.appendChild(ld);

    return () => {
      document.title = prevTitle;
      document.head.removeChild(ld);
      if (createdCanonical && canonical?.parentNode) canonical.parentNode.removeChild(canonical);
      else if (canonical) canonical.href = prevHref;
      [m1, m2, m3, m4, m5].forEach((m) => m && m.parentNode && m.parentNode.removeChild(m));
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <ClientNavbar />

      {/* HERO */}
      <section className="relative overflow-hidden pt-12 sm:pt-20 pb-16 sm:pb-24">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, hsl(var(--primary) / 0.10) 0%, transparent 70%)",
          }}
        />
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl mx-auto text-center"
          >
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-primary mb-4">
              <Sparkles className="w-3.5 h-3.5" /> Sobre a VIUFOTO
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-foreground tracking-tight leading-[1.05]">
              A fotografia esportiva, <span className="text-primary">do jeito que sempre deveria ter sido</span>.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed">
              A VIUFOTO é a plataforma brasileira que conecta atletas e fotógrafos profissionais
              através de busca inteligente por rosto e número de peito. Encontre suas fotos em
              segundos, em alta resolução, com pagamento seguro.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/buscar"
                className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] rounded-xl bg-primary text-primary-foreground font-bold text-sm sm:text-base hover:bg-primary/90 transition-all shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.45)]"
              >
                Buscar minhas fotos <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/virar-fotografo"
                className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] rounded-xl border border-border bg-card text-foreground font-bold text-sm sm:text-base hover:bg-accent transition-all"
              >
                Sou fotógrafo
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* MANIFESTO */}
      <section className="pb-16 sm:pb-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto bg-card border border-border rounded-2xl p-8 sm:p-10 shadow-sm text-center"
          >
            <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight mb-4">
              Por que existimos
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Toda conquista esportiva merece ser eternizada. Mas, por anos, atletas se perderam
              em galerias gigantes e fotógrafos não tinham ferramentas para vender com escala.
              A VIUFOTO nasceu para resolver os dois lados: atletas encontram suas fotos em
              segundos, fotógrafos transformam talento em renda recorrente.
            </p>
          </motion.div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <HowItWorks />

      {/* PARA QUEM É */}
      <section className="py-20 sm:py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.22em] text-primary mb-3">
              Para quem é
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight">
              Feita para <span className="text-primary">todos</span> os lados da prova
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {publicos.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.to}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="bg-card border border-border rounded-2xl p-7 shadow-sm hover:shadow-md transition-shadow flex flex-col"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center mb-5">
                    <Icon className="w-5 h-5 text-primary" strokeWidth={2.2} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2">
                    {p.eyebrow}
                  </span>
                  <h3 className="text-xl font-black text-foreground tracking-tight mb-3">
                    {p.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-1">
                    {p.desc}
                  </p>
                  <Link
                    to={p.to}
                    className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:gap-3 transition-all"
                  >
                    {p.cta} <ArrowRight className="w-4 h-4" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* DIFERENCIAIS */}
      <section className="py-20 sm:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.22em] text-primary mb-3">
              Tecnologia e diferenciais
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight">
              O que nos torna <span className="text-primary">diferentes</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
            {diferenciais.map((d, i) => {
              const Icon = d.icon;
              return (
                <motion.div
                  key={d.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: i * 0.06 }}
                  className="bg-card border border-border rounded-2xl p-6 shadow-sm"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-primary" strokeWidth={2.2} />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1.5">{d.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{d.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* NÚMEROS (apenas se houver dado real) */}
      {counts && (
        <section className="py-16 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { label: "Eventos cobertos", value: counts.events },
                { label: "Fotógrafos parceiros", value: counts.photographers },
                { label: "Fotos indexadas", value: counts.photos },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-card border border-border rounded-2xl p-7 text-center shadow-sm"
                >
                  <div className="text-4xl sm:text-5xl font-black text-primary tracking-tight">
                    {fmt(s.value)}
                  </div>
                  <div className="mt-2 text-sm font-medium text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SEGURANÇA */}
      <section className="py-20 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 items-center bg-card border border-border rounded-2xl p-8 sm:p-10 shadow-sm">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center mx-auto md:mx-0">
              <ShieldCheck className="w-10 h-10 text-primary" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight mb-3">
                Segurança e privacidade em primeiro lugar
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Os arquivos originais ficam protegidos em servidores na nuvem e nunca são
                expostos publicamente. Todas as previews exibidas na plataforma carregam marca
                d'água. Pagamentos são processados por gateway certificado, com Pix e cartão.
                Tratamos os dados pessoais em conformidade com a LGPD.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MISSÃO · VISÃO · VALORES */}
      <section className="py-20 sm:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                title: "Missão",
                desc: "Conectar atletas e fotógrafos com tecnologia, transformando cada conquista em memória eterna.",
              },
              {
                title: "Visão",
                desc: "Ser a maior plataforma de fotografia esportiva da América Latina, referência em IA e experiência.",
              },
              {
                title: "Valores",
                desc: "Transparência, segurança, inovação e respeito por quem está dos dois lados da lente.",
              },
            ].map((b) => (
              <div key={b.title} className="bg-card border border-border rounded-2xl p-7 shadow-sm">
                <h3 className="text-lg font-black text-foreground mb-2">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.22em] text-primary mb-3">
              Perguntas frequentes
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
              As dúvidas mais comuns
            </h2>
          </div>
          <div className="max-w-3xl mx-auto bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left text-base font-bold text-foreground">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
          <div className="text-center mt-6">
            <Link to="/ajuda" className="text-sm font-bold text-primary hover:underline">
              Ver central de ajuda completa →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="pb-20 sm:pb-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
            className="max-w-5xl mx-auto rounded-2xl p-8 sm:p-12 text-center"
            style={{ background: "hsl(var(--primary-soft))" }}
          >
            <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
              Bora viver de novo aquele momento?
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Encontre suas fotos ou comece a vender as suas hoje mesmo.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/buscar"
                className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] rounded-xl bg-primary text-primary-foreground font-bold text-sm sm:text-base hover:bg-primary/90 transition-all shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.45)]"
              >
                Buscar minhas fotos <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/virar-fotografo"
                className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] rounded-xl border border-border bg-card text-foreground font-bold text-sm sm:text-base hover:bg-accent transition-all"
              >
                Sou fotógrafo, quero vender
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Sobre;