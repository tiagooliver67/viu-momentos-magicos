import { useState } from "react";
import { useParams } from "react-router-dom";
import { useEventOrders } from "@/hooks/useEvent";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CardTitle, PageTitle, PageSubtitle } from "@/components/ui/Typography";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Download, FileText, ChevronDown } from "lucide-react";

export const OrdersModule = () => {
  const { id } = useParams();
  const { data: orders = [] } = useEventOrders(id);
  const [search, setSearch] = useState("");

  const filteredOrders = orders.filter((o) =>
    o.client_name.toLowerCase().includes(search.toLowerCase()) ||
    o.client_email.toLowerCase().includes(search.toLowerCase()) ||
    o.id.toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { label: "Total de pedidos", value: orders.length },
    { label: "Valor bruto", value: `R$ ${orders.reduce((acc, o) => acc + Number(o.amount), 0).toFixed(2)}` },
    { label: "Pedidos pagos", value: orders.filter(o => o.status === "pago").length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <PageTitle>Centro de Pedidos</PageTitle>
        <PageSubtitle>Acompanhe todas as vendas deste evento.</PageSubtitle>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="p-4 bg-card border rounded-xl shadow-sm">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome, email ou ID..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" className="gap-2">
          <FileText className="w-4 h-4" /> Exportar
        </Button>
      </div>

      <div className="bg-card border rounded-xl shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Comprador</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{order.client_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{order.client_name}</p>
                    <p className="text-xs text-muted-foreground">{order.client_email}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="font-semibold text-sm">R$ {Number(order.amount).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={order.status === "pago" ? "default" : "secondary"}>
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">Detalhes</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};