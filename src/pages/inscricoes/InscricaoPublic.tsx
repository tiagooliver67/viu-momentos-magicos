import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Calendar, MapPin, Users2, Loader2, Upload, Copy, MessageCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { formatDate, type RegistrationEvent } from "@/lib/inscricoes";

export default function InscricaoPublic() {
  const { slug } = useParams<{ slug: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<RegistrationEvent | null>(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"info" | "form" | "success">("info");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ id: string; full_name: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", city: "", birth_date: "", category: "", shirt_size: "", notes: "",
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("registration_events").select("*").eq("slug", slug!).maybeSingle();
      setEvent(data);
      if (data) {
        const { count: c } = await supabase
          .from("event_registrations")
          .select("id", { count: "exact", head: true })
          .eq("registration_event_id", data.id);
        setCount(c ?? 0);
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

  const submit = async () => {
    if (!event) return;
    if (!form.full_name || !form.email || !form.phone) {
      toast.error("Preencha nome, e-mail e telefone");
      return;
    }
    if (event.requires_birth_date && !form.birth_date) { toast.error("Informe a data de nascimento"); return; }
    if (event.requires_city && !form.city) { toast.error("Informe a cidade"); return; }
    if (event.requires_shirt_size && !form.shirt_size) { toast.error("Selecione o tamanho da camiseta"); return; }
    if ((event.categories as string[]).length > 0 && !form.category) { toast.error("Selecione uma categoria"); return; }

    setSubmitting(true);
    const { data, error } = await supabase.from("event_registrations").insert({
      registration_event_id: event.id,
      user_id: user?.id ?? null,
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      city: form.city || null,
      birth_date: form.birth_date || null,
      category: form.category || null,
      shirt_size: form.shirt_size || null,
      notes: form.notes || null,
    }).select("id, full_name").single();
    setSubmitting(false);
    if (error || !data) {
      toast.error(error?.message ?? "Erro ao inscrever");
      return;
    }
    setCreated(data);
    setStep("success");
    setCount((c) => c + 1);
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
    } else {
      toast.error("Erro no upload");
    }
    setUploading(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!event) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Evento não encontrado</div>;

  const remaining = event.max_slots ? Math.max(0, event.max_slots - count) : null;
  const closed = event.status !== "aberto" || remaining === 0;
  const cats = event.categories as string[];
  const shirts = event.shirt_sizes as string[];

  if (step === "success" && created) {
    const wppMsg = encodeURIComponent(`Olá! Inscrição de ${created.full_name} no evento ${event.name}. Segue comprovante.`);
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

          {event.pix_key && (
            <div className="glass-card p-5 space-y-3">
              <p className="font-bold">💸 Pagamento via Pix</p>
              {event.pix_amount && <p className="text-2xl font-black text-primary">R$ {Number(event.pix_amount).toFixed(2).replace(".", ",")}</p>}
              <div>
                <Label className="text-xs">Chave Pix</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input readOnly value={event.pix_key} />
                  <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(event.pix_key!); toast.success("Chave copiada"); }}><Copy className="w-4 h-4" /></Button>
                </div>
              </div>
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
            {remaining !== null && <span className="inline-flex items-center gap-1"><Users2 className="w-4 h-4" /> {remaining} vagas restantes</span>}
          </div>
        </div>

        {event.description && <p className="text-foreground/80 whitespace-pre-line">{event.description}</p>}

        {event.regulation && (
          <Accordion type="single" collapsible>
            <AccordionItem value="reg">
              <AccordionTrigger>Regulamento</AccordionTrigger>
              <AccordionContent className="whitespace-pre-line text-sm text-foreground/80">{event.regulation}</AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {step === "info" && (
          <Button size="lg" className="w-full h-14 text-base" disabled={closed} onClick={() => setStep("form")}>
            {closed ? (event.status !== "aberto" ? "Inscrições não disponíveis" : "Vagas esgotadas") : "Quero me inscrever"}
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
                <Label>Telefone *</Label>
                <Input type="tel" inputMode="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} className="h-12" />
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
            {cats.length > 0 && (
              <div>
                <Label>Categoria *</Label>
                <Select value={form.category} onValueChange={(v) => update("category", v)}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {event.requires_shirt_size && shirts.length > 0 && (
              <div>
                <Label>Tamanho da camiseta *</Label>
                <Select value={form.shirt_size} onValueChange={(v) => update("shirt_size", v)}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{shirts.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} />
            </div>
            <Button onClick={submit} disabled={submitting} className="w-full h-14 text-base">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirmar inscrição
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}