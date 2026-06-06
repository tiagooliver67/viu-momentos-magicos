import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ArrowLeft, ChevronRight, Mail, MessageCircle, Download, CreditCard, Shield, Camera, Paperclip, Loader2, LogIn } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type FormKind = "remove_photo" | "delete_account";
type Article = { q: string; a: string; form?: FormKind };
type Category = { id: string; name: string; icon: React.ComponentType<{ className?: string }>; description: string; articles: Article[] };

const categories: Category[] = [
  {
    id: "encontrar",
    name: "Encontrar Fotos",
    icon: Search,
    description: "Busca, reconhecimento facial e acesso ao álbum",
    articles: [
      { q: "Não achei minhas fotos", a: "Certifique-se de que buscou no evento correto. Algumas fotos podem demorar alguns minutos para carregar dependendo da conexão do fotógrafo no local. Tente buscar também pelas subpastas do evento (ex: horários ou categorias)." },
      { q: "Onde está o álbum?", a: "Os links dos álbuns são compartilhados diretamente pelos organizadores do evento ou pelo próprio fotógrafo. Se você perdeu o link, entre em contato com a organização do seu evento." },
      { q: "Reconhecimento Facial", a: "Para usar o reconhecimento facial, tire uma selfie nítida e bem iluminada, sem óculos de sol ou boné. Nosso sistema escaneará o álbum e mostrará apenas as fotos onde você aparece!" },
      { q: "Link do álbum não abre", a: "Verifique sua conexão com a internet. Caso persista, tente abrir o link em uma aba anônima do seu navegador ou limpe o cache." },
    ],
  },
  {
    id: "comprar",
    name: "Comprar Fotos",
    icon: CreditCard,
    description: "Pagamento, pacotes e liberação",
    articles: [
      { q: "Como comprar minhas fotos?", a: "Escolha suas fotos, adicione-as ao carrinho de compras, clique em \"Avançar\", preencha seus dados de identificação e escolha a forma de pagamento (Pix ou Cartão)." },
      { q: "Formas de pagamento aceitas", a: "Atualmente aceitamos pagamentos via Pix (com aprovação instantânea) e Cartão de Crédito." },
      { q: "Comprei, mas a foto não liberou", a: "Pagamentos via Pix costumam liberar na hora. Se você pagou via cartão, a operadora pode levar até 30 minutos para analisar a transação. Caso passe desse prazo, envie o comprovante para o nosso suporte." },
      { q: "Quero comprar várias fotos (Pacotes)", a: "Ao adicionar várias fotos do mesmo evento no carrinho, verifique se o fotógrafo disponibilizou descontos progressivos ou pacotes fechados para o lote." },
    ],
  },
  {
    id: "baixar",
    name: "Baixar Fotos",
    icon: Download,
    description: "Download, arquivos ZIP e problemas comuns",
    articles: [
      { q: "Como fazer o download da minha foto comprada?", a: "Assim que o pagamento for aprovado, você receberá um e-mail com o link de download. Você também pode baixar direto pela página de confirmação do pedido no site." },
      { q: "Baixei em ZIP e não consigo abrir", a: "Arquivos .zip são pacotes compactados para baixar várias fotos de uma vez. No celular, use um aplicativo de gerenciamento de arquivos (como o Files do Google ou Arquivos do iPhone) para \"Extrair\" as fotos. No computador, basta clicar com o botão direito e escolher \"Extrair Aqui\"." },
      { q: "O download não começa ou dá erro", a: "Verifique se o seu dispositivo tem espaço de armazenamento suficiente. Tente fazer o download conectado a uma rede Wi-Fi estável." },
    ],
  },
  {
    id: "privacidade",
    name: "Privacidade e Remoção",
    icon: Shield,
    description: "Remoção de fotos, denúncias e LGPD",
    articles: [
      {
        q: "Quero remover uma foto minha do site",
        a: "Se você encontrou uma foto sua exposta e deseja a remoção por motivos de privacidade, podemos te ajudar com isso imediatamente.\n\nLogo abaixo, você encontrará um campo de mensagem obrigatório onde poderá explicar seu pedido e solicitar a exclusão.\n\nPara agilizar o processo, cole o link da foto em questão no campo de texto ou anexe o arquivo da imagem utilizando o botão de anexo.\n\nNossa equipe de moderação analisará a denúncia com prioridade máxima para realizar a remoção.",
        form: "remove_photo",
      },
      {
        q: "Quero apagar minha conta e meus dados (LGPD)",
        a: "Se você deseja apagar sua conta e todos os seus dados pessoais da nossa plataforma, podemos te ajudar com isso.\n\nLogo abaixo, você encontrará um campo de mensagem obrigatório onde poderá confirmar e detalhar sua solicitação.\n\nPara agilizar o processo, descreva seu pedido e confirme que está ciente de que esta ação é irreversível e apagará seu histórico de compras/vendas.\n\nNossa equipe irá analisar a solicitação no painel administrativo e realizar a exclusão definitiva conforme as diretrizes de privacidade e proteção de dados (LGPD).",
        form: "delete_account",
      },
    ],
  },
  {
    id: "fotografo",
    name: "Área do Fotógrafo",
    icon: Camera,
    description: "Como vender, criar álbuns e receber",
    articles: [
      { q: "Como começar a vender na Viu Foto?", a: "Crie sua conta de fotógrafo clicando em \"Cadastrar-se como Fotógrafo\" no menu principal. Preencha seus dados profissionais e configure sua carteira para receber os pagamentos." },
      { q: "Como criar um álbum e definir preços?", a: "Acesse seu Painel > Criar Novo Álbum. Insira as informações do evento e, na aba de preços, defina o valor por foto individual e o valor dos pacotes promocionais." },
      { q: "Como e quando recebo minhas vendas?", a: "Os valores das suas vendas ficam disponíveis no seu painel da Viu Foto. Você pode solicitar o saque direto para sua conta bancária cadastrada (respeitando o prazo de liquidação de cada meio de pagamento)." },
    ],
  },
];

const Ajuda = () => {
  const [selected, setSelected] = useState<Category | null>(null);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const searching = q.length > 1;
  const searchResults = searching
    ? categories.flatMap((c) =>
        c.articles
          .filter((a) => a.q.toLowerCase().includes(q) || a.a.toLowerCase().includes(q))
          .map((a) => ({ ...a, category: c }))
      )
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-primary/10 to-transparent border-b border-border">
          <div className="container mx-auto px-4 py-12 md:py-16 max-w-3xl text-center">
            <h1 className="text-3xl md:text-5xl font-black mb-3">Central de Ajuda</h1>
            <p className="text-muted-foreground mb-8">Encontre respostas rápidas para as dúvidas mais comuns.</p>
            <div className="relative max-w-xl mx-auto">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar dúvida... (ex: pagamento, download)"
                className="w-full bg-card border border-border rounded-xl pl-12 pr-4 py-3.5 outline-none focus:border-primary text-sm"
              />
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-10 max-w-4xl">
          {searching ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                {searchResults.length} resultado{searchResults.length === 1 ? "" : "s"} para "{query}"
              </p>
              {searchResults.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhum artigo encontrado. Tente outras palavras.
                </div>
              ) : (
                <Accordion type="single" collapsible className="space-y-2">
                  {searchResults.map((r, i) => (
                    <AccordionItem key={i} value={`r-${i}`} className="border border-border rounded-xl px-4 bg-card">
                      <AccordionTrigger className="text-left hover:no-underline">
                        <div>
                          <div className="text-xs text-primary font-semibold mb-1">{r.category.name}</div>
                          <div className="font-medium">{r.q}</div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed">{r.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>
          ) : selected ? (
            <div>
              <button
                onClick={() => setSelected(null)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para categorias
              </button>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
                  <selected.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{selected.name}</h2>
                  <p className="text-sm text-muted-foreground">{selected.description}</p>
                </div>
              </div>
              <Accordion type="single" collapsible className="space-y-2">
                {selected.articles.map((a, i) => (
                  <AccordionItem key={i} value={`a-${i}`} className="border border-border rounded-xl px-4 bg-card">
                    <AccordionTrigger className="text-left font-medium hover:no-underline">{a.q}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">{a.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-4">Como podemos ajudar?</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className="group flex items-center gap-4 p-5 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-card/80 transition-all text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <c.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold mb-0.5">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.articles.length} artigos · {c.description}</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="mt-12 p-6 rounded-2xl border border-border bg-card text-center">
            <h3 className="font-bold text-lg mb-2">Ainda precisa de ajuda?</h3>
            <p className="text-sm text-muted-foreground mb-4">Nossa equipe responde em até 24 horas úteis.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="mailto:suporte@viufoto.com.br" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
                <Mail className="w-4 h-4" /> Enviar e-mail
              </a>
              <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border hover:bg-secondary transition-colors font-medium">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Ajuda;