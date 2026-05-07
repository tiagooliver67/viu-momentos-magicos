# Tornar mensagens de erro do checkout claras para o usuário

Hoje, quando algo falha no pagamento, o cliente vê textos técnicos como:
> "Erro ao criar pagamento: Edge Function returned a non-2xx status code"

Ou recebe a mensagem crua do Asaas em inglês/jargão (ex.: *"Não é permitido split para sua própria carteira"*), que confunde o atleta — ele não tem como agir sobre isso.

## Objetivo
Substituir mensagens técnicas por mensagens **humanas, acionáveis e em português**, tanto no Edge Function quanto no modal de checkout.

## Mudanças

### 1. Edge Function `asaas-payment` — devolver erros estruturados
Em vez de só `throw new Error(...)`, retornar JSON com:
```json
{ "error": "mensagem amigável", "code": "WALLET_CONFLICT", "detail": "técnico para log" }
```

Mapear os principais cenários de falha:

| Situação real                                              | Mensagem para o cliente                                                                 |
|------------------------------------------------------------|------------------------------------------------------------------------------------------|
| `Não é permitido split para sua própria carteira`          | "Este evento ainda não está pronto para receber pagamentos. Avise o organizador."        |
| Fotógrafo sem `asaas_wallet_id`                            | "O fotógrafo deste evento ainda não ativou o recebimento. Tente novamente em breve."    |
| CPF inválido / formato incorreto                           | "CPF inválido. Confira os números e tente novamente."                                    |
| Email inválido                                             | "E-mail inválido. Verifique e tente novamente."                                          |
| `customer` recusado pelo Asaas                             | "Não conseguimos validar seus dados. Confira nome, e-mail e CPF."                        |
| Valor mínimo / `value` inválido                            | "Valor da compra inválido. Atualize o carrinho e tente de novo."                         |
| Falha de rede / timeout / 5xx Asaas                        | "Sistema de pagamento indisponível no momento. Tente novamente em alguns minutos."       |
| Erro ao gravar pedido (`orderError`)                       | "Não conseguimos registrar seu pedido. Tente novamente."                                 |
| `ASAAS_API_KEY` / `VIUFOTO_WALLET_ID` ausente              | "Pagamento temporariamente indisponível. Já fomos avisados." (e log no servidor)         |
| Qualquer outro erro                                        | "Não foi possível concluir o pagamento. Tente novamente em instantes."                   |

Detalhes técnicos continuam indo só para `console.error` (logs do edge), nunca para o cliente.

Status HTTP: 400 para erros do usuário, 502 para falhas do Asaas, 500 para falhas internas — mas o **frontend usa `error` do JSON**, não o status code.

### 2. Frontend `CheckoutModal.tsx` — ler o JSON estruturado
Trocar:
```ts
toast.error("Erro ao criar pagamento: " + err.message);
```
por algo como:
```ts
const friendly = data?.error ?? "Não foi possível concluir o pagamento. Tente novamente.";
toast.error(friendly, { duration: 6000 });
```

E garantir que, mesmo quando `supabase.functions.invoke` retorna `non-2xx status code`, a gente leia o corpo da resposta (`error.context?.body` ou refazer com `fetch`) para extrair o `error` amigável em vez de mostrar o erro genérico do SDK.

### 3. Validação preventiva no front (antes de chamar a função)
- CPF: validar formato/dígitos antes de submeter — evita ida desnecessária ao Asaas.
- E-mail: regex básica.
- Mostrar erro inline no campo, não como toast.

## Arquivos afetados
- `supabase/functions/asaas-payment/index.ts` — mapa de erros + respostas estruturadas.
- `src/components/checkout/CheckoutModal.tsx` — ler `error` do JSON, validar CPF/email antes, mensagens consistentes.
- (opcional) `src/lib/validators.ts` — helpers `isValidCpf`, `isValidEmail` se ainda não existirem.

## Não incluído
- Resolver a causa raiz do "split para própria carteira" (isso é um bug separado de configuração do organizador/fotógrafo).
- Mudar o fluxo de pagamento ou o split.
