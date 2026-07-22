import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Camera, ArrowRight } from "lucide-react";

const StartNowCTA = () => {
  const navigate = useNavigate();
  return (
    <section className="pb-16 sm:pb-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl px-5 sm:px-8 py-6 sm:py-7 flex flex-col sm:flex-row items-center gap-5 sm:gap-6"
          style={{ background: "hsl(var(--primary-soft))" }}
        >
          <div className="w-14 h-14 shrink-0 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-[0_10px_24px_-8px_hsl(var(--primary)/0.5)]">
            <Camera className="w-6 h-6" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg sm:text-xl font-bold text-foreground leading-tight">
              Pronto para encontrar suas fotos?
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Milhares de atletas já confiam na ViuFoto para eternizar suas conquistas.
            </p>
          </div>
          <button
            onClick={() => navigate("/buscar")}
            className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] rounded-xl bg-cta text-cta-foreground font-bold text-sm sm:text-base hover:bg-cta-dark transition-all shadow-[0_8px_24px_-8px_hsl(var(--cta)/0.55)]"
          >
            Começar agora
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default StartNowCTA;