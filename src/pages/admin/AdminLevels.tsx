import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { LEVEL_ICONS, LEVEL_LABELS, type LevelKey } from "@/lib/levels";

interface Rule {
  level: LevelKey;
  sort_order: number;
  min_events: number;
  min_sales: number;
  min_revenue: number;
  requires_profile_complete: boolean;
  requires_document: boolean;
  manual_only: boolean;
  match_mode: "and" | "or";
  commission_pct: number;
  benefits: string[];
  message: string | null;
}

interface Ach {
  id: string;
  code: string;
  title: string;
  description: string | null;
  icon: string | null;
  criteria: any;
  active: boolean;
  sort_order: number;
}

export default function AdminLevels() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [achs, setAchs] = useState<Ach[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data: r }, { data: a }] = await Promise.all([
      supabase.from("level_rules" as any).select("*").order("sort_order"),
      supabase.from("achievements" as any).select("*").order("sort_order"),
    ]);
    setRules((r as any) ?? []);
    setAchs((a as any) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const saveRule = async (rule: Rule) => {
    setSaving(true);
    const { error } = await supabase
      .from("level_rules" as any)
      .update({
        min_events: rule.min_events,
        min_sales: rule.min_sales,
        min_revenue: rule.min_revenue,
        commission_pct: rule.commission_pct,
        match_mode: rule.match_mode,
        requires_profile_complete: rule.requires_profile_complete,
        requires_document: rule.requires_document,
        message: rule.message,
        benefits: rule.benefits,
      })
      .eq("level", rule.level);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success(`${LEVEL_LABELS[rule.level]} salvo`);
  };

  const saveAch = async (a: Ach) => {
    setSaving(true);
    const { error } = await supabase
      .from("achievements" as any)
      .update({ title: a.title, description: a.description, icon: a.icon, active: a.active, criteria: a.criteria })
      .eq("id", a.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Conquista salva");
  };

  const recalcAll = async () => {
    toast.info("Recalculando todos os fotógrafos...");
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "photographer");
    let ok = 0;
    for (const u of (roles as any[]) ?? []) {
      const { error } = await supabase.rpc("recalc_photographer_level" as any, { _user_id: u.user_id });
      if (!error) ok++;
    }
    toast.success(`${ok} fotógrafos atualizados`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Níveis & Conquistas</h1>
          <p className="text-sm text-muted-foreground">Configure os critérios de progressão dos fotógrafos.</p>
        </div>
        <button
          onClick={recalcAll}
          className="px-4 py-2 rounded-xl bg-secondary text-sm font-medium hover:bg-secondary/70 flex items-center gap-2"
        >
          <RotateCw className="w-4 h-4" /> Recalcular todos
        </button>
      </div>

      {/* Regras */}
      <div className="space-y-4">
        <h2 className="font-semibold">Regras dos níveis</h2>
        {rules.map((rule, idx) => (
          <div key={rule.level} className="glass-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{LEVEL_ICONS[rule.level]}</span>
              <h3 className="font-bold text-lg">{LEVEL_LABELS[rule.level]}</h3>
              {rule.manual_only && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-fuchsia-500/15 text-fuchsia-600 font-bold">
                  Apenas manual
                </span>
              )}
            </div>

            {!rule.manual_only && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field
                  label="Mín. eventos"
                  type="number"
                  value={rule.min_events}
                  onChange={(v) => setRules((r) => r.map((x, i) => (i === idx ? { ...x, min_events: Number(v) } : x)))}
                />
                <Field
                  label="Mín. vendas"
                  type="number"
                  value={rule.min_sales}
                  onChange={(v) => setRules((r) => r.map((x, i) => (i === idx ? { ...x, min_sales: Number(v) } : x)))}
                />
                <Field
                  label="Mín. faturamento (R$)"
                  type="number"
                  value={rule.min_revenue}
                  onChange={(v) => setRules((r) => r.map((x, i) => (i === idx ? { ...x, min_revenue: Number(v) } : x)))}
                />
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Modo</label>
                  <select
                    value={rule.match_mode}
                    onChange={(e) =>
                      setRules((r) => r.map((x, i) => (i === idx ? { ...x, match_mode: e.target.value as any } : x)))
                    }
                    className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm outline-none border border-border"
                  >
                    <option value="and">E (todos os critérios)</option>
                    <option value="or">OU (qualquer um)</option>
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field
                label="Comissão de indicação (%)"
                type="number"
                value={rule.commission_pct}
                step="0.1"
                onChange={(v) => setRules((r) => r.map((x, i) => (i === idx ? { ...x, commission_pct: Number(v) } : x)))}
              />
              <Field
                label="Mensagem"
                type="text"
                value={rule.message ?? ""}
                onChange={(v) => setRules((r) => r.map((x, i) => (i === idx ? { ...x, message: v } : x)))}
              />
            </div>

            {!rule.manual_only && (
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={rule.requires_profile_complete}
                    onChange={(e) =>
                      setRules((r) =>
                        r.map((x, i) => (i === idx ? { ...x, requires_profile_complete: e.target.checked } : x))
                      )
                    }
                  />
                  Perfil completo
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={rule.requires_document}
                    onChange={(e) =>
                      setRules((r) => r.map((x, i) => (i === idx ? { ...x, requires_document: e.target.checked } : x)))
                    }
                  />
                  Documento validado
                </label>
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Benefícios (um por linha)</label>
              <textarea
                value={rule.benefits.join("\n")}
                onChange={(e) =>
                  setRules((r) =>
                    r.map((x, i) => (i === idx ? { ...x, benefits: e.target.value.split("\n").filter(Boolean) } : x))
                  )
                }
                rows={4}
                className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm outline-none border border-border"
              />
            </div>

            <button
              onClick={() => saveRule(rule)}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Salvar {LEVEL_LABELS[rule.level]}
            </button>
          </div>
        ))}
      </div>

      {/* Conquistas */}
      <div className="space-y-3">
        <h2 className="font-semibold">Conquistas</h2>
        {achs.map((a, idx) => (
          <div key={a.id} className="glass-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{a.icon}</span>
              <code className="text-xs text-muted-foreground">{a.code}</code>
              <label className="ml-auto flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={a.active}
                  onChange={(e) => setAchs((arr) => arr.map((x, i) => (i === idx ? { ...x, active: e.target.checked } : x)))}
                />
                Ativa
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field
                label="Título"
                type="text"
                value={a.title}
                onChange={(v) => setAchs((arr) => arr.map((x, i) => (i === idx ? { ...x, title: v } : x)))}
              />
              <Field
                label="Ícone (emoji)"
                type="text"
                value={a.icon ?? ""}
                onChange={(v) => setAchs((arr) => arr.map((x, i) => (i === idx ? { ...x, icon: v } : x)))}
              />
              <Field
                label="Meta"
                type="number"
                value={a.criteria?.value ?? 0}
                onChange={(v) =>
                  setAchs((arr) =>
                    arr.map((x, i) => (i === idx ? { ...x, criteria: { ...x.criteria, value: Number(v) } } : x))
                  )
                }
              />
            </div>
            <Field
              label="Descrição"
              type="text"
              value={a.description ?? ""}
              onChange={(v) => setAchs((arr) => arr.map((x, i) => (i === idx ? { ...x, description: v } : x)))}
            />
            <button
              onClick={() => saveAch(a)}
              disabled={saving}
              className="mt-3 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Salvar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  step,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm outline-none border border-border focus:border-primary"
      />
    </div>
  );
}