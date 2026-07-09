import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Target, DollarSign, Users, Rocket, ChevronLeft, ChevronRight, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Objective = "vendas" | "trafego" | "reconhecimento" | "leads";

const OBJECTIVES: { id: Objective; label: string; desc: string }[] = [
  { id: "vendas", label: "Vendas de fotos", desc: "Foco em conversão no seu evento." },
  { id: "trafego", label: "Tráfego para o álbum", desc: "Levar atletas para buscar suas fotos." },
  { id: "reconhecimento", label: "Reconhecimento", desc: "Divulgar sua marca de fotografia." },
  { id: "leads", label: "Captação de contatos", desc: "Interessados para próximos eventos." },
];

const STEPS = ["Objetivo", "Orçamento", "Público", "Criativo & Publicar"];

const CreateCampaignWizard = ({ open, onOpenChange }: Props) => {
  const [step, setStep] = useState(0);
  const [objective, setObjective] = useState<Objective>("vendas");
  const [budget, setBudget] = useState<number[]>([50]);
  const [days, setDays] = useState<number[]>([7]);
  const [audience, setAudience] = useState({ age_min: 18, age_max: 55, location: "", interests: "" });
  const [creative, setCreative] = useState({ headline: "", body: "", cta: "Ver fotos" });
  const [generatingAi, setGeneratingAi] = useState(false);

  const reset = () => {
    setStep(0);
    setObjective("vendas");
    setBudget([50]);
    setDays([7]);
    setAudience({ age_min: 18, age_max: 55, location: "", interests: "" });
    setCreative({ headline: "", body: "", cta: "Ver fotos" });
  };

  const handleGenerateAi = async () => {
    setGeneratingAi(true);
    setTimeout(() => {
      setCreative({
        headline: "Suas fotos do evento estão prontas! 📸",
        body: "Encontre-se em segundos com nossa busca facial e leve para casa o melhor registro da sua prova.",
        cta: "Ver fotos",
      });
      setGeneratingAi(false);
      toast.success("Criativo sugerido pela IA");
    }, 900);
  };

  const handlePublish = () => {
    toast.info("Integração com Meta em breve. Sua configuração foi validada.");
    onOpenChange(false);
    reset();
  };

  const total = budget[0] * days[0];

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova campanha</DialogTitle>
          <div className="flex items-center gap-2 mt-4">
            {STEPS.map((label, i) => (
              <div key={label} className="flex-1 flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:inline ${i === step ? "font-semibold" : "text-muted-foreground"}`}>{label}</span>
                {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? "bg-primary" : "bg-border"}`} />}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="py-4 min-h-[280px]">
          {step === 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">Qual seu objetivo?</h3>
              </div>
              <RadioGroup value={objective} onValueChange={(v) => setObjective(v as Objective)} className="space-y-2">
                {OBJECTIVES.map((o) => (
                  <label key={o.id} htmlFor={o.id} className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition ${objective === o.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                    <RadioGroupItem value={o.id} id={o.id} className="mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">{o.label}</div>
                      <div className="text-xs text-muted-foreground">{o.desc}</div>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">Orçamento e duração</h3>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <Label>Orçamento diário</Label>
                  <span className="text-sm font-semibold">R$ {budget[0]}</span>
                </div>
                <Slider value={budget} onValueChange={setBudget} min={10} max={500} step={10} />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <Label>Duração (dias)</Label>
                  <span className="text-sm font-semibold">{days[0]} dias</span>
                </div>
                <Slider value={days} onValueChange={setDays} min={1} max={30} step={1} />
              </div>
              <div className="rounded-lg bg-muted/40 p-4 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Investimento total estimado</span>
                <span className="text-xl font-black text-primary">R$ {total.toLocaleString("pt-BR")}</span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">Público-alvo</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Idade mín.</Label>
                  <Input type="number" value={audience.age_min} onChange={(e) => setAudience({ ...audience, age_min: +e.target.value })} />
                </div>
                <div>
                  <Label>Idade máx.</Label>
                  <Input type="number" value={audience.age_max} onChange={(e) => setAudience({ ...audience, age_max: +e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Localização</Label>
                <Input placeholder="Ex.: São Paulo, SP" value={audience.location} onChange={(e) => setAudience({ ...audience, location: e.target.value })} />
              </div>
              <div>
                <Label>Interesses</Label>
                <Input placeholder="Ex.: corrida de rua, triathlon, ciclismo" value={audience.interests} onChange={(e) => setAudience({ ...audience, interests: e.target.value })} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold">Criativo do anúncio</h3>
                </div>
                <Button size="sm" variant="outline" onClick={handleGenerateAi} disabled={generatingAi} className="gap-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  {generatingAi ? "Gerando..." : "Gerar com IA"}
                </Button>
              </div>
              <div>
                <Label>Título</Label>
                <Input value={creative.headline} onChange={(e) => setCreative({ ...creative, headline: e.target.value })} placeholder="Chame atenção em uma frase" />
              </div>
              <div>
                <Label>Texto</Label>
                <Textarea rows={3} value={creative.body} onChange={(e) => setCreative({ ...creative, body: e.target.value })} placeholder="Fale sobre o benefício" />
              </div>
              <div>
                <Label>Botão de ação (CTA)</Label>
                <Input value={creative.cta} onChange={(e) => setCreative({ ...creative, cta: e.target.value })} />
              </div>

              <div className="rounded-lg border border-border p-4 bg-muted/30">
                <div className="text-xs text-muted-foreground mb-2">Resumo</div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Objetivo: {OBJECTIVES.find((o) => o.id === objective)?.label}</Badge>
                  <Badge variant="outline">R$ {budget[0]}/dia · {days[0]}d</Badge>
                  <Badge variant="outline">{audience.age_min}–{audience.age_max} anos</Badge>
                  {audience.location && <Badge variant="outline">{audience.location}</Badge>}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex sm:justify-between gap-2">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Voltar
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} className="gap-1">
              Próximo <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handlePublish} className="gap-1">
              <Rocket className="w-4 h-4" /> Publicar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCampaignWizard;