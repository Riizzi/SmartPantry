<div align="center">

<img src="public/icon.svg" width="88" alt="Ícone do SmartPantry" />

# SmartPantry

[English](README.md) · **Português**

Despensa inteligente: escaneie o QR Code da nota fiscal (NFC-e) e os produtos entram sozinhos na despensa, com validade estimada. Depois, o app sugere receitas e marmitas com o que você já tem em casa.

![React](https://img.shields.io/badge/React_19-292524?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-292524?logo=typescript&logoColor=3178C6)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_4-292524?logo=tailwindcss&logoColor=38BDF8)
![Express](https://img.shields.io/badge/Express-292524?logo=express&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini_API-292524?logo=googlegemini&logoColor=8E75B2)
![PWA](https://img.shields.io/badge/PWA-292524?logo=pwa&logoColor=white)

</div>

## Funcionalidades

- **Leitura da NFC-e**: escaneie o QR Code da nota pela câmera ou digite a chave de acesso de 44 dígitos. O app consulta o portal da SEFAZ e extrai produtos, quantidades e preços
- **Foto do cupom**: para notas sem QR Code, o Gemini faz OCR da imagem
- **Normalização dos produtos**: nomes abreviados do cupom ("LEITE INTEG 1L ITAMB") viram nomes legíveis, com categoria e validade estimada
- **Revisão antes de salvar**: confira e ajuste os itens lidos antes de entrarem na despensa
- **Controle de validade**: destaque para o que está vencendo ou vencido
- **Essenciais e lista de compras**: marque os itens que nunca podem faltar e veja o que precisa repor
- **Sugestão de receitas** com o que tem na despensa, priorizando o que vence primeiro (TheMealDB + Gemini)
- **Planejamento de marmitas (meal prep)** para a semana
- **Histórico** de lançamentos e notas arquivadas, com opção de estornar
- **PWA instalável** com uso offline; os dados ficam no aparelho

## Stack

| Camada | Tecnologia |
| --- | --- |
| Interface | React 19, TypeScript, Tailwind CSS 4, Motion, Lucide |
| Leitura de QR Code | `html5-qrcode` |
| Servidor | Express (rotas `/api`), Cheerio para ler o portal da SEFAZ |
| IA | `@google/genai` com saída em JSON estruturado e alternativas sem IA quando a chamada falha |
| Dados | `localStorage` |
| PWA | `vite-plugin-pwa` (Workbox) |

## Arquitetura

```
App (PWA)
 ├── Câmera → QR Code da NFC-e
 └── /api (Express)
      ├── nfce/parse ......... consulta o portal da SEFAZ (*.gov.br) e extrai os itens
      ├── receipt/ocr ........ OCR da foto do cupom com Gemini
      ├── products/normalize . nome legível, categoria e validade estimada
      ├── recipes/suggest .... receitas com os itens da despensa
      └── mealprep/plan ...... plano de marmitas da semana
```

Todas as rotas têm um caminho alternativo sem IA (regras e listas de reserva), então o app continua útil se a cota do Gemini acabar.

## Como rodar

Pré-requisitos: Node.js 22+ (ou Bun) e uma [chave da API do Gemini](https://aistudio.google.com/apikey).

```bash
bun install                 # ou npm install
cp .env.example .env        # e preencha GEMINI_API_KEY
bun run dev                 # http://localhost:3000
```

| Script | O que faz |
| --- | --- |
| `dev` | servidor Express + Vite com hot reload |
| `build` | build do app em `dist/` |
| `start` | inicia o servidor (com `NODE_ENV=production`, serve o build de `dist/`) |
| `lint` | checagem de tipos com `tsc` |

## Licença

[MIT](LICENSE)
