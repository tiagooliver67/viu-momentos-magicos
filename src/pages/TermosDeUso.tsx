import { Link } from "react-router-dom";

export default function TermosDeUso() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border px-4 h-14 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur z-50">
        <Link to="/" className="text-xl font-black tracking-tight">
          <span className="text-primary">VIU</span>
          <span className="text-foreground">FOTO</span>
        </Link>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Voltar</Link>
      </nav>

      <article className="container mx-auto max-w-3xl px-4 py-12 prose prose-neutral dark:prose-invert">
        <h1 className="text-3xl md:text-4xl font-black text-foreground mb-2">Termos de Uso — ViuFoto</h1>
        <p className="text-muted-foreground mb-8">Para Fotógrafos Parceiros</p>

        <p className="text-foreground/80 mb-8">
          Estes Termos de Uso regulam a utilização da plataforma ViuFoto por fotógrafos parceiros para publicação,
          comercialização e entrega de fotografias digitais. Ao utilizar a plataforma, o fotógrafo declara estar de
          acordo com os termos abaixo.
        </p>

        <Section title="1. Definições">
          <Item term="Plataforma">A ViuFoto é uma plataforma digital destinada à publicação, organização, comercialização e entrega de fotografias digitais.</Item>
          <Item term="Fotógrafo">Usuário cadastrado com autorização para publicar e vender conteúdos fotográficos de sua autoria.</Item>
          <Item term="Evento">Qualquer acontecimento social, esportivo, corporativo ou cultural que possua cobertura fotográfica.</Item>
          <Item term="Álbum">Galeria digital criada pelo fotógrafo para organizar fotografias por categoria, evento ou tema.</Item>
          <Item term="Usuário">Pessoa física ou jurídica que acessa a plataforma, compra fotos ou utiliza os serviços disponibilizados.</Item>
          <Item term="Conteúdo">Toda fotografia, imagem, informação ou material enviado pelo fotógrafo para publicação na plataforma.</Item>
        </Section>

        <Section title="2. Aceitação dos Termos">
          <p>Ao criar uma conta e utilizar a ViuFoto, o fotógrafo declara que:</p>
          <ul>
            <li>Leu e concorda com estes Termos de Uso;</li>
            <li>Possui capacidade legal para contratação;</li>
            <li>É responsável pelos conteúdos publicados;</li>
            <li>Aceita cumprir todas as regras da plataforma.</li>
          </ul>
        </Section>

        <Section title="3. Cadastro do Fotógrafo">
          <p>Para utilizar a ViuFoto, o fotógrafo deverá:</p>
          <ul>
            <li>Possuir idade mínima de 18 anos ou autorização legal;</li>
            <li>Fornecer informações verdadeiras e atualizadas;</li>
            <li>Manter seus dados corretos;</li>
            <li>Utilizar conta individual e intransferível.</li>
          </ul>
          <p>O fotógrafo é integralmente responsável pelas atividades realizadas em sua conta. A ViuFoto poderá suspender ou encerrar contas que violem estes termos.</p>
        </Section>

        <Section title="4. Publicação de Conteúdo">
          <p>O fotógrafo é exclusivamente responsável pelas imagens publicadas na plataforma. Ao publicar conteúdo, o fotógrafo declara que:</p>
          <ul>
            <li>Possui os direitos autorais das imagens;</li>
            <li>Possui autorização necessária para comercialização;</li>
            <li>Não viola direitos de terceiros;</li>
            <li>Atua em conformidade com a legislação brasileira.</li>
          </ul>

          <h3 className="text-lg font-bold mt-6 mb-2">4.1 Conteúdos Proibidos</h3>
          <p>É proibida a publicação de conteúdos:</p>
          <ul>
            <li>Ilegais;</li>
            <li>Ofensivos;</li>
            <li>Discriminatórios;</li>
            <li>Difamatórios;</li>
            <li>Pornográficos;</li>
            <li>Com nudez não autorizada;</li>
            <li>Que violem direitos de imagem ou privacidade.</li>
          </ul>
          <p>A ViuFoto poderá remover conteúdos sem aviso prévio.</p>

          <h3 className="text-lg font-bold mt-6 mb-2">4.2 Crianças e Adolescentes</h3>
          <p>O fotógrafo declara estar ciente da necessidade de proteção especial à privacidade de crianças e adolescentes. É proibida a comercialização de imagens sem autorização legal dos responsáveis quando exigida pela legislação aplicável. A plataforma poderá remover imediatamente qualquer conteúdo considerado inadequado.</p>
        </Section>

        <Section title="5. Direitos Autorais">
          <p>A ViuFoto não se torna proprietária das fotografias publicadas. Os direitos autorais permanecem pertencendo ao fotógrafo.</p>
          <p>O fotógrafo concede à plataforma licença não exclusiva para:</p>
          <ul>
            <li>Hospedar;</li>
            <li>Exibir;</li>
            <li>Divulgar;</li>
            <li>Distribuir;</li>
            <li>Comercializar;</li>
            <li>Promover as imagens dentro da plataforma e canais oficiais da ViuFoto.</li>
          </ul>
        </Section>

        <Section title="6. Funcionamento da Plataforma">
          <p>A ViuFoto atua como intermediadora tecnológica entre fotógrafos e clientes. A plataforma disponibiliza ferramentas como:</p>
          <ul>
            <li>Reconhecimento facial;</li>
            <li>Galerias digitais;</li>
            <li>Entrega automática;</li>
            <li>Processamento de pagamentos;</li>
            <li>Área de pedidos;</li>
            <li>Painel financeiro.</li>
          </ul>
        </Section>

        <Section title="7. Comissões e Pagamentos">
          <h3 className="text-lg font-bold mt-2 mb-2">7.1 Comissão</h3>
          <p>A ViuFoto poderá cobrar comissão sobre as vendas realizadas na plataforma. Os percentuais poderão variar conforme:</p>
          <ul>
            <li>Plano contratado;</li>
            <li>Tipo de evento;</li>
            <li>Parcerias comerciais;</li>
            <li>Condições negociadas.</li>
          </ul>

          <h3 className="text-lg font-bold mt-6 mb-2">7.2 Recebimentos</h3>
          <p>Após confirmação do pagamento do cliente:</p>
          <ul>
            <li>O saldo ficará disponível na carteira digital do fotógrafo;</li>
            <li>O saque poderá ser realizado via Pix;</li>
            <li>Poderão ocorrer validações de segurança e identidade.</li>
          </ul>
          <p>A plataforma poderá reter temporariamente valores em casos de:</p>
          <ul>
            <li>Suspeita de fraude;</li>
            <li>Chargeback;</li>
            <li>Dados inconsistentes;</li>
            <li>Descumprimento destes termos.</li>
          </ul>

          <h3 className="text-lg font-bold mt-6 mb-2">7.3 Estornos</h3>
          <p>Em casos de chargeback, fraude, cancelamento ou contestação de compra, a ViuFoto poderá descontar os valores correspondentes do saldo do fotógrafo.</p>
        </Section>

        <Section title="8. Responsabilidades do Fotógrafo">
          <p>O fotógrafo é integralmente responsável por:</p>
          <ul>
            <li>Direitos autorais;</li>
            <li>Direitos de imagem;</li>
            <li>Autorizações necessárias;</li>
            <li>Licenças;</li>
            <li>Conteúdos publicados;</li>
            <li>Eventuais disputas judiciais ou extrajudiciais.</li>
          </ul>
        </Section>

        <Section title="9. Limitações de Responsabilidade da ViuFoto">
          <p>A ViuFoto não se responsabiliza por:</p>
          <ul>
            <li>Uso indevido das imagens por terceiros;</li>
            <li>Falhas temporárias do sistema;</li>
            <li>Danos indiretos;</li>
            <li>Perdas financeiras;</li>
            <li>Problemas relacionados às autorizações das imagens.</li>
          </ul>
        </Section>

        <Section title="10. Privacidade e Proteção de Dados">
          <p>Os dados pessoais serão tratados conforme a Política de Privacidade da ViuFoto. O fotógrafo declara estar ciente de que:</p>
          <ul>
            <li>Seus dados poderão ser utilizados para operação da plataforma;</li>
            <li>Informações poderão ser compartilhadas com provedores de pagamento e parceiros operacionais;</li>
            <li>O tratamento ocorrerá em conformidade com a LGPD.</li>
          </ul>
        </Section>

        <Section title="11. Suspensão e Encerramento">
          <p>A ViuFoto poderá suspender contas, bloquear acessos, remover conteúdos e encerrar cadastros sempre que houver violação destes termos ou da legislação vigente. O fotógrafo poderá solicitar o encerramento da conta a qualquer momento.</p>
        </Section>

        <Section title="12. Alterações dos Termos">
          <p>A ViuFoto poderá atualizar estes Termos de Uso periodicamente. A continuidade da utilização da plataforma será considerada aceitação das alterações realizadas.</p>
        </Section>

        <Section title="13. Lei Aplicável">
          <p>Este Termo será regido pela legislação brasileira. Fica eleito o foro da comarca responsável pela sede da ViuFoto para resolução de eventuais conflitos.</p>
        </Section>

        <Section title="14. Contato">
          <p>Dúvidas, solicitações ou denúncias poderão ser realizadas através dos canais oficiais de atendimento da ViuFoto.</p>
        </Section>

        <p className="text-sm text-muted-foreground mt-12 pt-6 border-t border-border">
          Última atualização: Maio de 2026
        </p>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3">{title}</h2>
      <div className="space-y-3 text-foreground/80 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_ul]:my-2">
        {children}
      </div>
    </section>
  );
}

function Item({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <p>
      <strong className="text-foreground">{term}:</strong> {children}
    </p>
  );
}