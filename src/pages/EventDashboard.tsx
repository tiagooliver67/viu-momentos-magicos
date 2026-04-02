import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import DashboardSidebar from "@/components/DashboardSidebar";
import { 
  Edit, ShoppingCart, DollarSign, Upload, Image, MoreHorizontal, Lock, Megaphone, Tag, 
  Video, FileDown, Camera as CameraIcon, Eye, Check, ChevronRight, Users, BarChart3, X
} from "lucide-react";
import { toast } from "sonner";

const mockEvent = {
  id: "263068",
  name: "TREINO ESCOLA ALFA 31.03",
  date: "31/03/2026",
  location: "João Dourado, João Dourado - João Dourado / BA",
  status: "Ativo",
  coverUrl: "",
  priceHigh: "12,00",
  priceLow: "8,00",
  searchType: "Reconhecimento Facial",
  organizer: "VIUFOTO",
  revenue: 24.0,
  commission: 21.6,
  stats: {
    orders: 1, avgTicket: "24,00", photosSold: 2, photosPerOrder: "2.00",
    videosSold: 0, videosPerOrder: "0.00", totalPhotos: 228, totalVideos: 0,
    identified: 0, unidentified: 228, visitors: 0, buyerRate: "0%",
  },
  photographers: [
    { name: "@Tiagooliverfotogr...", avatar: "", ranking: "1º", commission: "90%", videosSent: 0, videosSold: 0, photosSent: 228, photosSoldCount: 2, unidentified: 228, photographed: 0, revenue: "21,60" },
  ],
  progressSteps: [
    { label: "Infos do Evento", done: true },
    { label: "Enviar Fotos", done: true },
    { label: "Identificar Fotos", done: true },
    { label: "Ativar Evento", done: true },
    { label: "Vender", done: true },
  ],
};

const quickActions = [
  { label: "Editar", icon: Edit },
  { label: "Pedidos", icon: ShoppingCart },
  { label: "Financeiro", icon: DollarSign },
  { label: "Enviar Fotos", icon: Upload },
  { label: "Fotos", icon: Image },
  { label: "Ações", icon: MoreHorizontal },
  { label: "Senha", icon: Lock },
  { label: "Divulgação", icon: Megaphone },
  { label: "Cupons", icon: Tag },
  { label: "Enviar Vídeos", icon: Video },
  { label: "Vídeos", icon: Video },
  { label: "Importar Pedidos", icon: FileDown },
  { label: "Convidar", icon: CameraIcon },
  { label: "Galeria", icon: Eye },
];

const EventDashboard = () => {
  const { id } = useParams();
  const [showUpload, setShowUpload] = useState(false);
  const ev = mockEvent;

  const handleAction = (label: string) => {
    if (label === "Enviar Fotos") {
      setShowUpload(true);
    } else {
      toast.info(`Ação "${label}" será implementada com backend`);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 p-4 pt-18 lg:pt-6 lg:p-8 overflow-auto">
        {/* Header */}
        <p className="text-xs text-primary font-bold mb-1">DASHBOARD EVENTO</p>
        <p className="text-xs text-muted-foreground mb-4">{ev.id} - {ev.name}</p>

        {/* Event Info Card */}
        <div className="glass-card p-4 sm:p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Cover placeholder */}
            <div className="w-full lg:w-48 h-32 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
              <Image className="w-10 h-10 text-muted-foreground" />
            </div>

            {/* Event details */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-primary font-bold">{ev.id}</p>
              <h1 className="text-lg sm:text-xl font-bold text-foreground mb-1">{ev.name}</h1>
              <p className="text-xs text-muted-foreground mb-3">{ev.date} - {ev.location}</p>
              <span className="inline-flex px-4 py-1.5 rounded-full bg-lime/10 text-lime text-xs font-bold">
                {ev.status.toUpperCase()}
              </span>
            </div>

            {/* Quick actions grid */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
              {quickActions.map((a) => (
                <button
                  key={a.label}
                  onClick={() => handleAction(a.label)}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-secondary/50 transition-colors min-w-[50px]"
                >
                  <a.icon className="w-4 h-4 text-primary" />
                  <span className="text-[9px] text-muted-foreground text-center leading-tight">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pricing + Search + Revenue */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-bold text-foreground">GRADE DE PREÇO</h3>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Alta</span>
              <span className="text-foreground font-medium">{ev.priceHigh}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Baixa</span>
              <span className="text-foreground font-medium">{ev.priceLow}</span>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-bold text-foreground">TIPO DE BUSCA</h3>
            </div>
            <p className="text-sm text-foreground">{ev.searchType || "—"}</p>
            <div className="flex items-center gap-2 mt-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-bold text-foreground">ORGANIZADOR</h3>
            </div>
            <p className="text-sm text-foreground">{ev.organizer || "—"}</p>
          </div>

          <div className="rounded-xl bg-lime/90 p-5 text-center">
            <h3 className="text-sm font-bold text-black mb-1">FATURAMENTO DO EVENTO</h3>
            <p className="text-4xl font-black text-black">{ev.revenue.toFixed(2).replace(".", ",")}</p>
            <p className="text-sm text-black/70 mt-1">Sua Comissão: {ev.commission.toFixed(2).replace(".", ",")}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="glass-card p-4">
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <div><p className="text-xl font-bold text-foreground">{ev.stats.orders}</p><p className="text-xs text-muted-foreground">PEDIDOS</p></div>
              <div><p className="text-xl font-bold text-foreground">{ev.stats.avgTicket}</p><p className="text-xs text-muted-foreground">TICKET MÉDIO</p></div>
              <div><p className="text-xl font-bold text-foreground">{ev.stats.photosSold}</p><p className="text-xs text-muted-foreground">FOTOS VENDIDAS</p></div>
              <div><p className="text-xl font-bold text-foreground">{ev.stats.photosPerOrder}</p><p className="text-xs text-muted-foreground">FOTOS POR PEDIDO</p></div>
              <div><p className="text-xl font-bold text-foreground">{ev.stats.videosSold}</p><p className="text-xs text-muted-foreground">VÍDEOS VENDIDOS</p></div>
              <div><p className="text-xl font-bold text-foreground">{ev.stats.videosPerOrder}</p><p className="text-xs text-muted-foreground">VÍDEOS POR PEDIDO</p></div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <div><p className="text-xl font-bold text-foreground">{ev.stats.totalPhotos}</p><p className="text-xs text-muted-foreground">TOTAL DE FOTOS</p></div>
              <div><p className="text-xl font-bold text-foreground">{ev.stats.totalVideos}</p><p className="text-xs text-muted-foreground">TOTAL DE VÍDEOS</p></div>
              <div><p className="text-xl font-bold text-foreground">{ev.stats.identified}</p><p className="text-xs text-muted-foreground">IDENTIFICADAS</p></div>
              <div><p className="text-xl font-bold text-foreground">{ev.stats.visitors}</p><p className="text-xs text-muted-foreground">VISITANTES</p></div>
              <div className="col-span-2"><p className="text-xl font-bold text-foreground">{ev.stats.unidentified}</p><p className="text-xs text-muted-foreground">SEM IDENTIFICAÇÃO</p></div>
            </div>
          </div>

          <div className="glass-card p-4 flex items-center justify-center">
            <div className="text-center">
              <p className="text-3xl mb-1">👀</p>
              <p className="text-xs text-muted-foreground">DE VISITANTES QUE<br />COMPRARAM</p>
              <p className="text-xl font-bold text-foreground mt-1">{ev.stats.buyerRate}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          {["Fotos Vendidas", "Vídeos Vendidos", "Histórico Alteração Capa", "Convidar Fotógrafos", "Enviar Mensagem"].map((btn) => (
            <button key={btn} className="px-4 py-2 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/5 transition-colors min-h-[44px]">
              {btn}
            </button>
          ))}
        </div>

        {/* Photographers Table */}
        <div className="glass-card overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  {["Fotógrafo", "Ranking", "Comissão", "Vídeos Env.", "Vídeos Vend.", "Fotos Env.", "Fotos Vend.", "Sem Ident.", "Fotografados", "Vendidas", "Faturamento", ""].map((h) => (
                    <th key={h} className="text-left text-[10px] font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ev.photographers.map((p) => (
                  <tr key={p.name} className="border-b border-border/50">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"><CameraIcon className="w-4 h-4 text-muted-foreground" /></div>
                        <span className="text-xs text-foreground font-medium">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-foreground">{p.ranking}</td>
                    <td className="px-3 py-3 text-xs text-foreground">{p.commission}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{p.videosSent}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{p.videosSold}</td>
                    <td className="px-3 py-3 text-xs text-foreground">{p.photosSent}</td>
                    <td className="px-3 py-3 text-xs text-primary font-bold">{p.photosSoldCount}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{p.unidentified}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{p.photographed}</td>
                    <td className="px-3 py-3 text-xs text-foreground">{p.photosSoldCount}</td>
                    <td className="px-3 py-3 text-xs font-bold text-foreground">{p.revenue}</td>
                    <td className="px-3 py-3">
                      <button className="px-3 py-1.5 rounded bg-muted-foreground/20 text-xs text-foreground font-medium">Ações</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 py-6">
          {ev.progressSteps.map((step, i) => (
            <div key={step.label} className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step.done ? "bg-lime" : "bg-secondary"}`}>
                {step.done ? <Check className="w-5 h-5 text-black" /> : <span className="text-sm text-muted-foreground">{i + 1}</span>}
              </div>
              <span className={`text-[10px] sm:text-xs font-medium text-center ${step.done ? "text-lime" : "text-muted-foreground"}`}>{step.label}</span>
            </div>
          ))}
        </div>

        {/* Upload Modal */}
        {showUpload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowUpload(false)}>
            <div className="glass-card p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-foreground">Enviar Fotos</h3>
                <button onClick={() => setShowUpload(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="border-2 border-dashed border-border rounded-xl p-10 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-foreground font-medium mb-1">Arraste suas fotos ou clique para selecionar</p>
                <p className="text-xs text-muted-foreground">JPG, PNG, WEBP • Máximo 25MB por foto</p>
              </div>
              <button
                onClick={() => { toast.success("Upload iniciado! (simulação)"); setShowUpload(false); }}
                className="w-full mt-4 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm min-h-[44px]"
              >
                Iniciar Upload
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default EventDashboard;
