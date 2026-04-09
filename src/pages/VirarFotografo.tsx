import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Upload, DollarSign, CheckCircle2, ArrowRight, Rocket } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ClientNavbar from "@/components/ClientNavbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";

const steps = [
  { icon: Camera, title: "Configure seu perfil", desc: "Adicione seu nome artístico, bio e foto." },
  { icon: DollarSign, title: "Configure o recebimento", desc: "Cadastre seus dados para receber pagamentos." },
  { icon: Upload, title: "Crie seu primeiro evento", desc: "Faça upload de fotos e comece a vender." },
];

export default function VirarFotografo() {
  const { user, hasRole, addRole } = useAuth();
  const navigate = useNavigate();
  const [upgrading, setUpgrading] = useState(false);
  const isAlreadyPhotographer = hasRole("photographer");

  const handleUpgrade = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (isAlreadyPhotographer) {
      navigate("/dashboard");
      return;
    }
    setUpgrading(true);
    try {
      await addRole("photographer");
      toast.success("Agora você é fotógrafo! 🎉");
      navigate("/dashboard");
    } catch {
      toast.error("Erro ao ativar conta de fotógrafo.");
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ClientNavbar />
      <main className="flex-1 pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Hero */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Rocket className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground mb-2">
              Venda suas fotos na ViuFoto
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Transforme seus cliques em renda. Crie eventos, faça upload e receba automaticamente.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-4 mb-10">
            {steps.map((step, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-5 rounded-xl border border-border bg-card"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">
                    Passo {i + 1}: {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                </div>
                {isAlreadyPhotographer && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto flex-shrink-0 mt-1" />
                )}
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={handleUpgrade}
            disabled={upgrading}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 transition-all hover:shadow-[0_0_30px_hsl(var(--primary)/0.3)] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {upgrading ? (
              "Ativando..."
            ) : isAlreadyPhotographer ? (
              <>
                Ir para o Painel <ArrowRight className="w-5 h-5" />
              </>
            ) : (
              <>
                Quero vender minhas fotos <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          {/* Benefits */}
          <div className="mt-10 grid grid-cols-2 gap-3">
            {[
              "Sem mensalidade",
              "Receba via PIX",
              "Comissão a partir de 10%",
              "Loja personalizada",
            ].map((b) => (
              <div key={b} className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                {b}
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
