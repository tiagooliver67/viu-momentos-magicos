import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, PlusCircle, Check, X, Shield, Award, Mail, Send, Trash2, UserPlus, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Typography } from "@/components/Typography";

const MeuColetivo = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [newColetivoName, setNewColetivoName] = useState("");
  const [isCreatingMode, setIsCreatingMode] = useState(false);

  // 1. Dados do Coletivo (Se sou dono)
  const { data: meuColetivo, isLoading: loadingColetivo } = useQuery({
    queryKey: ["meu-coletivo-dono", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coletivos")
        .select(`
          *,
          members:coletivo_members(
            *,
            profile:profiles(full_name, email)
          )
        `)
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // 2. Coletivos onde sou membro
  const { data: participandoColetivos = [], isLoading: loadingParticipando } = useQuery({
    queryKey: ["coletivos-participando", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coletivo_members")
        .select(`
          *,
          coletivo:coletivos(
            *,
            owner:profiles(full_name, email)
          )
        `)
        .eq("user_id", user!.id)
        .neq("status", "removido");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Mutações
  const criarColetivo = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("coletivos")
        .insert({ name, owner_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meu-coletivo-dono"] });
      toast.success("Coletivo criado com sucesso! 🎉");
      setIsCreatingMode(false);
    },
    onError: (err: any) => toast.error("Erro ao criar coletivo: " + err.message)
  });

  const convidarMembro = useMutation({
    mutationFn: async (email: string) => {
      // Buscar perfil pelo email
      const { data: profiles, error: pError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();
      
      if (!profiles) throw new Error("Usuário não encontrado no ViuFoto");

      const { error } = await supabase
        .from("coletivo_members")
        .insert({
          coletivo_id: meuColetivo!.id,
          user_id: profiles.id,
          invited_by: user!.id,
          status: "convidado"
        });
      
      if (error) {
        if (error.code === '23505') throw new Error("Este fotógrafo já foi convidado ou já é membro.");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meu-coletivo-dono"] });
      toast.success("Convite enviado!");
      setInviteEmail("");
    },
    onError: (err: any) => toast.error(err.message)
  });

  const responderConvite = useMutation({
    mutationFn: async ({ memberId, accept }: { memberId: string, accept: boolean }) => {
      const { error } = await supabase
        .from("coletivo_members")
        .update({ 
          status: accept ? "ativo" : "removido",
          joined_at: accept ? new Date().toISOString() : null
        })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coletivos-participando"] });
      toast.success("Ação realizada!");
    }
  });

  const sairDoColetivo = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("coletivo_members")
        .update({ status: "removido" })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coletivos-participando"] });
      toast.success("Você saiu do coletivo.");
    }
  });

  const atualizarComissao = useMutation({
    mutationFn: async ({ memberId, pct }: { memberId: string, pct: number }) => {
      const { error } = await supabase
        .from("coletivo_members")
        .update({ commission_pct: pct })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meu-coletivo-dono"] });
      toast.success("Comissão atualizada.");
    }
  });

  if (loadingColetivo || loadingParticipando) {
    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar />
        <main className="flex-1 p-8 pt-20 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Carregando seus coletivos...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 p-4 pt-20 lg:pt-6 lg:p-8 overflow-auto space-y-8">
        <div>
          <Typography.PageTitle>Meu Coletivo</Typography.PageTitle>
          <Typography.PageSubtitle>Gerencie seus grupos de fotógrafos parceiros e oportunidades exclusivas.</Typography.PageSubtitle>
        </div>

        {/* 1. SE SOU DONO DE UM COLETIVO */}
        {meuColetivo ? (
          <section className="space-y-6">
            <div className="glass-card p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-l-4 border-l-primary">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" /> {meuColetivo.name}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Você é o administrador deste coletivo. Criado em {new Date(meuColetivo.created_at).toLocaleDateString()}.
                </p>
              </div>
              <div className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-bold uppercase tracking-wider">Administrador</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Membros */}
              <div className="lg:col-span-2 glass-card overflow-hidden">
                <header className="p-5 border-b border-border flex justify-between items-center">
                  <h3 className="font-bold flex items-center gap-2 text-sm"><Users className="w-4 h-4 text-primary" /> Membros ({meuColetivo.members?.length || 0})</h3>
                </header>
                <div className="divide-y divide-border">
                  {meuColetivo.members?.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">Nenhum membro convidado ainda.</div>
                  ) : (
                    meuColetivo.members?.map((m: any) => (
                      <div key={m.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{m.profile?.full_name || "Fotógrafo s/ nome"}</p>
                          <p className="text-xs text-muted-foreground truncate">{m.profile?.email}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <label className="block text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Comissão (%)</label>
                            <input 
                              type="number" 
                              defaultValue={m.commission_pct} 
                              onBlur={(e) => atualizarComissao.mutate({ memberId: m.id, pct: parseFloat(e.target.value) || 0 })}
                              className="w-16 h-8 text-center text-xs bg-secondary border border-border rounded outline-none focus:border-primary"
                            />
                          </div>
                          <div className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${
                            m.status === 'ativo' ? 'bg-emerald-500/10 text-emerald-600' : 
                            m.status === 'convidado' ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-600'
                          }`}>
                            {m.status}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Convidar */}
              <div className="glass-card p-5 space-y-4 h-fit">
                <h3 className="font-bold text-sm flex items-center gap-2"><UserPlus className="w-4 h-4 text-primary" /> Convidar Fotógrafo</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Digite o e-mail do fotógrafo que você deseja convidar para o seu coletivo. Ele precisa ter conta no ViuFoto.
                </p>
                <div className="space-y-3">
                  <Input 
                    placeholder="email@exemplo.com" 
                    value={inviteEmail} 
                    onChange={e => setInviteEmail(e.target.value)}
                    className="h-10 text-sm"
                  />
                  <Button 
                    className="w-full h-10" 
                    onClick={() => convidarMembro.mutate(inviteEmail)}
                    disabled={convidarMembro.isPending || !inviteEmail}
                  >
                    <Send className="w-4 h-4 mr-2" /> Enviar Convite
                  </Button>
                </div>
              </div>
            </div>
          </section>
        ) : (
          /* ESTADO: NÃO É DONO */
          <section className="glass-card p-8 text-center space-y-6 max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <PlusCircle className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Crie seu próprio Coletivo</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                Organize grupos fixos de fotógrafos e consiga prioridade em grandes eventos.
              </p>
            </div>
            
            {isCreatingMode ? (
              <div className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto animate-in fade-in slide-in-from-top-2">
                <Input 
                  placeholder="Nome do Coletivo" 
                  value={newColetivoName}
                  onChange={e => setNewColetivoName(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <Button onClick={() => criarColetivo.mutate(newColetivoName)} disabled={!newColetivoName}>Criar</Button>
                <Button variant="ghost" onClick={() => setIsCreatingMode(false)}>Cancelar</Button>
              </div>
            ) : (
              <Button onClick={() => setIsCreatingMode(true)}>Criar Coletivo</Button>
            )}
          </section>
        )}

        {/* 2. CONVITES PENDENTES (MEMBRO) */}
        {participandoColetivos.some(m => m.status === 'convidado') && (
          <section className="space-y-4">
            <h2 className="font-bold flex items-center gap-2"><Mail className="w-5 h-5 text-primary" /> Convites Recebidos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {participandoColetivos.filter(m => m.status === 'convidado').map(m => (
                <div key={m.id} className="glass-card p-5 border-l-4 border-l-amber-500 animate-glow-pulse flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm">Convite de: {m.coletivo?.name}</h3>
                    <p className="text-xs text-muted-foreground">Enviado por {m.coletivo?.owner?.full_name}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => responderConvite.mutate({ memberId: m.id, accept: true })} className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 px-3 text-[11px]">Aceitar</Button>
                    <Button size="sm" variant="outline" onClick={() => responderConvite.mutate({ memberId: m.id, accept: false })} className="h-8 px-3 text-[11px]">Recusar</Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 3. MEUS COLETIVOS ATIVOS */}
        {participandoColetivos.some(m => m.status === 'ativo') && (
          <section className="space-y-4">
            <h2 className="font-bold flex items-center gap-2"><Award className="w-5 h-5 text-primary" /> Meus Coletivos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {participandoColetivos.filter(m => m.status === 'ativo').map(m => (
                <div key={m.id} className="glass-card p-5 hover:border-primary/40 transition-all group">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-sm">{m.coletivo?.name}</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => sairDoColetivo.mutate(m.id)}
                      className="text-muted-foreground hover:text-red-500 h-8 w-8 p-0"
                      title="Sair do coletivo"
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Dono:</span>
                      <span className="font-medium">{m.coletivo?.owner?.full_name}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Sua Taxa:</span>
                      <span className="font-bold text-primary">{m.commission_pct}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default MeuColetivo;
