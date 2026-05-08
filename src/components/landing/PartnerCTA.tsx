import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Camera, Trophy } from "lucide-react";

const cards = [
  {
    icon: Trophy,
    eyebrow: "Para organizadores",
    title: "Eleve a experiência da sua prova",
    description:
      "Agregue valor à sua prova com a melhor cobertura fotográfica do mercado e relatórios em tempo real.",
    cta: "Seja um parceiro ViuFoto",
    to: "/para-organizadores",
  },
  {
    icon: Camera,
    eyebrow: "Para fotógrafos",
    title: "Transforme suas fotos em renda",
    description:
      "Upload em massa, watermark automática, recebimento via PIX e dashboard completo de vendas.",
    cta: "Comece a vender",
    to: "/virar-fotografo",
  },
];

const PartnerCTA = () => {
  return (
    <section className="py-20 sm:py-28 relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, hsl(var(--primary) / 0.08) 0%, transparent 70%)",
        }}
      />
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight mb-4">
            Faça parte da nova era da fotografia esportiva
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            Mais de uma forma de crescer com a ViuFoto.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.to}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.6,
                  ease: [0.16, 1, 0.3, 1],
                  delay: i * 0.12,
                }}
                className="glass-card p-8 sm:p-10 flex flex-col group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                  <Icon className="w-6 h-6 text-primary" strokeWidth={2.2} />
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">
                  {card.eyebrow}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight mb-3">
                  {card.title}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-8 flex-1">
                  {card.description}
                </p>
                <Link
                  to={card.to}
                  className="inline-flex items-center justify-center gap-2 self-start px-6 py-3 min-h-[44px] rounded-xl bg-primary text-primary-foreground font-bold text-sm sm:text-base hover:bg-primary/90 transition-all hover:shadow-[0_8px_24px_-6px_hsl(var(--primary)/0.5)]"
                >
                  {card.cta}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PartnerCTA;