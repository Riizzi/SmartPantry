import { ItemDespensa, Produto, Receita } from '../types/pantry';

export interface NfceParseResult {
  success: boolean;
  chaveAcesso: string;
  uf: string;
  emitenteNome: string;
  emitenteCnpj: string;
  dataEmissao: string;
  total: number;
  itemsCount: number;
  items: Array<{
    nomeBruto: string;
    quantidade: number;
    unidade: string;
    precoUnitario: number;
    precoTotal: number;
  }>;
}

export interface NormalizedItem {
  nomeBruto: string;
  nomeCanonico: string;
  categoria: Produto['categoria'];
  emoji: string;
  unidadePadrao: Produto['unidadePadrao'];
  conteudoPorUnidade?: number;
  proteinaAnimal: boolean;
  derivadoAnimal: boolean;
  perecivel: boolean;
  validadePadraoDias: number;
  ehAlimento: boolean;
}

export const ApiService = {
  async parseNfce(payload: { qrUrl?: string; chaveAcesso?: string; rawHtml?: string }): Promise<NfceParseResult> {
    const res = await fetch('/api/nfce/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const errorObj = new Error(err.details || err.error || 'Falha ao consultar nota fiscal.');
      (errorObj as any).code = err.error || (res.status === 422 ? 'SEFAZ_INDISPONIVEL' : 'UNKNOWN');
      (errorObj as any).details = err.details;
      throw errorObj;
    }
    return res.json();
  },

  async ocrReceipt(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<NfceParseResult> {
    const res = await fetch('/api/receipt/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, mimeType }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details || err.error || 'Falha na leitura da imagem.');
    }
    return res.json();
  },

  async normalizeProducts(
    items: Array<{ nomeBruto: string; quantidade?: number; unidade?: string; precoUnitario?: number }>
  ): Promise<NormalizedItem[]> {
    const res = await fetch('/api/products/normalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details || err.error || 'Falha ao normalizar itens com IA.');
    }
    const data = await res.json();
    return data.items || [];
  },

  async suggestRecipes(params: {
    itemsDespensa: ItemDespensa[];
    diet: 'tudo' | 'vegetariano' | 'vegano' | 'com_carne';
    meal: 'qualquer' | 'cafe' | 'almoco' | 'lanche' | 'jantar';
    maxPrepTimeMinutes: number;
    maxMissingIngredients: number;
    pantryBasics: string[];
    excludeTitles?: string[];
    shuffleSeed?: number;
  }): Promise<Receita[]> {
    const pantryPayload = params.itemsDespensa.map(it => ({
      id: it.produto.id,
      produtoId: it.produto.id,
      nome: it.produto.nomeCanonico,
      quantidadeRestante: it.quantidadeTotal,
      unidade: it.produto.unidadePadrao,
      diasAteVencer: it.diasAteVencer,
      proteinaAnimal: it.produto.proteinaAnimal,
      derivadoAnimal: it.produto.derivadoAnimal,
      categoria: it.produto.categoria,
    }));

    const res = await fetch('/api/recipes/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pantryItems: pantryPayload,
        diet: params.diet,
        meal: params.meal,
        maxPrepTimeMinutes: params.maxPrepTimeMinutes,
        maxMissingIngredients: params.maxMissingIngredients,
        pantryBasics: params.pantryBasics,
        excludeTitles: params.excludeTitles || [],
        shuffleSeed: params.shuffleSeed || Date.now(),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details || err.error || 'Falha ao gerar receitas inteligentes.');
    }

    const data = await res.json();
    return data.recipes || [];
  },

  planMealPrep: async (params: {
    config: any;
    pantryItems: ItemDespensa[];
    excludeTitles?: string[];
    shuffleSeed?: number;
  }): Promise<{ success: boolean; source: 'ia' | 'reserva'; pratos: any[]; message?: string }> => {
    const pantryPayload = params.pantryItems.map(it => ({
      id: it.produto.id,
      nome: it.produto.nomeCanonico,
      quantidadeRestante: it.quantidadeTotal,
      unidade: it.produto.unidadePadrao,
      diasAteVencer: it.diasAteVencer,
      proteinaAnimal: it.produto.proteinaAnimal,
      derivadoAnimal: it.produto.derivadoAnimal,
      categoria: it.produto.categoria,
    }));

    const res = await fetch('/api/mealprep/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: params.config,
        pantryItems: pantryPayload,
        excludeTitles: params.excludeTitles || [],
        shuffleSeed: params.shuffleSeed || Date.now(),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details || err.error || 'Falha ao planejar marmitas da semana.');
    }

    return await res.json();
  },
};
