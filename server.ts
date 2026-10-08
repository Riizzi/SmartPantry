import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import {
  generateMasterChefRecipes,
  getCuratedBrazilianRecipes,
  PantryItemCandidate,
} from './src/services/recipeEngine';
import { GEMINI_MODEL } from './src/services/config';
import { PRATOS_RESERVA, TABELA_NUTRI, normalizeStr } from './src/services/mealPrep';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Centralized Gemini Model constant
export { GEMINI_MODEL };

// Pseudo-random deterministic mulberry32 generator
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Initialize GoogleGenAI client according to gemini-api skill
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// UF State mapping from cUF (first 2 digits of 44-digit key)
const UF_CODE_MAP: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL',
  '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP', '41': 'PR',
  '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
};

// Helper: Extract 44-digit NFC-e key from string/URL
function extractChaveAcesso(input: string): string | null {
  if (!input) return null;
  const match = input.match(/\b\d{44}\b/);
  return match ? match[0] : null;
}

// Helper: accept only http(s) URLs on official SEFAZ portals (*.gov.br)
function isSefazPortalUrl(input: unknown): boolean {
  if (typeof input !== 'string') return false;
  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase();
    return (url.protocol === 'https:' || url.protocol === 'http:') && host.endsWith('.gov.br');
  } catch {
    return false;
  }
}

// Helper: Timeout wrapper for AI calls
function withTimeout<T>(promise: Promise<T>, timeoutMs = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout de ${timeoutMs}ms excedido`)), timeoutMs)
    ),
  ]);
}

// ----------------------------------------------------
// 1. NFC-e Parse Route (URL or 44-digit key or HTML)
// ----------------------------------------------------
app.post('/api/nfce/parse', async (req, res) => {
  try {
    const { qrUrl, chaveAcesso: rawKey, rawHtml } = req.body;
    let chave = extractChaveAcesso(rawKey || qrUrl || '');

    const cUF = chave ? chave.substring(0, 2) : '';
    const uf = UF_CODE_MAP[cUF] || 'BR';
    const anoMes = chave ? `20${chave.substring(2, 4)}-${chave.substring(4, 6)}` : '';
    const cnpj = chave ? chave.substring(6, 20) : '';

    let htmlContent = rawHtml || '';

    // If a QR Code URL was provided and no rawHtml, attempt fetching the SEFAZ portal.
    // Only official SEFAZ portals (*.gov.br) are fetched, so the server can't be used
    // to reach arbitrary or internal addresses (SSRF).
    if (qrUrl && !htmlContent && isSefazPortalUrl(qrUrl)) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const fetchRes = await fetch(qrUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          },
        });
        clearTimeout(timeoutId);
        if (fetchRes.ok) {
          htmlContent = await fetchRes.text();
        }
      } catch (fetchErr) {
        console.warn('Direct SEFAZ portal fetch skipped or timed out:', fetchErr);
      }
    }

    interface ParsedItem {
      nomeBruto: string;
      quantidade: number;
      unidade: string;
      precoUnitario: number;
      precoTotal: number;
    }

    let items: ParsedItem[] = [];
    let emitenteNome = 'Supermercado';
    let emitenteCnpj = cnpj;
    let dataEmissao = new Date().toISOString();
    let total = 0;

    // Cheerio Adapter parsing if HTML is present
    if (htmlContent) {
      const $ = cheerio.load(htmlContent);

      // Issuer name heuristics
      const titleCandidate = $('div.txtTopo, .ui-header h1, #lblNomeFantasia, .xNome, .txtCenter .txtTit, .titulo').first().text().trim();
      if (titleCandidate) {
        emitenteNome = titleCandidate;
      }

      // Check standard table rows across state portals (SP, RJ, RS, MG, etc.)
      $('table#tabResult tr, table.table-hover tr, tr[id^="Item + "], .item, tr.linha').each((_, el) => {
        const desc = $(el).find('.txtTit, .txtDesc, .desc, td:nth-child(1), .xProd').first().text().trim();
        const qtdStr = $(el).find('.Rqtd, .qtd, td:nth-child(2), .qCom').first().text().replace(/[^\d.,]/g, '').replace(',', '.');
        const unStr = $(el).find('.RUN, .un, td:nth-child(3), .uCom').first().text().trim().toLowerCase();
        const vlUnitStr = $(el).find('.RvlUnit, .vlUnit, td:nth-child(4), .vUnCom').first().text().replace(/[^\d.,]/g, '').replace(',', '.');
        const vlTotStr = $(el).find('.valor, .vProd, td:nth-child(5)').first().text().replace(/[^\d.,]/g, '').replace(',', '.');

        if (desc && desc.length > 2) {
          const quantidade = parseFloat(qtdStr) || 1;
          const precoUnitario = parseFloat(vlUnitStr) || (parseFloat(vlTotStr) / quantidade) || 0;
          const precoTotal = parseFloat(vlTotStr) || (quantidade * precoUnitario) || 0;

          items.push({
            nomeBruto: desc,
            quantidade,
            unidade: unStr || 'un',
            precoUnitario,
            precoTotal,
          });
        }
      });

      // Total heuristic
      const totalCandidate = $('#totalNota .totalNumb, .vNF, .totalValor, .txtTotal').first().text().replace(/[^\d.,]/g, '').replace(',', '.');
      if (totalCandidate) {
        total = parseFloat(totalCandidate) || 0;
      }
    }

    // Fallback: If cheerio found 0 items but HTML exists or key was given, use Gemini Flash
    if (items.length === 0 && htmlContent) {
      try {
        const textClean = cheerio.load(htmlContent).text().replace(/\s+/g, ' ').substring(0, 15000);
        const geminiRes = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: `Analise o texto deste cupom/nota fiscal NFC-e brasileira e extraia os itens comprados, nome do estabelecimento e total.
Texto:
${textClean}`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                emitenteNome: { type: Type.STRING },
                emitenteCnpj: { type: Type.STRING },
                total: { type: Type.NUMBER },
                dataEmissao: { type: Type.STRING },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      nomeBruto: { type: Type.STRING },
                      quantidade: { type: Type.NUMBER },
                      unidade: { type: Type.STRING },
                      precoUnitario: { type: Type.NUMBER },
                      precoTotal: { type: Type.NUMBER },
                    },
                    required: ['nomeBruto', 'quantidade', 'unidade'],
                  },
                },
              },
              required: ['items'],
            },
          },
        });

        if (geminiRes.text) {
          const parsed = JSON.parse(geminiRes.text);
          if (parsed.items && Array.isArray(parsed.items)) {
            items = parsed.items;
          }
          if (parsed.emitenteNome) emitenteNome = parsed.emitenteNome;
          if (parsed.total) total = parsed.total;
        }
      } catch (err) {
        console.warn('Gemini HTML fallback failed:', err);
      }
    }

    // Calculate total if not set
    if (total === 0 && items.length > 0) {
      total = items.reduce((acc, it) => acc + (it.precoTotal || (it.quantidade * (it.precoUnitario || 0))), 0);
    }

    return res.json({
      success: true,
      chaveAcesso: chave || `MANUAL_${Date.now()}`,
      uf,
      emitenteNome,
      emitenteCnpj,
      dataEmissao,
      total: Number(total.toFixed(2)),
      itemsCount: items.length,
      items,
    });
  } catch (error) {
    console.error('Error in /api/nfce/parse:', error);
    return res.status(500).json({
      error: 'Erro ao processar dados da nota fiscal',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// ----------------------------------------------------
// 2. Receipt Multimodal OCR Route (Gemini 3.8 Flash)
// ----------------------------------------------------
app.post('/api/receipt/ocr', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Imagem em base64 é obrigatória.' });
    }

    // Strip data:image/...;base64, prefix if present
    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

    const response = await withTimeout(
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType,
            },
          },
          {
            text: `Você é um leitor especialista em cupons fiscais, recibos de supermercado e notas fiscais brasileiras (NFC-e / SAT).
Analise a imagem da nota fiscal e extraia todas as informações dos produtos comprados.
Procure por:
1. Nome do mercado/estabelecimento
2. CNPJ se visível
3. Chave de acesso de 44 dígitos (localizada frequentemente perto do QR code ou rodapé)
4. Data da compra
5. Valor total pago
6. Lista completa de itens com descrição exata, quantidade, unidade (un, kg, g, etc.), preço unitário e total.
Retorne rigorosamente no formato JSON.`,
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              chaveAcesso: { type: Type.STRING, description: 'Chave de 44 dígitos se visível, ou vazia' },
              emitenteNome: { type: Type.STRING },
              emitenteCnpj: { type: Type.STRING },
              dataEmissao: { type: Type.STRING },
              total: { type: Type.NUMBER },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    nomeBruto: { type: Type.STRING },
                    quantidade: { type: Type.NUMBER },
                    unidade: { type: Type.STRING },
                    precoUnitario: { type: Type.NUMBER },
                    precoTotal: { type: Type.NUMBER },
                  },
                  required: ['nomeBruto', 'quantidade', 'unidade'],
                },
              },
            },
            required: ['items'],
          },
        },
      }),
      9000
    );

    if (!response.text) {
      return res.status(500).json({ error: 'Nenhum texto retornado pela análise visual.' });
    }

    const data = JSON.parse(response.text);
    return res.json({
      success: true,
      ...data,
      chaveAcesso: extractChaveAcesso(data.chaveAcesso) || `FOTO_${Date.now()}`,
    });
  } catch (error) {
    console.error('Error in /api/receipt/ocr:', error);
    return res.status(500).json({
      error: 'Falha ao analisar a foto do cupom fiscal.',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// ----------------------------------------------------
// 3. Product Normalization Route (Gemini 3.8 Flash)
// ----------------------------------------------------
app.post('/api/products/normalize', async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.json({ success: true, items: [] });
    }

    const promptItems = items.map((it: { nomeBruto: string; quantidade?: number; unidade?: string }) => ({
      nomeBruto: it.nomeBruto,
      quantidade: it.quantidade || 1,
      unidade: it.unidade || 'un',
    }));

    const response = await withTimeout(
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Você é o normalizador de despensa inteligente do SmartPantry no Brasil.
Receba a lista de nomes brutos de produtos de notas fiscais (ex.: "LEITE UHT INT ITAMBE 1L", "MACA NAC GALA KG", "PEITO FRANGO RESFR KG", "SACOLA PLASTICA", "SABAO PO OMO 1.6KG") e normalize cada um.
Para cada item:
- nomeCanonico: Nome limpo, apetitoso e padronizado em português (ex: "Leite Integral", "Maçã Gala", "Peito de Frango", "Sacola Plástica")
- categoria: escolha estritamente uma de: ["hortifruti", "carnes", "laticinios", "graos", "padaria", "bebidas", "congelados", "mercearia", "temperos", "limpeza", "outros"]
- emoji: um emoji representativo e bonito do item (ex: 🥛, 🍎, 🍗, 🛍️, 🧽, 🍅)
- unidadePadrao: uma de ["un", "kg", "g", "l", "ml"]
- conteudoPorUnidade: número com o peso/volume unitário (ex: 1 para 1L de leite, 12 para dúzia de ovos, 0.5 para pacote de 500g de café, 1 para unidade padrão)
- proteinaAnimal: true se for carne bovina, aves, suínos, peixes ou frutos do mar; senão false
- derivadoAnimal: true se contiver leite, ovos, manteiga, queijo, mel, iogurte; senão false
- perecivel: true se estragar em temperatura ambiente ou em geladeira em menos de 30 dias
- validadePadraoDias: número de dias estimados de validade a partir da data de compra (ex: leite aberto/fechado: 7 a 10 dias, maçã: 14 dias, folhagens: 5 dias, carne fresca: 4 dias, arroz/feijão: 180 dias, ovos: 21 dias, queijo: 20 dias, temperos: 365 dias)
- ehAlimento: true se for comida/ingrediente de cozinha; false se for sacola plástica, produto de limpeza, higiene ou descartável.

Lista de itens brutos para normalizar:
${JSON.stringify(promptItems, null, 2)}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                nomeBruto: { type: Type.STRING },
                nomeCanonico: { type: Type.STRING },
                categoria: {
                  type: Type.STRING,
                  enum: ['hortifruti', 'carnes', 'laticinios', 'graos', 'padaria', 'bebidas', 'congelados', 'mercearia', 'temperos', 'limpeza', 'outros'],
                },
                emoji: { type: Type.STRING },
                unidadePadrao: {
                  type: Type.STRING,
                  enum: ['un', 'kg', 'g', 'l', 'ml'],
                },
                conteudoPorUnidade: { type: Type.NUMBER },
                proteinaAnimal: { type: Type.BOOLEAN },
                derivadoAnimal: { type: Type.BOOLEAN },
                perecivel: { type: Type.BOOLEAN },
                validadePadraoDias: { type: Type.NUMBER },
                ehAlimento: { type: Type.BOOLEAN },
              },
              required: [
                'nomeBruto',
                'nomeCanonico',
                'categoria',
                'emoji',
                'unidadePadrao',
                'proteinaAnimal',
                'derivadoAnimal',
                'perecivel',
                'validadePadraoDias',
                'ehAlimento',
              ],
            },
          },
        },
      }),
      9000
    );

    if (!response.text) {
      throw new Error('Nenhum retorno retornado pelo modelo.');
    }

    const normalizedItems = JSON.parse(response.text);
    return res.json({
      success: true,
      items: normalizedItems,
    });
  } catch (error) {
    console.warn('Gemini normalize fallback triggered:', error);
    // Intelligent heuristic normalization fallback
    const { items = [] } = req.body;
    const fallbackNormalized = items.map((it: { nomeBruto: string; quantidade?: number; unidade?: string }) => {
      const raw = (it.nomeBruto || '').toUpperCase();
      let cat: 'hortifruti' | 'carnes' | 'laticinios' | 'graos' | 'padaria' | 'bebidas' | 'mercearia' | 'limpeza' | 'temperos' | 'outros' = 'mercearia';
      let emoji = '📦';
      let validade = 14;
      let proteina = false;
      let derivado = false;
      let ehAlimento = true;

      if (/LEITE|QUEIJO|IOGURTE|MANTEIGA|REQUEIJAO|CREME DE LEITE/i.test(raw)) {
        cat = 'laticinios';
        emoji = /LEITE/i.test(raw) ? '🥛' : /QUEIJO/i.test(raw) ? '🧀' : '🧈';
        validade = 10;
        derivado = true;
      } else if (/FRANGO|CARNE|FILE|PEITO|BOV|SUIN|ALCATRA|PATINHO|BACON|LINGUICA|PEIXE/i.test(raw)) {
        cat = 'carnes';
        emoji = /FRANGO/i.test(raw) ? '🍗' : /PEIXE/i.test(raw) ? '🐟' : '🥩';
        validade = 4;
        proteina = true;
      } else if (/TOMATE|CEBOLA|ALFACE|MACA|BANANA|CENOURA|BATATA|LARANJA|LIMAO|ALHO/i.test(raw)) {
        cat = 'hortifruti';
        emoji = /TOMATE/i.test(raw) ? '🍅' : /MACA/i.test(raw) ? '🍎' : /BANANA/i.test(raw) ? '🍌' : '🥗';
        validade = 7;
      } else if (/ARROZ|FEIJAO|MACARRAO|FARINHA|AVEIA|LENTILHA/i.test(raw)) {
        cat = 'graos';
        emoji = /ARROZ/i.test(raw) ? '🍚' : '🌾';
        validade = 180;
      } else if (/PAO|TORRADA|BISCOITO|BOLO/i.test(raw)) {
        cat = 'padaria';
        emoji = '🍞';
        validade = 8;
      } else if (/SUCO|REFRIGERANTE|CERVEJA|AGUA|CHA/i.test(raw)) {
        cat = 'bebidas';
        emoji = '🧃';
        validade = 60;
      } else if (/SACOLA|DETERGENTE|SABAO|AMACIANTE|PAPEL|DESINFETANTE/i.test(raw)) {
        cat = 'limpeza';
        emoji = '🛍️';
        validade = 365;
        ehAlimento = false;
      }

      // Clean name: capitalize words, remove noisy codes
      const cleanName = raw
        .replace(/\b(UHT|INT|KG|UN|LT|1L|2L|500G|1KG|T1|PCT)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
        .replace(/(?:^|\s)\S/g, a => a.toUpperCase());

      return {
        nomeBruto: it.nomeBruto,
        nomeCanonico: cleanName || it.nomeBruto,
        categoria: cat,
        emoji,
        unidadePadrao: it.unidade || 'un',
        conteudoPorUnidade: 1,
        proteinaAnimal: proteina,
        derivadoAnimal: derivado,
        perecivel: validade < 30,
        validadePadraoDias: validade,
        ehAlimento,
      };
    });

    return res.json({
      success: true,
      items: fallbackNormalized,
    });
  }
});

// ----------------------------------------------------
// 4. Recipes Suggestion Route (TheMealDB + Gemini 3.8 Flash MasterChef)
// ----------------------------------------------------
app.post('/api/recipes/suggest', async (req, res) => {
  const {
    pantryItems = [],
    diet = 'tudo',
    meal = 'qualquer',
    maxPrepTimeMinutes = 45,
    maxMissingIngredients = 2,
    pantryBasics = ['Sal', 'Óleo', 'Azeite', 'Água', 'Alho', 'Cebola', 'Açúcar'],
    excludeTitles = [],
    shuffleSeed = 0,
  } = req.body as {
    pantryItems: PantryItemCandidate[];
    diet?: 'tudo' | 'vegetariano' | 'vegano' | 'com_carne';
    meal?: 'qualquer' | 'cafe' | 'almoco' | 'lanche' | 'jantar';
    maxPrepTimeMinutes?: number;
    maxMissingIngredients?: number;
    pantryBasics?: string[];
    excludeTitles?: string[];
    shuffleSeed?: number;
  };

  // 1. Strict Food Only Pre-Filter (No cleaning products, bags, detergents)
  const foodOnly = pantryItems.filter(it => {
    if (it.categoria === 'limpeza') return false;
    const name = it.nome.toLowerCase();
    if (/detergente|sabao|amaciante|papel|desinfetante|sacola|esponja|guardanapo/i.test(name)) return false;
    return true;
  });

  let availableItems = [...foodOnly];
  if (diet === 'vegetariano') {
    availableItems = availableItems.filter(item => !item.proteinaAnimal);
  } else if (diet === 'vegano') {
    availableItems = availableItems.filter(item => !item.proteinaAnimal && !item.derivadoAnimal);
  }

  // Sort available items by urgency (lowest days until expiry first!)
  availableItems.sort((a, b) => a.diasAteVencer - b.diasAteVencer);

  if (availableItems.length === 0) {
    return res.json({
      success: true,
      recipes: [],
      message: 'Nenhum ingrediente alimentar compatível na despensa para os filtros selecionados.',
    });
  }

  try {
    // Attempt AI Master Chef generation (incorporating TheMealDB reference recipes and strict Brazilian home cooking guidelines)
    const aiRecipes = await generateMasterChefRecipes(ai, {
      pantryItems: availableItems,
      diet,
      meal,
      maxPrepTimeMinutes,
      maxMissingIngredients,
      pantryBasics,
      excludeTitles,
      shuffleSeed,
    });

    if (aiRecipes.length > 0) {
      return res.json({
        success: true,
        recipes: aiRecipes,
        totalCount: aiRecipes.length,
      });
    }

    // If AI returned 0 recipes, fallback to curated Brazilian recipes
    const curated = getCuratedBrazilianRecipes(availableItems, diet, meal, excludeTitles);
    return res.json({
      success: true,
      recipes: curated,
      totalCount: curated.length,
    });
  } catch (error) {
    console.warn('AI recipe generation error or timeout, utilizing curated Brazilian culinary engine:', error);
    const curated = getCuratedBrazilianRecipes(availableItems, diet, meal, excludeTitles);
    return res.json({
      success: true,
      recipes: curated,
      totalCount: curated.length,
    });
  }
});

// ----------------------------------------------------
// 5. Meal Prep Planning Route (Gemini Flash + Reserve Fallback)
// ----------------------------------------------------
app.post('/api/mealprep/plan', async (req, res) => {
  const {
    config = {},
    pantryItems = [],
    excludeTitles = [],
    shuffleSeed = Date.now(),
  } = req.body;

  const rng = mulberry32(shuffleSeed);

  // Cooking styles pool for meal prep
  const ESTILOS_MEALPREP = [
    'strogonofe fit leve com molho de iogurte/tomate',
    'frango xadrez aromático com legumes crocantes',
    'escondidinho rústico dourado',
    'bowl colorido substancial com molho caseiro',
    'carne de panela macia desfiada com legumes ensopados',
    'risoto funcional de forno',
    'salteado oriental com gengibre e gergelim',
    'picadinho tradicional brasileiro ao molho de tomate fresco',
    'estrogonofe cremoso de grão-de-bico com especiarias',
  ];
  const estilo = ESTILOS_MEALPREP[Math.floor(rng() * ESTILOS_MEALPREP.length)];

  // Clean food items only (exclude cleaning products)
  const foodOnly = (pantryItems || []).filter((it: any) => {
    if (it.categoria === 'limpeza') return false;
    const name = (it.nome || it.produto?.nomeCanonico || '').toLowerCase();
    if (/detergente|sabao|amaciante|papel|desinfetante|sacola|esponja|guardanapo/i.test(name)) return false;
    return true;
  });

  const numPratos = config.numPratos === 2 ? 2 : 1;

  const prompt = `Você é um Nutricionista e Chef Executivo especialista em Marmitas da Semana (Meal Prep) brasileiras.
Sua missão é planejar exatamente ${numPratos} ${numPratos === 1 ? 'prato completo de marmita' : 'pratos diferentes de marmita'} para cozinhar em lote e congelar ou refrigerar para a semana.

DIRETRIZ DESTE CARDÁPIO:
- Estilo gastronômico: ${estilo}
- Dieta: ${config.dieta || 'tudo'}
- Preferências de Proteína: ${(config.preferenciasProteina || []).join(', ') || 'Livre'}
- Preferências de Carboidrato: ${(config.preferenciasCarbo || []).join(', ') || 'Livre'}
- Observações do Usuário: ${config.observacoes || 'Nenhuma'}
- Priorizar itens da despensa: ${config.priorizarDespensa ? 'SIM (use primeiro itens que estão no estoque)' : 'NÃO'}

LEIS CULINÁRIAS DE MARMITA DA SEMANA:
1. ESTRUTURA RÍGIDA: Cada prato DEVE conter:
   - 1 fonte principal de proteína (papel: 'proteina', proporcaoNoPapel: 1.0)
   - 1 fonte principal de carboidrato (papel: 'carbo', proporcaoNoPapel: 1.0)
   - 1 a 2 legumes/verduras cozidos ou salteados (papel: 'legume', proporcaoNoPapel somando 1.0)
   - Temperos básicos (alho, cebola, azeite, sal, ervas)
2. RESISTÊNCIA AO REAQUECIMENTO:
   - NUNCA use folhas cruas (alface, rúcula), frutos do mar extremamente delicados, frituras que empapam.
   - Use preparações úmidas, saborosas e que ficam perfeitas após 4 dias de geladeira ou 30 dias de congelador.
3. DADOS NUTRICIONAIS POR 100g (SEMPRE DO ALIMENTO COZIDO / PRONTO):
   - Cada ingrediente deve ter papel ('proteina'|'carbo'|'legume'|'gordura'|'tempero'), estado ('cozido'), por100g (kcal, proteina, carbo, gordura) e rendimentoCozinha (peso cozido para cada 1 de cru, ex: arroz 2.4, frango 0.75, carne moída 0.7, feijão 2.3, macarrão 2.2, batata 0.95, legumes 0.9).
   - NÃO tente calcular os gramas totais de cada marmita (o sistema fará esse cálculo de macros matematicamente).
4. MODO DE PREPARO EM LOTE:
   - Sequência lógica para preparar tudo de uma só vez na cozinha (fogo, utensilho, tempo em minutos, ponto visual).
5. EXCLUSÕES:
   ${excludeTitles && excludeTitles.length > 0 ? `NÃO repita estes pratos anteriores: ${excludeTitles.join(', ')}.` : ''}

ESTOQUE ATUAL DA DESPENSA DO USUÁRIO:
${JSON.stringify(foodOnly.slice(0, 15).map((p: any) => ({ id: p.id || p.produto?.id, nome: p.nome || p.produto?.nomeCanonico, qtd: p.quantidadeRestante || p.quantidadeTotal, un: p.unidade || p.produto?.unidadePadrao, diasAteVencer: p.diasAteVencer })), null, 2)}
`;

  try {
    const aiResponse = await withTimeout(
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          temperature: 0.9,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              pratos: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    nome: { type: Type.STRING },
                    descricao: { type: Type.STRING },
                    tempoTotalMin: { type: Type.INTEGER },
                    armazenamento: { type: Type.STRING },
                    dicaReaquecer: { type: Type.STRING },
                    modoPreparo: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    ingredientes: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          nome: { type: Type.STRING },
                          papel: {
                            type: Type.STRING,
                            enum: ['proteina', 'carbo', 'legume', 'gordura', 'tempero'],
                          },
                          proporcaoNoPapel: { type: Type.NUMBER },
                          estado: {
                            type: Type.STRING,
                            enum: ['cozido', 'cru'],
                          },
                          por100g: {
                            type: Type.OBJECT,
                            properties: {
                              kcal: { type: Type.NUMBER },
                              proteina: { type: Type.NUMBER },
                              carbo: { type: Type.NUMBER },
                              gordura: { type: Type.NUMBER },
                            },
                            required: ['kcal', 'proteina', 'carbo', 'gordura'],
                          },
                          rendimentoCozinha: { type: Type.NUMBER },
                          produtoIdDespensa: { type: Type.STRING },
                          observacao: { type: Type.STRING },
                        },
                        required: ['nome', 'papel', 'proporcaoNoPapel', 'estado', 'por100g', 'rendimentoCozinha'],
                      },
                    },
                  },
                  required: [
                    'nome',
                    'descricao',
                    'tempoTotalMin',
                    'modoPreparo',
                    'armazenamento',
                    'dicaReaquecer',
                    'ingredientes',
                  ],
                },
              },
            },
            required: ['pratos'],
          },
        },
      }),
      20000
    );

    if (!aiResponse.text) {
      throw new Error('Retorno vazio da IA para Meal Prep.');
    }

    const parsed = JSON.parse(aiResponse.text);
    if (!parsed.pratos || !Array.isArray(parsed.pratos) || parsed.pratos.length === 0) {
      throw new Error('Nenhum prato estruturado retornado pela IA.');
    }

    const pratosLimpos = parsed.pratos.slice(0, numPratos).map((p: any) => ({
      ...p,
      source: 'ia' as const,
    }));

    return res.json({
      success: true,
      source: 'ia',
      pratos: pratosLimpos,
    });
  } catch (err) {
    console.error('[ROUTE /api/mealprep/plan] Erro na IA ou timeout, acionando pratos de reserva:', err instanceof Error ? err.message : err);

    // Fallback: 6 pratos prontos do motor de reserva com dados da TABELA_NUTRI
    const fallbackPratos: any[] = [];
    const normExcludes = (excludeTitles || []).map((t: string) => normalizeStr(t));

    const matchedReservas = PRATOS_RESERVA.filter(p => p.dieta.includes(config.dieta || 'tudo'));
    const pool = matchedReservas.length > 0 ? matchedReservas : PRATOS_RESERVA;
    const notSeen = pool.filter(p => !normExcludes.includes(normalizeStr(p.nome)));
    const chosenList = (notSeen.length >= numPratos ? notSeen : pool).slice(0, numPratos);

    for (const chosen of chosenList) {
      const protRef = TABELA_NUTRI.find(t => t.nome === chosen.proteinaKey)!;
      const carboRef = TABELA_NUTRI.find(t => t.nome === chosen.carboKey)!;
      const legRef = TABELA_NUTRI.find(t => t.nome === chosen.legumeKey)!;

      fallbackPratos.push({
        nome: chosen.nome,
        descricao: chosen.descricao,
        tempoTotalMin: chosen.tempoTotalMin,
        modoPreparo: chosen.modoPreparo,
        armazenamento: chosen.armazenamento,
        dicaReaquecer: chosen.dicaReaquecer,
        source: 'reserva' as const,
        ingredientes: [
          {
            nome: protRef.nome,
            papel: 'proteina',
            proporcaoNoPapel: 1.0,
            estado: 'cozido',
            por100g: protRef.por100g,
            rendimentoCozinha: protRef.rendimento,
          },
          {
            nome: carboRef.nome,
            papel: 'carbo',
            proporcaoNoPapel: 1.0,
            estado: 'cozido',
            por100g: carboRef.por100g,
            rendimentoCozinha: carboRef.rendimento,
          },
          {
            nome: legRef.nome,
            papel: 'legume',
            proporcaoNoPapel: 1.0,
            estado: 'cozido',
            por100g: legRef.por100g,
            rendimentoCozinha: legRef.rendimento,
          },
        ],
      });
    }

    return res.json({
      success: true,
      source: 'reserva',
      pratos: fallbackPratos,
      message: 'IA indisponível, usando cardápio de reserva.',
    });
  }
});

// ----------------------------------------------------
// Mounting Vite Middlewares in Dev / Static in Prod
// ----------------------------------------------------
async function setupApp() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SmartPantry server running at http://0.0.0.0:${PORT}`);
  });
}

setupApp().catch(err => {
  console.error('Failed to start server:', err);
});
