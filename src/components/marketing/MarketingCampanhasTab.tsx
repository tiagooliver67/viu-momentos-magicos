import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Facebook, Plus, Link2, Info } from "lucide-react";
import CreateCampaignWizard from "./CreateCampaignWizard";

const MarketingCampanhasTab = () => {
  const [connected] = useState(false); // Fase 3 backend habilitará
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Conexão Meta */}
      <div className="rounded-2xl border border-border bg-card p-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#1877F2]/10 text-[#1877F2] flex items-center justify-center">
            <Facebook className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg">Meta Ads (Facebook + Instagram)</h3>
              {connected ? (
                <Badge variant="secondary" className="bg-green-500/10 text-green-600">Conectado</Badge>
              ) : (
                <Badge variant="outline">Não conectado</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Conecte sua conta de anúncios do Meta para criar, pausar e monitorar campanhas direto da ViuFoto.
            </p>
          </div>
        </div>
        <Button disabled className="gap-2">
          <Link2 className="w-4 h-4" />
          Conectar Meta (em breve)
        </Button>
      </div>

      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          A integração real com a API de Marketing do Meta está sendo preparada. Você já pode explorar a interface e simular o fluxo de criação de campanha.
        </p>
      </div>

      {/* Campanhas */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="p-6 flex items-center justify-between border-b border-border">
          <div>
            <h3 className="font-bold">Suas campanhas</h3>
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
          </div>
          <Button onClick={() => setWizardOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova campanha
          </Button>
        </div>
        <div className="p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma campanha encontrada. Conecte o Meta e crie sua primeira campanha.
          </p>
        </div>
      </div>

      <CreateCampaignWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  );
};

export default MarketingCampanhasTab;