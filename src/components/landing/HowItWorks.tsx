import { motion } from "framer-motion";
import { Search, ImageIcon, CloudDownload, ArrowRight } from "lucide-react";

const steps = [
  {
    n: 1,
    icon: Search,
    title: "Busque o evento",
    description: "Digite o nome do evento ou use a busca inteligente por rosto ou número de peito.",
  },
  {
    n: 2,
    icon: ImageIcon,
    title: "Encontre suas fotos",
    description: "Nossa IA encontra todas as suas fotos automaticamente em segundos.",
  },
  {
    n: 3,
    icon: CloudDownload,
    title: "Escolha e baixe",
    description: "Selecione suas fotos favoritas e baixe em alta resolução de forma ilimitada.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-20 sm:py-24 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-xl mx-auto mb-12"
        >
          <span className="inline-block text-xs font-bold uppercase tracking-[0.22em] text-primary mb-3">
            Como funciona
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight">
            Em <span className="text-primary">3 passos</span> simples
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-5 md:gap-3 items-stretch max-w-6xl mx-auto">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <>
                <motion.div
                  key={s.n}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.12, ease: [0.16, 1, 0.3, 1] }}
                  className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center">
                      {s.n}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground">{s.title}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-primary" strokeWidth={2} />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
                </motion.div>
                {idx < steps.length - 1 && (
                  <div key={`arrow-${idx}`} className="hidden md:flex items-center justify-center text-primary">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                )}
              </>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;