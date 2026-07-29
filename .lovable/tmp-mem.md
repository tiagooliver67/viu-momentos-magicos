---
name: Proteção por Desfoque
description: Camada client-side de blur revelado por gesto na galeria pública, configurada por fotógrafo.
type: feature
---
- Colunas em `photographer_sites`: `blur_protection_enabled` (bool, false), `blur_protection_pattern` (diagonal|vertical|horizontal|circular|faixa, default 'faixa'), `blur_protection_devices` ('mobile'|'all', default 'mobile'). Expostas em `photographer_sites_public`.
- Componente `BlurProtectionOverlay.tsx`: imagem desfocada + cópia nítida com clip-path que segue touchmove/mousemove. Nunca revela a foto inteira.
- Hook `useBlurProtection` decide ativação (respeita device).
- É camada ADICIONAL: a marca d'água continua sendo aplicada no servidor (Lambda). Nunca remover watermark por causa do blur.
- UI em Configurações → "Marca d'água e proteção" (sub-abas Marca d'água / Proteção).
