## Objetivo
Garantir que todos os usuários (desktop e celular) abram o site no **tema branco/claro** por padrão — inclusive quem já visitou antes e ficou com o tema escuro salvo no navegador.

## Diagnóstico
O código já define `"clean"` (branco) como padrão em `src/contexts/ThemeContext.tsx`. O problema é que o tema escolhido fica salvo no `localStorage` do navegador na chave `admin-theme`. Quem entrou antes e ativou o escuro continua vendo escuro mesmo agora.

## Mudanças

1. **Resetar o tema salvo de todos os visitantes** (`src/contexts/ThemeContext.tsx`)
   - Trocar a chave do localStorage de `admin-theme` para `viu-theme-v2`.
   - Efeito: todo navegador (desktop e mobile) "esquece" a preferência antiga e cai no padrão branco. Quem quiser escuro precisa clicar no ícone de Lua novamente.

2. **Manter o toggle Sol/Lua funcionando**
   - O botão no navbar continua permitindo trocar para escuro manualmente; a escolha nova é salva na chave nova e respeitada nas próximas visitas.

3. **Sem mudanças visuais ou de layout**
   - Não mexe em cores, CSS, componentes ou navbar. Só reseta a preferência salva e confirma o padrão claro.

## Resultado esperado
- Qualquer pessoa que abrir o site (PC ou celular), nova ou recorrente, verá o tema **branco** na primeira carga.
- O botão de alternar tema continua disponível para quem preferir escuro.