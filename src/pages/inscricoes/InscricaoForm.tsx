import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload, Loader2, Plus, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { slugify, randomSuffix, SHIRT_SIZES_DEFAULT } from "@/lib/inscricoes";

type TierDraft = { id?: string; name: string; price: string; starts_at: string; ends_at: string; sort_order: number };
type CatDraft = { id?: string; name: string; max_slots: string; sort_order: number };
type ShirtDraft = { id?: string; size: string; quantity: string; sort_order: number };

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function InscricaoForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingReg, setUploadingReg] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    cover_url: "",
    event_date: "",
    event_time: "",
    location: "",
    category: "Corrida",
    regulation: "",
    regulation_file_url: "",
    pix_key: "",
    payment_instructions: "Após o Pix, envie o comprovante para o WhatsApp e aguarde até 24h para a confirmação.",
    whatsapp: "",
    status: "rascunho" as "rascunho" | "aberto" | "encerrado" | "cancelado",
    requires_birth_date: true,
    requires_city: true,
    requires_shirt_size: false,
    senior_discount_enabled: false,
    senior_discount_min_age: "60",
  });

  const [tiers, setTiers] = useState<TierDraft[]>([]);
  const [categories, setCategories] = useState<CatDraft[]>([]);
  const [shirts, setShirts] = useState<ShirtDraft[]>([]);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const [{ data: ev }, { data: t }, { data: c }, { data: s }] = await Promise.all([
        supabase.from("registration_events").select("*").eq("id", id).single(),
        supabase.from("registration_price_tiers").select("*").eq("registration_event_id", id).order("sort_order"),
        supabase.from("registration_categories").select("*").eq("registration_event_id", id).order("sort_order"),
        supabase.from("registration_shirt_stock").select("*").eq("registration_event_id", id).order("sort_order"),
      ]);
      if (ev) {
        setForm({
          name: ev.name,
          description: ev.description ?? "",
          cover_url: ev.cover_url ?? "",
          event_date: ev.event_date,
          event_time: ev.event_time ?? "",
          location: ev.location,
          category: ev.category ?? "",
          regulation: ev.regulation ?? "",
          regulation_file_url: ev.regulation_file_url ?? "",
          pix_key: ev.pix_key ?? "",
          payment_instructions: ev.payment_instructions ?? "",
          whatsapp: ev.whatsapp ?? "",
          status: ev.status,
          requires_birth_date: ev.requires_birth_date,
          requires_city: ev.requires_city,
          requires_shirt_size: ev.requires_shirt_size,
          senior_discount_enabled: ev.senior_discount_enabled,
          senior_discount_min_age: String(ev.senior_discount_min_age ?? 60),
        });
      }
      setTiers((t ?? []).map((x, i) => ({
        id: x.id, name: x.name, price: String(x.price),
        starts_at: x.starts_at.slice(0, 10), ends_at: x.ends_at.slice(0, 10), sort_order: x.sort_order ?? i,
      })));
      setCategories((c ?? []).map((x, i) => ({
        id: x.id, name: x.name, max_slots: x.max_slots != null ? String(x.max_slots) : "", sort_order: x.sort_order ?? i,
      })));
      setShirts((s ?? []).map((x, i) => ({
        id: x.id, size: x.size, quantity: String(x.quantity), sort_order: x.sort_order ?? i,
      })));
    })();
  }, [id, isEdit]);

  const update = (k: keyof typeof form, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const onUploadCover = async (file: File) => {
    if (!user) return;
    setUploadingCover(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/covers/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("registration-assets").upload(path, file, { upsert: true });
    if (error) toast.error("Erro no upload da capa");
    else {
      const { data } = supabase.storage.from("registration-assets").getPublicUrl(path);
      update("cover_url", data.publicUrl);
    }
    setUploadingCover(false);
  };

  const onUploadRegulation = async (file: File) => {
    if (!user) return;
    setUploadingReg(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/regulations/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("registration-assets").upload(path, file, { upsert: true });
    if (error) toast.error("Erro no upload do regulamento");
    else {
      const { data } = supabase.storage.from("registration-assets").getPublicUrl(path);
      update("regulation_file_url", data.publicUrl);
      toast.success("Regulamento anexado");
    }
    setUploadingReg(false);
  };

  // ---------- Tiers ----------
  const addTier = () => setTiers((p) => [
    ...p,
    { name: p.length === 0 ? "1º Lote" : `${p.length + 1}º Lote`, price: "", starts_at: todayISO(), ends_at: todayISO(), sort_order: p.length },
  ]);
  const updateTier = (i: number, k: keyof TierDraft, v: any) =>
    setTiers((p) => p.map((t, idx) => (idx === i ? { ...t, [k]: v } : t)));
  const removeTier = (i: number) => setTiers((p) => p.filter((_, idx) => idx !== i));

  // ---------- Categories ----------
  const addCategory = () =>
    setCategories((p) => [...p, { name: "", max_slots: "", sort_order: p.length }]);
  const updateCategory = (i: number, k: keyof CatDraft, v: any) =>
    setCategories((p) => p.map((c, idx) => (idx === i ? { ...c, [k]: v } : c)));
  const removeCategory = (i: number) => setCategories((p) => p.filter((_, idx) => idx !== i));

  // ---------- Shirts ----------
  const ensureDefaultShirts = () => {
    if (shirts.length === 0) {
      setShirts(SHIRT_SIZES_DEFAULT.map((size, i) => ({ size, quantity: "0", sort_order: i })));
    }
  };
  useEffect(() => { if (form.requires_shirt_size) ensureDefaultShirts(); /* eslint-disable-next-line */ }, [form.requires_shirt_size]);
  const addShirt = () => setShirts((p) => [...p, { size: "", quantity: "0", sort_order: p.length }]);
  const updateShirt = (i: number, k: keyof ShirtDraft, v: any) =>
    setShirts((p) => p.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)));
  const removeShirt = (i: number) => setShirts((p) => p.filter((_, idx) => idx !== i));

  // ---------- Save ----------
  const handleSubmit = async () => {
    if (!user) return;
    if (!form.name || !form.event_date || !form.location) {
      toast.error("Preencha nome, data e local"); return;
    }
    // validate tiers
    for (const t of tiers) {
      if (!t.name || !t.starts_at || !t.ends_at || !t.price) {
        toast.error("Preencha todos os campos dos lotes"); return;
      }
      if (new Date(t.ends_at) < new Date(t.starts_at)) {
        toast.error(`Lote "${t.name}": data fim antes do início`); return;
      }
    }
    for (const c of categories) {
      if (!c.name) { toast.error("Modalidade sem nome"); return; }
    }
    if (form.requires_shirt_size) {
      for (const s of shirts) if (!s.size) { toast.error("Tamanho de camiseta sem nome"); return; }
    }

    setLoading(true);
    const payload = {
      organizer_id: user.id,
      name: form.name,
      description: form.description || null,
      cover_url: form.cover_url || null,
      event_date: form.event_date,
      event_time: form.event_time || null,
      location: form.location,
      category: form.category || null,
      regulation: form.regulation || null,
      regulation_file_url: form.regulation_file_url || null,
      pix_key: form.pix_key || null,
      payment_instructions: form.payment_instructions || null,
      whatsapp: form.whatsapp || null,
      status: form.status,
      requires_birth_date: form.requires_birth_date,
      requires_city: form.requires_city,
      requires_shirt_size: form.requires_shirt_size,
      senior_discount_enabled: form.senior_discount_enabled,
      senior_discount_min_age: parseInt(form.senior_discount_min_age) || 60,
      // legacy backwards-compat
      categories: categories.map((c) => c.name),
      shirt_sizes: form.requires_shirt_size ? shirts.map((s) => s.size) : [],
      pix_amount: tiers.length > 0 ? parseFloat(tiers[0].price) : null,
      max_slots: null,
    };

    let eventId = id;
    if (isEdit) {
      const { error } = await supabase.from("registration_events").update(payload).eq("id", id);
      if (error) { toast.error(error.message); setLoading(false); return; }
    } else {
      let slug = slugify(form.name);
      const { data: existing } = await supabase.from("registration_events").select("id").eq("slug", slug).maybeSingle();
      if (existing) slug = `${slug}-${randomSuffix()}`;
      const { data, error } = await supabase
        .from("registration_events").insert({ ...payload, slug }).select("id").single();
      if (error || !data) { toast.error(error?.message ?? "Erro ao criar"); setLoading(false); return; }
      eventId = data.id;
    }

    if (!eventId) { setLoading(false); return; }

    // sync tiers (delete + reinsert: simples e seguro)
    await supabase.from("registration_price_tiers").delete().eq("registration_event_id", eventId);
    if (tiers.length > 0) {
      await supabase.from("registration_price_tiers").insert(
        tiers.map((t, i) => ({
          registration_event_id: eventId,
          name: t.name, price: parseFloat(t.price) || 0,
          starts_at: new Date(t.starts_at + "T00:00:00").toISOString(),
          ends_at: new Date(t.ends_at + "T23:59:59").toISOString(),
          sort_order: i,
        })),
      );
    }
    // sync categories
    await supabase.from("registration_categories").delete().eq("registration_event_id", eventId);
    if (categories.length > 0) {
      await supabase.from("registration_categories").insert(
        categories.map((c, i) => ({
          registration_event_id: eventId,
          name: c.name, max_slots: c.max_slots ? parseInt(c.max_slots) : null, sort_order: i,
        })),
      );
    }
    // sync shirts
    await supabase.from("registration_shirt_stock").delete().eq("registration_event_id", eventId);
    if (form.requires_shirt_size && shirts.length > 0) {
      await supabase.from("registration_shirt_stock").insert(
        shirts.map((s, i) => ({
          registration_event_id: eventId,
          size: s.size, quantity: parseInt(s.quantity) || 0, sort_order: i,
        })),
      );
    }

    toast.success(isEdit ? "Evento atualizado" : "Evento criado");
    navigate(`/dashboard/inscricoes/${eventId}`);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <DashboardSidebar />
      <main className="flex-1 p-4 md:p-8 pt-20 lg:pt-8 max-w-4xl">
        <button onClick={() => navigate("/dashboard/inscricoes")} className="flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <h1 className="text-2xl md:text-3xl font-black mb-6">{isEdit ? "Editar evento" : "Criar evento de inscrição"}</h1>

        <div className="space-y-5 glass-card p-5 md:p-6">
          {/* Dados básicos */}
          <section className="space-y-4">
            <h2 className="font-bold text-lg">Dados básicos</h2>
            <div>
              <Label>Nome do evento *</Label>
              <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Night Run 2026" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} />
            </div>
            <div>
              <Label>Capa do evento</Label>
              <div className="flex items-center gap-3 mt-1">
                {form.cover_url && <img src={form.cover_url} alt="" className="w-20 h-20 rounded-lg object-cover" />}
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-sm hover:bg-secondary/80">
                  {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {form.cover_url ? "Trocar capa" : "Enviar capa"}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => e.target.files?.[0] && onUploadCover(e.target.files[0])} />
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data *</Label>
                <Input type="date" value={form.event_date} onChange={(e) => update("event_date", e.target.value)} />
              </div>
              <div>
                <Label>Horário</Label>
                <Input type="time" value={form.event_time} onChange={(e) => update("event_time", e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Local *</Label>
              <Input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="Parque Ibirapuera, São Paulo" />
            </div>
            <div>
              <Label>Categoria do evento</Label>
              <Input value={form.category} onChange={(e) => update("category", e.target.value)} placeholder="Corrida, Ciclismo..." />
            </div>
          </section>

          {/* Modalidades */}
          <section className="space-y-3 pt-5 border-t border-border">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Modalidades / Distâncias</h2>
              <Button type="button" size="sm" variant="outline" onClick={addCategory} className="gap-1">
                <Plus className="w-4 h-4" /> Adicionar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Defina vagas individuais por distância. Deixe vagas em branco para ilimitado.</p>
            {categories.length === 0 && <p className="text-sm text-muted-foreground italic">Nenhuma modalidade. Atletas se inscreverão sem escolher distância.</p>}
            {categories.map((c, i) => (
              <div key={i} className="grid grid-cols-[1fr_120px_auto] gap-2 items-end">
                <div>
                  <Label className="text-xs">Nome</Label>
                  <Input value={c.name} onChange={(e) => updateCategory(i, "name", e.target.value)} placeholder="5km" />
                </div>
                <div>
                  <Label className="text-xs">Vagas</Label>
                  <Input type="number" min={0} value={c.max_slots} onChange={(e) => updateCategory(i, "max_slots", e.target.value)} placeholder="∞" />
                </div>
                <Button type="button" size="icon" variant="ghost" onClick={() => removeCategory(i)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </section>

          {/* Lotes de preço */}
          <section className="space-y-3 pt-5 border-t border-border">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Lotes de preço</h2>
              <Button type="button" size="sm" variant="outline" onClick={addTier} className="gap-1">
                <Plus className="w-4 h-4" /> Adicionar lote
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">O sistema ativa automaticamente o lote vigente conforme as datas.</p>
            {tiers.length === 0 && <p className="text-sm text-muted-foreground italic">Nenhum lote criado. O evento será gratuito.</p>}
            {tiers.map((t, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto] gap-2 items-end">
                <div>
                  <Label className="text-xs">Nome</Label>
                  <Input value={t.name} onChange={(e) => updateTier(i, "name", e.target.value)} placeholder="Promocional" />
                </div>
                <div>
                  <Label className="text-xs">Início</Label>
                  <Input type="date" value={t.starts_at} onChange={(e) => updateTier(i, "starts_at", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Fim</Label>
                  <Input type="date" value={t.ends_at} onChange={(e) => updateTier(i, "ends_at", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Valor (R$)</Label>
                  <Input type="number" step="0.01" min={0} value={t.price} onChange={(e) => updateTier(i, "price", e.target.value)} />
                </div>
                <Button type="button" size="icon" variant="ghost" onClick={() => removeTier(i)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </section>

          {/* Regulamento */}
          <section className="space-y-3 pt-5 border-t border-border">
            <h2 className="font-bold text-lg">Regulamento</h2>
            <Tabs defaultValue={form.regulation_file_url ? "pdf" : "texto"}>
              <TabsList>
                <TabsTrigger value="texto">Escrever texto</TabsTrigger>
                <TabsTrigger value="pdf">Anexar PDF</TabsTrigger>
              </TabsList>
              <TabsContent value="texto" className="mt-3">
                <Textarea value={form.regulation} onChange={(e) => update("regulation", e.target.value)} rows={5} placeholder="Cole ou escreva o regulamento..." />
              </TabsContent>
              <TabsContent value="pdf" className="mt-3 space-y-2">
                {form.regulation_file_url && (
                  <a href={form.regulation_file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                    <FileText className="w-4 h-4" /> Ver PDF atual
                  </a>
                )}
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-sm hover:bg-secondary/80">
                  {uploadingReg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {form.regulation_file_url ? "Trocar PDF" : "Enviar PDF"}
                  <input type="file" accept="application/pdf" className="hidden"
                    onChange={(e) => e.target.files?.[0] && onUploadRegulation(e.target.files[0])} />
                </label>
                {form.regulation_file_url && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => update("regulation_file_url", "")}>Remover</Button>
                )}
              </TabsContent>
            </Tabs>
          </section>

          {/* Camisetas */}
          <section className="space-y-3 pt-5 border-t border-border">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Camisetas</h2>
              <div className="flex items-center gap-2">
                <Label className="cursor-pointer text-sm">Pedir tamanho</Label>
                <Switch checked={form.requires_shirt_size} onCheckedChange={(v) => update("requires_shirt_size", v)} />
              </div>
            </div>
            {form.requires_shirt_size && (
              <>
                <p className="text-xs text-muted-foreground">Quando o estoque de um tamanho zerar, o sistema bloqueia a opção no formulário.</p>
                {shirts.map((s, i) => (
                  <div key={i} className="grid grid-cols-[1fr_140px_auto] gap-2 items-end">
                    <div>
                      <Label className="text-xs">Tamanho</Label>
                      <Input value={s.size} onChange={(e) => updateShirt(i, "size", e.target.value)} placeholder="M" />
                    </div>
                    <div>
                      <Label className="text-xs">Quantidade</Label>
                      <Input type="number" min={0} value={s.quantity} onChange={(e) => updateShirt(i, "quantity", e.target.value)} />
                    </div>
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeShirt(i)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button type="button" size="sm" variant="outline" onClick={addShirt} className="gap-1">
                  <Plus className="w-4 h-4" /> Adicionar tamanho
                </Button>
              </>
            )}
          </section>

          {/* Desconto 60+ */}
          <section className="space-y-3 pt-5 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg">Desconto Lei do Idoso</h2>
                <p className="text-xs text-muted-foreground">Aplica 50% automaticamente quando a idade do atleta for ≥ idade mínima.</p>
              </div>
              <Switch checked={form.senior_discount_enabled} onCheckedChange={(v) => update("senior_discount_enabled", v)} />
            </div>
            {form.senior_discount_enabled && (
              <div className="w-32">
                <Label className="text-xs">Idade mínima</Label>
                <Input type="number" min={50} value={form.senior_discount_min_age}
                  onChange={(e) => update("senior_discount_min_age", e.target.value)} />
              </div>
            )}
          </section>

          {/* Pagamento */}
          <section className="space-y-3 pt-5 border-t border-border">
            <h2 className="font-bold text-lg">Pagamento (Pix manual)</h2>
            <div>
              <Label>Chave Pix</Label>
              <Input value={form.pix_key} onChange={(e) => update("pix_key", e.target.value)} placeholder="CPF, e-mail ou aleatória" />
            </div>
            <div>
              <Label>WhatsApp para comprovante</Label>
              <Input value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} placeholder="11999999999 (com DDD)" />
            </div>
            <div>
              <Label>Instruções de pagamento</Label>
              <Textarea value={form.payment_instructions} onChange={(e) => update("payment_instructions", e.target.value)} rows={3}
                placeholder="Após o Pix, envie o comprovante para o WhatsApp e aguarde a confirmação." />
            </div>
          </section>

          {/* Form fields */}
          <section className="space-y-3 pt-5 border-t border-border">
            <h2 className="font-bold text-lg">Campos do formulário</h2>
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer">Pedir cidade</Label>
              <Switch checked={form.requires_city} onCheckedChange={(v) => update("requires_city", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer">Pedir data de nascimento</Label>
              <Switch checked={form.requires_birth_date} onCheckedChange={(v) => update("requires_birth_date", v)} />
            </div>
            <p className="text-xs text-muted-foreground">Telefone (WhatsApp) é sempre obrigatório.</p>
          </section>

          {/* Status + Save */}
          <section className="space-y-3 pt-5 border-t border-border">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v: any) => update("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rascunho">Rascunho (não publicado)</SelectItem>
                <SelectItem value="aberto">Aberto (recebendo inscrições)</SelectItem>
                <SelectItem value="encerrado">Encerrado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSubmit} disabled={loading} className="w-full">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? "Salvar alterações" : "Criar evento"}
            </Button>
          </section>
        </div>
      </main>
    </div>
  );
}
