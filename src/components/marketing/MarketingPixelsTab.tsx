import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus, Power } from "lucide-react";

type Provider = "meta" | "gtm" | "google_ads" | "tiktok";

const PROVIDERS: { id: Provider; label: string; hint: string; placeholder: string }[] = [
  { id: "meta", label: "Meta Pixel", hint: "ID numérico do Meta Pixel (Facebook / Instagram)", placeholder: "123456789012345" },
  { id: "gtm", label: "Google Tag Manager", hint: "Container ID (GTM-XXXXXX)", placeholder: "GTM-XXXXXX" },
  { id: "google_ads", label: "Google Ads", hint: "Conversion ID (AW-XXXXXXXXX)", placeholder: "AW-123456789" },
  { id: "tiktok", label: "TikTok Pixel", hint: "Pixel Code", placeholder: "C4XXXXXXXXXXXXXXXXXX" },
];

const MarketingPixelsTab = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [provider, setProvider] = useState<Provider>("meta");
  const [pixelId, setPixelId] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: pixels = [], isLoading } = useQuery({
    queryKey: ["marketing-pixels", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_pixels" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const handleAdd = async () => {
    if (!user || !pixelId.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("marketing_pixels" as any).insert({
      user_id: user.id,
      provider,
      pixel_id: pixelId.trim(),
      label: label.trim() || null,
      active: true,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    setPixelId("");
    setLabel("");
    qc.invalidateQueries({ queryKey: ["marketing-pixels", user.id] });
    toast({ title: "Pixel conectado", description: "Eventos começarão a ser enviados imediatamente." });
  };

  const toggle = async (id: string, active: boolean) => {
    await supabase.from("marketing_pixels" as any).update({ active: !active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["marketing-pixels", user?.id] });
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este pixel?")) return;
    await supabase.from("marketing_pixels" as any).delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["marketing-pixels", user?.id] });
  };

  const currentProvider = PROVIDERS.find((p) => p.id === provider)!;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-bold mb-1">Conectar novo pixel</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Seus pixels são injetados automaticamente nas páginas públicas dos seus eventos.
        </p>

        <div className="grid gap-3 md:grid-cols-[180px_1fr_1fr_auto] items-end">
          <label className="block">
            <span className="text-xs text-muted-foreground">Plataforma</span>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as Provider)}
              className="mt-1 w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">{currentProvider.hint}</span>
            <input
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
              placeholder={currentProvider.placeholder}
              className="mt-1 w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Rótulo (opcional)</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex.: Conta pessoal"
              className="mt-1 w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
            />
          </label>
          <button
            onClick={handleAdd}
            disabled={saving || !pixelId.trim()}
            className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-bold">Pixels conectados</h3>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : pixels.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhum pixel conectado ainda.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {pixels.map((p) => {
              const meta = PROVIDERS.find((x) => x.id === p.provider);
              return (
                <li key={p.id} className="flex items-center gap-3 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">
                      {meta?.label || p.provider}
                      {p.label && <span className="text-muted-foreground font-normal"> · {p.label}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{p.pixel_id}</p>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2 py-1 rounded ${
                      p.active ? "bg-emerald-500/10 text-emerald-600" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {p.active ? "Ativo" : "Pausado"}
                  </span>
                  <button
                    onClick={() => toggle(p.id, p.active)}
                    className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"
                    title={p.active ? "Pausar" : "Ativar"}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    className="p-2 rounded-lg hover:bg-secondary text-red-500"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MarketingPixelsTab;