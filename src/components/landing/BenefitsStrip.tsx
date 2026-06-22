import { motion } from "framer-motion";
import { ScanFace, Image as ImageIcon, Download, Lock, type LucideIcon } from "lucide-react";

interface Benefit {
  icon: LucideIcon;
  title: string;
  description: string;
}

const items: Benefit[] = [
  {
    icon: ScanFace,
    title: "Busca Inteligente",
    description: "Encontre suas fotos por rosto ou número de peito em segundos.",
  },
  {
    icon: ImageIcon,
    title: "Fotos em Alta Definição",
    description: "Imagens profissionais em alta qualidade para reviver cada conquista.",
  },
  {
    icon: Download,
    title: "Download Ilimitado",
    description: "Baixe suas fotos quantas vezes quiser, quando quiser.",
  },
  {
    icon: Lock,
    title: "Compra Segura",
    description: "Ambiente 100% seguro para proteger suas memórias.",
  },
];

const BenefitsStrip = () => {
  return (
    <section className="relative -mt-10 sm:-mt-16 z-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="bg-card rounded-2xl border border-border shadow-[0_20px_60px_-20px_hsl(220_39%_11%/0.12)] p-5 sm:p-8"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-6">
            {items.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-start gap-3 sm:gap-4"
                >
                  <div className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-foreground leading-tight mb-1">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-snug">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default BenefitsStrip;