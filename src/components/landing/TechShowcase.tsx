import { motion } from "framer-motion";
import { ScanFace, Hash, Zap, ArrowRight } from "lucide-react";
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
              "linear-gradient(135deg, hsl(var(--primary-dark)) 0%, hsl(var(--primary)) 100%)",
          }}
        >
          {/* decorative glow */}
          <div
            className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-30 blur-3xl pointer-events-none"
            style={{ background: "hsl(var(--primary-soft))" }}
          />
          <div className="relative grid grid-cols-1 lg:grid-cols-[1.1fr_auto_1fr] gap-10 lg:gap-12 items-center">
            {/* Left: text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="inline-block text-xs font-bold uppercase tracking-[0.22em] text-primary-foreground/80 mb-4">
                Tecnologia Exclusiva
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-primary-foreground tracking-tight leading-[1.05] mb-5">
                Inteligência que encontra o que importa{" "}
                <span style={{ color: "hsl(var(--primary-soft))" }}>para você.</span>
              </h2>
              <p className="text-sm sm:text-base text-primary-foreground/80 leading-relaxed mb-8 max-w-md">
                Nossa tecnologia de reconhecimento facial e OCR identifica você nos eventos
                e entrega suas melhores fotos automaticamente.
              </p>
              <a
                href="#tecnologia"
                className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] rounded-xl bg-card text-foreground font-bold text-sm sm:text-base hover:bg-card/90 transition-all"
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
              <div className="relative w-[240px] sm:w-[280px] aspect-[9/19] rounded-[2.5rem] bg-foreground p-2.5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)]">
                <div className="relative w-full h-full rounded-[2rem] overflow-hidden">
                  <img
                    src={techRunner}
                    alt="Atleta identificada pela IA da ViuFoto"
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                    width={1024}
                    height={1536}
                  />
                  {/* face detection corners */}
                  <div className="absolute top-[20%] left-[22%] w-[56%] h-[28%] pointer-events-none">
                    {["top-0 left-0 border-t-2 border-l-2", "top-0 right-0 border-t-2 border-r-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"].map((pos) => (
                      <span key={pos} className={`absolute w-5 h-5 border-primary-foreground ${pos}`} />
                    ))}
                  </div>
                </div>
              </div>
              {/* Floating "Foto encontrada" card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="absolute -bottom-6 -left-4 sm:-left-10 bg-card rounded-2xl p-4 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)] w-[230px] hidden sm:block"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-foreground">Foto encontrada!</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight mb-1">
                  Evento: Circuito das Estações
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight mb-3">
                  Data: 21/05/2024
                </p>
                <button className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors">
                  Ver fotos
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
                    <div className="shrink-0 w-12 h-12 rounded-xl border border-primary-foreground/25 bg-primary-foreground/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary-foreground" strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-primary-foreground leading-tight mb-1">
                        {f.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-primary-foreground/75 leading-snug">
                        {f.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TechShowcase;