import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { slugify, randomSuffix } from "@/lib/inscricoes";

const SHIRT_SIZES_DEFAULT = ["PP", "P", "M", "G", "GG", "XG"];

export default function InscricaoForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    cover_url: "",
    event_date: "",
    event_time: "",
    location: "",
    category: "Corrida",
    max_slots: "" as string | "",
    regulation: "",
    pix_key: "",
    pix_amount: "" as string | "",
    whatsapp: "",
    status: "rascunho" as "rascunho" | "aberto" | "encerrado" | "cancelado",
    categories: "" as string,
    requires_birth_date: true,
    requires_city: true,
    requires_shirt_size: false,
  });

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const { data } = await supabase.from("registration_events").select("*").eq("id", id).single();
      if (data) {
        setForm({
          name: data.name,
          description: data.description ?? "",
          cover_url: data.cover_url ?? "",
          event_date: data.event_date,
          event_time: data.event_time ?? "",
          location: data.location,
          category: data.category ?? "",
          max_slots: data.max_slots?.toString() ?? "",
          regulation: data.regulation ?? "",
          pix_key: data.pix_key ?? "",
          pix_amount: data.pix_amount?.toString() ?? "",
          whatsapp: data.whatsapp ?? "",
          status: data.status,
          categories: Array.isArray(data.categories) ? (data.categories as string[]).join(", ") : "",
          requires_birth_date: data.requires_birth_date,
          requires_city: data.requires_city,
          requires_shirt_size: data.requires_shirt_size,
        });
      }
    })();
  }, [id, isEdit]);

  const update = (k: keyof typeof form, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const onUploadCover = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/covers/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("registration-assets").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Erro no upload da capa");
    } else {
      const { data } = supabase.storage.from("registration-assets").getPublicUrl(path);
      update("cover_url", data.publicUrl);
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!form.name || !form.event_date || !form.location) {
      toast.error("Preencha nome, data e local");
      return;
    }
    setLoading(true);
    const categoriesArr = form.categories.split(",").map((c) => c.trim()).filter(Boolean);
    const payload = {
      organizer_id: user.id,
      name: form.name,
      description: form.description || null,
      cover_url: form.cover_url || null,
      event_date: form.event_date,
      event_time: form.event_time || null,
      location: form.location,
      category: form.category || null,
      max_slots: form.max_slots ? parseInt(form.max_slots) : null,
      regulation: form.regulation || null,
      pix_key: form.pix_key || null,
      pix_amount: form.pix_amount ? parseFloat(form.pix_amount) : null,
      whatsapp: form.whatsapp || null,
      status: form.status,
      categories: categoriesArr,
      shirt_sizes: form.requires_shirt_size ? SHIRT_SIZES_DEFAULT : [],
      requires_birth_date: form.requires_birth_date,
      requires_city: form.requires_city,
      requires_shirt_size: form.requires_shirt_size,
    };

    if (isEdit) {
      const { error } = await supabase.from("registration_events").update(payload).eq("id", id);
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      toast.success("Evento atualizado");
      navigate(`/dashboard/inscricoes/${id}`);
    } else {
      // generate unique slug
      let slug = slugify(form.name);
      const { data: existing } = await supabase.from("registration_events").select("id").eq("slug", slug).maybeSingle();
      if (existing) slug = `${slug}-${randomSuffix()}`;
      const { data, error } = await supabase
        .from("registration_events")
        .insert({ ...payload, slug })
        .select("id")
        .single();
      if (error || !data) {
        toast.error(error?.message ?? "Erro ao criar");
        setLoading(false);
        return;
      }
      toast.success("Evento criado");
      navigate(`/dashboard/inscricoes/${data.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <DashboardSidebar />
      <main className="flex-1 p-4 md:p-8 pt-20 lg:pt-8 max-w-3xl">
        <button onClick={() => navigate("/dashboard/inscricoes")} className="flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <h1 className="text-2xl md:text-3xl font-black mb-6">{isEdit ? "Editar evento" : "Criar evento de inscrição"}</h1>

        <div className="space-y-5 glass-card p-5 md:p-6">
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
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {form.cover_url ? "Trocar capa" : "Enviar capa"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && onUploadCover(e.target.files[0])}
                />
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categoria do evento</Label>
              <Input value={form.category} onChange={(e) => update("category", e.target.value)} placeholder="Corrida, Ciclismo..." />
            </div>
            <div>
              <Label>Vagas (opcional)</Label>
              <Input type="number" min={1} value={form.max_slots} onChange={(e) => update("max_slots", e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Categorias da prova (separadas por vírgula)</Label>
            <Input value={form.categories} onChange={(e) => update("categories", e.target.value)} placeholder="5km, 10km, 21km" />
          </div>

          <div>
            <Label>Regulamento</Label>
            <Textarea value={form.regulation} onChange={(e) => update("regulation", e.target.value)} rows={4} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Chave Pix</Label>
              <Input value={form.pix_key} onChange={(e) => update("pix_key", e.target.value)} placeholder="CPF, e-mail ou aleatória" />
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input type="number" min={0} step="0.01" value={form.pix_amount} onChange={(e) => update("pix_amount", e.target.value)} />
            </div>
          </div>

          <div>
            <Label>WhatsApp para comprovante</Label>
            <Input value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} placeholder="11999999999 (com DDD)" />
          </div>

          <div className="space-y-3 pt-2 border-t border-border">
            <p className="text-sm font-semibold">Campos do formulário de inscrição</p>
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer">Pedir cidade</Label>
              <Switch checked={form.requires_city} onCheckedChange={(v) => update("requires_city", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer">Pedir data de nascimento</Label>
              <Switch checked={form.requires_birth_date} onCheckedChange={(v) => update("requires_birth_date", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer">Pedir tamanho da camiseta</Label>
              <Switch checked={form.requires_shirt_size} onCheckedChange={(v) => update("requires_shirt_size", v)} />
            </div>
          </div>

          <div>
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
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? "Salvar alterações" : "Criar evento"}
          </Button>
        </div>
      </main>
    </div>
  );
}