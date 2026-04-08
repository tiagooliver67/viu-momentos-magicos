import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Loader2, Flag } from "lucide-react";
import { toast } from "sonner";

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

export default function CadastroOrganizador() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", cpfCnpj: "",
    password: "", confirmPassword: "",
    country: "Brasil", state: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const update = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }));

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password || !form.cpfCnpj || !form.state) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (form.password.length < 6) { toast.error("Senha mínima: 6 caracteres"); return; }
    if (form.password !== form.confirmPassword) { toast.error("As senhas não conferem"); return; }
    if (!agreed) { toast.error("Aceite os termos de uso para continuar"); return; }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          phone: form.phone,
          cpf_cnpj: form.cpfCnpj,
          interest: "organizador",
        },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Conta criada! Verifique seu email para confirmar.");
    navigate("/login/organizador");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="border-b border-border px-4 h-14 flex items-center justify-between">
        <Link to="/" className="text-xl font-black tracking-tight">
          <span className="text-primary">VIU</span><span className="text-foreground">FOTO</span>
        </Link>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Voltar</Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="bg-card border border-border rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Flag className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Cadastro de Organizador</h1>
                <p className="text-muted-foreground text-sm">Cadastre-se para gerenciar eventos</p>
              </div>
            </div>
            <p className="text-muted-foreground text-sm mb-6">
              Já tem conta?{" "}
              <Link to="/login/organizador" className="text-primary font-semibold hover:underline">Fazer login</Link>
            </p>

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Select value={form.country} onValueChange={v => update("country", v)}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="País *" /></SelectTrigger>
                  <SelectContent><SelectItem value="Brasil">Brasil</SelectItem></SelectContent>
                </Select>
                <Select value={form.state} onValueChange={v => update("state", v)}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Estado *" /></SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BR.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Input placeholder="CPF ou CNPJ *" value={form.cpfCnpj} onChange={e => update("cpfCnpj", e.target.value)} className="h-12" />
              <Input placeholder="Nome completo *" value={form.fullName} onChange={e => update("fullName", e.target.value)} className="h-12" />
              <Input type="email" placeholder="E-mail *" value={form.email} onChange={e => update("email", e.target.value)} className="h-12" />
              <Input placeholder="Celular" value={form.phone} onChange={e => update("phone", e.target.value)} className="h-12" />

              <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder="Senha *" value={form.password} onChange={e => update("password", e.target.value)} className="h-12 pr-12" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="relative">
                <Input type={showConfirm ? "text" : "password"} placeholder="Confirmar senha *" value={form.confirmPassword} onChange={e => update("confirmPassword", e.target.value)} className="h-12 pr-12" />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <label className="flex items-start gap-2 text-sm text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-1 accent-primary" />
                <span>Concordo com os <span className="text-primary font-medium">Termos e Condições de uso</span></span>
              </label>

              <Button type="submit" className="w-full h-12 text-base font-bold" disabled={loading || !agreed}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Criar conta de Organizador"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
