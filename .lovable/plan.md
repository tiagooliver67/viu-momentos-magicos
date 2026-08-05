---
name: Standardize Typography
description: Apply standardized typography and font sizes across all pages based on the design system tokens.
type: design
---

# Plan: Standardize Typography Across the Platform

The goal is to apply the Design System tokens defined in `src/index.css` to all pages and components for visual consistency.

## 1. Audit & Preparation
- Already identified core tokens in `src/index.css`: `display-title`, `h1`-`h5`, `body-large`, `body-base`, `body-small`, `caption`.
- Pages that need updates: `Dashboard.tsx`, `Configuracoes.tsx`, `Login.tsx`, `Cadastro.tsx`, `Footer.tsx`, and others listed in the codebase.

## 2. Implementation Steps

### Layout & Page Shells
- Standardize main container padding and spacing using `.section-padding` and `.container-tight`.

### Specific Page Updates

#### `src/pages/Dashboard.tsx`
- Update "Bem-vindo de volta" header to use `.h1` or `.h2` token.
- Update section headers ("🎯 Comece por aqui", "Meus Eventos") to use standardized typography classes.

#### `src/pages/Configuracoes.tsx`
- Apply standardized headings to tab headers.
- Ensure input labels use `.body-small` or `.caption`.

#### `src/pages/Login.tsx` & `src/pages/Cadastro.tsx`
- Standardize main heading (`h1`) and helper text (`p`).
- Update button font sizes to use `.btn-height`.

#### `src/components/Footer.tsx`
- Ensure column headers use `.h5` (already partially implemented).
- Standardize link text and copyright info.

## 3. Review & Verification
- Check all screens on mobile and desktop viewports.
- Ensure consistent line heights and letter spacing.
