import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, PlusCircle, Check, X, Shield, Award } from "lucide-react";
import { toast } from "sonner";

const MeuColetivo = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: meuColetivo, isLoading } = useQuery({
    queryKey: ["meu-coletivo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coletivos")
        .select("*, members:coletivo_members(*, profile:profiles(full_name, email))")
        .eq("owner_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const criarColetivo = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from("coletivos").insert({ name, owner_id: user!.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meu-coletivo"] });
      toast.success("Coletivo criado!");
    }
  });

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 p-8 pt-20">
        <h1 className="text-2xl font-bold mb-6">Meu Coletivo</h1>
        
        {!meuColetivo ? (
          <div className="p-8 border rounded-2xl bg-card text-center">
            <h2 className="font-bold mb-2">Você ainda não tem um coletivo</h2>
            <Button onClick={() => criarColetivo.mutate("Meu Novo Coletivo")}>Criar Coletivo</Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-6 border rounded-2xl bg-card">
              <h2 className="text-xl font-bold">{meuColetivo.name}</h2>
              <p className="text-sm text-muted-foreground">{meuColetivo.description || "Sem descrição"}</p>
            </div>

            <div className="p-6 border rounded-2xl bg-card">
              <h3 className="font-bold mb-4">Membros</h3>
              <ul className="space-y-2">
                {meuColetivo.members?.map((m: any) => (
                  <li key={m.id} className="flex justify-between p-3 border rounded-lg">
                    <span>{m.profile?.full_name || m.profile?.email}</span>
                    <span className="text-sm text-muted-foreground capitalize">{m.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MeuColetivo;
