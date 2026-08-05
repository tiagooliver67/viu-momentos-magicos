import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, TrendingUp, Settings, Plus, Calendar, RotateCcw, 
  Infinity as InfinityIcon, Pause, Play, XCircle, History, 
  Save, Loader2, Search, Filter, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatBRL } from "@/lib/levels";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export default function AdminEmbaixador() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReferral, setSelectedReferral] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // 1. Fetch Global Settings
  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ["admin-ambassador-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ambassador_settings").select("*").single();
      if (error) throw error;
      return data;
    },
  });

  // 2. Fetch Referrals (Indications)
  const { data: referrals, isLoading: loadingReferrals } = useQuery({
    queryKey: ["admin-referrals", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("referrals")
        .select(`
          *,
          referrer:profiles!referrals_referrer_id_fkey(full_name, email),
          referred:profiles!referrals_referred_id_fkey(full_name, email)
        `)
        .order("created_at", { ascending: false });

      if (searchTerm) {
        // Busca simples por nome do indicado ou indicador
        // Nota: A busca complexa entre joins pode exigir RPC ou filtros específicos, aqui usamos client-side para o demo
      }

      const { data, error } = await supabase.from("referrals").select(`
        *,
        referrer:referrer_id(full_name),
        referred:referred_id(full_name)
      `);
      // Re-fetching manually because of TS issues with joined profile names in standard client
      const { data: rawData, error: err } = await supabase.from('referrals').select('*');
      if (err) throw err;
      
      const userIds = [...new Set([...rawData.map(r => r.referrer_id), ...rawData.map(r => r.referred_id)])];
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, email').in('user_id', userIds);
      const profileMap = Object.fromEntries(profiles?.map(p => [p.user_id, p]) || []);

      return rawData.map(r => ({
        ...r,
        referrer: profileMap[r.referrer_id],
        referred: profileMap[r.referred_id]
      }));
    },
  });

  // 3. Mutations
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: any) => {
      const { error } = await supabase
        .from("ambassador_settings")
        .update(newSettings)
        .eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ambassador-settings"] });
      toast.success("Configurações globais atualizadas!");
    },
  });

  const updateReferralMutation = useMutation({
    mutationFn: async ({ id, updates, action }: { id: string; updates: any; action: string }) => {
      const { data: oldData } = await supabase.from("referrals").select("*").eq("id", id).single();
      
      const { error: updateError } = await supabase
        .from("referrals")
        .update(updates)
        .eq("id", id);
      
      if (updateError) throw updateError;

      // Log audit
      await supabase.from("ambassador_audit_logs").insert({
        referral_id: id,
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action,
        old_values: oldData,
        new_values: updates
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-referrals"] });
      setIsEditModalOpen(false);
      toast.success("Indicação atualizada com sucesso!");
    },
  });

  if (loadingSettings || loadingReferrals) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 p-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão do Programa Embaixador</h1>
          <p className="text-muted-foreground">Configure as regras globais e gerencie indicações individuais.</p>
        </div>
        <div className="flex items-center gap-2">
           <Badge variant="outline" className="px-3 py-1">
             {settings?.is_active ? "Programa Ativo" : "Programa Inativo"}
           </Badge>
        </div>
      </header>

      {/* Global Settings Card */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-card border border-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="font-bold">Configuração Global</h2>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Comissão padrão (%)</Label>
              <Input 
                type="number" 
                defaultValue={settings?.default_commission_pct} 
                step="0.1"
                onBlur={(e) => updateSettingsMutation.mutate({ default_commission_pct: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Vigência padrão (meses)</Label>
              <Input 
                type="number" 
                defaultValue={settings?.default_duration_months} 
                onBlur={(e) => updateSettingsMutation.mutate({ default_duration_months: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor mínimo saque (R$)</Label>
              <Input 
                type="number" 
                defaultValue={settings?.min_payout_amount} 
                onBlur={(e) => updateSettingsMutation.mutate({ min_payout_amount: parseFloat(e.target.value) })}
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Label>Status do Programa</Label>
              <Switch 
                checked={settings?.is_active} 
                onCheckedChange={(checked) => updateSettingsMutation.mutate({ is_active: checked })}
              />
            </div>
          </div>
        </div>

        {/* Referrals Table */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome ou e-mail..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="px-4 py-3">Indicado</th>
                  <th className="px-4 py-3">Indicador (Embaixador)</th>
                  <th className="px-4 py-3">Comissão</th>
                  <th className="px-4 py-3">Vigência</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {referrals?.map((ref) => (
                  <tr key={ref.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{ref.referred?.full_name || "Fotógrafo"}</div>
                      <div className="text-xs text-muted-foreground">{ref.referred?.email}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {ref.referrer?.full_name || "Embaixador"}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {ref.commission_pct !== null ? `${ref.commission_pct}%` : `${settings?.default_commission_pct}% (Padrão)`}
                    </td>
                    <td className="px-4 py-3">
                      {ref.expires_at ? (
                        <div className="flex flex-col">
                          <span>{format(new Date(ref.expires_at), "dd/MM/yyyy")}</span>
                          <span className="text-[10px] text-muted-foreground">Expira em {format(new Date(ref.expires_at), "MMM/yyyy", { locale: ptBR })}</span>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="font-bold">VITALÍCIO ♾️</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {ref.is_paused ? (
                        <Badge variant="destructive">Pausado</Badge>
                      ) : new Date(ref.expires_at) < new Date() ? (
                        <Badge variant="outline">Expirado</Badge>
                      ) : (
                        <Badge variant="success" className="bg-success/10 text-success border-success/20">Ativo</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => { setSelectedReferral(ref); setIsEditModalOpen(true); }}>
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Histórico" onClick={() => { setSelectedReferral(ref); setIsHistoryModalOpen(true); }}>
                        <History className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Edit Referral Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Indicação</DialogTitle>
            <DialogDescription>
              Ajuste as regras específicas para {selectedReferral?.referred?.full_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Comissão Customizada (%)</Label>
              <Input 
                type="number" 
                placeholder={`Padrão: ${settings?.default_commission_pct}%`}
                defaultValue={selectedReferral?.commission_pct}
                id="edit-comm"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="flex items-center gap-2" onClick={() => {
                 const current = new Date(selectedReferral.expires_at || new Date());
                 current.setMonth(current.getMonth() + 12);
                 updateReferralMutation.mutate({ 
                   id: selectedReferral.id, 
                   updates: { expires_at: current.toISOString(), is_paused: false },
                   action: "Renovação por 12 meses"
                 });
              }}>
                <RotateCcw className="w-4 h-4" /> Renovar 12m
              </Button>
              <Button variant="outline" className="flex items-center gap-2" onClick={() => {
                 updateReferralMutation.mutate({ 
                   id: selectedReferral.id, 
                   updates: { expires_at: null },
                   action: "Tornar comissão sem prazo (Infinito)"
                 });
              }}>
                <InfinityIcon className="w-4 h-4" /> Sem prazo
              </Button>
            </div>

            <div className="flex gap-2">
               <Button 
                variant={selectedReferral?.is_paused ? "success" : "warning"} 
                className="flex-1"
                onClick={() => {
                  updateReferralMutation.mutate({ 
                    id: selectedReferral.id, 
                    updates: { is_paused: !selectedReferral.is_paused },
                    action: selectedReferral.is_paused ? "Retomar comissão" : "Pausar comissão"
                  });
                }}
              >
                {selectedReferral?.is_paused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                {selectedReferral?.is_paused ? "Retomar" : "Pausar"}
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={() => {
                  if (confirm("Encerrar comissão imediatamente?")) {
                    updateReferralMutation.mutate({ 
                      id: selectedReferral.id, 
                      updates: { expires_at: new Date().toISOString() },
                      action: "Encerrar comissão imediatamente"
                    });
                  }
                }}
              >
                <XCircle className="w-4 h-4 mr-2" /> Encerrar
              </Button>
            </div>

            <div className="pt-4 border-t border-border">
              <Button className="w-full" onClick={() => {
                const comm = (document.getElementById('edit-comm') as HTMLInputElement).value;
                updateReferralMutation.mutate({
                  id: selectedReferral.id,
                  updates: { commission_pct: comm ? parseFloat(comm) : null },
                  action: "Alteração manual de percentual"
                });
              }}>
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <HistoryModal 
        isOpen={isHistoryModalOpen} 
        onClose={() => setIsHistoryModalOpen(false)} 
        referralId={selectedReferral?.id} 
      />
    </div>
  );
}

function HistoryModal({ isOpen, onClose, referralId }: { isOpen: boolean, onClose: () => void, referralId: string }) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["ambassador-audit-logs", referralId],
    enabled: !!referralId && isOpen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ambassador_audit_logs")
        .select(`*, admin:admin_id(full_name)`)
        .eq("referral_id", referralId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Histórico de Alterações</DialogTitle>
        </DialogHeader>
        <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2">
          {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : (
            logs?.map((log) => (
              <div key={log.id} className="p-3 rounded-lg border border-border space-y-1 relative pl-8">
                <div className="absolute left-3 top-4 w-2 h-2 rounded-full bg-primary" />
                <div className="flex justify-between items-start">
                  <span className="font-bold text-sm">{log.action}</span>
                  <span className="text-[10px] text-muted-foreground">{format(new Date(log.created_at), "dd/MM/yyyy HH:mm")}</span>
                </div>
                <div className="text-xs text-muted-foreground">Por: {log.admin?.full_name || "Sistema"}</div>
              </div>
            ))
          )}
          {!isLoading && logs?.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma alteração registrada.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
