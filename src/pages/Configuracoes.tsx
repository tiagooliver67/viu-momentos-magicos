import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardSidebar from "@/components/DashboardSidebar";
import {
  User, Globe, Image, Landmark, Star, CreditCard, Ticket, MessageSquare, Smartphone,
  Save, Eye, EyeOff, Plus, Trash2, QrCode, Share2, Shield, LogOut, Copy, Check,
  Upload, ChevronRight, Lock, Bell, Mail, Phone
} from "lucide-react";
import { toast } from "sonner";

import { Wallet } from "lucide-react";

const settingsTabs = [
  { id: "conta", label: "Minha conta", icon: User },
  { id: "site", label: "Meu site", icon: Globe },
  { id: "portfolio", label: "Meu portfólio", icon: Image },
  { id: "carteira", label: "Carteira", icon: Wallet },
  { id: "exclusividade", label: "Exclusividade", icon: Star },
  { id: "smartcard", label: "SmartCard", icon: CreditCard },
  { id: "cupons", label: "Cupons", icon: Ticket },
  { id: "comunicacao", label: "Comunicação", icon: MessageSquare },
  { id: "dispositivos", label: "Dispositivos", icon: Smartphone },
];

// ─── Mock Data ───
const mockProfile = {
  nome: "Tiago Oliver",
  email: "tiagooliver@gmail.com",
  cpf: "051.153.435-33",
  rg: "05115343533",
  sexo: "Masculino",
  nascimento: "1988-11-21",
  celular: "(74) 99943-9609",
  fuso: "(GMT-03:00) Brasília",
  cep: "44920-000",
  endereco: "Rua Carmosina Carneiro",
  numero: "105",
  complemento: "",
  referencia: "casa",
  bairro: "Centro",
  estado: "Bahia",
  cidade: "João Dourado",
  interesse: "Fotografar eventos esportivos",
  experiencia: "Profissional",
};

const mockCupons = [
  { id: 1, code: "VERAO10", tipo: "percentual", valor: 10, validade: "2026-06-30", usos: 24, limite: 100, ativo: true },
  { id: 2, code: "PRIMEIRACOMPRA", tipo: "fixo", valor: 5, validade: "2026-12-31", usos: 87, limite: 500, ativo: true },
  { id: 3, code: "BLACKFRIDAY", tipo: "percentual", valor: 25, validade: "2025-11-30", usos: 200, limite: 200, ativo: false },
];

const mockDevices = [
  { id: 1, name: "Chrome — Windows 11", ip: "189.44.120.33", location: "São Paulo, BR", lastActive: "Agora (sessão atual)", current: true },
  { id: 2, name: "Safari — iPhone 15", ip: "189.44.120.35", location: "São Paulo, BR", lastActive: "Há 2 horas", current: false },
  { id: 3, name: "Firefox — macOS", ip: "201.12.55.90", location: "Rio de Janeiro, BR", lastActive: "Há 3 dias", current: false },
];

const InputField = ({ label, value, type = "text", disabled = false, onChange }: {
  label: string; value: string; type?: string; disabled?: boolean; onChange?: (v: string) => void;
}) => (
  <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-2 py-3 border-b border-border/50 last:border-0">
    <label className="text-sm text-muted-foreground font-medium">{label}</label>
    <input
      type={type}
      defaultValue={value}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
      className="w-full bg-secondary/50 rounded-lg px-4 py-2.5 text-sm outline-none border border-border focus:border-primary transition-colors disabled:opacity-50"
    />
  </div>
);

const SelectField = ({ label, value, options }: { label: string; value: string; options: string[] }) => (
  <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-2 py-3 border-b border-border/50 last:border-0">
    <label className="text-sm text-muted-foreground font-medium">{label}</label>
    <select defaultValue={value} className="w-full bg-secondary/50 rounded-lg px-4 py-2.5 text-sm outline-none border border-border focus:border-primary transition-colors appearance-none">
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

// ─── Tab: Minha Conta ───
const TabConta = () => {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Minha conta</h2>
        <p className="text-sm text-muted-foreground">Gerencie seus dados pessoais e de acesso</p>
      </div>
      <div className="glass-card p-6 space-y-0">
        <InputField label="Nome completo" value={mockProfile.nome} />
        <InputField label="E-mail" value={mockProfile.email} type="email" />
        <InputField label="CPF" value={mockProfile.cpf} />
        <InputField label="RG" value={mockProfile.rg} />
        <SelectField label="Sexo" value={mockProfile.sexo} options={["Masculino", "Feminino", "Outro", "Prefiro não informar"]} />
        <InputField label="Data de nascimento" value={mockProfile.nascimento} type="date" />
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-2 py-3 border-b border-border/50">
          <label className="text-sm text-muted-foreground font-medium">Celular</label>
          <div className="flex items-center gap-2">
            <span className="bg-secondary/50 rounded-lg px-3 py-2.5 text-sm border border-border">🇧🇷 +55</span>
            <input defaultValue={mockProfile.celular} className="flex-1 bg-secondary/50 rounded-lg px-4 py-2.5 text-sm outline-none border border-border focus:border-primary transition-colors" />
            <button className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors">
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
        <SelectField label="Fuso horário" value={mockProfile.fuso} options={["(GMT-03:00) Brasília", "(GMT-04:00) Manaus", "(GMT-05:00) Acre"]} />
        <InputField label="CEP" value={mockProfile.cep} />
        <InputField label="Endereço" value={mockProfile.endereco} />
        <InputField label="Número" value={mockProfile.numero} />
        <InputField label="Complemento" value={mockProfile.complemento} />
        <InputField label="Referência" value={mockProfile.referencia} />
        <InputField label="Bairro" value={mockProfile.bairro} />
        <SelectField label="Estado" value={mockProfile.estado} options={["Bahia", "São Paulo", "Rio de Janeiro", "Minas Gerais", "Paraná", "Santa Catarina", "Rio Grande do Sul"]} />
        <SelectField label="Cidade" value={mockProfile.cidade} options={["João Dourado", "Salvador", "Feira de Santana"]} />
        <SelectField label="Interesse na plataforma" value={mockProfile.interesse} options={["Fotografar eventos esportivos", "Fotografar eventos sociais", "Ambos"]} />
        <SelectField label="Experiência em fotografia" value={mockProfile.experiencia} options={["Iniciante", "Intermediário", "Profissional"]} />
      </div>

      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Lock className="w-4 h-4 text-primary" /> Segurança</h3>
        <button
          onClick={() => { setShowPassword(!showPassword); toast.info("Funcionalidade de alteração de senha será integrada com autenticação."); }}
          className="px-5 py-2.5 rounded-xl border-2 border-primary text-primary font-bold text-sm hover:bg-primary/10 transition-all"
        >
          ALTERAR SENHA
        </button>
        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground">Termos VIUFOTO</p>
          <a href="#" className="text-sm font-bold text-primary hover:underline">Link termos de uso VIUFOTO</a>
          <p className="text-xs text-muted-foreground mt-1">Data do aceite dos termos: 03/05/2025</p>
        </div>
      </div>

      <button onClick={() => toast.success("Dados salvos com sucesso!")} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] flex items-center gap-2">
        <Save className="w-4 h-4" /> Salvar alterações
      </button>
    </div>
  );
};

// ─── Tab: Meu Site ───
import MeuSiteTab from "@/components/settings/MeuSiteTab";
const TabSite = MeuSiteTab;
import TabCarteira from "@/components/settings/TabCarteira";

// ─── Tab: Portfólio ───
const TabPortfolio = () => {
  const categories = ["Corrida", "Ciclismo", "Triathlon", "Trail Run"];
  const [selectedCat, setSelectedCat] = useState("Corrida");
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Meu portfólio</h2>
        <p className="text-sm text-muted-foreground">Selecione suas melhores fotos para exibir publicamente</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button key={cat} onClick={() => setSelectedCat(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCat === cat ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"}`}>
            {cat}
          </button>
        ))}
        <button className="px-4 py-2 rounded-full text-sm font-medium bg-secondary/50 text-muted-foreground hover:bg-secondary flex items-center gap-1">
          <Plus className="w-3 h-3" /> Nova categoria
        </button>
      </div>
      <div className="glass-card p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="aspect-square rounded-xl bg-secondary/50 border border-border overflow-hidden relative group cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <div className="flex gap-2">
                  <button className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30"><Star className="w-3.5 h-3.5 text-white" /></button>
                  <button className="p-1.5 rounded-lg bg-white/20 hover:bg-red-500/60"><Trash2 className="w-3.5 h-3.5 text-white" /></button>
                </div>
              </div>
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <Image className="w-8 h-8" />
              </div>
            </div>
          ))}
          <div className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary flex items-center justify-center cursor-pointer transition-colors group">
            <div className="text-center">
              <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors mx-auto" />
              <p className="text-xs text-muted-foreground mt-2">Adicionar</p>
            </div>
          </div>
        </div>
      </div>
      <button onClick={() => toast.success("Portfólio salvo!")} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] flex items-center gap-2">
        <Save className="w-4 h-4" /> Salvar portfólio
      </button>
    </div>
  );
};

// TabBanco removed — replaced by TabCarteira

// ─── Tab: Exclusividade ───
const TabExclusividade = () => {
  const [exclusive, setExclusive] = useState(false);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Exclusividade</h2>
        <p className="text-sm text-muted-foreground">Defina se você atua exclusivamente com a VIUFOTO</p>
      </div>
      <div className="glass-card p-6">
        <div className="flex items-start gap-4">
          <button onClick={() => setExclusive(!exclusive)}
            className={`w-14 h-7 rounded-full transition-all relative flex-shrink-0 mt-1 ${exclusive ? "bg-primary" : "bg-secondary"}`}>
            <div className={`w-6 h-6 rounded-full bg-white absolute top-0.5 transition-all shadow-sm ${exclusive ? "left-7" : "left-0.5"}`} />
          </button>
          <div>
            <h3 className="font-bold text-lg">{exclusive ? "Exclusividade ativada" : "Sem exclusividade"}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {exclusive
                ? "Você é um fotógrafo exclusivo VIUFOTO. Benefícios especiais estão ativos."
                : "Ative a exclusividade para desbloquear benefícios especiais."}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {[
            { label: "Comissão reduzida", desc: "Até 10% menor", active: exclusive },
            { label: "Destaque em eventos", desc: "Prioridade na seleção", active: exclusive },
            { label: "Selo exclusivo", desc: "Badge no perfil público", active: exclusive },
          ].map(b => (
            <div key={b.label} className={`p-4 rounded-xl border transition-all ${b.active ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/20 opacity-50"}`}>
              <p className="font-semibold text-sm">{b.label}</p>
              <p className="text-xs text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Tab: SmartCard ───
const TabSmartCard = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold">SmartCard</h2>
      <p className="text-sm text-muted-foreground">Seu cartão digital profissional</p>
    </div>
    <div className="glass-card p-6">
      <div className="max-w-sm mx-auto">
        <div className="aspect-[1.6/1] rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] p-6 text-white flex flex-col justify-between shadow-xl">
          <div>
            <p className="text-xs opacity-70">VIUFOTO PRO</p>
            <h3 className="text-lg font-bold mt-1">Tiago Oliver</h3>
            <p className="text-xs opacity-80">Fotógrafo Esportivo</p>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs opacity-70">Desde 2023</p>
              <p className="text-xs opacity-70">156 eventos · 12.450 fotos</p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
              <QrCode className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6 justify-center">
          <button onClick={() => { navigator.clipboard.writeText("https://viufoto.com.br/tiagooliverfotografias"); toast.success("Link copiado!"); }}
            className="px-5 py-2.5 rounded-xl bg-secondary/50 text-sm font-medium flex items-center gap-2 hover:bg-secondary transition-colors">
            <Copy className="w-4 h-4" /> Copiar link
          </button>
          <button className="px-5 py-2.5 rounded-xl bg-secondary/50 text-sm font-medium flex items-center gap-2 hover:bg-secondary transition-colors">
            <Share2 className="w-4 h-4" /> Compartilhar
          </button>
        </div>
      </div>
    </div>
  </div>
);

// ─── Tab: Cupons ───
const TabCupons = () => {
  const [showForm, setShowForm] = useState(false);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Cupons</h2>
          <p className="text-sm text-muted-foreground">Crie e gerencie cupons de desconto</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center gap-2 hover:bg-primary/90 transition-all">
          <Plus className="w-4 h-4" /> Novo cupom
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-6 space-y-4 animate-in slide-in-from-top-2">
          <h3 className="font-semibold">Criar cupom</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Código" value="" />
            <SelectField label="Tipo" value="Percentual" options={["Percentual", "Valor fixo"]} />
            <InputField label="Valor / %" value="" type="number" />
            <InputField label="Validade" value="" type="date" />
            <InputField label="Limite de uso" value="" type="number" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setShowForm(false); toast.success("Cupom criado!"); }} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm">Criar</button>
            <button onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl bg-secondary text-sm font-medium">Cancelar</button>
          </div>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 text-left">
              <th className="px-5 py-3 font-semibold text-muted-foreground">Código</th>
              <th className="px-5 py-3 font-semibold text-muted-foreground">Tipo</th>
              <th className="px-5 py-3 font-semibold text-muted-foreground">Desconto</th>
              <th className="px-5 py-3 font-semibold text-muted-foreground">Validade</th>
              <th className="px-5 py-3 font-semibold text-muted-foreground">Usos</th>
              <th className="px-5 py-3 font-semibold text-muted-foreground">Status</th>
              <th className="px-5 py-3 font-semibold text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {mockCupons.map(c => (
              <tr key={c.id} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                <td className="px-5 py-3 font-bold font-mono">{c.code}</td>
                <td className="px-5 py-3">{c.tipo === "percentual" ? "%" : "R$"}</td>
                <td className="px-5 py-3">{c.tipo === "percentual" ? `${c.valor}%` : `R$ ${c.valor}`}</td>
                <td className="px-5 py-3">{new Date(c.validade).toLocaleDateString("pt-BR")}</td>
                <td className="px-5 py-3">{c.usos}/{c.limite}</td>
                <td className="px-5 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${c.ativo ? "bg-lime/20 text-lime" : "bg-secondary text-muted-foreground"}`}>
                    {c.ativo ? "Ativo" : "Expirado"}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <button className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Tab: Comunicação ───
const TabComunicacao = () => {
  const [prefs, setPrefs] = useState({
    emailVendas: true, emailPedidos: true, emailEventos: false,
    whatsVendas: true, whatsPedidos: false, whatsEventos: true,
    pushVendas: false, pushPedidos: false, pushEventos: false,
  });
  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button onClick={onChange} className={`w-11 h-6 rounded-full transition-all relative ${checked ? "bg-primary" : "bg-secondary"}`}>
      <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all shadow-sm ${checked ? "left-5" : "left-0.5"}`} />
    </button>
  );
  const channels = [
    { key: "Vendas", icon: <Bell className="w-4 h-4" />, desc: "Notificação quando uma foto ou vídeo for vendido" },
    { key: "Pedidos", icon: <Bell className="w-4 h-4" />, desc: "Alertas sobre novos pedidos recebidos" },
    { key: "Eventos", icon: <Bell className="w-4 h-4" />, desc: "Oportunidades de eventos disponíveis na sua região" },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Comunicação</h2>
        <p className="text-sm text-muted-foreground">Configure como deseja receber notificações</p>
      </div>
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="px-5 py-3 text-left font-semibold text-muted-foreground">Alerta</th>
              <th className="px-5 py-3 text-center font-semibold text-muted-foreground"><Mail className="w-4 h-4 mx-auto" /></th>
              <th className="px-5 py-3 text-center font-semibold text-muted-foreground"><Phone className="w-4 h-4 mx-auto" /></th>
              <th className="px-5 py-3 text-center font-semibold text-muted-foreground"><Bell className="w-4 h-4 mx-auto" /></th>
            </tr>
          </thead>
          <tbody>
            {channels.map(ch => (
              <tr key={ch.key} className="border-b border-border/30">
                <td className="px-5 py-4">
                  <p className="font-medium">{ch.key}</p>
                  <p className="text-xs text-muted-foreground">{ch.desc}</p>
                </td>
                <td className="px-5 py-4 text-center">
                  <div className="flex justify-center">
                    <Toggle checked={(prefs as any)[`email${ch.key}`]} onChange={() => setPrefs(p => ({ ...p, [`email${ch.key}`]: !(p as any)[`email${ch.key}`] }))} />
                  </div>
                </td>
                <td className="px-5 py-4 text-center">
                  <div className="flex justify-center">
                    <Toggle checked={(prefs as any)[`whats${ch.key}`]} onChange={() => setPrefs(p => ({ ...p, [`whats${ch.key}`]: !(p as any)[`whats${ch.key}`] }))} />
                  </div>
                </td>
                <td className="px-5 py-4 text-center">
                  <div className="flex justify-center">
                    <Toggle checked={(prefs as any)[`push${ch.key}`]} onChange={() => setPrefs(p => ({ ...p, [`push${ch.key}`]: !(p as any)[`push${ch.key}`] }))} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={() => toast.success("Preferências salvas!")} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] flex items-center gap-2">
        <Save className="w-4 h-4" /> Salvar preferências
      </button>
    </div>
  );
};

// ─── Tab: Dispositivos ───
const TabDispositivos = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold">Dispositivos</h2>
      <p className="text-sm text-muted-foreground">Gerencie as sessões ativas da sua conta</p>
    </div>
    <div className="space-y-3">
      {mockDevices.map(d => (
        <div key={d.id} className={`glass-card p-5 flex items-center justify-between ${d.current ? "border border-primary/30" : ""}`}>
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${d.current ? "bg-primary/20 text-primary" : "bg-secondary/50 text-muted-foreground"}`}>
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-sm flex items-center gap-2">
                {d.name}
                {d.current && <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-bold">Atual</span>}
              </p>
              <p className="text-xs text-muted-foreground">{d.ip} · {d.location}</p>
              <p className="text-xs text-muted-foreground">{d.lastActive}</p>
            </div>
          </div>
          {!d.current && (
            <button onClick={() => toast.success("Sessão encerrada!")} className="px-4 py-2 rounded-lg text-sm font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Encerrar
            </button>
          )}
        </div>
      ))}
    </div>
    <button onClick={() => toast.success("Todas as outras sessões foram encerradas!")}
      className="px-5 py-2.5 rounded-xl border border-destructive text-destructive font-bold text-sm hover:bg-destructive/10 transition-all flex items-center gap-2">
      <LogOut className="w-4 h-4" /> Encerrar todas as outras sessões
    </button>
  </div>
);

// ─── Main Component ───
const tabComponents: Record<string, React.FC> = {
  conta: TabConta,
  site: TabSite,
  portfolio: TabPortfolio,
  carteira: TabCarteira,
  exclusividade: TabExclusividade,
  smartcard: TabSmartCard,
  cupons: TabCupons,
  comunicacao: TabComunicacao,
  dispositivos: TabDispositivos,
};

const Configuracoes = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get("tab");
    return tab && tabComponents[tab] ? tab : "conta";
  });
  const ActiveComponent = tabComponents[activeTab];

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 p-4 pt-18 lg:pt-4 md:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
            {/* Sidebar tabs - horizontal scroll on mobile */}
            <nav className="lg:w-64 flex-shrink-0 -mx-4 px-4 lg:mx-0 lg:px-0">
              <div className="glass-card p-1.5 sm:p-2 lg:sticky lg:top-8 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible scrollbar-hide">
                {settingsTabs.map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all min-h-[44px] ${
                        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                      }`}
                    >
                      <tab.icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span className="hidden sm:inline lg:inline">{tab.label}</span>
                      <span className="sm:hidden lg:hidden">{tab.label.split(' ')[0]}</span>
                      {isActive && <ChevronRight className="w-4 h-4 ml-auto hidden lg:block" />}
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <ActiveComponent />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Configuracoes;
