import { useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Check, ChevronRight, ScanFace, Image, Eye, Camera } from "lucide-react";

const steps = ["Modelo", "Informações", "Busca", "Visibilidade", "Resumo"];

const models = [
  {
    name: "Standard",
    description: "Ideal para eventos de pequeno a médio porte que precisam de flexibilidade e custo-benefício.",
    commission: "10%",
    features: ["25.000 uploads gratuitos", "Busca por reconhecimento facial", "Busca por número de atleta", "Corretor com IA"],
  },
  {
    name: "HighVolume",
    description: "Ideal para eventos grandes ou com alto volume de fotos, como maratonas ou festivais.",
    commission: "15%",
    features: ["Uploads ilimitados", "Reconhecimento facial", "Venda de vídeos", "Separador de fotos", "Vendas no local"],
    highlighted: true,
  },
  {
    name: "Pay as you go",
    description: "Ideal para eventos pontuais, vendas presenciais ou quem quer pagar somente pelo que usar.",
    commission: "8%",
    features: ["Pague por foto: R$ 0,025", "Reconhecimento facial", "Corretor com IA", "Fotógrafos ilimitados"],
  },
];

const CriarEvento = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 p-4 pt-18 lg:pt-6 lg:p-8 overflow-auto">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Criar novo evento</h1>
        <p className="text-sm text-muted-foreground mb-6 sm:mb-8">Insira abaixo as informações para criar seu evento.</p>

        {/* Progress - scrollable on mobile */}
        <div className="flex items-center gap-1 sm:gap-2 mb-8 sm:mb-10 overflow-x-auto pb-2">
          {steps.map((step, i) => (
            <div key={step} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < currentStep ? "bg-primary text-primary-foreground" :
                i === currentStep ? "bg-primary text-primary-foreground animate-glow-pulse" :
                "bg-secondary text-muted-foreground"
              }`}>
                {i < currentStep ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:inline ${i === currentStep ? "text-foreground" : "text-muted-foreground"}`}>{step}</span>
              {i < steps.length - 1 && <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        {currentStep === 0 && (
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground mb-2">Escolha um modelo</h2>
            <p className="text-sm text-muted-foreground mb-6">De acordo com as configurações, você tem disponível os seguintes pacotes:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {models.map((model) => (
                <div
                  key={model.name}
                  onClick={() => setSelectedModel(model.name)}
                  className={`glass-card p-5 sm:p-6 cursor-pointer transition-all ${
                    selectedModel === model.name ? "border-primary neon-border" : "hover:border-primary/30"
                  } ${model.highlighted ? "ring-1 ring-primary/20" : ""}`}
                >
                  {model.highlighted && (
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-3">POPULAR</span>
                  )}
                  <h3 className="text-base sm:text-lg font-bold text-foreground mb-1">{model.name}</h3>
                  <p className="text-xs text-muted-foreground mb-4">{model.description}</p>
                  <p className="text-sm text-foreground mb-4">Comissão de <span className="text-primary font-bold">{model.commission}</span> sobre vendas</p>
                  <ul className="space-y-2">
                    {model.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="w-4 h-4 text-lime flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="max-w-2xl space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-foreground mb-4">Informações básicas</h2>
            {[
              { label: "Nome do evento", placeholder: "Ex: VERÃO RUN 2026", type: "text" },
              { label: "Data do evento", placeholder: "dd/mm/aaaa", type: "date" },
              { label: "Horário do evento", placeholder: "--:--", type: "time" },
              { label: "Local do evento", placeholder: "Digite o local do evento", type: "text" },
              { label: "Categoria", placeholder: "Selecione a categoria", type: "select" },
            ].map((field) => (
              <div key={field.label}>
                <label className="block text-sm font-medium text-foreground mb-1.5">{field.label}</label>
                <input
                  type={field.type === "select" ? "text" : field.type}
                  placeholder={field.placeholder}
                  className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors text-sm min-h-[48px]"
                />
              </div>
            ))}
          </div>
        )}

        {currentStep === 2 && (
          <div className="max-w-2xl">
            <h2 className="text-base sm:text-lg font-bold text-foreground mb-4">Tipos de busca no evento</h2>
            <p className="text-sm text-muted-foreground mb-6">Selecione como os participantes poderão buscar suas fotos.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {[
                { label: "Reconhecimento Facial", icon: ScanFace },
                { label: "Álbum", icon: Image },
                { label: "Número de Peito", icon: Eye },
                { label: "Sem busca", icon: Camera },
              ].map((opt) => (
                <button key={opt.label} className="glass-card p-4 sm:p-6 flex flex-col items-center gap-2 sm:gap-3 hover:border-primary/30 transition-all text-center min-h-[100px]">
                  <opt.icon className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                  <span className="text-[11px] sm:text-xs font-medium text-foreground leading-tight">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep >= 3 && (
          <div className="max-w-2xl">
            <h2 className="text-base sm:text-lg font-bold text-foreground mb-4">Visibilidade</h2>
            <div className="glass-card p-5 sm:p-6">
              <p className="text-sm text-muted-foreground mb-4">Deseja que seu evento seja visualizado no marketplace da VIUFOTO?</p>
              <div className="flex items-center gap-3 sm:gap-4">
                <button className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm min-h-[48px] min-w-[80px]">Sim</button>
                <button className="px-6 py-3 rounded-lg border border-border text-muted-foreground text-sm min-h-[48px] min-w-[80px]">Não</button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 sm:mt-10 pt-6 border-t border-border gap-3">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            className={`px-4 sm:px-6 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-all min-h-[44px] ${currentStep === 0 ? "opacity-50 pointer-events-none" : ""}`}
          >
            Voltar
          </button>
          <button
            onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
            className="px-4 sm:px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all min-h-[44px]"
          >
            {currentStep === steps.length - 1 ? "Criar Evento" : "Próximo"}
          </button>
        </div>
      </main>
    </div>
  );
};

export default CriarEvento;
