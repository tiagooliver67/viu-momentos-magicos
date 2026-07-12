import { useState, useRef } from "react";
import {
  Globe, User, Share2, Image, Palette, Link2,
  Save, Plus, Trash2, Check
} from "lucide-react";
import { toast } from "sonner";
import { usePhotographerSite } from "@/hooks/usePhotographerSite";
import TabPortfolio from "@/components/settings/TabPortfolio";

const siteSubTabs = [
  { id: "geral", label: "Meu site", icon: Globe },
  { id: "sobre", label: "Sobre", icon: User },
  { id: "portfolio", label: "Meu portfólio", icon: Image },
  { id: "redes", label: "Redes sociais", icon: Share2 },
  { id: "imagem", label: "Imagem de perfil", icon: Image },
  { id: "cores", label: "Cores", icon: Palette },
];

const tabCompletionKey: Record<string, string> = {
  geral: "slug",
  sobre: "bio",
  redes: "instagram",
  imagem: "avatar_url",
  cores: "primary_color",
};

const presetColors = [
  "#000000", "#FFFFFF", "#673DE6", "#FFD700", "#00C853", "#2196F3", "#9C27B0", "#E91E63",
];

const MeuSiteTab = () => {
  const [activeSubTab, setActiveSubTab] = useState("geral");
  const { site, isLoading, upsertSite, uploadAsset } = usePhotographerSite();
  const [form, setForm] = useState<Record<string, any>>({});
  const avatarRef = useRef<HTMLInputElement>(null);

  const val = (key: string) => form[key] ?? (site as any)?.[key] ?? "";
  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = () => {
    upsertSite.mutate(form);
    setForm({});
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadAsset(file, `avatar.${file.name.split(".").pop()}`);
      set("avatar_url", url);
      upsertSite.mutate({ avatar_url: url });
    } catch (err: any) {
      toast.error("Erro ao enviar imagem: " + err.message);
    }
  };

  if (isLoading) return <div className="p-6 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Meu site</h2>
        <p className="text-sm text-muted-foreground">Edite e atualize as informações do seu site</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sub-navigation */}
        <nav className="lg:w-56 flex-shrink-0">
          <div className="glass-card p-1.5 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
            {siteSubTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all min-h-[40px] ${
                  activeSubTab === tab.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/50"
                }`}
              >
                <tab.icon className="w-4 h-4 flex-shrink-0" />
                {tab.label}
                {tabCompletionKey[tab.id] && (site as any)?.[tabCompletionKey[tab.id]] && (
                  <Check className="w-4 h-4 text-lime ml-auto hidden lg:block" />
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Geral */}
          {activeSubTab === "geral" && (
            <div className="glass-card p-6 space-y-5">
              <h3 className="text-lg font-bold">Meu site</h3>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Link*</label>
                <div className="flex items-center gap-0 border border-border rounded-lg overflow-hidden">
                  <span className="bg-secondary/80 px-3 py-2.5 text-sm text-muted-foreground">https://</span>
                  <input
                    value={val("slug")}
                    onChange={e => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    className="flex-1 bg-secondary/50 px-3 py-2.5 text-sm outline-none"
                    placeholder="seu-nome"
                  />
                  <span className="bg-secondary/80 px-3 py-2.5 text-sm text-muted-foreground">.viufoto.com</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nome de exibição*</label>
                  <input
                    value={val("display_name")}
                    onChange={e => set("display_name", e.target.value)}
                    className="w-full bg-secondary/50 rounded-lg px-4 py-2.5 text-sm outline-none border border-border focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">E-mail de atendimento*</label>
                  <input
                    value={val("contact_email")}
                    onChange={e => set("contact_email", e.target.value)}
                    className="w-full bg-secondary/50 rounded-lg px-4 py-2.5 text-sm outline-none border border-border focus:border-primary transition-colors"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                O telefone de contato é gerenciado pelo WhatsApp em <strong>Redes sociais</strong>.
              </p>
              <div>
                <h4 className="font-semibold mt-4 mb-2">SEO</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Título da página (aba do navegador)</label>
                    <input value={val("seo_title")} onChange={e => set("seo_title", e.target.value)}
                      className="w-full bg-secondary/50 rounded-lg px-4 py-2.5 text-sm outline-none border border-border focus:border-primary transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Palavras-chave (separadas por vírgula)</label>
                    <input value={val("seo_keywords")} onChange={e => set("seo_keywords", e.target.value)}
                      className="w-full bg-secondary/50 rounded-lg px-4 py-2.5 text-sm outline-none border border-border focus:border-primary transition-colors" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sobre */}
          {activeSubTab === "sobre" && (
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-lg font-bold">Sobre</h3>
              <textarea
                value={val("bio")}
                onChange={e => set("bio", e.target.value)}
                rows={8}
                className="w-full bg-secondary/50 rounded-lg px-4 py-3 text-sm outline-none border border-border focus:border-primary transition-colors resize-none"
                placeholder="Conte sobre você e seu trabalho..."
              />
            </div>
          )}

          {/* Portfólio */}
          {activeSubTab === "portfolio" && (
            <div className="glass-card p-6">
              <TabPortfolio />
            </div>
          )}

          {/* Redes sociais */}
          {activeSubTab === "redes" && (
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-lg font-bold">Redes sociais</h3>
              {[
                { key: "whatsapp", label: "WhatsApp", placeholder: "5574999439609" },
                { key: "instagram", label: "Instagram", placeholder: "https://www.instagram.com/..." },
                { key: "facebook", label: "Facebook", placeholder: "https://www.facebook.com/..." },
                { key: "tiktok", label: "TikTok", placeholder: "https://www.tiktok.com/..." },
                { key: "youtube", label: "Youtube", placeholder: "https://www.youtube.com/..." },
                { key: "linkedin", label: "LinkedIn", placeholder: "https://www.linkedin.com/in/..." },
                { key: "twitter", label: "X (Twitter)", placeholder: "https://www.x.com/..." },
              ].map(field => (
                <div key={field.key} className="grid grid-cols-1 md:grid-cols-[140px_1fr] items-center gap-2 py-2">
                  <label className="text-sm text-muted-foreground font-medium">{field.label}</label>
                  <input
                    value={val(field.key)}
                    onChange={e => set(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full bg-secondary/50 rounded-lg px-4 py-2.5 text-sm outline-none border border-border focus:border-primary transition-colors"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Imagem de perfil */}
          {activeSubTab === "imagem" && (
            <div className="glass-card p-6 space-y-6">
              <h3 className="text-lg font-bold">Foto de perfil</h3>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold">Foto de perfil</h4>
                    <p className="text-xs text-muted-foreground">Aparece no topo da sua página pública e em cards de evento.</p>
                  </div>
                  <button
                    onClick={() => avatarRef.current?.click()}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90"
                  >
                    Enviar foto
                  </button>
                  <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </div>
                {val("avatar_url") && (
                  <img src={val("avatar_url")} alt="" className="w-24 h-24 rounded-xl object-cover border border-border" />
                )}
              </div>
            </div>
          )}

          {/* Cores */}
          {activeSubTab === "cores" && (
            <div className="glass-card p-6 space-y-6">
              <h3 className="text-lg font-bold">Cores</h3>
              <p className="text-sm text-muted-foreground">Aqui você pode alterar as cores do seu site.</p>
              <div>
                <h4 className="font-semibold mb-3">Padrões ViuFoto</h4>
                <div className="flex gap-2 flex-wrap">
                  {presetColors.map(c => (
                    <button
                      key={c}
                      onClick={() => set("primary_color", c)}
                      className="w-10 h-10 rounded-full border-2 transition-all"
                      style={{ backgroundColor: c, borderColor: val("primary_color") === c ? "#673DE6" : "transparent" }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">Cor primária</label>
                <p className="text-xs text-muted-foreground mb-3">Aplicada no cabeçalho da sua página pública.</p>
                <div className="flex items-center gap-3 max-w-sm">
                  <div className="w-16 h-10 rounded-lg border border-border" style={{ backgroundColor: val("primary_color") || "#673DE6" }} />
                  <input
                    type="color"
                    value={val("primary_color") || "#673DE6"}
                    onChange={e => set("primary_color", e.target.value)}
                    className="w-full h-8"
                  />
                </div>
                <input
                  value={val("primary_color") || "#673DE6"}
                  onChange={e => set("primary_color", e.target.value)}
                  className="mt-2 bg-secondary/50 rounded-lg px-4 py-2 text-sm outline-none border border-border w-32"
                />
              </div>
            </div>
          )}

          {/* Save button */}
          {Object.keys(form).length > 0 && (
            <button
              onClick={handleSave}
              disabled={upsertSite.isPending}
              className="mt-6 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> {upsertSite.isPending ? "Salvando..." : "Salvar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeuSiteTab;
