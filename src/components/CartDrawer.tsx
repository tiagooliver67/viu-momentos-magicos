import { ShoppingCart, X, Trash2, CreditCard } from "lucide-react";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import CheckoutModal from "@/components/checkout/CheckoutModal";
import { toast } from "sonner";

const CartDrawer = () => {
  const [open, setOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { items, removeItem, clearCart, total, count } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Derive eventId from first cart item
  const eventId = items.length > 0 ? items[0].eventId || "" : "";

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error("Seu carrinho está vazio");
      return;
    }
    if (!eventId) {
      toast.error("Erro: evento não identificado");
      return;
    }
    if (!user) {
      toast.info("Para continuar com a compra, faça login ou crie sua conta");
      setOpen(false);
      navigate("/login", { state: { from: location.pathname, fromCheckout: true } });
      return;
    }
    setOpen(false);
    setCheckoutOpen(true);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative p-2 rounded-lg hover:bg-secondary/50 transition-colors"
      >
        <ShoppingCart className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-card border-l border-border h-full overflow-y-auto animate-in slide-in-from-right"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" /> Carrinho ({count})
              </h2>
              <button onClick={() => setOpen(false)} className="p-2 hover:bg-secondary rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Seu carrinho está vazio</p>
              </div>
            ) : (
              <>
                <div className="p-4 space-y-3">
                  {items.map(item => (
                    <div key={item.id} className="flex gap-3 p-3 rounded-xl bg-secondary/30 border border-border/50">
                      <img
                        src={item.photoUrl}
                        alt=""
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.eventName}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.resolution === "high" ? "Alta resolução" : "Baixa resolução"}
                        </p>
                        <p className="text-sm font-bold text-primary mt-1">
                          R$ {item.price.toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 hover:bg-destructive/20 rounded-lg text-muted-foreground hover:text-destructive transition-colors self-start"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="p-6 border-t border-border space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total</span>
                    <span className="text-xl font-bold text-primary">R$ {total.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={handleCheckout}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all min-h-[48px]"
                  >
                    <CreditCard className="w-5 h-5" /> Finalizar compra
                  </button>
                  <button
                    onClick={clearCart}
                    className="w-full py-2.5 rounded-xl border border-border text-muted-foreground text-sm hover:border-destructive hover:text-destructive transition-all"
                  >
                    Limpar carrinho
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        eventId={eventId}
      />
    </>
  );
};

export default CartDrawer;
