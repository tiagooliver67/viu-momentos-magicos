import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LoadingButton from "@/components/LoadingButton";
import { toast } from "sonner";
import { Send } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  event: { id: string; name: string } | null;
}

export default function ApplyEventModal({ open, onOpenChange, event }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const [fee, setFee] = useState("");

  const apply = useMutation({
    mutationFn: async () => {
      if (!user || !event) throw new Error("Não autenticado");
      const { error } = await supabase.from("event_applications").insert({
        event_id: event.id,
        photographer_id: user.id,
        message: message.trim() || null,
        suggested_fee: fee ? Number(fee) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Candidatura enviada!", { description: "O organizador será notificado." });
      qc.invalidateQueries({ queryKey: ["my-applications"] });
      onOpenChange(false);
      setMessage(""); setFee("");
    },
    onError: (e: any) => {
      const msg = e?.message?.includes("duplicate") || e?.code === "23505"
        ? "Você já se candidatou a este evento."
        : e?.message || "Erro ao enviar candidatura";
      toast.error(msg);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quero fotografar este evento</DialogTitle>
          <DialogDescription className="truncate">{event?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="msg" className="text-xs">Mensagem ao organizador</Label>
            <Textarea
              id="msg"
              placeholder="Conte sobre sua experiência, equipamento, disponibilidade..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
              rows={5}
              className="mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-1">{message.length}/1000</p>
          </div>
          <div>
            <Label htmlFor="fee" className="text-xs">Cachê sugerido (opcional, R$)</Label>
            <Input
              id="fee" type="number" min="0" step="50"
              placeholder="ex.: 800"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              className="mt-1"
            />
          </div>
          <LoadingButton
            onClick={() => apply.mutate()}
            loading={apply.isPending}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" /> Enviar candidatura
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}