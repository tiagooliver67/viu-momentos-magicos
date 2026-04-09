import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Check, ChevronRight, ScanFace, Image, Eye, Camera, MapPin, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const steps = ["Plano", "Informações", "Busca", "Visibilidade", "Resumo"];

const models = [
  {
    key: "inicio" as const,
    name: "ViuFoto Início",
    description: "Comece a vender suas fotos sem custo inicial.",
    commission: "12%",
    commissionDesc: "A ViuFoto retém uma pequena porcentagem sobre cada venda realizada. O restante do valor é repassado automaticamente para você.",
    features: [
      "Até 20.000 uploads gratuitos",
      "Reconhecimento facial",
      "Busca por número de peito",
      "Organização por pastas",
    ],
    uploadInfo: "Após o limite: R$ 0,023/foto · R$ 0,26/vídeo",
  },
  {
    key: "profissional" as const,
    name: "ViuFoto Profissional",
    description: "Comissão reduzida para quem deseja vender mais e ter maior visibilidade na plataforma.",
    commission: "10%",
    commissionDesc: "Pague menos por cada venda e ganhe destaque nos resultados da plataforma.",
    features: [
      "Tudo do plano Início",
      "Comissão reduzida por venda",
      "Prioridade na plataforma",
      "Destaque em eventos na Home",
    ],
    uploadInfo: "Após o limite: R$ 0,023/foto · R$ 0,26/vídeo",
    highlighted: true,
    badge: "Mais visibilidade",
  },
];

const categories = [
  "Corrida", "Ciclismo", "Triathlon", "Natação", "Futebol", "Futsal", "Vôlei", "Basquete",
  "Handball", "Tênis", "CrossFit", "Jiu-Jitsu", "Muay Thai", "Boxe", "Surf", "Skate",
  "Montanhismo", "Trail Run", "Caminhada", "Yoga", "Dança", "Evento Social", "Formatura",
  "Casamento", "Aniversário", "Corporativo", "Outro",
];

const locationSuggestions: Record<string, string[]> = {
  "joao": ["João Dourado - BA", "João Pessoa - PB", "João Monlevade - MG"],
  "sal": ["Salvador - BA", "Salinas - MG", "Salto - SP"],
  "sao": ["São Paulo - SP", "São Luís - MA", "São José dos Campos - SP", "São Carlos - SP"],
  "rec": ["Recife - PE", "Recreio dos Bandeirantes - RJ"],
  "rio": ["Rio de Janeiro - RJ", "Rio Branco - AC", "Rio Verde - GO"],
  "bel": ["Belém - PA", "Belo Horizonte - MG", "Belford Roxo - RJ"],
  "for": ["Fortaleza - CE", "Formosa - GO"],
  "ire": ["Irecê - BA"],
  "cam": ["Campinas - SP", "Campo Grande - MS", "Camaçari - BA"],
};

const searchTypes = [
  { key: "facial", label: "Reconhecimento Facial", icon: ScanFace, desc: "IA identifica rostos automaticamente" },
  { key: "album", label: "Álbum", icon: Image, desc: "Organize por pastas e jogos" },
  { key: "numero", label: "Número de Peito", icon: Eye, desc: "OCR lê números dos atletas" },
  { key: "sem", label: "Sem busca", icon: Camera, desc: "Galeria simples sem filtro" },
];

const CriarEvento = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedModel, setSelectedModel] = useState<"inicio" | "profissional" | null>(null);

  // Form fields
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventCategory, setEventCategory] = useState("");
  const [selectedSearchTypes, setSelectedSearchTypes] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<boolean | null>(null);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const getLocationSuggestions = (input: string) => {
    if (input.length < 2) return [];
    const key = Object.keys(locationSuggestions).find((k) => input.toLowerCase().startsWith(k));
    return key ? locationSuggestions[key] : [];
  };

  const filteredCategories = categories.filter((c) =>
    c.toLowerCase().includes((categorySearch || eventCategory).toLowerCase())
  );

  const toggleSearchType = (key: string) => {
    setSelectedSearchTypes((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (key === "sem") return ["sem"];
      const without = prev.filter((k) => k !== "sem");
      if (without.length >= 2) return without;
      return [...without, key];
    });
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 0 && !selectedModel) {
      toast.error("Selecione um modelo para continuar");
      return false;
    }

    if (step === 1) {
      if (!eventName.trim()) newErrors.eventName = "Nome do evento é obrigatório";
      if (!eventDate) newErrors.eventDate = "Data é obrigatória";
      if (!eventTime) newErrors.eventTime = "Horário é obrigatório";
      if (!eventLocation.trim()) newErrors.eventLocation = "Local é obrigatório";
      if (!eventCategory) newErrors.eventCategory = "Categoria é obrigatória";
    }

    if (step === 2 && selectedSearchTypes.length === 0) {
      toast.error("Selecione pelo menos um tipo de busca");
      return false;
    }

    if (step === 3 && visibility === null) {
      toast.error("Defina a visibilidade do evento");
      return false;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep(Math.min(steps.length - 1, currentStep + 1));
  };

  const [isCreating, setIsCreating] = useState(false);

  const handleCreateEvent = async () => {
    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Você precisa estar logado para criar um evento");
        setIsCreating(false);
        return;
      }

      const { data, error } = await supabase.from("events").insert({
        organizer_id: user.id,
        name: eventName,
        event_date: eventDate,
        event_time: eventTime || null,
        location: eventLocation,
        category: eventCategory,
        search_type: selectedSearchTypes,
        visibility: visibility ?? true,
        plan_type: selectedModel || "inicio",
      } as any).select().single();

      if (error) throw error;

      // Create default price grid
      await supabase.from("price_grids").insert({
        event_id: data.id,
        name: "Padrão",
        photo_high_price: 12,
        photo_low_price: 8,
        video_price: 10,
      });

      toast.success("Evento criado com sucesso! 🎉");
      navigate(`/dashboard/evento/${data.id}`);
    } catch (err: any) {
      toast.error("Erro ao criar evento: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 p-4 pt-18 lg:pt-6 lg:p-8 overflow-auto">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Criar novo evento</h1>
        <p className="text-sm text-muted-foreground mb-6 sm:mb-8">Insira abaixo as informações para criar seu evento.</p>

        {/* Progress */}
        <div className="flex items-center gap-1 sm:gap-2 mb-8 sm:mb-10 overflow-x-auto pb-2 scrollbar-hide">
          {steps.map((step, i) => (
            <div key={step} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <div
                onClick={() => i < currentStep && setCurrentStep(i)}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < currentStep ? "bg-primary text-primary-foreground cursor-pointer" :
                  i === currentStep ? "bg-primary text-primary-foreground animate-glow-pulse" :
                  "bg-secondary text-muted-foreground"
                }`}
              >
                {i < currentStep ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:inline ${i === currentStep ? "text-foreground" : "text-muted-foreground"}`}>{step}</span>
              {i < steps.length - 1 && <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step 0: Model */}
        {currentStep === 0 && (
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground mb-2">Escolha seu plano</h2>
            <p className="text-sm text-muted-foreground mb-6">Selecione o plano ideal para o seu evento:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
              {models.map((model) => (
                <div
                  key={model.key}
                  onClick={() => setSelectedModel(model.key)}
                  className={`glass-card p-5 sm:p-6 cursor-pointer transition-all relative ${
                    selectedModel === model.key ? "border-primary neon-border" : "hover:border-primary/30"
                  } ${model.highlighted ? "ring-1 ring-primary/20" : ""}`}
                >
                  {model.highlighted && model.badge && (
                    <span className="absolute -top-3 left-4 inline-flex px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg">
                      🚀 {model.badge}
                    </span>
                  )}
                  <h3 className="text-base sm:text-lg font-bold text-foreground mb-1 mt-1">{model.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{model.description}</p>
                  <p className="text-sm text-foreground mb-1">
                    Comissão de <span className="text-primary font-bold text-lg">{model.commission}</span> sobre vendas
                  </p>
                  <p className="text-[11px] text-muted-foreground mb-4">{model.commissionDesc}</p>
                  <ul className="space-y-2 mb-3">
                    {model.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="w-4 h-4 text-lime flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-muted-foreground/70 border-t border-border/50 pt-2">{model.uploadInfo}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Info */}
        {currentStep === 1 && (
          <div className="max-w-2xl space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-foreground mb-4">Informações básicas</h2>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Nome do evento *</label>
              <input
                type="text"
                placeholder="Ex: VERÃO RUN 2026"
                value={eventName}
                onChange={(e) => { setEventName(e.target.value); setErrors((p) => ({ ...p, eventName: "" })); }}
                className={`w-full px-4 py-3 rounded-lg bg-secondary border text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors text-sm min-h-[48px] ${errors.eventName ? "border-red-500" : "border-border"}`}
              />
              {errors.eventName && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.eventName}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Data do evento *</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => { setEventDate(e.target.value); setErrors((p) => ({ ...p, eventDate: "" })); }}
                  className={`w-full px-4 py-3 rounded-lg bg-secondary border text-foreground outline-none focus:border-primary transition-colors text-sm min-h-[48px] ${errors.eventDate ? "border-red-500" : "border-border"}`}
                />
                {errors.eventDate && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.eventDate}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Horário *</label>
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => { setEventTime(e.target.value); setErrors((p) => ({ ...p, eventTime: "" })); }}
                  className={`w-full px-4 py-3 rounded-lg bg-secondary border text-foreground outline-none focus:border-primary transition-colors text-sm min-h-[48px] ${errors.eventTime ? "border-red-500" : "border-border"}`}
                />
                {errors.eventTime && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.eventTime}</p>}
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-foreground mb-1.5">Local do evento *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Digite a cidade do evento"
                  value={eventLocation}
                  onChange={(e) => { setEventLocation(e.target.value); setShowLocationSuggestions(true); setErrors((p) => ({ ...p, eventLocation: "" })); }}
                  onFocus={() => setShowLocationSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                  className={`w-full pl-10 pr-4 py-3 rounded-lg bg-secondary border text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors text-sm min-h-[48px] ${errors.eventLocation ? "border-red-500" : "border-border"}`}
                />
              </div>
              {showLocationSuggestions && getLocationSuggestions(eventLocation).length > 0 && (
                <div className="absolute z-20 w-full mt-1 rounded-lg bg-secondary border border-border shadow-xl overflow-hidden">
                  {getLocationSuggestions(eventLocation).map((loc) => (
                    <button
                      key={loc}
                      onMouseDown={() => { setEventLocation(loc); setShowLocationSuggestions(false); }}
                      className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-primary/10 transition-colors flex items-center gap-2"
                    >
                      <MapPin className="w-3 h-3 text-primary" />
                      {loc}
                    </button>
                  ))}
                </div>
              )}
              {errors.eventLocation && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.eventLocation}</p>}
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-foreground mb-1.5">Categoria *</label>
              <input
                type="text"
                placeholder="Selecione ou digite a categoria"
                value={eventCategory}
                onChange={(e) => { setEventCategory(e.target.value); setCategorySearch(e.target.value); setShowCategoryDropdown(true); setErrors((p) => ({ ...p, eventCategory: "" })); }}
                onFocus={() => setShowCategoryDropdown(true)}
                onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
                className={`w-full px-4 py-3 rounded-lg bg-secondary border text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors text-sm min-h-[48px] ${errors.eventCategory ? "border-red-500" : "border-border"}`}
              />
              {showCategoryDropdown && filteredCategories.length > 0 && (
                <div className="absolute z-20 w-full mt-1 rounded-lg bg-secondary border border-border shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                  {filteredCategories.map((cat) => (
                    <button
                      key={cat}
                      onMouseDown={() => { setEventCategory(cat); setCategorySearch(""); setShowCategoryDropdown(false); }}
                      className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-primary/10 transition-colors"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
              {errors.eventCategory && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.eventCategory}</p>}
            </div>
          </div>
        )}

        {/* Step 2: Search Types */}
        {currentStep === 2 && (
          <div className="max-w-2xl">
            <h2 className="text-base sm:text-lg font-bold text-foreground mb-2">Tipos de busca no evento</h2>
            <p className="text-sm text-muted-foreground mb-6">Selecione até 2 tipos de busca para os participantes encontrarem suas fotos.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {searchTypes.map((opt) => {
                const selected = selectedSearchTypes.includes(opt.key);
                return (
                  <button
                    key={opt.key}
                    onClick={() => toggleSearchType(opt.key)}
                    className={`glass-card p-4 sm:p-6 flex flex-col items-center gap-2 sm:gap-3 transition-all text-center min-h-[100px] ${
                      selected ? "border-primary neon-border" : "hover:border-primary/30"
                    }`}
                  >
                    <opt.icon className={`w-6 h-6 sm:w-8 sm:h-8 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-[11px] sm:text-xs font-medium text-foreground leading-tight">{opt.label}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight hidden sm:block">{opt.desc}</span>
                    {selected && <Check className="w-4 h-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Visibility */}
        {currentStep === 3 && (
          <div className="max-w-2xl">
            <h2 className="text-base sm:text-lg font-bold text-foreground mb-4">Visibilidade</h2>
            <div className="glass-card p-5 sm:p-6">
              <p className="text-sm text-muted-foreground mb-4">Deseja que seu evento seja visualizado no marketplace da VIUFOTO?</p>
              <div className="flex items-center gap-3 sm:gap-4">
                <button
                  onClick={() => setVisibility(true)}
                  className={`px-6 py-3 rounded-lg font-bold text-sm min-h-[48px] min-w-[80px] transition-all ${
                    visibility === true ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sim
                </button>
                <button
                  onClick={() => setVisibility(false)}
                  className={`px-6 py-3 rounded-lg font-bold text-sm min-h-[48px] min-w-[80px] transition-all ${
                    visibility === false ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Não
                </button>
              </div>
              {visibility !== null && (
                <p className="text-xs text-muted-foreground mt-3">
                  {visibility
                    ? "✅ Seu evento será exibido na Home e no Marketplace para todos os visitantes."
                    : "🔒 Seu evento ficará oculto. Somente pessoas com o link direto poderão acessá-lo."}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Summary */}
        {currentStep === 4 && (
          <div className="max-w-2xl">
            <h2 className="text-base sm:text-lg font-bold text-foreground mb-4">Resumo do evento</h2>
            <p className="text-sm text-muted-foreground mb-6">Confira as informações antes de criar seu evento.</p>
            <div className="glass-card p-5 sm:p-6 space-y-4">
              {[
                { label: "Plano", value: models.find((m) => m.key === selectedModel)?.name || selectedModel },
                { label: "Nome", value: eventName },
                { label: "Data", value: eventDate ? new Date(eventDate + "T12:00:00").toLocaleDateString("pt-BR") : "" },
                { label: "Horário", value: eventTime },
                { label: "Local", value: eventLocation },
                { label: "Categoria", value: eventCategory },
                { label: "Busca", value: selectedSearchTypes.map((k) => searchTypes.find((s) => s.key === k)?.label).join(", ") },
                { label: "Visibilidade", value: visibility ? "Público (marketplace)" : "Privado (apenas link)" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-medium text-foreground text-right">{item.value}</span>
                </div>
              ))}
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
            onClick={currentStep === steps.length - 1 ? handleCreateEvent : handleNext}
            disabled={isCreating}
            className="px-4 sm:px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all min-h-[44px] disabled:opacity-50"
          >
            {isCreating ? "Criando..." : currentStep === steps.length - 1 ? "🚀 Criar Evento" : "Próximo"}
          </button>
        </div>
      </main>
    </div>
  );
};

export default CriarEvento;
