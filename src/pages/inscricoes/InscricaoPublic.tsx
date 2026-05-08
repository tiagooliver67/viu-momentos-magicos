import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Calendar, MapPin, Loader2, Upload, Copy, MessageCircle, CheckCircle2, FileText, Tag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  formatDate, formatBRL, applySeniorDiscount, getActiveTier, getNextTier,
  getCategoryAvailability, getShirtAvailability,
  type RegistrationEvent, type EventRegistration, type PriceTier, type RegistrationCategory, type ShirtStock,
} from "@/lib/inscricoes";

export default function InscricaoPublic() {
  const { slug } = useParams<{ slug: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<RegistrationEvent | null>(null);
  const [tiers, setTiers] = useState<PriceTier[]>([]);
  const [categories, setCategories] = useState<RegistrationCategory[]>([]);
  const [shirts, setShirts] = useState<ShirtStock[]>([]);
  const [regs, setRegs] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"info" | "form" | "success">("info");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ id: string; full_name: string; amount_due: number } | null>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", city: "", birth_date: "",
    category_id: "", shirt_size: "", notes: "",
  });

  useEffect(() => {
    (async () => {
      const { data: ev } = await supabase.from("registration_events").select("*").eq("slug", slug!).maybeSingle();
      setEvent(ev);
      if (ev) {
        const [{ data: t }, { data: c }, { data: s }, { data: r }] = await Promise.all([
          supabase.from("registration_price_tiers").select("*").eq("registration_event_id", ev.id).order("sort_order"),
          supabase.from("registration_categories").select("*").eq("registration_event_id", ev.id).order("sort_order"),
          supabase.from("registration_shirt_stock").select("*").eq("registration_event_id", ev.id).order("sort_order"),
          supabase.from("event_registrations").select("*").eq("registration_event_id", ev.id),
        ]);
        setTiers(t ?? []); setCategories(c ?? []); setShirts(s ?? []); setRegs(r ?? []);
      }
      setLoading(false);
    })();
  }, [slug]);

  useEffect(() => {
    if (user && profile) {
      setForm((p) => ({
        ...p,
        full_name: p.full_name || profile.full_name || "",
        email: p.email || user.email || "",
      }));
    }
  }, [user, profile]);

  const update = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const activeTier = useMemo(() => getActiveTier(tiers), [tiers]);
  const nextTier = useMemo(() => getNextTier(tiers), [tiers]);
  const catAvailability = useMemo(() => getCategoryAvailability(categories, regs), [categories, regs]);
  const shirtAvailability = useMemo(() => getShirtAvailability(shirts, regs), [shirts, regs]);

  const basePrice = activeTier ? Number(activeTier.price) : 0;
  const seniorEnabled = !!event?.senior_discount_enabled;
  const seniorMinAge = event?.senior_discount_min_age ?? 60;
  const priceCalc = useMemo(
    () => applySeniorDiscount(basePrice, form.birth_date || null, seniorEnabled, seniorMinAge),
    [basePrice, form.birth_date, seniorEnabled, seniorMinAge],
  );

  const submit = async () => {
    if (!event) return;
    if (!form.full_name || !form.email || !form.phone) { toast.error("Preencha nome, e-mail e telefone (WhatsApp)"); return; }
    if (event.requires_birth_date && !form.birth_date) { toast.error("Informe a data de nascimento"); return; }
    if (event.requires_city && !form.city) { toast.error("Informe a cidade"); return; }
    if (event.requires_shirt_size && !form.shirt_size) { toast.error("Selecione o tamanho da camiseta"); return; }
    if (categories.length > 0 && !form.category_id) { toast.error("Selecione uma modalidade"); return; }

    // validate slot availability
    if (form.category_id) {
      const cat = catAvailability.find((c) => c.id === form.category_id);
      if (cat && cat.remaining !== null && cat.remaining <= 0) { toast.error("Modalidade esgotada"); return; }
    }
    if (form.shirt_size) {
      const sh = shirtAvailability.find((s) => s.size === form.shirt_size);
      if (sh && sh.remaining <= 0) { toast.error("Tamanho esgotado"); return; }
    }

    const selectedCat = categories.find((c) => c.id === form.category_id);
    setSubmitting(true);
    const { data, error } = await supabase.from("event_registrations").insert({
      registration_event_id: event.id,
      user_id: user?.id ?? null,
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      city: form.city || null,
      birth_date: form.birth_date || null,
      category_id: form.category_id || null,
      category: selectedCat?.name ?? null,
      shirt_size: form.shirt_size || null,
      notes: form.notes || null,
      price_tier_id: activeTier?.id ?? null,
      amount_due: priceCalc.final,
      senior_discount_applied: priceCalc.applied,
    }).select("id, full_name, amount_due").single();
    setSubmitting(false);
    if (error || !data) { toast.error(error?.message ?? "Erro ao inscrever"); return; }
    setCreated({ id: data.id, full_name: data.full_name, amount_due: Number(data.amount_due) });
    setStep("success");
  };

  const uploadProof = async (file: File) => {
    if (!created) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `proofs/${created.id}.${ext}`;
    const { error } = await supabase.storage.from("registration-assets").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("registration-assets").getPublicUrl(path);
      await supabase.from("event_registrations").update({ payment_proof_url: data.publicUrl }).eq("id", created.id);
      toast.success("Comprovante enviado!");
    } else toast.error("Erro no upload");
    setUploading(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!event) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Evento não encontrado</div>;

  const closed = event.status !== "aberto";

  if (step === "success" && created) {
    const wppMsg = encodeURIComponent(`Olá! Inscrição de ${created.full_name} no evento ${event.name}. Valor R$ ${created.amount_due.toFixed(2).replace(".", ",")}. Segue comprovante.`);
    const wppUrl = event.whatsapp ? `https://wa.me/55${event.whatsapp.replace(/\D/g, "")}?text=${wppMsg}` : null;
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-xl mx-auto p-4 pt-24 space-y-5">
          <div className="glass-card p-6 text-center">
            <CheckCircle2 className="w-14 h-14 mx-auto text-green-500 mb-3" />
            <h1 className="text-2xl font-black mb-1">Inscrição realizada!</h1>
            <p className="text-sm text-muted-foreground">Agora finalize o pagamento para garantir sua vaga.</p>
          </div>

          {event.pix_key && created.amount_due > 0 && (
            <div className="glass-card p-5 space-y-3">
              <p className="font-bold">Pagamento via Pix</p>
              <p className="text-3xl font-black text-primary">{formatBRL(created.amount_due)}</p>
              <div>
                <Label className="text-xs">Chave Pix</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input readOnly value={event.pix_key} />
                  <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(event.pix_key!); toast.success("Chave Pix copiada"); }}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {event.payment_instructions && (
                <div className="text-sm bg-secondary/50 p-3 rounded-lg whitespace-pre-line">{event.payment_instructions}</div>
              )}
              {wppUrl && (
                <Button asChild className="w-full gap-2 bg-green-600 hover:bg-green-700">
                  <a href={wppUrl} target="_blank" rel="noreferrer"><MessageCircle className="w-4 h-4" /> Enviar comprovante por WhatsApp</a>
                </Button>
              )}
              <div>
                <Label className="text-xs">Ou anexe o comprovante aqui (opcional)</Label>
                <label className="cursor-pointer mt-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-border hover:bg-secondary text-sm">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Selecionar arquivo
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && uploadProof(e.target.files[0])} />
                </label>
              </div>
            </div>
          )}

          <Button variant="outline" className="w-full" onClick={() => navigate("/")}>Voltar para o início</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto p-4 pt-20 space-y-5">
        {event.cover_url && (
          <div className="aspect-video rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${event.cover_url})` }} />
        )}
        <div>
          <h1 className="text-3xl font-black">{event.name}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2 flex-wrap">
            <span className="inline-flex items-center gap-1"><Calendar className="w-4 h-4" /> {formatDate(event.event_date)}{event.event_time ? ` • ${event.event_time.slice(0, 5)}` : ""}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="w-4 h-4" /> {event.location}</span>
          </div>
        </div>

        {/* Lote ativo */}
        {tiers.length > 0 && (
          <div className="glass-card p-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Lote vigente</span>
              </div>
              {activeTier ? (
                <>
                  <p className="font-bold mt-1">{activeTier.name}</p>
                  <p className="text-2xl font-black text-primary">{formatBRL(Number(activeTier.price))}</p>
                  <p className="text-xs text-muted-foreground">Válido até {formatDate(activeTier.ends_at.slice(0, 10))}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  {nextTier ? `Próximo lote: ${nextTier.name} a partir de ${formatDate(nextTier.starts_at.slice(0, 10))}` : "Nenhum lote ativo no momento"}
                </p>
              )}
            </div>
            {seniorEnabled && (
              <Badge variant="outline" className="gap-1">
                Desconto {seniorMinAge}+ disponível
              </Badge>
            )}
          </div>
        )}

        {event.description && <p className="text-foreground/80 whitespace-pre-line">{event.description}</p>}

        {(event.regulation || event.regulation_file_url) && (
          <Accordion type="single" collapsible>
            <AccordionItem value="reg">
              <AccordionTrigger>Regulamento</AccordionTrigger>
              <AccordionContent className="space-y-2">
                {event.regulation_file_url && (
                  <a href={event.regulation_file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                    <FileText className="w-4 h-4" /> Baixar regulamento (PDF)
                  </a>
                )}
                {event.regulation && <div className="whitespace-pre-line text-sm text-foreground/80">{event.regulation}</div>}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {step === "info" && (
          <Button size="lg" className="w-full h-14 text-base" disabled={closed} onClick={() => setStep("form")}>
            {closed ? "Inscrições não disponíveis" : "Quero me inscrever"}
          </Button>
        )}

        {step === "form" && (
          <div className="glass-card p-5 space-y-4">
            <h2 className="font-bold text-lg">Seus dados</h2>
            <div>
              <Label>Nome completo *</Label>
              <Input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} className="h-12" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>E-mail *</Label>
                <Input type="email" inputMode="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="h-12" />
              </div>
              <div>
                <Label>WhatsApp *</Label>
                <Input type="tel" inputMode="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} className="h-12" placeholder="11999999999" />
              </div>
            </div>
            {event.requires_city && (
              <div>
                <Label>Cidade *</Label>
                <Input value={form.city} onChange={(e) => update("city", e.target.value)} className="h-12" />
              </div>
            )}
            {event.requires_birth_date && (
              <div>
                <Label>Data de nascimento *</Label>
                <Input type="date" value={form.birth_date} onChange={(e) => update("birth_date", e.target.value)} className="h-12" />
              </div>
            )}

            {/* Modalidades */}
            {categories.length > 0 && (
              <div>
                <Label>Modalidade *</Label>
                <Select value={form.category_id} onValueChange={(v) => update("category_id", v)}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {catAvailability.map((c) => {
                      const out = c.remaining !== null && c.remaining <= 0;
                      return (
                        <SelectItem key={c.id} value={c.id} disabled={out}>
                          <span className={out ? "line-through opacity-50" : ""}>
                            {c.name}{c.remaining !== null ? ` — ${out ? "esgotada" : `${c.remaining} vagas`}` : ""}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Camiseta */}
            {event.requires_shirt_size && shirtAvailability.length > 0 && (
              <div>
                <Label>Tamanho da camiseta *</Label>
                <Select value={form.shirt_size} onValueChange={(v) => update("shirt_size", v)}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {shirtAvailability.map((s) => {
                      const out = s.remaining <= 0;
                      return (
                        <SelectItem key={s.size} value={s.size} disabled={out}>
                          <span className={out ? "line-through opacity-50" : ""}>
                            {s.size}{out ? " — esgotado" : ` — ${s.remaining} disponíveis`}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} />
            </div>

            {/* Resumo de preço */}
            {activeTier && (
              <div className="rounded-lg bg-secondary/50 p-4 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Lote {activeTier.name}</span>
                  <span>{formatBRL(basePrice)}</span>
                </div>
                {priceCalc.applied && (
                  <div className="flex items-center justify-between text-sm text-green-600">
                    <span>Desconto Lei do Idoso (50%)</span>
                    <span>− {formatBRL(basePrice * 0.5)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between font-bold pt-1 border-t border-border">
                  <span>Total a pagar</span>
                  <span className="text-primary text-xl">{formatBRL(priceCalc.final)}</span>
                </div>
              </div>
            )}

            <Button onClick={submit} disabled={submitting} className="w-full h-14 text-base">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirmar inscrição
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
