import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bot, Loader2, RefreshCw, Check, X, Zap, TrendingUp, Percent, Megaphone } from "lucide-react";
import { toast } from "sonner";

type Suggestion = {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  payload: any;
  status: string;
  event_id: string | null;
  created_at: string;
};

const KIND_META: Record<string, { icon: any; color: string; label: string }> = {
  remarketing: { icon: TrendingUp, color: "bg-blue-500/10 text-blue-600", label: "Remarketing" },
  cupom: { icon: Percent, color: "bg-amber-500/10 text-amber-600", label: "Cupom" },
  campanha: { icon: Megaphone, color: "bg-purple-500/10 text-purple-600", label: "Campanha" },
  promocao: { icon: Zap, color: "bg-emerald-500/10 text-emerald-600", label: "Promoção" },
};

const MarketingAutomacaoTab = () => {
  const { user } = useAuth();
  const [autopilot, setAutopilot] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const [s, sug] = await Promise.all([
      supabase.from("marketing_automation_settings" as any).select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("marketing_suggestions" as any).select("*").eq("user_id", user.id).eq("status", "pending").order("created_at", { ascending: false }),
    ]);
    const row: any = s.data;
    setAutopilot(!!row?.autopilot_enabled);
    setAutoApprove(!!row?.auto_approve);
    setLastScan(row?.last_scan_at ?? null);
    setSuggestions((sug.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const toggleAutopilot = async (v: boolean) => {
    if (!user) return;
    setAutopilot(v);
    const { error } = await supabase.from("marketing_automation_settings" as any).upsert({ user_id: user.id, autopilot_enabled: v, auto_approve: autoApprove });
    if (error) { toast.error("Erro ao salvar"); setAutopilot(!v); }
    else toast.success(v ? "Piloto automático ativado" : "Piloto automático desativado");
  };

  const toggleAutoApprove = async (v: boolean) => {
    if (!user) return;
    setAutoApprove(v);
    await supabase.from("marketing_automation_settings" as any).upsert({ user_id: user.id, autopilot_enabled: autopilot, auto_approve: v });
  };

  const scan = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("marketing-autopilot-scan", { body: {} });
      if (error) throw error;
      const created = (data as any)?.created?.length ?? 0;
      toast.success(created ? `${created} nova(s) sugestão(ões) encontrada(s)` : "Nenhuma nova oportunidade agora");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao analisar");
    } finally {
      setScanning(false);
    }
  };

  const decide = async (id: string, status: "approved" | "dismissed") => {
    const { error } = await supabase.from("marketing_suggestions" as any).update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error("Erro"); return; }
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
    toast.success(status === "approved" ? "Sugestão aprovada" : "Sugestão descartada");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Piloto Automático</h3>
              <p className="text-sm text-muted-foreground max-w-xl mt-1">
                A IA monitora suas vendas e sugere ações (campanhas, cupons, remarketing) quando detecta oportunidades.
              </p>
              {lastScan && (
                <p className="text-xs text-muted-foreground mt-2">
                  Última análise: {new Date(lastScan).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{autopilot ? "Ativo" : "Desativado"}</span>
            <Switch checked={autopilot} onCheckedChange={toggleAutopilot} />
          </div>
        </div>

        {autopilot && (
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Aprovação automática</p>
              <p className="text-xs text-muted-foreground">Aplica sugestões sem aguardar sua confirmação (não recomendado no início).</p>
            </div>
            <Switch checked={autoApprove} onCheckedChange={toggleAutoApprove} />
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={scan} disabled={scanning} className="gap-2">
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Analisar agora
          </Button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">Sugestões pendentes</h3>
          <Badge variant="outline">{suggestions.length}</Badge>
        </div>

        {loading ? (
          <div className="grid gap-3">
            {[0, 1].map((i) => <div key={i} className="rounded-2xl border border-border bg-card p-6 h-28 animate-pulse" />)}
          </div>
        ) : suggestions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <Bot className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhuma sugestão no momento. Clique em <strong className="text-foreground">Analisar agora</strong> para gerar novas.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {suggestions.map((s) => {
              const meta = KIND_META[s.kind] || { icon: Zap, color: "bg-secondary text-foreground", label: s.kind };
              const Icon = meta.icon;
              return (
                <div key={s.id} className="rounded-2xl border border-border bg-card p-5 flex flex-col sm:flex-row gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${meta.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="secondary" className="text-[10px] uppercase">{meta.label}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                    <h4 className="font-semibold">{s.title}</h4>
                    {s.description && <p className="text-sm text-muted-foreground mt-1">{s.description}</p>}
                  </div>
                  <div className="flex gap-2 sm:flex-col justify-end">
                    <Button size="sm" onClick={() => decide(s.id, "approved")} className="gap-1">
                      <Check className="w-4 h-4" /> Aprovar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => decide(s.id, "dismissed")} className="gap-1">
                      <X className="w-4 h-4" /> Descartar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketingAutomacaoTab;