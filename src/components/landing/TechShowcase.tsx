import { motion } from "framer-motion";
import { ScanFace, Hash, Zap, ArrowRight, ShieldCheck, Gauge, Shield, Heart } from "lucide-react";
import techRunner from "@/assets/tech-runner.jpg";

const features = [
  { icon: ScanFace, title: "Reconhecimento Facial", description: "IA treinada para identificar você em milhares de fotos." },
  { icon: Hash, title: "Leitura OCR de Peito", description: "Reconhecimento automático do seu número de inscrição." },
  { icon: Zap, title: "Resultados em Segundos", description: "Sua galeria personalizada montada em tempo real." },
];

const TechShowcase = () => {
  return (
    <section id="tecnologia" className="relative py-20 sm:py-28 overflow-hidden">
      <div className="container mx-auto px-4">
        <div
          className="relative rounded-3xl overflow-hidden px-6 sm:px-12 lg:px-16 py-14 sm:py-20"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 70% 20%, hsla(258, 70%, 45%, 0.28) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 20% 80%, hsla(258, 60%, 38%, 0.18) 0%, transparent 65%), linear-gradient(180deg, #0A1424 0%, #07111F 100%)",
          }}
        >
          {/* volumetric glow */}
          <div
            className="absolute -top-40 right-1/3 w-[520px] h-[520px] rounded-full opacity-40 blur-3xl pointer-events-none"
            style={{ background: "radial-gradient(circle, hsla(260, 80%, 55%, 0.55) 0%, transparent 70%)" }}
          />
          <div
            className="absolute -bottom-32 -left-24 w-[420px] h-[420px] rounded-full opacity-25 blur-3xl pointer-events-none"
            style={{ background: "radial-gradient(circle, hsla(258, 70%, 50%, 0.45) 0%, transparent 70%)" }}
          />
          {/* subtle grid overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(hsla(258,60%,80%,1) 1px, transparent 1px), linear-gradient(90deg, hsla(258,60%,80%,1) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
            }}
          />
          <div className="relative grid grid-cols-1 lg:grid-cols-[1.1fr_auto_1fr] gap-10 lg:gap-12 items-center">
            {/* Left: text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <span
                className="inline-block text-[11px] font-bold uppercase tracking-[0.22em] mb-5 px-3.5 py-1.5 rounded-full border"
                style={{ borderColor: "hsla(258, 70%, 65%, 0.35)", color: "hsl(258, 85%, 78%)", background: "hsla(258, 60%, 40%, 0.12)" }}
              >
                Tecnologia Exclusiva
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.05] mb-5">
                Inteligência que encontra o que importa{" "}
                <span style={{ color: "hsl(258, 85%, 72%)" }}>para você.</span>
              </h2>
              <p className="text-sm sm:text-base text-white/70 leading-relaxed mb-8 max-w-md">
                Nossa tecnologia de reconhecimento facial e OCR identifica você nos eventos
                e entrega suas melhores fotos automaticamente.
              </p>
              {/* mini stats row */}
              <div className="flex flex-wrap gap-x-8 gap-y-4 mb-8">
                {[
                  { icon: ShieldCheck, title: "Privacidade", desc: "Seus dados protegidos." },
                  { icon: Zap, title: "Rapidez", desc: "Encontramos suas fotos em segundos." },
                  { icon: Gauge, title: "Precisão", desc: "Tecnologia avançada que reconhece você." },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.title} className="flex items-start gap-2.5 max-w-[160px]">
                      <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "hsla(258, 70%, 55%, 0.18)", border: "1px solid hsla(258, 70%, 65%, 0.25)" }}>
                        <Icon className="w-4 h-4" style={{ color: "hsl(258, 85%, 75%)" }} strokeWidth={2} />
                      </div>
                      <div className="leading-tight">
                        <div className="text-xs font-bold text-white">{s.title}</div>
                        <div className="text-[11px] text-white/55 leading-snug mt-0.5">{s.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <a
                href="#tecnologia"
                className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] rounded-xl font-bold text-sm sm:text-base transition-all text-white shadow-[0_10px_30px_-8px_hsla(258,80%,50%,0.6)] hover:brightness-110"
                style={{ background: "linear-gradient(135deg, hsl(258, 75%, 55%) 0%, hsl(258, 70%, 45%) 100%)" }}
              >
                Saiba mais sobre nossa tecnologia
                <ArrowRight className="w-4 h-4" />
              </a>
            </motion.div>

            {/* Center: phone mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="relative mx-auto"
            >
              {/* halo behind phone */}
              <div
                className="absolute -inset-16 rounded-full blur-3xl opacity-60 pointer-events-none"
                style={{ background: "radial-gradient(circle, hsla(258, 80%, 55%, 0.35) 0%, transparent 65%)" }}
              />
              {/* animated orbit ring */}
              <svg className="absolute -inset-8 w-[calc(100%+4rem)] h-[calc(100%+4rem)] pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="hsl(258, 85%, 70%)" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="hsl(258, 85%, 70%)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <ellipse cx="50" cy="50" rx="48" ry="49" fill="none" stroke="url(#ring)" strokeWidth="0.3" strokeDasharray="2 3" />
              </svg>
              <div className="relative w-[240px] sm:w-[280px] aspect-[9/19] rounded-[2.5rem] p-2.5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]"
                   style={{ background: "linear-gradient(135deg, hsl(258, 40%, 22%) 0%, hsl(258, 30%, 12%) 100%)" }}>
                <div className="relative w-full h-full rounded-[2rem] overflow-hidden">
                  <img
                    src={techRunner}
                    alt="Atleta identificada pela IA da ViuFoto"
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                    width={1024}
                    height={1536}
                  />
                  {/* face detection frame */}
                  <div className="absolute top-[14%] left-[28%] w-[44%] h-[22%] pointer-events-none">
                    {["top-0 left-0 border-t-2 border-l-2", "top-0 right-0 border-t-2 border-r-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"].map((pos) => (
                      <motion.span
                        key={pos}
                        initial={{ opacity: 0.4 }}
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className={`absolute w-4 h-4 border-white ${pos}`}
                      />
                    ))}
                    {/* scan line */}
                    <motion.div
                      initial={{ top: "0%" }}
                      animate={{ top: ["0%", "100%", "0%"] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute left-0 right-0 h-[2px]"
                      style={{ background: "linear-gradient(90deg, transparent, hsl(258, 90%, 75%), transparent)", boxShadow: "0 0 12px hsl(258, 90%, 70%)" }}
                    />
                  </div>
                  {/* bib detection frame */}
                  <div className="absolute top-[42%] left-[34%] w-[32%] h-[14%] pointer-events-none">
                    {["top-0 left-0 border-t-2 border-l-2", "top-0 right-0 border-t-2 border-r-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"].map((pos) => (
                      <motion.span
                        key={pos}
                        initial={{ opacity: 0.4 }}
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                        className={`absolute w-3 h-3 ${pos}`}
                        style={{ borderColor: "hsl(258, 90%, 78%)" }}
                      />
                    ))}
                  </div>
                  {/* AI particles */}
                  {[...Array(8)].map((_, i) => (
                    <motion.span
                      key={i}
                      className="absolute w-1 h-1 rounded-full"
                      style={{
                        background: "hsl(258, 90%, 78%)",
                        boxShadow: "0 0 6px hsl(258, 90%, 70%)",
                        left: `${15 + (i * 9) % 70}%`,
                        top: `${20 + (i * 13) % 60}%`,
                      }}
                      animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
                      transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
                    />
                  ))}
                </div>
              </div>
              {/* Floating "Foto encontrada" card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="absolute -bottom-6 -left-4 sm:-left-10 rounded-2xl p-4 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] w-[240px] hidden sm:block backdrop-blur-xl"
                style={{ background: "hsla(258, 30%, 12%, 0.85)", border: "1px solid hsla(258, 70%, 65%, 0.25)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "hsl(258, 75%, 55%)" }}>
                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <span className="text-xs font-bold text-white">Foto encontrada!</span>
                </div>
                <p className="text-[11px] text-white/60 leading-tight mb-0.5">Evento: Circuito das Estações</p>
                <p className="text-[11px] text-white/60 leading-tight mb-3">Data: 21/05/2024</p>
                <button className="flex items-center gap-1.5 text-xs font-bold" style={{ color: "hsl(258, 90%, 75%)" }}>
                  Ver minhas fotos <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            </motion.div>

            {/* Right: feature list */}
            <div className="space-y-6">
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-start gap-4"
                  >
                    <div
                      className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: "hsla(258, 70%, 55%, 0.15)", border: "1px solid hsla(258, 70%, 65%, 0.3)", boxShadow: "0 8px 24px -8px hsla(258, 80%, 50%, 0.35)" }}
                    >
                      <Icon className="w-5 h-5" style={{ color: "hsl(258, 90%, 78%)" }} strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white leading-tight mb-1">
                        {f.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-white/60 leading-snug">
                        {f.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
          {/* bottom trust bar */}
          <div className="relative mt-12 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-10 text-xs text-white/55">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" style={{ color: "hsl(258, 85%, 75%)" }} />
              Segurança e confiança em cada etapa do processo.
            </div>
            <div className="hidden sm:block w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2">
              Seus melhores momentos, sempre com você.
              <Heart className="w-4 h-4" style={{ color: "hsl(258, 85%, 75%)" }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TechShowcase;