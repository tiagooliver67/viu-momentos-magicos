import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardSidebar from "@/components/DashboardSidebar";
import StatusDropdown from "@/components/event/StatusDropdown";
import UploadModal from "@/components/event/UploadModal";
import DuplicateFilesModal, { type DuplicateResolution } from "@/components/event/DuplicateFilesModal";
import { detectDuplicates, uniqueName, renameFile, type DuplicateEntry } from "@/lib/duplicateDetection";
import PriceGridModal from "@/components/event/PriceGridModal";
import DiscountModal from "@/components/event/DiscountModal";
import CouponModal from "@/components/event/CouponModal";
import EditEventModal from "@/components/event/EditEventModal";
import PasswordModal from "@/components/event/PasswordModal";
import ScheduleModal from "@/components/event/ScheduleModal";
import PhotoGallery from "@/components/event/PhotoGallery";
import VideoGallery from "@/components/event/VideoGallery";
import PromoArtModal from "@/components/event/PromoArtModal";
import CollaborationModal from "@/components/event/CollaborationModal";
import { useEvent, useEventPhotos, useEventVideos, useEventOrders, useEventCoupons, useEventPriceGrid, useDiscountPackages } from "@/hooks/useEvent";
import { useS3Upload } from "@/hooks/useS3Upload";
import { usePhotographerSite } from "@/hooks/usePhotographerSite";
import { useAuth } from "@/contexts/AuthContext";
import type { UploadFileProgress } from "@/components/event/PhotoGallery";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Edit, ShoppingCart, DollarSign, Upload, Image, MoreHorizontal, Lock, Megaphone, Tag,
  Video, FileDown, Camera as CameraIcon, Eye, Check, ChevronRight, Users, BarChart3, X, Trash2, Copy, Share2,
  ExternalLink, MessageCircle
} from "lucide-react";

const quickActions = [
  { label: "Editar", icon: Edit, key: "edit" },
  { label: "Pedidos", icon: ShoppingCart, key: "orders" },
  { label: "Financeiro", icon: DollarSign, key: "financial" },
  { label: "Enviar Fotos", icon: Upload, key: "upload-photos" },
  { label: "Fotos", icon: Image, key: "photos" },
  { label: "Senha", icon: Lock, key: "password" },
  { label: "Divulgação", icon: Megaphone, key: "promo" },
  { label: "Colaboração", icon: Users, key: "collab" },
  { label: "Enviar Vídeos", icon: Video, key: "upload-videos" },
  { label: "Vídeos", icon: Video, key: "videos" },
  { label: "Importar Pedidos", icon: FileDown, key: "import" },
  { label: "Convidar", icon: CameraIcon, key: "invite" },
  { label: "Galeria", icon: Eye, key: "gallery" },
  { label: "Ações", icon: MoreHorizontal, key: "actions" },
];

const EventDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [photoUploadProgress, setPhotoUploadProgress] = useState<UploadFileProgress[]>([]);
  const [videoUploadProgress, setVideoUploadProgress] = useState<UploadFileProgress[]>([]);

  // Data hooks
  const { event, isLoading, updateEvent, deleteEvent } = useEvent(id);
  const { photos, deletePhoto } = useEventPhotos(id);
  const { videos, deleteVideo } = useEventVideos(id);
  const { site: photographerSite } = usePhotographerSite();
  const s3UploadPhotos = useS3Upload({ eventId: id || "", type: "fotos", watermarkUrl: photographerSite?.watermark_url || undefined, onProgress: (files) => {
    setPhotoUploadProgress(files.map(f => ({
      fileName: f.fileName,
      progress: f.progress,
      status: f.status,
    })));
    if (files.every(f => f.status === "done" || f.status === "error")) {
      setTimeout(() => setPhotoUploadProgress([]), 5000);
    }
  }});
  const s3UploadVideos = useS3Upload({ eventId: id || "", type: "videos", onProgress: (files) => {
    setVideoUploadProgress(files.map(f => ({
      fileName: f.fileName,
      progress: f.progress,
      status: f.status,
    })));
    if (files.every(f => f.status === "done" || f.status === "error")) {
      setTimeout(() => setVideoUploadProgress([]), 5000);
    }
  }});
  const ordersQuery = useEventOrders(id);
  const { coupons, createCoupon, toggleCoupon } = useEventCoupons(id);
  const { grids, savePriceGrid, deletePriceGrid } = useEventPriceGrid(id);
  const { packages, savePackage } = useDiscountPackages(id);

  // Modal states
  const [showUploadPhotos, setShowUploadPhotos] = useState(false);
  const [showUploadVideos, setShowUploadVideos] = useState(false);
  const [showPriceGrid, setShowPriceGrid] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showVideoGallery, setShowVideoGallery] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  const [showCollab, setShowCollab] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const { profile } = useAuth();

  const orders = ordersQuery.data || [];

  // Computed stats
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.amount), 0);
  const paidOrders = orders.filter(o => o.status === "pago" || o.status === "enviado");
  const photosSold = paidOrders.length * 2; // simplified
  const avgTicket = paidOrders.length > 0 ? (totalRevenue / paidOrders.length) : 0;

  const handleAction = (key: string) => {
    switch (key) {
      case "edit": setShowEdit(true); break;
      case "orders": navigate(`/dashboard/pedidos`); break;
      case "financial": navigate(`/dashboard/configuracoes?tab=carteira`); break;
      case "upload-photos": setShowGallery(true); break;
      case "upload-videos": setShowVideoGallery(true); break;
      case "photos": case "gallery": setShowGallery(true); break;
      case "password": setShowPassword(true); break;
      case "coupons": setShowCoupon(true); break;
      case "actions": setShowActions(true); break;
      case "promo": setShowPromo(true); break;
      case "collab": setShowCollab(true); break;
      case "import": toast.info("Importação de pedidos em breve!"); break;
      case "invite": toast.info("Convite de fotógrafos em breve!"); break;
      case "videos": setShowVideoGallery(true); break;
      default: break;
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    try {
      const fileName = `${id}/cover-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from("event-covers").upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("event-covers").getPublicUrl(fileName);
      await updateEvent.mutateAsync({ cover_url: publicUrl });
    } catch (err: any) {
      toast.error("Erro ao enviar capa: " + err.message);
    }
  };

  const handleDuplicateEvent = async () => {
    if (!event) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.from("events").insert({
        organizer_id: user.id,
        name: event.name + " (cópia)",
        event_date: event.event_date,
        event_time: event.event_time,
        location: event.location,
        category: event.category,
        search_type: event.search_type,
        visibility: event.visibility,
      });
      if (error) throw error;
      toast.success("Evento duplicado!");
      setShowActions(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteEvent = async () => {
    if (!confirm("Tem certeza que deseja excluir este evento?")) return;
    await deleteEvent.mutateAsync();
    navigate("/dashboard");
  };

  const handleShareLink = () => {
    const url = `${window.location.origin}/evento/${id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado! ✅");
    setShowActions(false);
  };

  const handleShareWhatsApp = () => {
    const url = `${window.location.origin}/evento/${id}`;
    const text = encodeURIComponent(`Confira as fotos do evento "${event?.name}":\n${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleOpenGallery = () => {
    window.open(`/evento/${id}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Carregando evento...</div>
        </main>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar />
        <main className="flex-1 flex items-center justify-center flex-col gap-4">
          <p className="text-muted-foreground">Evento não encontrado</p>
          <button onClick={() => navigate("/dashboard")} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Voltar ao Dashboard</button>
        </main>
      </div>
    );
  }

  const grid = grids[0];

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 p-4 pt-20 lg:pt-6 lg:p-8 overflow-auto">
        {/* Header */}
        <p className="text-xs text-primary font-bold mb-1">DASHBOARD EVENTO</p>
        <p className="text-xs text-muted-foreground mb-4">{event.id.slice(0, 8)} - {event.name}</p>

        {/* Event Info Card */}
        <div className="glass-card p-4 sm:p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            {/* Cover */}
            <div
              onClick={() => coverInputRef.current?.click()}
              className="w-full md:w-52 h-36 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden relative"
            >
              {event.cover_url ? (
                <img src={event.cover_url} alt="Capa" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Image className="w-10 h-10 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Clique para adicionar capa</span>
                </div>
              )}
              <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
            </div>

            {/* Event details */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-primary font-bold">{event.id.slice(0, 8).toUpperCase()}</p>
              <h1 className="text-lg sm:text-xl font-bold text-foreground mb-1 break-words">{event.name}</h1>
              <p className="text-xs text-muted-foreground mb-3">
                {new Date(event.event_date).toLocaleDateString("pt-BR")} - {event.location}
              </p>
              <StatusDropdown
                status={event.status}
                publishAt={(event as any).publish_at}
                onChange={(s) => {
                  if (s === "agendado") {
                    setShowSchedule(true);
                    return;
                  }
                  updateEvent.mutate({ status: s, publish_at: null } as any);
                }}
                disabled={updateEvent.isPending}
              />
              {/* Prominent action buttons */}
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={handleShareLink}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all min-h-[40px]"
                >
                  <Share2 className="w-4 h-4" />
                  Compartilhar evento
                </button>
                <button
                  onClick={handleOpenGallery}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/5 transition-all min-h-[40px]"
                >
                  <Eye className="w-4 h-4" />
                  Ver galeria
                </button>
                <button
                  onClick={handleShareWhatsApp}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-secondary/50 transition-all min-h-[40px]"
                >
                  <MessageCircle className="w-4 h-4 text-green-500" />
                  WhatsApp
                </button>
              </div>
            </div>
          </div>

          {/* Quick actions grid — dedicated row to avoid overlap */}
          <div className="mt-5 pt-5 border-t border-border/60">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Ações rápidas</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-1.5">
              {quickActions.map((a) => (
                <button
                  key={a.key}
                  onClick={() => handleAction(a.key)}
                  className="flex flex-col items-center justify-start gap-1.5 p-2.5 rounded-lg hover:bg-secondary/60 transition-colors text-center"
                >
                  <a.icon className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-[10px] text-muted-foreground leading-tight">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pricing + Search + Revenue */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="glass-card p-4 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setShowPriceGrid(true)}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-bold text-foreground">GRADE DE PREÇO</h3>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Alta</span>
              <span className="text-foreground font-medium">{grid?.photo_high_price?.toFixed(2).replace(".", ",") || "12,00"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Baixa</span>
              <span className="text-foreground font-medium">{grid?.photo_low_price?.toFixed(2).replace(".", ",") || "8,00"}</span>
            </div>
            <div className="mt-3 border-t border-border pt-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); setShowDiscount(true); }}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">PACOTES E DESCONTOS</h3>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-bold text-foreground">TIPO DE BUSCA</h3>
            </div>
            <p className="text-sm text-foreground">{event.search_type?.join(", ") || "—"}</p>
            <div className="flex items-center gap-2 mt-3">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-bold text-foreground">ORGANIZADOR</h3>
            </div>
            <p className="text-sm text-foreground">Você</p>
          </div>

          <div className="rounded-xl bg-lime/90 p-5 text-center">
            <h3 className="text-sm font-bold text-black mb-1">FATURAMENTO DO EVENTO</h3>
            <p className="text-4xl font-black text-black">{totalRevenue.toFixed(2).replace(".", ",")}</p>
            <p className="text-sm text-black/70 mt-1">Sua Comissão: {(totalRevenue * 0.9).toFixed(2).replace(".", ",")}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="glass-card p-4">
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <div><p className="text-xl font-bold text-foreground">{paidOrders.length}</p><p className="text-xs text-muted-foreground">PEDIDOS</p></div>
              <div><p className="text-xl font-bold text-foreground">{avgTicket.toFixed(2).replace(".", ",")}</p><p className="text-xs text-muted-foreground">TICKET MÉDIO</p></div>
              <div><p className="text-xl font-bold text-foreground">{photosSold}</p><p className="text-xs text-muted-foreground">FOTOS VENDIDAS</p></div>
              <div><p className="text-xl font-bold text-foreground">{paidOrders.length > 0 ? (photosSold / paidOrders.length).toFixed(2) : "0.00"}</p><p className="text-xs text-muted-foreground">FOTOS POR PEDIDO</p></div>
              <div><p className="text-xl font-bold text-foreground">0</p><p className="text-xs text-muted-foreground">VÍDEOS VENDIDOS</p></div>
              <div><p className="text-xl font-bold text-foreground">0.00</p><p className="text-xs text-muted-foreground">VÍDEOS POR PEDIDO</p></div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <div><p className="text-xl font-bold text-foreground">{photos.length}</p><p className="text-xs text-muted-foreground">TOTAL DE FOTOS</p></div>
              <div><p className="text-xl font-bold text-foreground">{videos.length}</p><p className="text-xs text-muted-foreground">TOTAL DE VÍDEOS</p></div>
              <div><p className="text-xl font-bold text-foreground">{photos.filter(p => p.identified).length}</p><p className="text-xs text-muted-foreground">IDENTIFICADAS</p></div>
              <div><p className="text-xl font-bold text-foreground">0</p><p className="text-xs text-muted-foreground">VISITANTES</p></div>
              <div className="col-span-2"><p className="text-xl font-bold text-foreground">{photos.filter(p => !p.identified).length}</p><p className="text-xs text-muted-foreground">SEM IDENTIFICAÇÃO</p></div>
            </div>
          </div>

          <div className="glass-card p-4 flex items-center justify-center">
            <div className="text-center">
              <p className="text-3xl mb-1">👀</p>
              <p className="text-xs text-muted-foreground">DE VISITANTES QUE<br />COMPRARAM</p>
              <p className="text-xl font-bold text-foreground mt-1">{paidOrders.length > 0 ? "33%" : "0%"}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { label: "Fotos Vendidas", action: () => setShowGallery(true) },
            { label: "Vídeos Vendidos", action: () => toast.info("Em breve!") },
            { label: "Histórico Alteração Capa", action: () => toast.info("Em breve!") },
            { label: "Convidar Fotógrafos", action: () => toast.info("Em breve!") },
            { label: "Enviar Mensagem", action: () => toast.info("Em breve!") },
          ].map((btn) => (
            <button key={btn.label} onClick={btn.action} className="px-4 py-2 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/5 transition-colors min-h-[44px]">
              {btn.label}
            </button>
          ))}
        </div>

        {/* Coupons List */}
        {coupons.length > 0 && (
          <div className="glass-card p-4 mb-6">
            <h3 className="text-sm font-bold text-foreground mb-3">CUPONS ATIVOS</h3>
            <div className="space-y-2">
              {coupons.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-secondary/30 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-3">
                    <Tag className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold text-foreground">{c.code}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.discount_type === "percentual" ? `${c.discount_value}%` : `R$ ${c.discount_value.toFixed(2)}`}
                    </span>
                    <span className="text-xs text-muted-foreground">{c.uses}/{c.max_uses} usos</span>
                  </div>
                  <button
                    onClick={() => toggleCoupon.mutate({ id: c.id, active: !c.active })}
                    className={`px-3 py-1 rounded text-xs font-medium ${c.active ? "bg-lime/20 text-lime" : "bg-destructive/20 text-destructive"}`}
                  >
                    {c.active ? "Ativo" : "Inativo"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Steps */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 py-6">
          {[
            { label: "Infos do Evento", done: true },
            { label: "Enviar Fotos", done: photos.length > 0 },
            { label: "Identificar Fotos", done: photos.some(p => p.identified) },
            { label: "Ativar Evento", done: event.status === "ativo" },
            { label: "Vender", done: orders.length > 0 },
          ].map((step, i) => (
            <div key={step.label} className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step.done ? "bg-lime" : "bg-secondary"}`}>
                {step.done ? <Check className="w-5 h-5 text-black" /> : <span className="text-sm text-muted-foreground">{i + 1}</span>}
              </div>
              <span className={`text-[10px] sm:text-xs font-medium text-center ${step.done ? "text-lime" : "text-muted-foreground"}`}>{step.label}</span>
            </div>
          ))}
        </div>

        {/* ======= MODALS ======= */}
        <UploadModal open={showUploadPhotos} onClose={() => setShowUploadPhotos(false)} onUpload={(files) => { s3UploadPhotos.mutate(files); setShowUploadPhotos(false); }} isUploading={s3UploadPhotos.isPending} type="photos" />
        <UploadModal open={showUploadVideos} onClose={() => setShowUploadVideos(false)} onUpload={(files) => { s3UploadVideos.mutate(files); setShowUploadVideos(false); }} isUploading={s3UploadVideos.isPending} type="videos" />
        <PriceGridModal
          open={showPriceGrid}
          onClose={() => setShowPriceGrid(false)}
          onSave={(g) => { savePriceGrid.mutate(g); setShowPriceGrid(false); }}
          onDelete={(gid) => deletePriceGrid.mutate(gid)}
          isSaving={savePriceGrid.isPending}
          grids={(grids || []).map((g: any) => ({
            id: g.id,
            name: g.name,
            photo_high_price: Number(g.photo_high_price),
            photo_low_price: Number(g.photo_low_price),
            video_price: Number(g.video_price),
          }))}
          photographerShare={Number((event as any).commission_photographer_share ?? 10)}
          clientShare={Number((event as any).commission_client_share ?? 0)}
        />
        <DiscountModal
          open={showDiscount}
          onClose={() => setShowDiscount(false)}
          onSave={(pkg) => { savePackage.mutate(pkg); setShowDiscount(false); }}
          isSaving={savePackage.isPending || updateEvent.isPending}
          basePhotoPrice={grid ? Number(grid.photo_high_price) : 20}
          initialProgressiveEnabled={!!event.progressive_discount_enabled}
          initialProgressiveRules={Array.isArray(event.progressive_discount_rules) ? (event.progressive_discount_rules as any) : []}
          onSaveProgressive={(rules, enabled) => {
            updateEvent.mutate({
              progressive_discount_enabled: enabled,
              progressive_discount_rules: rules as any,
            });
          }}
        />
        <CouponModal open={showCoupon} onClose={() => setShowCoupon(false)} onSave={(c) => { createCoupon.mutate(c); setShowCoupon(false); }} isSaving={createCoupon.isPending} />
        <EditEventModal open={showEdit} onClose={() => setShowEdit(false)} onSave={(data) => { updateEvent.mutate(data as any); setShowEdit(false); }} initial={{ name: event.name, event_date: event.event_date, event_time: event.event_time, location: event.location, category: event.category, search_type: event.search_type || [], visibility: event.visibility }} isSaving={updateEvent.isPending} />
        <PasswordModal open={showPassword} onClose={() => setShowPassword(false)} onSave={(pw) => { updateEvent.mutate({ password: pw }); setShowPassword(false); }} currentPassword={event.password} isSaving={updateEvent.isPending} />
        <PhotoGallery
          open={showGallery}
          onClose={() => setShowGallery(false)}
          photos={photos}
          onDelete={(pid) => deletePhoto.mutate(pid)}
          isDeleting={deletePhoto.isPending}
          totalPhotos={photos.length}
          onUploadFiles={(files, album) => s3UploadPhotos.mutate({ files, album })}
          isUploading={s3UploadPhotos.isPending}
          uploadProgress={photoUploadProgress}
          coverUrl={event?.cover_url}
          onSetCover={async (photo) => {
            try {
              const { data: signed } = await supabase.functions.invoke("s3-presign", {
                body: { action: "sign_read_batch", objects: [{ path: photo.file_url }] },
              });
              const url = signed?.results?.[0]?.url || photo.file_url;
              await updateEvent.mutateAsync({ cover_url: url });
              toast.success("Foto definida como capa do evento");
            } catch (e: any) {
              toast.error("Erro ao definir capa: " + (e.message || "tente novamente"));
            }
          }}
          onBulkDelete={async (ids) => {
            const { error } = await supabase.from("event_photos").delete().in("id", ids);
            if (error) {
              toast.error("Erro ao excluir fotos");
              return;
            }
            toast.success(`${ids.length} foto(s) excluída(s)`);
            queryClient.invalidateQueries({ queryKey: ["event-photos", id] });
          }}
        />
        <VideoGallery
          open={showVideoGallery}
          onClose={() => setShowVideoGallery(false)}
          videos={videos as any}
          onDelete={(vid) => deleteVideo.mutate(vid)}
          isDeleting={deleteVideo.isPending}
          totalVideos={videos.length}
          onUploadFiles={(files) => s3UploadVideos.mutate(files)}
          isUploading={s3UploadVideos.isPending}
          uploadProgress={videoUploadProgress}
          onBulkDelete={async (ids) => {
            const { error } = await supabase.from("event_videos").delete().in("id", ids);
            if (error) {
              toast.error("Erro ao excluir vídeos");
              return;
            }
            toast.success(`${ids.length} vídeo(s) excluído(s)`);
            queryClient.invalidateQueries({ queryKey: ["event-videos", id] });
          }}
        />
        <PromoArtModal
          open={showPromo}
          onClose={() => setShowPromo(false)}
          event={{
            id: event.id,
            name: event.name,
            event_date: event.event_date,
            event_time: event.event_time,
            location: event.location,
            cover_url: event.cover_url,
          }}
          photographerName={profile?.full_name || undefined}
        />
        <CollaborationModal
          open={showCollab}
          onClose={() => setShowCollab(false)}
          eventId={event.id}
          ownerCommissionPct={Number((event as any).owner_commission_pct ?? 0)}
          collabNote={(event as any).collab_note ?? null}
        />
        <ScheduleModal
          open={showSchedule}
          onClose={() => setShowSchedule(false)}
          initial={(event as any).publish_at}
          isSaving={updateEvent.isPending}
          onConfirm={(iso) => {
            updateEvent.mutate({ status: "agendado", publish_at: iso } as any);
            setShowSchedule(false);
            toast.success("Publicação agendada!");
          }}
        />

        {/* Actions dropdown */}
        {showActions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowActions(false)}>
            <div className="glass-card p-4 max-w-xs w-full" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-foreground mb-3">Ações do Evento</h3>
              <div className="space-y-2">
                <button onClick={handleDuplicateEvent} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary/50 transition-colors text-left">
                  <Copy className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">Duplicar Evento</span>
                </button>
                <button onClick={handleShareLink} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary/50 transition-colors text-left">
                  <Share2 className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">Copiar Link</span>
                </button>
                <button onClick={handleDeleteEvent} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-destructive/10 transition-colors text-left">
                  <Trash2 className="w-4 h-4 text-destructive" />
                  <span className="text-sm text-destructive">Excluir Evento</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default EventDashboard;
