## Redesign do Lightbox da Foto (estilo Fotop)

Comparando os dois prints, a versão da concorrência (Fotop) é mais limpa, com fundo claro semi-transparente que mantém a galeria visível ao fundo, dando ênfase total à foto. O nosso atual tem fundo preto pesado (`bg-black/95`) que sufoca a experiência.

### Mudanças no `src/pages/EventPage.tsx` (apenas o bloco do lightbox, linhas ~468-643)

**1. Backdrop mais leve**
- Trocar `bg-black/95` por `bg-background/80 backdrop-blur-md` (fundo claro com blur, deixa a galeria entrever atrás)
- Painel de compra muda para `bg-card` com `shadow-xl rounded-2xl` (cartão flutuante, não mais coluna lateral)

**2. Layout — foto em destaque central**
- Imagem fica no centro com `max-h-[80vh]` no desktop (mais alta que os atuais 75vh, sem painel lateral comprimindo)
- Painel de compra vira um card flutuante à direita no desktop (`absolute right-6 top-1/2 -translate-y-1/2 w-80`) ou drawer inferior no mobile (mantém comportamento atual)
- Setas de navegação ficam fora da área da imagem, sobre o backdrop (estilo Fotop com `<` `>` grandes nas laterais da viewport)

**3. Botões de ação (favorito/share/close)**
- Migrar de fundo preto opaco (`bg-black/50`) para fundo claro (`bg-card/80 text-foreground border border-border`) já que o backdrop ficou claro
- Posicionar sobre a imagem com offset menor

**4. Painel de compra refinado**
- Header `Foto digital para download` em `text-foreground` (já está)
- Remover o `PhotoTermsFooter` de dentro do painel (fica visualmente pesado) — mantê-lo apenas na `FotoPage`. No lightbox, deixar um link discreto "Termo de uso das fotos" que abre tooltip/popover
- Manter as opções de resolução, CTA principal laranja e os dois botões secundários (Continuar comprando / Ir para o carrinho)

**5. Animação de entrada**
- Adicionar `animate-in fade-in zoom-in-95 duration-200` no container da imagem para dar polimento na abertura

### Fora de escopo
- Não mudar `FotoPage.tsx` (página individual já está clara)
- Não mudar grid da galeria, paginação ou qualquer lógica de dados/preço
- Não mexer no watermark (continua bakeado na imagem)

### Detalhes técnicos
- Tudo usa tokens semânticos do design system (`bg-background`, `bg-card`, `text-foreground`, `border-border`, `bg-primary`)
- Suporta `light` e `dark` automaticamente via tokens HSL
- Mobile mantém o atual layout vertical (foto em cima 55dvh, painel embaixo 40dvh) — só atualizamos cores
