import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check, Zap, Star, Crown } from "lucide-react";

const VIUPass = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold mb-4">
              <Crown className="w-4 h-4" />
              VIU PASS
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4">
              Seu passe <span className="text-primary">premium</span> para fotos esportivas
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Assine e tenha acesso exclusivo a 10 fotos grátis por mês, prioridade no reconhecimento facial e descontos especiais.
            </p>
          </div>

          <div className="max-w-lg mx-auto">
            <div className="glass-card p-8 neon-border relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-5xl font-black text-primary">R$ 19,90</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>

                <ul className="space-y-4 mb-8">
                  {[
                    "10 fotos grátis por mês (qualquer evento)",
                    "Prioridade no reconhecimento facial",
                    "Álbum pessoal automático com IA",
                    "Descontos exclusivos em fotos extras",
                    "QR Code personalizado para eventos",
                    "Acesso antecipado a novas funcionalidades",
                    "Suporte prioritário",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-sm text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>

                <button className="w-full py-4 rounded-xl bg-cta text-cta-foreground font-black text-lg hover:bg-cta-dark transition-all hover:shadow-[0_0_30px_hsl(var(--cta)/0.5)] flex items-center justify-center gap-2">
                  <Zap className="w-5 h-5" />
                  Assinar VIU Pass
                </button>
                <p className="text-xs text-muted-foreground text-center mt-3">Cancele quando quiser. Sem fidelidade.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default VIUPass;
