import { useState } from "react";
import { Search, Download, Package, CheckCircle2, Clock, XCircle, Loader2, ArrowLeft, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ClientNavbar from "@/components/ClientNavbar";
import Footer from "@/components/Footer";
import { getPhotoCode } from "@/lib/photoCode";

interface OrderItem {
  id: string;
  photo_id: string | null;
  video_id: string | null;
  price: number;
}

interface Order {
  id: string;
  client_name: string;
  client_email: string;
  amount: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  event_id: string;
  event_name: string;
  item_count: number;
  order_items: OrderItem[];
}

interface DownloadFile {
  id: string;
  path: string;
  name: string | null;
  type: string;
  url: string | null;
}

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  pago: { label: "Pago", icon: CheckCircle2, color: "text-green-500" },
  enviado: { label: "Enviado", icon: Package, color: "text-primary" },
  aguardando_pagamento: { label: "Aguardando pagamento", icon: Clock, color: "text-yellow-500" },
  cancelado: { label: "Cancelado", icon: XCircle, color: "text-red-500" },
};

const MeusPedidos = () => {
  const [email, setEmail] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadFiles, setDownloadFiles] = useState<DownloadFile[]>([]);
  const [showDownload, setShowDownload] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Digite seu e-mail");
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke("order-download", {
        body: { action: "lookup", email: email.trim() },
      });
      if (error) throw new Error(error.message);
      setOrders(data.orders || []);
    } catch (err: any) {
      toast.error("Erro ao buscar pedidos: " + err.message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (orderId: string) => {
    setDownloadingId(orderId);
    try {
      const { data, error } = await supabase.functions.invoke("order-download", {
        body: { action: "download", order_id: orderId, email: email.trim() },
      });
      if (error) throw new Error(error.message);
      setDownloadFiles(data.files || []);
      setShowDownload(orderId);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const canDownload = (status: string) => status === "pago" || status === "enviado";

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ClientNavbar />
      <main className="flex-1 pt-24 pb-12 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Meus Pedidos</h1>
          <p className="text-muted-foreground mb-8">
            Digite seu e-mail para consultar seus pedidos e baixar suas fotos.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex gap-3 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="Digite seu e-mail..."
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Buscar
            </button>
          </form>

          {/* Download modal */}
          {showDownload && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowDownload(null)}>
              <div className="bg-card border border-border rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-border flex items-center justify-between">
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    <Download className="w-5 h-5 text-primary" />
                    Downloads
                  </h3>
                  <button onClick={() => setShowDownload(null)} className="p-2 hover:bg-secondary rounded-lg">
                    <XCircle className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
                <div className="p-5 space-y-3">
                  {downloadFiles.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum arquivo encontrado</p>
                  )}
                  {downloadFiles.map((file, i) => (
                    <div key={file.id || i} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/50">
                      <div className="flex items-center gap-3">
                        <Image className="w-8 h-8 text-primary/60" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{file.name || `Arquivo ${i + 1}`}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {file.type}
                            {file.id && (
                              <span className="ml-2 font-mono text-[10px] text-muted-foreground/80">
                                ID: {getPhotoCode(file.id)}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      {file.url ? (
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all"
                        >
                          Baixar
                        </a>
                      ) : (
                        <span className="text-xs text-red-400">Indisponível</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {searched && !loading && (
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum pedido encontrado para este e-mail.</p>
                </div>
              ) : (
                orders.map(order => {
                  const config = statusConfig[order.status] || statusConfig.aguardando_pagamento;
                  const StatusIcon = config.icon;
                  return (
                    <div key={order.id} className="rounded-2xl border border-border bg-card p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-mono text-primary">#{order.id.slice(0, 8)}</p>
                          <p className="font-bold text-foreground">{order.event_name}</p>
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs font-medium ${config.color}`}>
                          <StatusIcon className="w-4 h-4" />
                          {config.label}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>{formatDate(order.created_at)}</span>
                        <span>{order.item_count} foto(s)</span>
                        <span className="font-bold text-foreground">R$ {Number(order.amount).toFixed(2).replace(".", ",")}</span>
                      </div>

                      {canDownload(order.status) && (
                        <button
                          onClick={() => handleDownload(order.id)}
                          disabled={downloadingId === order.id}
                          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                          {downloadingId === order.id ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Gerando links...</>
                          ) : (
                            <><Download className="w-4 h-4" /> Baixar fotos</>
                          )}
                        </button>
                      )}

                      {order.status === "aguardando_pagamento" && (
                        <p className="text-xs text-yellow-500 text-center">
                          Pagamento pendente. As fotos serão liberadas após a confirmação.
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MeusPedidos;
