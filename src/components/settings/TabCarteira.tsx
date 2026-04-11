import { useState, useEffect } from "react";
import {
  Wallet, CheckCircle2, AlertTriangle, Loader2, Save, Shield, ArrowRight,
  Eye, EyeOff, Info, Clock, Ban, CheckCircle, CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCountUp } from "@/components/financeiro/useCountUp";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const InputField = ({ label, value, onChange, placeholder, required = false, disabled = false, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; disabled?: boolean; type?: string;
}) => (
  <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-2 py-3 border-b border-border/50 last:border-0">
    <label className="text-sm text-muted-foreground font-medium">
      {label} {required && <span className="text-destructive">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full bg-secondary/50 rounded-lg px-4 py-2.5 text-sm outline-none border border-border focus:border-primary transition-colors disabled:opacity-50"
    />
  </div>
);

type Transfer = {
  id: string;
  amount: number;
  status: string;
  date: string;
  type: string;
};

const TabCarteira = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);

  // Onboarding form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");

  // Wallet data
  const [balance, setBalance] = useState(0);
  const [pending, setPending] = useState(0);
  const [transfers, setTransfers] = useState<Transfer[]>([]);

  // Withdrawal form
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState("CPF");

  const animBalance = useCountUp(balance, 1000, visible);
  const animPending = useCountUp(pending, 1000, visible);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Check wallet + get balance + get transfers in parallel
      const [walletRes, balanceRes, transfersRes] = await Promise.all([
        supabase.functions.invoke("asaas-wallet", { body: { action: "check_wallet" } }),
        supabase.functions.invoke("asaas-wallet", { body: { action: "get_balance" } }),
        supabase.functions.invoke("asaas-wallet", { body: { action: "get_transfers" } }),
      ]);

      const wallet = walletRes.data;
      if (wallet) {
        setConfigured(wallet.configured);
        setWalletId(wallet.walletId);
        if (wallet.name) setName(wallet.name);
        if (wallet.cpfCnpj) setCpfCnpj(wallet.cpfCnpj);
        if (wallet.phone) setPhone(wallet.phone);
        setEmail(user?.email || "");
      }

      const bal = balanceRes.data;
      if (bal) {
        setBalance(bal.balance ?? 0);
        setPending(bal.pending ?? 0);
      }

      const trans = transfersRes.data;
      if (trans?.transfers) {
        setTransfers(trans.transfers);
      }
    } catch (err) {
      console.error("Error loading wallet data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !cpfCnpj.trim() || !email.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    const cleanCpf = cpfCnpj.replace(/\D/g, "");
    if (cleanCpf.length !== 11 && cleanCpf.length !== 14) {
      toast.error("CPF ou CNPJ inválido");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("asaas-wallet", {
        body: { action: "create_wallet", name: name.trim(), email: email.trim(), cpfCnpj: cpfCnpj.trim(), phone: phone.trim() || undefined, birthDate: birthDate || undefined },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setConfigured(true);
      setWalletId(data.walletId);
      toast.success("Carteira configurada com sucesso! 🎉");
    } catch (err: any) {
      toast.error(err.message || "Erro ao configurar carteira");
    } finally {
      setSaving(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      toast.error("Informe um valor válido para saque");
      return;
    }
    if (amount > balance) {
      toast.error(`Saldo insuficiente. Disponível: R$ ${fmt(balance)}`);
      return;
    }
    if (!pixKey.trim()) {
      toast.error("Informe sua chave PIX");
      return;
    }

    setWithdrawing(true);
    try {
      const { data, error } = await supabase.functions.invoke("asaas-wallet", {
        body: { action: "request_withdrawal", amount, pixKey: pixKey.trim(), pixKeyType },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(data.message || "Saque solicitado com sucesso!");
      setShowWithdraw(false);
      setWithdrawAmount("");
      // Refresh data
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao solicitar saque");
    } finally {
      setWithdrawing(false);
    }
  };

  const statusLabel = (s: string) => {
    const map: Record<string, { label: string; icon: any; color: string }> = {
      PENDING: { label: "Pendente", icon: Clock, color: "text-amber-500" },
      BANK_PROCESSING: { label: "Processando", icon: Clock, color: "text-blue-500" },
      DONE: { label: "Concluído", icon: CheckCircle, color: "text-emerald-500" },
      CANCELLED: { label: "Cancelado", icon: Ban, color: "text-red-500" },
      FAILED: { label: "Falhou", icon: Ban, color: "text-red-500" },
    };
    return map[s] || { label: s, icon: Clock, color: "text-muted-foreground" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // ─── NOT CONFIGURED: ONBOARDING ───
  if (!configured) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" /> Carteira
          </h2>
          <p className="text-sm text-muted-foreground">Configure sua carteira para começar a receber pagamentos</p>
        </div>

        <div className="glass-card p-5 flex items-center gap-4 border-l-4 border-l-amber-500">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Carteira não configurada</p>
            <p className="text-sm text-muted-foreground">
              Preencha seus dados abaixo para ativar sua carteira e começar a vender.
            </p>
          </div>
        </div>

        <div className="glass-card p-6 space-y-0">
          <InputField label="Nome completo / Razão social" value={name} onChange={setName} placeholder="Seu nome ou razão social" required />
          <InputField label="E-mail" value={email} onChange={setEmail} placeholder="seu@email.com" required />
          <InputField label="CPF ou CNPJ" value={cpfCnpj} onChange={setCpfCnpj} placeholder="000.000.000-00" required />
          <InputField label="Data de nascimento" value={birthDate} onChange={setBirthDate} placeholder="1990-01-31" required type="date" />
          <InputField label="Telefone" value={phone} onChange={setPhone} placeholder="(00) 00000-0000" />
        </div>

        <div className="glass-card p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Seus pagamentos são processados com segurança por uma instituição financeira parceira.
            Você pode acompanhar e sacar seus valores diretamente pela ViuFoto.
          </p>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
          {saving ? "Configurando..." : "Ativar carteira"}
        </button>
      </div>
    );
  }

  // ─── CONFIGURED: WALLET VIEW ───
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" /> Carteira
          </h2>
          <p className="text-sm text-muted-foreground">Gerencie seus ganhos e saques</p>
        </div>
        <button onClick={() => setVisible(!visible)}
          className="text-muted-foreground hover:text-foreground transition-colors p-2">
          {visible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
        </button>
      </div>

      {/* Status */}
      <div className="glass-card p-4 flex items-center gap-3 border-l-4 border-l-emerald-500">
        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
        <p className="text-sm text-muted-foreground">
          Carteira ativa — suas vendas são processadas automaticamente.
        </p>
      </div>

      {/* Balance Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          {visible ? (
            <>
              <p className="text-sm opacity-70 mb-1">Disponível para saque</p>
              <p className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-5">
                R$ {fmt(animBalance)}
              </p>

              <TooltipProvider>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/10 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-xs opacity-70">A receber</span>
                      <Tooltip>
                        <TooltipTrigger asChild><Info className="w-3 h-3 opacity-50 cursor-help" /></TooltipTrigger>
                        <TooltipContent className="max-w-[200px]">
                          <p className="text-xs">Valor de vendas confirmadas ainda no prazo de liberação.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="font-bold text-sm">R$ {fmt(animPending)}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-xs opacity-70">Saldo total</span>
                      <Tooltip>
                        <TooltipTrigger asChild><Info className="w-3 h-3 opacity-50 cursor-help" /></TooltipTrigger>
                        <TooltipContent className="max-w-[200px]">
                          <p className="text-xs">Disponível + a receber.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="font-bold text-sm">R$ {fmt(animBalance + animPending)}</p>
                  </div>
                </div>
              </TooltipProvider>

              <button onClick={() => setShowWithdraw(true)}
                className="w-full flex items-center justify-center gap-2 bg-white text-primary rounded-xl px-5 py-3.5 font-bold text-sm hover:bg-white/90 transition-all hover:shadow-lg min-h-[48px]">
                <span>Sacar dinheiro</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </>
          ) : (
            <p className="text-sm opacity-60 italic">Valores ocultos</p>
          )}
        </div>
      </div>

      {/* Withdrawal Form */}
      {showWithdraw && (
        <div className="glass-card p-6 space-y-4 animate-in slide-in-from-top-2">
          <h3 className="font-semibold flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" /> Solicitar saque via PIX
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-2 py-3 border-b border-border/50">
            <label className="text-sm text-muted-foreground font-medium">Tipo de chave</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { id: "CPF", label: "CPF" },
                { id: "EMAIL", label: "E-mail" },
                { id: "PHONE", label: "Celular" },
                { id: "EVP", label: "Aleatória" },
              ].map((t) => (
                <button key={t.id} onClick={() => setPixKeyType(t.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    pixKeyType === t.id ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <InputField label="Chave PIX" value={pixKey} onChange={setPixKey}
            placeholder={pixKeyType === "CPF" ? "000.000.000-00" : pixKeyType === "EMAIL" ? "seu@email.com" : pixKeyType === "PHONE" ? "(00) 00000-0000" : "Chave aleatória"}
            required />

          <InputField label="Valor do saque" value={withdrawAmount} onChange={setWithdrawAmount}
            placeholder={`Máximo: R$ ${fmt(balance)}`} required />

          <div className="flex gap-3">
            <button onClick={handleWithdraw} disabled={withdrawing}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50">
              {withdrawing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {withdrawing ? "Processando..." : "Confirmar saque"}
            </button>
            <button onClick={() => setShowWithdraw(false)}
              className="px-6 py-3 rounded-xl border border-border text-muted-foreground font-medium hover:bg-secondary transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Transfer History */}
      {transfers.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Histórico de saques</h3>
          <div className="space-y-3">
            {transfers.map((t) => {
              const st = statusLabel(t.status);
              const Icon = st.icon;
              return (
                <div key={t.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${st.color}`} />
                    <div>
                      <p className="text-sm font-medium">{t.type === "PIX" ? "Saque PIX" : "Transferência"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">R$ {fmt(t.amount)}</p>
                    <p className={`text-xs ${st.color}`}>{st.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Security Note */}
      <div className="glass-card p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Seus pagamentos são processados com segurança por uma instituição financeira parceira.
          Você pode acompanhar e sacar seus valores diretamente pela ViuFoto.
        </p>
      </div>
    </div>
  );
};

export default TabCarteira;
