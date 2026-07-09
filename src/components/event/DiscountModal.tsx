import { useEffect, useState } from "react";
import { X, Plus, Minus, Tag, Package, Sparkles } from "lucide-react";

interface ProgressiveRule {
  active?: boolean;
  enabled: boolean;
  min_photos: number;
  discount_pct: number;
}

interface SavePayload {
  min_photos: number;
  discount_pct: number;
  all_photos_price?: number;
  min_photo_price?: number;
  package_type?: "closed" | "per_photo";
  display_mode?: "from" | "always";
  active?: boolean;
  base_photo_price?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (pkg: SavePayload) => void;
  isSaving: boolean;
  basePhotoPrice?: number;
  initialProgressiveEnabled?: boolean;
  initialProgressiveRules?: ProgressiveRule[];
  onSaveProgressive?: (rules: ProgressiveRule[], enabled: boolean) => void;
}

type Tab = "prices" | "packages";

export default function DiscountModal({
  open,
  onClose,
  onSave,
  isSaving,
  basePhotoPrice = 20,
  initialProgressiveEnabled,
  initialProgressiveRules,
  onSaveProgressive,
}: Props) {
  const [tab, setTab] = useState<Tab>("prices");

  // Aba 1 — Preços e descontos
  const [progressiveEnabled, setProgressiveEnabled] = useState(true);
  const [rules, setRules] = useState<ProgressiveRule[]>([
    { enabled: true, min_photos: 2, discount_pct: 5 },
    { enabled: true, min_photos: 5, discount_pct: 10 },
    { enabled: true, min_photos: 10, discount_pct: 20 },
  ]);

  // Aba 2 — Pacotes
  const [packageEnabled, setPackageEnabled] = useState(true);
  const [packageType, setPackageType] = useState<"closed" | "per_photo">("closed");
  const [packagePrice, setPackagePrice] = useState("0,00");
  const [displayMode, setDisplayMode] = useState<"from" | "always">("from");
  const [minPhotosToShow, setMinPhotosToShow] = useState("5");

  useEffect(() => {
    if (!open) setTab("prices");
  }, [open]);

  // Carrega regras existentes ao abrir
  useEffect(() => {
    if (!open) return;
    if (typeof initialProgressiveEnabled === "boolean") {
      setProgressiveEnabled(initialProgressiveEnabled);
    }
    if (initialProgressiveRules && initialProgressiveRules.length > 0) {
      setRules(initialProgressiveRules.map(r => ({
        active: r.active !== false,
        enabled: r.enabled !== false && r.active !== false,
        min_photos: Number(r.min_photos) || 0,
        discount_pct: Number(r.discount_pct) || 0,
      })));
    }
  }, [open, initialProgressiveEnabled, initialProgressiveRules]);

  if (!open) return null;

  const addRule = () =>
    setRules(rules.length >= 4 ? rules : [...rules, { enabled: true, min_photos: 1, discount_pct: 5 }]);
  const removeRule = (i: number) => setRules(rules.filter((_, j) => j !== i));
  const updateRule = (i: number, patch: Partial<ProgressiveRule>) => {
    const n = [...rules];
    n[i] = { ...n[i], ...patch };
    setRules(n);
  };

  const parseMoney = (s: string) => {
    const v = parseFloat(s.replace(/\./g, "").replace(",", "."));
    return isNaN(v) ? 0 : v;
  };
  const formatMoney = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;

  const handleSave = () => {
    const persistedRules = rules.map((rule) => ({
      ...rule,
      active: rule.enabled,
    }));
    const activeRule = progressiveEnabled
      ? persistedRules.find((r) => r.enabled) || persistedRules[0]
      : { min_photos: 0, discount_pct: 0 };
    // Persiste TODAS as regras progressivas no evento (banner + carrinho)
    if (onSaveProgressive) {
      onSaveProgressive(persistedRules, progressiveEnabled);
    }
    onSave({
      min_photos: activeRule.min_photos,
      discount_pct: activeRule.discount_pct,
      package_type: packageType,
      display_mode: displayMode,
      active: packageEnabled,
      all_photos_price: packageEnabled ? parseMoney(packagePrice) : undefined,
      min_photo_price: parseInt(minPhotosToShow) || undefined,
      base_photo_price: basePhotoPrice,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="glass-card p-0 max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="font-bold text-foreground text-lg">Pacotes e descontos</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Configure preços, descontos progressivos e pacotes do evento.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary"><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 pt-4 border-b border-border">
          {[
            { key: "prices" as Tab, label: "Preços e descontos", icon: Tag },
            { key: "packages" as Tab, label: "Pacotes", icon: Package },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative px-4 py-3 text-sm font-semibold flex items-center gap-2 transition-colors ${
                tab === key ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {tab === key && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary rounded-full" />}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === "prices" && (
            <div className="space-y-5">
              <div>
                <h4 className="text-base font-bold text-foreground">Descontos deste evento</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Ofereça descontos automáticos por quantidade de fotos e aumente o ticket médio da sua galeria.
                </p>
              </div>

              {/* Radio: Sem / Progressivo */}
              <div className="space-y-2">
                <RadioRow
                  active={!progressiveEnabled}
                  onClick={() => setProgressiveEnabled(false)}
                  title="Sem desconto"
                  desc="Manter o preço padrão da grade em cada foto comprada."
                />
                <RadioRow
                  active={progressiveEnabled}
                  onClick={() => setProgressiveEnabled(true)}
                  title="Desconto progressivo"
                  desc="Definir regras de desconto por quantidade de fotos adicionadas ao carrinho."
                />
              </div>

              {progressiveEnabled && (
                <div className="rounded-2xl border border-border bg-secondary/30 p-4 sm:p-5 space-y-4">
                  {/* Referência de preço base */}
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60">
                    <div>
                      <p className="text-xs font-semibold text-foreground">Preço base por foto</p>
                      <p className="text-[11px] text-muted-foreground">Definido na grade de preços do evento.</p>
                    </div>
                    <span className="text-sm font-bold text-foreground tabular-nums">{formatMoney(basePhotoPrice)}</span>
                  </div>

                  {/* Regras */}
                  <div className="space-y-2">
                    {rules.map((r, i) => {
                      const finalPrice = basePhotoPrice * (1 - r.discount_pct / 100);
                      return (
                        <div
                          key={i}
                          className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 rounded-xl bg-background border border-border px-3 py-2.5"
                        >
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={r.discount_pct}
                              onChange={(e) => updateRule(i, { discount_pct: Math.max(1, Math.min(100, +e.target.value || 0)), enabled: true })}
                              className="w-16 px-2 py-1.5 rounded-lg bg-secondary/60 border border-border text-foreground text-sm font-semibold text-center focus:border-primary focus:bg-background outline-none"
                            />
                            <span className="text-xs font-semibold text-muted-foreground">%</span>
                          </div>
                          <span className="text-xs text-muted-foreground">a partir de</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={1}
                              value={r.min_photos}
                              onChange={(e) => updateRule(i, { min_photos: Math.max(1, +e.target.value || 0), enabled: true })}
                              className="w-16 px-2 py-1.5 rounded-lg bg-secondary/60 border border-border text-foreground text-sm font-semibold text-center focus:border-primary focus:bg-background outline-none"
                            />
                            <span className="text-xs font-semibold text-muted-foreground">fotos</span>
                          </div>
                          <span className="hidden sm:inline text-xs text-muted-foreground ml-auto tabular-nums">
                            → <span className="font-semibold text-primary">{formatMoney(finalPrice)}</span> / foto
                          </span>
                          <button
                            onClick={() => removeRule(i)}
                            disabled={rules.length === 1}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ml-auto sm:ml-0"
                            aria-label="Remover regra"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={addRule}
                    disabled={rules.length >= 4}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 text-primary text-sm font-semibold hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" /> Adicionar regra de desconto
                  </button>

                  <p className="text-[11px] text-muted-foreground">
                    Você adicionou <strong className="text-foreground">{rules.length}</strong> de 4 regras. Os descontos são aplicados automaticamente no carrinho e destacados no topo da galeria.
                  </p>

                  {/* Preview */}
                  {rules.length > 0 && (
                    <div className="flex items-start gap-3 rounded-xl bg-primary/5 border border-primary/20 p-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-primary" />
                      </div>
                      <div className="text-[11px] text-muted-foreground leading-relaxed">
                        Prévia do banner da galeria: <span className="font-bold text-foreground">Ganhe até {Math.max(...rules.map(r => r.discount_pct))}% de desconto</span> comprando a partir de {Math.min(...rules.map(r => r.min_photos))} fotos.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "packages" && (
            <div className="space-y-6">
              {/* Toggle pacote */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-foreground">Ativar venda por pacote</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Habilite a venda de TODAS as fotos do reconhecimento facial em um único pacote.</p>
                </div>
                <Switch checked={packageEnabled} onChange={setPackageEnabled} />
              </div>

              {packageEnabled && (
                <>
                  {/* Tipo de pacote */}
                  <div className="rounded-xl border border-border bg-secondary/30 p-4">
                    <p className="text-sm font-bold text-foreground mb-3">Tipo de pacote</p>
                    <div className="grid grid-cols-2 gap-3">
                      <RadioCard
                        title="Pacote fechado"
                        desc="Cliente paga um valor único por TODAS as fotos encontradas."
                        active={packageType === "closed"}
                        onClick={() => setPackageType("closed")}
                      />
                      <RadioCard
                        title="Por foto"
                        desc="Preço unitário reduzido aplicado a cada foto do pacote."
                        active={packageType === "per_photo"}
                        onClick={() => setPackageType("per_photo")}
                      />
                    </div>

                    <div className="mt-4">
                      <label className="text-xs font-semibold text-foreground">
                        {packageType === "closed" ? "Valor total do pacote" : "Preço por foto no pacote"}
                      </label>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-sm text-muted-foreground">R$</span>
                        <input
                          value={packagePrice}
                          onChange={(e) => setPackagePrice(e.target.value)}
                          placeholder="0,00"
                          className="flex-1 px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:border-primary outline-none"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                        {packageType === "closed"
                          ? "Ex.: 20 fotos por R$ 50,00 — independente da quantidade encontrada."
                          : "Ex.: cada foto custará o valor definido acima dentro do pacote."}
                      </p>
                    </div>
                  </div>

                  {/* Quando exibir */}
                  <div className="rounded-xl border border-border bg-secondary/30 p-4">
                    <p className="text-sm font-bold text-foreground mb-1">Quando exibir o pacote</p>
                    <p className="text-xs text-muted-foreground mb-3">Defina em que momento o pacote aparece para o cliente.</p>

                    <div className="flex items-center gap-4 mb-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={displayMode === "from"}
                          onChange={() => setDisplayMode("from")}
                          className="accent-primary"
                        />
                        <span className="text-sm text-foreground">A partir de</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={displayMode === "always"}
                          onChange={() => setDisplayMode("always")}
                          className="accent-primary"
                        />
                        <span className="text-sm text-foreground">Sempre</span>
                      </label>
                    </div>

                    {displayMode === "from" && (
                      <>
                        <input
                          type="number"
                          min={1}
                          value={minPhotosToShow}
                          onChange={(e) => setMinPhotosToShow(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:border-primary outline-none"
                        />
                        <p className="text-[11px] text-muted-foreground mt-2">
                          O pacote só será exibido para o cliente quando houver pelo menos <strong className="text-foreground">{minPhotosToShow || 0}</strong> fotos encontradas.
                        </p>
                      </>
                    )}
                    {displayMode === "always" && (
                      <p className="text-[11px] text-muted-foreground">O pacote será exibido sempre, mesmo com poucas fotos encontradas.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 min-w-[140px]"
          >
            {isSaving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Switch({ checked, onChange, small }: { checked: boolean; onChange: (v: boolean) => void; small?: boolean }) {
  const w = small ? "w-9" : "w-11";
  const h = small ? "h-5" : "h-6";
  const dot = small ? "w-3.5 h-3.5" : "w-5 h-5";
  const trans = small ? (checked ? "translate-x-4" : "translate-x-0.5") : (checked ? "translate-x-5" : "translate-x-0.5");
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`${w} ${h} rounded-full transition-colors flex-shrink-0 relative ${checked ? "bg-primary" : "bg-secondary border border-border"}`}
    >
      <span className={`absolute top-1/2 -translate-y-1/2 ${dot} bg-white rounded-full shadow transition-transform ${trans}`} />
    </button>
  );
}

function RadioCard({ title, desc, active, onClick }: { title: string; desc: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-3 rounded-lg border-2 transition-all ${
        active ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/40"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${active ? "border-primary" : "border-muted-foreground/40"}`}>
          {active && <span className="w-2 h-2 rounded-full bg-primary" />}
        </span>
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed pl-6">{desc}</p>
    </button>
  );
}