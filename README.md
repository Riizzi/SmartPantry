<div align="center">

<img src="public/icon.svg" width="88" alt="SmartPantry icon" />

# SmartPantry

**English** · [Português](README.pt-BR.md)

A smart pantry: scan the QR code on your grocery receipt (Brazilian NFC-e) and the products go straight into your pantry with an estimated expiry date. Then the app suggests recipes and meal preps using what you already have.

![React](https://img.shields.io/badge/React_19-292524?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-292524?logo=typescript&logoColor=3178C6)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_4-292524?logo=tailwindcss&logoColor=38BDF8)
![Express](https://img.shields.io/badge/Express-292524?logo=express&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini_API-292524?logo=googlegemini&logoColor=8E75B2)
![PWA](https://img.shields.io/badge/PWA-292524?logo=pwa&logoColor=white)

</div>

> The app interface is in Brazilian Portuguese and reads Brazilian electronic receipts (NFC-e).

## Features

- **Receipt scanning**: scan the NFC-e QR code with the camera or type the 44-digit access key. The app queries the state tax authority (SEFAZ) portal and extracts products, quantities and prices
- **Receipt photo**: for receipts without a QR code, Gemini runs OCR on the image
- **Product normalization**: abbreviated receipt names ("LEITE INTEG 1L ITAMB") become readable names with a category and an estimated shelf life
- **Review before saving**: check and adjust the scanned items before they go into the pantry
- **Expiry tracking**: highlights what is about to expire or already expired
- **Essentials and shopping list**: mark items you never want to run out of and see what needs restocking
- **Recipe suggestions** from what's in the pantry, prioritizing items that expire first (TheMealDB + Gemini)
- **Weekly meal prep planning**
- **History** of entries and archived receipts, with an undo option
- **Installable PWA** with offline support; data stays on the device

## Tech stack

| Layer | Technology |
| --- | --- |
| UI | React 19, TypeScript, Tailwind CSS 4, Motion, Lucide |
| QR scanning | `html5-qrcode` |
| Server | Express (`/api` routes), Cheerio to read the SEFAZ portal |
| AI | `@google/genai` with structured JSON output and non-AI fallbacks when a call fails |
| Data | `localStorage` |
| PWA | `vite-plugin-pwa` (Workbox) |

## Architecture

```
App (PWA)
 ├── Camera → NFC-e QR code
 └── /api (Express)
      ├── nfce/parse ......... queries the SEFAZ portal (*.gov.br) and extracts items
      ├── receipt/ocr ........ receipt photo OCR with Gemini
      ├── products/normalize . readable name, category and estimated shelf life
      ├── recipes/suggest .... recipes from pantry items
      └── mealprep/plan ...... weekly meal prep plan
```

Every route has a non-AI fallback (rules and reserve lists), so the app stays useful if the Gemini quota runs out. The receipt route only fetches official SEFAZ portals (`*.gov.br`), so the server can't be used to reach arbitrary addresses.

## Getting started

Requirements: Node.js 22+ (or Bun) and a [Gemini API key](https://aistudio.google.com/apikey).

```bash
bun install                 # or npm install
cp .env.example .env        # then fill in GEMINI_API_KEY
bun run dev                 # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `dev` | Express server + Vite with hot reload |
| `build` | builds the app into `dist/` |
| `start` | starts the server (with `NODE_ENV=production`, it serves the build from `dist/`) |
| `lint` | type check with `tsc` |

## License

[MIT](LICENSE)
