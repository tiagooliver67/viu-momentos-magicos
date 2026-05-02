import { motion } from "framer-motion";
import { Cpu, Zap, Trophy, type LucideIcon } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: Cpu,
    title: "Busca Facial com IA",
    description:
      "Envie uma selfie e nossa inteligência localiza você em milhares de fotos em segundos. OCR de número de peito como reforço.",
  },
  {
    icon: Zap,
    title: "Entrega via CDN Global",
    description:
      "Imagens otimizadas e distribuídas em servidores de borda. Carregamento instantâneo, mesmo em conexões móveis.",
  },
  {
    icon: Trophy,
    title: "Originais Sempre Protegidos",
    description:
      "Watermark aplicada no backend e originais mantidos em armazenamento privado. Liberação automática só após a compra.",
  },
];

const FeatureCards = () => {
  return (
    <section className="py-20 sm:py-28 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4">
            Por dentro da plataforma
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight mb-4">
            Tecnologia que impulsiona o esporte
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            Ferramentas inteligentes para atletas, fotógrafos e organizadores —
            construídas para escala, velocidade e segurança.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.6,
                  ease: [0.16, 1, 0.3, 1],
                  delay: i * 0.12,
                }}
                className="glass-card p-7 sm:p-8 transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-primary" strokeWidth={2.2} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2.5 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeatureCards;