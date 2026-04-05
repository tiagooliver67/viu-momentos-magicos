import { useState, useEffect } from "react";
import { X, CreditCard, QrCode, Copy, CheckCircle2, Loader2 } from "lucide-react";
import { useAsaasCheckout } from "@/hooks/useAsaasCheckout";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
}

const CheckoutModal = ({ open, onClose, eventId }: CheckoutModalProps) => {
  const { createCheckout, loading, pixData, paymentStatus, isPaid, reset } = useAsaasCheckout();
  const { items, total, clearCart } = useCart();
  const [form, setForm] = useState({ name: "", email: "", cpfCnpj: "" });
  const [step, setStep] = useState<"form" | "pix" | "success">("form");

  // Check if payment is confirmed
  useEffect(() => {
    if (isPaid && step === "pix") {
      setStep("success");
      clearCart();
    }
  }, [isPaid, step, clearCart]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.cpfCnpj) {
      toast.error("Preencha todos os campos");
      return;
    }
    try {
      await createCheckout({
        name: form.name,
        email: form.email,
        cpfCnpj: form.cpfCnpj,
        eventId,
        items: items.map(i => ({
          photoId: i.photoId,
          videoId: i.videoId,
          price: i.price,
        })),
        total,
      });
      setStep("pix");
    } catch (err: any) {
      toast.error("Erro ao criar pagamento: " + err.message);
    }
  };

  const handleCopyPix = () => {
    if (pixData?.pixCopyPaste) {
      navigator.clipboard.writeText(pixData.pixCopyPaste);
      toast.success("Código PIX copiado!");
    }
  };

  // Check if payment is confirmed
  useEffect(() => {
    if (isPaid && step === "pix") {
      setStep("success");
      clearCart();
    }
  }, [isPaid, step, clearCart]);

  const handleClose = () => {
    reset();
    setStep("form");
    setForm({ name: "", email: "", cpfCnpj: "" });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={handleClose}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-card border border-border rounded-2xl overflow-hidden animate-in zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            {step === "form" && "Finalizar compra"}
            {step === "pix" && "Pagamento PIX"}
            {step === "success" && "Pagamento confirmado!"}
          </h2>
          <button onClick={handleClose} className="p-2 hover:bg-secondary rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {step === "form" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/50">
                <p className="text-sm text-muted-foreground">{items.length} item(ns)</p>
                <p className="text-xl font-bold text-primary">R$ {total.toFixed(2)}</p>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-secondary/50 rounded-lg px-4 py-3 text-sm outline-none border border-border focus:border-primary"
                />
                <input
                  type="email"
                  placeholder="E-mail"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-secondary/50 rounded-lg px-4 py-3 text-sm outline-none border border-border focus:border-primary"
                />
                <input
                  type="text"
                  placeholder="CPF ou CNPJ"
                  value={form.cpfCnpj}
                  onChange={e => setForm(f => ({ ...f, cpfCnpj: e.target.value }))}
                  className="w-full bg-secondary/50 rounded-lg px-4 py-3 text-sm outline-none border border-border focus:border-primary"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all min-h-[48px] disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Processando...</>
                ) : (
                  <><QrCode className="w-5 h-5" /> Gerar PIX</>
                )}
              </button>
            </form>
          )}

          {step === "pix" && pixData && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Escaneie o QR Code ou copie o código PIX
              </p>

              {pixData.pixQrCode && (
                <div className="flex justify-center">
                  <img
                    src={`data:image/png;base64,${pixData.pixQrCode}`}
                    alt="QR Code PIX"
                    className="w-48 h-48 rounded-lg border border-border"
                  />
                </div>
              )}

              <button
                onClick={handleCopyPix}
                className="w-full py-3 rounded-xl border border-primary text-primary font-medium flex items-center justify-center gap-2 hover:bg-primary/10 transition-all"
              >
                <Copy className="w-4 h-4" /> Copiar código PIX
              </button>

              <div className="p-3 rounded-xl bg-secondary/30 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Valor</p>
                <p className="text-lg font-bold text-primary">R$ {pixData.value.toFixed(2)}</p>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Aguardando pagamento...
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="space-y-4 text-center py-4">
              <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
              <h3 className="text-xl font-bold">Pagamento confirmado!</h3>
              <p className="text-sm text-muted-foreground">
                Suas fotos já estão disponíveis para download. Você receberá um e-mail com os links.
              </p>
              <button
                onClick={handleClose}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
