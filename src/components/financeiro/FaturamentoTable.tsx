import { Crown, Filter } from "lucide-react";
import { useState } from "react";

interface BillingRow {
  date: string;
  event: string;
  photos: number;
  videos: number;
  revenue: number;
}

interface FaturamentoTableProps {
  rows: BillingRow[];
  total: number;
}

type FilterMode = "venda" | "evento";

const FaturamentoTable = ({ rows, total }: FaturamentoTableProps) => {
  const [filterMode, setFilterMode] = useState<FilterMode>("venda");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div>
      {/* Filter toggle */}
      <div className="flex justify-center mb-6">
        <div className="flex rounded-xl overflow-hidden border border-border w-full sm:w-auto">
          <button
            onClick={() => setFilterMode("venda")}
            className={`flex-1 sm:flex-none px-4 sm:px-8 py-3 text-xs sm:text-sm font-semibold transition-all min-h-[44px] ${
              filterMode === "venda"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Por período de venda
          </button>
          <button
            onClick={() => setFilterMode("evento")}
            className={`flex-1 sm:flex-none px-4 sm:px-8 py-3 text-xs sm:text-sm font-semibold transition-all min-h-[44px] ${
              filterMode === "evento"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Por data do evento
          </button>
        </div>
      </div>

      {/* Date filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 mb-8">
        <div className="w-full sm:w-auto">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {filterMode === "venda" ? "Período das Vendas" : "Período dos Eventos"}
          </p>
          <div className="flex items-center gap-2 sm:gap-3 border border-border rounded-xl bg-card px-3 sm:px-4 py-2.5">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-transparent text-sm text-foreground border-none outline-none flex-1 min-w-0"
            />
            <span className="text-muted-foreground">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent text-sm text-foreground border-none outline-none flex-1 min-w-0"
            />
          </div>
        </div>
        <button className="px-8 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all sm:mt-6 min-h-[44px]">
          <Filter className="w-4 h-4 inline mr-2" />
          FILTRAR
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-border/50">
          {rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Nenhum dado encontrado no período.</p>
          ) : (
            rows.map((row, i) => (
              <div key={i} className="p-4 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-primary font-semibold text-sm flex-1">{row.event}</span>
                  <Crown className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{row.date}</span>
                  <span>{row.photos} fotos • {row.videos} vídeos</span>
                </div>
                <p className="text-sm font-bold text-foreground">R$ {fmt(row.revenue)}</p>
              </div>
            ))
          )}
          {rows.length > 0 && (
            <div className="p-4 bg-primary/5 flex items-center justify-between">
              <span className="font-bold text-sm text-muted-foreground">Total</span>
              <span className="text-lg font-bold text-primary">R$ {fmt(total)}</span>
            </div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Data</th>
                <th className="text-left p-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Evento</th>
                <th className="text-center p-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Fotos</th>
                <th className="text-center p-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Vídeos</th>
                <th className="text-right p-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Faturamento</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum dado encontrado.</td></tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="p-4 text-muted-foreground">{row.date}</td>
                    <td className="p-4">
                      <span className="text-primary font-semibold hover:underline cursor-pointer">{row.event}</span>
                    </td>
                    <td className="p-4 text-center text-foreground">{row.photos}</td>
                    <td className="p-4 text-center text-foreground">{row.videos}</td>
                    <td className="p-4 text-right font-semibold text-foreground">R$ {fmt(row.revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td colSpan={4} className="p-4 text-right font-bold text-muted-foreground uppercase text-sm">Total</td>
                  <td className="p-4 text-right text-xl font-bold text-primary">R$ {fmt(total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default FaturamentoTable;
