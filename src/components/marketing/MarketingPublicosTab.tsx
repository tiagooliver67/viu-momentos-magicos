import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Users, ShoppingCart, Search, Eye, Link2, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CreateCampaignWizard from "./CreateCampaignWizard";

interface Segment {
  id: string;
  name: string;
  description: string;
  icon: any;
  count: number;
  color: string;
}

const MarketingPublicosTab = () => {
  const { user } = useAuth();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardPreset, setWizardPreset] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const since = new Date(Date.now() - 30 * 86400_000).toISOString();
      const [visitors, searchers, viewers] = await Promise.all([
        supabase.from("marketing_events_log" as any).select("visitor_id", { count: "exact", head: true }).eq("photographer_id", user.id).eq("event_name", "PageView").gte("created_at", since),
        supabase.from("marketing_events_log" as any).select("visitor_id", { count: "exact", head: true }).eq("photographer_id", user.id).eq("event_name", "Search").gte("created_at", since),
        supabase.from("marketing_events_log" as any).select("visitor_id", { count: "exact", head: true }).eq("photographer_id", user.id).eq("event_name", "ViewContent").gte("created_at", since),
      ]);

      setSegments([
        { id: "visitors", name: "Visitantes que não compraram", description: "Pessoas que abriram seu álbum nos últimos 30 dias e não finalizaram a compra.", icon: Eye, count: visitors.count || 0, color: "bg-blue-500/10 text-blue-600" },
        { id: "searchers", name: "Buscaram por face/número", description: "Fizeram uma busca facial ou por número no seu evento.", icon: Search, count: searchers.count || 0, color: "bg-amber-500/10 text-amber-600" },
        { id: "viewers", name: "Viram uma foto específica", description: "Interagiram com uma foto individual sem levar ao carrinho.", icon: Users, count: viewers.count || 0, color: "bg-purple-500/10 text-purple-600" },
        { id: "cart", name: "Abandono de carrinho", description: "Adicionaram fotos ao carrinho e não pagaram.", icon: ShoppingCart, count: 0, color: "bg-red-500/10 text-red-600" },
      ]);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-bold text-lg mb-1">Públicos de remarketing</h3>
        <p className="text-sm text-muted-foreground">
          Segmentos gerados automaticamente a partir dos eventos rastreados pelos seus Pixels.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-6 animate-pulse h-40" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {segments.map((s) => (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-6 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <Badge variant="outline">{s.count.toLocaleString("pt-BR")} pessoas</Badge>
              </div>
              <h4 className="font-semibold">{s.name}</h4>
              <p className="text-xs text-muted-foreground mt-1 flex-1">{s.description}</p>
              <div className="mt-4 flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  className="gap-2"
                  disabled={s.count === 0}
                  onClick={() => { setWizardPreset(s.id); setWizardOpen(true); }}
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  Criar campanha
                </Button>
                <Button variant="outline" size="sm" className="gap-2" disabled>
                  <Link2 className="w-3.5 h-3.5" />
                  Sincronizar com Meta (em breve)
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateCampaignWizard open={wizardOpen} onOpenChange={setWizardOpen} audiencePreset={wizardPreset} />
    </div>
  );
};

export default MarketingPublicosTab;