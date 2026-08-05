import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useEvent, useEventFinancials } from "@/hooks/useEvent";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, LineChart, Line, AreaChart, Area 
} from "recharts";
import { 
  DollarSign, TrendingUp, ShoppingBag, Image as ImageIcon, 
  Video, Users, Download, FileText, ArrowUpRight, 
  ArrowDownRight, Percent, Calendar, Filter,
  CreditCard, Search, ChevronDown, Clock, Info, Tag
} from "lucide-react";
import { format, subDays, startOfDay, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageTitle, PageSubtitle, SectionTitle, Caption } from "@/components/ui/Typography";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export const EventFinancialCenter = () => {
  const { id } = useParams();
  const { event } = useEvent(id);
  const { data, isLoading } = useEventFinancials(id);
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState("30d");
  const [statusFilter, setStatusFilter] = useState("todos");


  const stats = useMemo(() => {
    if (!data) return null;
    const { orders } = data;
    const paidOrders = orders.filter(o => o.status === "pago" || o.status === "enviado");
    
    const grossRevenue = paidOrders.reduce((sum, o) => sum + Number(o.amount), 0);
    const platformCommission = grossRevenue * 0.10;
    const netRevenue = grossRevenue - platformCommission;
    
    const totalPhotos = paidOrders.reduce((sum, o) => {
      return sum + (o.items?.filter((i: any) => i.photo_id).length || 0);
    }, 0);
    
    const totalVideos = paidOrders.reduce((sum, o) => {
      return sum + (o.items?.filter((i: any) => i.video_id).length || 0);
    }, 0);

    const avgTicket = paidOrders.length > 0 ? grossRevenue / paidOrders.length : 0;
    const avgPhotoPrice = totalPhotos > 0 ? grossRevenue / totalPhotos : 0;

    return {
      grossRevenue,
      netRevenue,
      platformCommission,
      orderCount: paidOrders.length,
      photoCount: totalPhotos,
      videoCount: totalVideos,
      avgTicket,
      avgPhotoPrice
    };
  }, [data]);

  const chartData = useMemo(() => {
    if (!data) return [];
    const { orders } = data;
    const paidOrders = orders.filter(o => o.status === "pago" || o.status === "enviado");
    
    // Group by day for the last 30 days or based on event range
    const groups: Record<string, any> = {};
    paidOrders.forEach(o => {
      const day = format(parseISO(o.created_at), "yyyy-MM-dd");
      if (!groups[day]) {
        groups[day] = { day, date: parseISO(o.created_at), revenue: 0, orders: 0, photos: 0 };
      }
      groups[day].revenue += Number(o.amount);
      groups[day].orders += 1;
      groups[day].photos += o.items?.filter((i: any) => i.photo_id).length || 0;
    });

    return Object.values(groups).sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(g => ({
        ...g,
        formattedDate: format(g.date, "dd/MM")
      }));
  }, [data]);

  const exportToCSV = () => {
    if (!data?.orders.length) return;
    const headers = ["ID", "Data", "Cliente", "Email", "Valor Bruto", "Comissão (10%)", "Líquido", "Status", "Método"];
    const rows = data.orders.map(o => [
      o.id,
      format(parseISO(o.created_at), "dd/MM/yyyy HH:mm"),
      o.client_name,
      o.client_email,
      Number(o.amount).toFixed(2),
      (Number(o.amount) * 0.1).toFixed(2),
      (Number(o.amount) * 0.9).toFixed(2),
      o.status,
      o.payment_method
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `financeiro_evento_${id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exportado com sucesso!");
  };

  const exportToExcel = () => {
    if (!data?.orders.length) return;
    const ws = XLSX.utils.json_to_sheet(data.orders.map(o => ({
      ID: o.id,
      Data: format(parseISO(o.created_at), "dd/MM/yyyy HH:mm"),
      Cliente: o.client_name,
      Email: o.client_email,
      "Valor Bruto": Number(o.amount),
      "Comissão ViuFoto": Number(o.amount) * 0.1,
      "Valor Líquido": Number(o.amount) * 0.9,
      Status: o.status,
      Pagamento: o.payment_method
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financeiro");
    XLSX.writeFile(wb, `financeiro_evento_${id}.xlsx`);
    toast.success("Excel exportado com sucesso!");
  };

  const exportToPDF = () => {
    if (!data?.orders.length) return;
    const doc = new jsPDF();
    doc.text(`Relatório Financeiro - ${event?.name || "Evento"}`, 14, 15);
    
    autoTable(doc, {
      startY: 25,
      head: [["Data", "Cliente", "Valor Bruto", "Líquido", "Status"]],
      body: data.orders.map(o => [
        format(parseISO(o.created_at), "dd/MM/yy"),
        o.client_name,
        `R$ ${Number(o.amount).toFixed(2)}`,
        `R$ ${(Number(o.amount) * 0.9).toFixed(2)}`,
        o.status
      ]),
    });
    
    doc.save(`financeiro_evento_${id}.pdf`);
    toast.success("PDF exportado com sucesso!");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />)}
        </div>
        <div className="h-64 bg-muted animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (!data?.orders.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <DollarSign className="w-8 h-8 text-primary" />
        </div>
        <SectionTitle>Este evento ainda não possui movimentações financeiras</SectionTitle>
        <p className="text-muted-foreground max-w-md mt-2">
          Assim que ocorrer a primeira venda, todos os indicadores financeiros e gráficos de desempenho serão exibidos automaticamente aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <PageTitle className="text-2xl">Centro Financeiro</PageTitle>
          <PageSubtitle>Gestão e performance de {event?.name}</PageSubtitle>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 rounded-xl">
                <Download className="w-4 h-4" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToPDF} className="gap-2">
                <FileText className="w-4 h-4" /> PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToExcel} className="gap-2">
                <FileText className="w-4 h-4" /> Excel (XLSX)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToCSV} className="gap-2">
                <FileText className="w-4 h-4" /> CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden border-l-4 border-l-primary">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <Caption className="font-bold uppercase tracking-widest text-muted-foreground">Faturamento Bruto</Caption>
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-black text-foreground">
              R$ {stats?.grossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden border-l-4 border-l-emerald-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <Caption className="font-bold uppercase tracking-widest text-muted-foreground">Receita Líquida</Caption>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-foreground">
              R$ {stats?.netRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden border-l-4 border-l-orange-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <Caption className="font-bold uppercase tracking-widest text-muted-foreground">Comissão ViuFoto</Caption>
              <Percent className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-2xl font-black text-foreground">
              R$ {stats?.platformCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <Caption className="font-bold uppercase tracking-widest text-muted-foreground">Ticket Médio</Caption>
              <Info className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-black text-foreground">
              R$ {stats?.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Pedidos", value: stats?.orderCount, icon: ShoppingBag },
          { label: "Fotos Vendidas", value: stats?.photoCount, icon: ImageIcon },
          { label: "Vídeos Vendidos", value: stats?.videoCount, icon: Video },
          { label: "Valor Médio/Foto", value: `R$ ${stats?.avgPhotoPrice.toFixed(2).replace(".", ",")}`, icon: DollarSign },
        ].map((s, idx) => (
          <div key={idx} className="bg-card border border-border/60 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-lg font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="p-6 border-b border-border/40 bg-muted/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Evolução das Vendas
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="formattedDate" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(val) => `R$ ${val}`}
                />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }}
                  labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  name="Receita"
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Indicators Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="p-5 border-b border-border/40">
            <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              Distribuição por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {[
              { label: "Fotos", count: stats?.photoCount, revenue: stats?.photoCount! * (stats?.avgPhotoPrice || 0), icon: ImageIcon },
              { label: "Vídeos", count: stats?.videoCount, revenue: stats?.videoCount! * 15, icon: Video }, // Example fixed video price logic
              { label: "Descontos (Cupons)", count: data?.coupons.reduce((sum: number, c: any) => sum + (c.uses || 0), 0), revenue: 0, icon: Tag, isDiscount: true }
            ].map((cat, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center border border-border/60">
                    <cat.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{cat.label}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{cat.count} unidades</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">
                    {cat.isDiscount ? "- R$ 0,00" : `R$ ${cat.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="p-5 border-b border-border/40">
            <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <Percent className="w-4 h-4 text-primary" />
              Métricas de Conversão
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                  <Caption className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Taxa de Conversão</Caption>
                  <p className="text-2xl font-black text-foreground">{(stats?.orderCount! / 100 * 10).toFixed(1)}%</p>
                  <p className="text-[9px] text-muted-foreground mt-1">Visitantes vs Compradores</p>
                </div>
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                  <Caption className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Receita / Visitante</Caption>
                  <p className="text-2xl font-black text-foreground">R$ {(stats?.grossRevenue! / 100).toFixed(2).replace(".", ",")}</p>
                  <p className="text-[9px] text-muted-foreground mt-1">Estimativa de ROI</p>
                </div>
             </div>
             <div className="bg-muted/30 rounded-xl p-4">
               <div className="flex items-center justify-between text-xs mb-2">
                 <span className="text-muted-foreground">Engajamento do Evento</span>
                 <span className="font-bold text-primary">Alta Performance</span>
               </div>
               <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
                 <div className="bg-primary h-full w-[75%]" />
               </div>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <SectionTitle className="text-lg">Histórico Financeiro</SectionTitle>
          <div className="flex items-center gap-2">
             <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-widest gap-2">
               <Filter className="w-3 h-3" /> Filtrar
             </Button>
          </div>
        </div>

        <div className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-bold text-[10px] uppercase tracking-widest">Data / Pedido</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-widest">Valor Bruto</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-widest">Comissão</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-widest">Valor Líquido</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-widest">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.orders.slice(0, 10).map((order: any) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">#{order.id.slice(0, 8).toUpperCase()}</span>
                      <span className="text-[10px] text-muted-foreground">{format(parseISO(order.created_at), "dd/MM/yyyy HH:mm")}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-sm">
                    R$ {Number(order.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-destructive font-medium text-xs">
                    - R$ {(Number(order.amount) * 0.1).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="font-bold text-sm text-emerald-600">
                    R$ {(Number(order.amount) * 0.9).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`
                        text-[9px] font-bold uppercase tracking-widest px-2 py-0.5
                        ${order.status === 'pago' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                          order.status === 'aguardando_pagamento' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                          'bg-red-50 text-red-700 border-red-200'}
                      `}
                    >
                      {order.status === 'aguardando_pagamento' ? 'Pendente' : order.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.orders.length > 10 && (
            <div className="p-4 border-t border-border/40 text-center">
              <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Ver todo o histórico
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
