import {
  Produto,
  Lote,
  NotaFiscal,
  Movimento,
  ItemDespensa,
  ConfigDespensa,
  Receita,
  ItemEssencial,
  ItemListaCompras,
  MealPrepConfig,
  PlanoMarmita,
  PratoMarmita,
} from '../types/pantry';

const STORAGE_KEYS = {
  PRODUTOS: 'smartpantry_produtos_v1',
  LOTES: 'smartpantry_lotes_v1',
  NOTAS: 'smartpantry_notas_v1',
  MOVIMENTOS: 'smartpantry_movimentos_v1',
  CONFIG: 'smartpantry_config_v1',
  FAVORITAS: 'smartpantry_favoritas_v1',
  RECIPE_CACHE: 'smartpantry_recipe_cache_v1',
  ESSENCIAIS: 'smartpantry_essenciais_v1',
  LISTA_COMPRAS: 'smartpantry_lista_compras_v1',
  RECEITAS_FEITAS: 'smartpantry_receitas_feitas_v1',
  MEALPREP_CONFIG: 'smartpantry_mealprep_config_v1',
  MEALPREP_PLANOS: 'smartpantry_mealprep_planos_v1',
  MEALPREP_VISTOS: 'smartpantry_mealprep_vistos_v1',
};

const DEFAULT_CONFIG: ConfigDespensa = {
  basicos: ['Sal', 'Açúcar', 'Óleo', 'Azeite', 'Água', 'Alho', 'Cebola', 'Pimenta-do-reino', 'Café'],
  dietaPadrao: 'tudo',
  toleranciaFaltantes: 2,
  notificarValidade: true,
};

const DEFAULT_ESSENCIAIS: ItemEssencial[] = [
  {
    id: 'ess_cafe',
    nome: 'Café Torrado e Moído',
    categoria: 'mercearia',
    emoji: '☕',
    unidadePadrao: 'un',
    quantidadeMinima: 1,
    criadoEm: new Date().toISOString(),
  },
  {
    id: 'ess_azeite',
    nome: 'Azeite de Oliva Extra Virgem',
    categoria: 'temperos',
    emoji: '🫒',
    unidadePadrao: 'un',
    quantidadeMinima: 1,
    criadoEm: new Date().toISOString(),
  },
  {
    id: 'ess_ovos',
    nome: 'Ovos Vermelhos',
    categoria: 'laticinios',
    emoji: '🥚',
    unidadePadrao: 'un',
    quantidadeMinima: 6,
    produtoId: 'prod_ovos',
    criadoEm: new Date().toISOString(),
  },
  {
    id: 'ess_leite',
    nome: 'Leite Integral',
    categoria: 'laticinios',
    emoji: '🥛',
    unidadePadrao: 'l',
    quantidadeMinima: 1,
    produtoId: 'prod_leite',
    criadoEm: new Date().toISOString(),
  },
  {
    id: 'ess_arroz',
    nome: 'Arroz Branco Tipo 1',
    categoria: 'graos',
    emoji: '🍚',
    unidadePadrao: 'kg',
    quantidadeMinima: 1,
    produtoId: 'prod_arroz',
    criadoEm: new Date().toISOString(),
  },
  {
    id: 'ess_papel',
    nome: 'Papel Higiênico Folha Dupla',
    categoria: 'limpeza',
    emoji: '🧻',
    unidadePadrao: 'un',
    quantidadeMinima: 1,
    criadoEm: new Date().toISOString(),
  },
  {
    id: 'ess_detergente',
    nome: 'Detergente Lava-Louças',
    categoria: 'limpeza',
    emoji: '🧼',
    unidadePadrao: 'un',
    quantidadeMinima: 1,
    criadoEm: new Date().toISOString(),
  },
];

// Seed realistic pantry data if first launch
function getInitialSeedData(): { produtos: Produto[]; lotes: Lote[]; notas: NotaFiscal[] } {
  const now = new Date();

  // Helper date adder
  const addDays = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };

  const seedNota: NotaFiscal = {
    chaveAcesso: '35240958123456000192650010001234561001234567',
    uf: 'SP',
    emitenteCnpj: '58.123.456/0001-92',
    emitenteNome: 'Pão de Açúcar - Mercado & Frescos',
    dataEmissao: addDays(-2),
    total: 114.70,
    fonte: 'qr',
    criadoEm: addDays(-2),
  };

  const seedProdutos: Produto[] = [
    {
      id: 'prod_leite',
      nomeCanonico: 'Leite Integral',
      aliases: ['LEITE UHT INT ITAMBE 1L'],
      categoria: 'laticinios',
      emoji: '🥛',
      unidadePadrao: 'l',
      conteudoPorUnidade: 1,
      proteinaAnimal: false,
      derivadoAnimal: true,
      perecivel: true,
      validadePadraoDias: 8,
      ehAlimento: true,
    },
    {
      id: 'prod_ovos',
      nomeCanonico: 'Ovos Vermelhos',
      aliases: ['OVOS CAIPIRA C/12 UN'],
      categoria: 'laticinios',
      emoji: '🥚',
      unidadePadrao: 'un',
      conteudoPorUnidade: 12,
      proteinaAnimal: false,
      derivadoAnimal: true,
      perecivel: true,
      validadePadraoDias: 21,
      ehAlimento: true,
    },
    {
      id: 'prod_tomate',
      nomeCanonico: 'Tomate Italiano',
      aliases: ['TOMATE ITAL KG'],
      categoria: 'hortifruti',
      emoji: '🍅',
      unidadePadrao: 'kg',
      conteudoPorUnidade: 1,
      proteinaAnimal: false,
      derivadoAnimal: false,
      perecivel: true,
      validadePadraoDias: 6,
      ehAlimento: true,
    },
    {
      id: 'prod_queijo',
      nomeCanonico: 'Queijo Mussarela',
      aliases: ['QUEIJO MUSSARELA FAT'],
      categoria: 'laticinios',
      emoji: '🧀',
      unidadePadrao: 'g',
      conteudoPorUnidade: 300,
      proteinaAnimal: false,
      derivadoAnimal: true,
      perecivel: true,
      validadePadraoDias: 14,
      ehAlimento: true,
    },
    {
      id: 'prod_frango',
      nomeCanonico: 'Peito de Frango',
      aliases: ['FILE PEITO FRANGO KG'],
      categoria: 'carnes',
      emoji: '🍗',
      unidadePadrao: 'kg',
      conteudoPorUnidade: 1,
      proteinaAnimal: true,
      derivadoAnimal: false,
      perecivel: true,
      validadePadraoDias: 4,
      ehAlimento: true,
    },
    {
      id: 'prod_arroz',
      nomeCanonico: 'Arroz Branco Tipo 1',
      aliases: ['ARROZ TIO JOAO T1 5KG'],
      categoria: 'graos',
      emoji: '🍚',
      unidadePadrao: 'kg',
      conteudoPorUnidade: 5,
      proteinaAnimal: false,
      derivadoAnimal: false,
      perecivel: false,
      validadePadraoDias: 180,
      ehAlimento: true,
    },
    {
      id: 'prod_maca',
      nomeCanonico: 'Maçã Gala',
      aliases: ['MACA NACIONAL GALA KG'],
      categoria: 'hortifruti',
      emoji: '🍎',
      unidadePadrao: 'un',
      conteudoPorUnidade: 1,
      proteinaAnimal: false,
      derivadoAnimal: false,
      perecivel: true,
      validadePadraoDias: 10,
      ehAlimento: true,
    },
    {
      id: 'prod_pao',
      nomeCanonico: 'Pão de Forma Tradicional',
      aliases: ['PAO FORMA WICKBOLD 500G'],
      categoria: 'padaria',
      emoji: '🍞',
      unidadePadrao: 'un',
      conteudoPorUnidade: 1,
      proteinaAnimal: false,
      derivadoAnimal: false,
      perecivel: true,
      validadePadraoDias: 9,
      ehAlimento: true,
    },
  ];

  const seedLotes: Lote[] = [
    {
      id: 'lote_1',
      produtoId: 'prod_leite',
      notaId: seedNota.chaveAcesso,
      nomeBruto: 'LEITE UHT INT ITAMBE 1L',
      quantidadeInicial: 2,
      quantidadeRestante: 2,
      unidade: 'l',
      precoUnitario: 5.49,
      compradoEm: addDays(-2),
      validadeEstimada: addDays(2), // Urgente: Vence em 2 dias!
      status: 'ativo',
    },
    {
      id: 'lote_2',
      produtoId: 'prod_tomate',
      notaId: seedNota.chaveAcesso,
      nomeBruto: 'TOMATE ITAL KG',
      quantidadeInicial: 1.2,
      quantidadeRestante: 0.8,
      unidade: 'kg',
      precoUnitario: 8.90,
      compradoEm: addDays(-2),
      validadeEstimada: addDays(1), // Vence amanhã!
      status: 'ativo',
    },
    {
      id: 'lote_3',
      produtoId: 'prod_frango',
      notaId: seedNota.chaveAcesso,
      nomeBruto: 'FILE PEITO FRANGO KG',
      quantidadeInicial: 1,
      quantidadeRestante: 1,
      unidade: 'kg',
      precoUnitario: 22.90,
      compradoEm: addDays(-2),
      validadeEstimada: addDays(2), // Vence em 2 dias!
      status: 'ativo',
    },
    {
      id: 'lote_4',
      produtoId: 'prod_queijo',
      notaId: seedNota.chaveAcesso,
      nomeBruto: 'QUEIJO MUSSARELA FAT',
      quantidadeInicial: 300,
      quantidadeRestante: 200,
      unidade: 'g',
      precoUnitario: 14.50,
      compradoEm: addDays(-2),
      validadeEstimada: addDays(8),
      status: 'ativo',
    },
    {
      id: 'lote_5',
      produtoId: 'prod_ovos',
      notaId: seedNota.chaveAcesso,
      nomeBruto: 'OVOS CAIPIRA C/12 UN',
      quantidadeInicial: 12,
      quantidadeRestante: 8,
      unidade: 'un',
      precoUnitario: 16.90,
      compradoEm: addDays(-5),
      validadeEstimada: addDays(14),
      status: 'ativo',
    },
    {
      id: 'lote_6',
      produtoId: 'prod_arroz',
      notaId: seedNota.chaveAcesso,
      nomeBruto: 'ARROZ TIO JOAO T1 5KG',
      quantidadeInicial: 5,
      quantidadeRestante: 3.5,
      unidade: 'kg',
      precoUnitario: 31.90,
      compradoEm: addDays(-14),
      validadeEstimada: addDays(150),
      status: 'ativo',
    },
    {
      id: 'lote_7',
      produtoId: 'prod_maca',
      notaId: seedNota.chaveAcesso,
      nomeBruto: 'MACA NACIONAL GALA KG',
      quantidadeInicial: 6,
      quantidadeRestante: 4,
      unidade: 'un',
      precoUnitario: 2.10,
      compradoEm: addDays(-3),
      validadeEstimada: addDays(5),
      status: 'ativo',
    },
    {
      id: 'lote_8',
      produtoId: 'prod_pao',
      notaId: seedNota.chaveAcesso,
      nomeBruto: 'PAO FORMA WICKBOLD 500G',
      quantidadeInicial: 1,
      quantidadeRestante: 0.5,
      unidade: 'un',
      precoUnitario: 9.80,
      compradoEm: addDays(-4),
      validadeEstimada: addDays(3),
      status: 'ativo',
    },
  ];

  return { produtos: seedProdutos, lotes: seedLotes, notas: [seedNota] };
}

// Simple pub-sub event listener for reactive UI updates
type StorageListener = () => void;
const listeners = new Set<StorageListener>();

export function subscribeToPantry(listener: StorageListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  listeners.forEach(fn => fn());
}

// Helper to generate cryptographically safe unique IDs with fallback
export function generateUniqueId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const PantryStore = {
  getProdutos(): Produto[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUTOS);
    if (!raw) {
      const seed = getInitialSeedData();
      try {
        localStorage.setItem(STORAGE_KEYS.PRODUTOS, JSON.stringify(seed.produtos));
        localStorage.setItem(STORAGE_KEYS.LOTES, JSON.stringify(seed.lotes));
        localStorage.setItem(STORAGE_KEYS.NOTAS, JSON.stringify(seed.notas));
      } catch {}
      return seed.produtos;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Ensure legacy items have all required properties
        return parsed.map(p => ({
          ...p,
          aliases: Array.isArray(p.aliases) ? p.aliases : [],
          ehAlimento: p.ehAlimento !== undefined ? p.ehAlimento : p.categoria !== 'limpeza',
          perecivel: p.perecivel !== undefined ? p.perecivel : true,
          proteinaAnimal: p.proteinaAnimal || false,
          derivadoAnimal: p.derivadoAnimal || false,
          validadePadraoDias: p.validadePadraoDias || 14,
        }));
      }
    } catch {}
    const seed = getInitialSeedData();
    return seed.produtos;
  },

  getLotes(): Lote[] {
    const raw = localStorage.getItem(STORAGE_KEYS.LOTES);
    if (!raw) {
      PantryStore.getProdutos(); // Triggers seed
      const afterSeed = localStorage.getItem(STORAGE_KEYS.LOTES);
      try {
        return afterSeed ? JSON.parse(afterSeed) : [];
      } catch {
        return [];
      }
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(l => ({
          ...l,
          quantidadeRestante: typeof l.quantidadeRestante === 'number' ? l.quantidadeRestante : l.quantidadeInicial || 0,
          status: l.status || 'ativo',
        }));
      }
    } catch {}
    return [];
  },

  getNotas(): NotaFiscal[] {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTAS);
    if (!raw) {
      PantryStore.getProdutos();
      const afterSeed = localStorage.getItem(STORAGE_KEYS.NOTAS);
      try {
        return afterSeed ? JSON.parse(afterSeed) : [];
      } catch {
        return [];
      }
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return [];
  },

  getMovimentos(): Movimento[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MOVIMENTOS);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  },

  getConfig(): ConfigDespensa {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_CONFIG, ...parsed };
      } catch {}
    }
    return DEFAULT_CONFIG;
  },

  saveConfig(cfg: Partial<ConfigDespensa>) {
    const current = PantryStore.getConfig();
    const updated = { ...current, ...cfg };
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(updated));
    } catch {}
    notifyListeners();
  },

  getFavoritas(): Receita[] {
    const raw = localStorage.getItem(STORAGE_KEYS.FAVORITAS);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  },

  toggleFavorita(receita: Receita) {
    const favs = PantryStore.getFavoritas();
    const exists = favs.some(f => f.id === receita.id);
    let updated: Receita[];
    if (exists) {
      updated = favs.filter(f => f.id !== receita.id);
    } else {
      updated = [...favs, { ...receita, favorita: true }];
    }
    localStorage.setItem(STORAGE_KEYS.FAVORITAS, JSON.stringify(updated));
    notifyListeners();
  },

  // Calculate aggregated pantry view with FIFO lot tracking & days until expiry
  getItemsDespensa(): ItemDespensa[] {
    const produtos = PantryStore.getProdutos();
    const lotes = PantryStore.getLotes().filter(l => l.status === 'ativo' && l.quantidadeRestante > 0);

    const now = new Date();
    const items: ItemDespensa[] = [];

    for (const prod of produtos) {
      const activeLots = lotes
        .filter(l => l.produtoId === prod.id)
        .sort((a, b) => {
          if (!a.validadeEstimada) return 1;
          if (!b.validadeEstimada) return -1;
          return new Date(a.validadeEstimada).getTime() - new Date(b.validadeEstimada).getTime();
        });

      if (activeLots.length === 0) continue;

      const quantidadeTotal = Number(
        activeLots.reduce((acc, l) => acc + l.quantidadeRestante, 0).toFixed(2)
      );

      const loteMaisProximo = activeLots[0] || null;

      let diasAteVencer = 999;
      let urgencia: ItemDespensa['urgencia'] = 'indefinida';

      if (loteMaisProximo?.validadeEstimada) {
        const valDate = new Date(loteMaisProximo.validadeEstimada);
        const diffMs = valDate.getTime() - now.getTime();
        diasAteVencer = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (diasAteVencer < 0) {
          urgencia = 'vencido';
        } else if (diasAteVencer <= 1) {
          urgencia = 'vence_hoje';
        } else if (diasAteVencer <= 3) {
          urgencia = 'vence_logo';
        } else {
          urgencia = 'ok';
        }
      }

      items.push({
        produto: prod,
        quantidadeTotal,
        lotesAtivos: activeLots,
        loteMaisProximo,
        diasAteVencer,
        urgencia,
      });
    }

    // Sort by urgency: expired & expiring soonest first!
    items.sort((a, b) => a.diasAteVencer - b.diasAteVencer);
    return items;
  },

  // Import parsed receipt into database idempotently
  salvarNotaComLotes(
    nota: NotaFiscal,
    novosLotes: Omit<Lote, 'id'>[],
    produtosParaCadastrar: Produto[]
  ): { novosLotesCount: number } {
    const existingNotas = PantryStore.getNotas();
    // Check if receipt was already imported
    const exists = existingNotas.some(n => n.chaveAcesso === nota.chaveAcesso);
    if (!exists) {
      existingNotas.unshift(nota);
      localStorage.setItem(STORAGE_KEYS.NOTAS, JSON.stringify(existingNotas));
    }

    // Update / upsert products
    const existingProds = PantryStore.getProdutos();
    const prodMap = new Map(existingProds.map(p => [p.id, p]));

    for (const p of produtosParaCadastrar) {
      if (prodMap.has(p.id)) {
        // Merge aliases
        const curr = prodMap.get(p.id)!;
        const newAliases = Array.from(new Set([...curr.aliases, ...p.aliases]));
        prodMap.set(p.id, { ...curr, aliases: newAliases });
      } else {
        prodMap.set(p.id, p);
      }
    }
    localStorage.setItem(STORAGE_KEYS.PRODUTOS, JSON.stringify(Array.from(prodMap.values())));

    // Add lots
    const allLotes = PantryStore.getLotes();
    let count = 0;

    for (const l of novosLotes) {
      const loteId = generateUniqueId('lote');
      allLotes.push({
        ...l,
        id: loteId,
      });
      count++;
    }

    localStorage.setItem(STORAGE_KEYS.LOTES, JSON.stringify(allLotes));
    notifyListeners();
    return { novosLotesCount: count };
  },

  // FIFO Item consumption (used −1, −0.25, −0.5, etc.)
  consumirItem(
    produtoId: string,
    quantidadeConsumida: number,
    origem: string = 'manual'
  ): { movimentosCriados: Movimento[]; sucesso: boolean } {
    const lotes = PantryStore.getLotes();
    const movimentos = PantryStore.getMovimentos();

    // Active lots for this product sorted FIFO by expiry date
    const activeLots = lotes
      .filter(l => l.produtoId === produtoId && l.status === 'ativo' && l.quantidadeRestante > 0)
      .sort((a, b) => {
        if (!a.validadeEstimada) return 1;
        if (!b.validadeEstimada) return -1;
        return new Date(a.validadeEstimada).getTime() - new Date(b.validadeEstimada).getTime();
      });

    if (activeLots.length === 0) {
      return { movimentosCriados: [], sucesso: false };
    }

    let restanteParaBaixar = Math.max(0, quantidadeConsumida);
    const criados: Movimento[] = [];

    for (const lote of activeLots) {
      if (restanteParaBaixar <= 0) break;

      const qtdDisponivel = lote.quantidadeRestante;
      const abatimento = Math.min(qtdDisponivel, restanteParaBaixar);

      lote.quantidadeRestante = Number((lote.quantidadeRestante - abatimento).toFixed(2));
      restanteParaBaixar = Number((restanteParaBaixar - abatimento).toFixed(2));

      if (lote.quantidadeRestante <= 0.001) {
        lote.quantidadeRestante = 0;
        lote.status = 'acabou';
      }

      const mov: Movimento = {
        id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        loteId: lote.id,
        produtoId,
        tipo: lote.status === 'acabou' ? 'acabou' : 'consumo',
        delta: abatimento,
        origem,
        criadoEm: new Date().toISOString(),
        descricao: `Consumido ${abatimento} ${lote.unidade}`,
      };

      criados.push(mov);
      movimentos.unshift(mov);
    }

    localStorage.setItem(STORAGE_KEYS.LOTES, JSON.stringify(lotes));
    localStorage.setItem(STORAGE_KEYS.MOVIMENTOS, JSON.stringify(movimentos));
    notifyListeners();
    return { movimentosCriados: criados, sucesso: true };
  },

  // 1-Tap "Acabou!" button
  marcarAcabou(produtoId: string): { movimentosCriados: Movimento[] } {
    const lotes = PantryStore.getLotes();
    const movimentos = PantryStore.getMovimentos();

    const activeLots = lotes.filter(
      l => l.produtoId === produtoId && l.status === 'ativo' && l.quantidadeRestante > 0
    );

    const criados: Movimento[] = [];

    for (const l of activeLots) {
      const abatimento = l.quantidadeRestante;
      l.quantidadeRestante = 0;
      l.status = 'acabou';

      const mov: Movimento = {
        id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        loteId: l.id,
        produtoId,
        tipo: 'acabou',
        delta: abatimento,
        origem: 'manual',
        criadoEm: new Date().toISOString(),
        descricao: `Item esgotado (${abatimento} ${l.unidade})`,
      };

      criados.push(mov);
      movimentos.unshift(mov);
    }

    localStorage.setItem(STORAGE_KEYS.LOTES, JSON.stringify(lotes));
    localStorage.setItem(STORAGE_KEYS.MOVIMENTOS, JSON.stringify(movimentos));
    notifyListeners();
    return { movimentosCriados: criados };
  },

  // Instant Undo for last movements
  desfazerMovimentos(movimentoIds: string[]): boolean {
    const lotes = PantryStore.getLotes();
    let movimentos = PantryStore.getMovimentos();

    const toUndo = movimentos.filter(m => movimentoIds.includes(m.id));
    if (toUndo.length === 0) return false;

    for (const mov of toUndo) {
      const lote = lotes.find(l => l.id === mov.loteId);
      if (lote) {
        lote.quantidadeRestante = Number((lote.quantidadeRestante + mov.delta).toFixed(2));
        lote.status = 'ativo';
      }
    }

    // Remove undone movements
    movimentos = movimentos.filter(m => !movimentoIds.includes(m.id));

    localStorage.setItem(STORAGE_KEYS.LOTES, JSON.stringify(lotes));
    localStorage.setItem(STORAGE_KEYS.MOVIMENTOS, JSON.stringify(movimentos));
    notifyListeners();
    return true;
  },

  // Execute "Cozinhei esta!" recipe deduction
  cozinharReceita(
    receita: Receita,
    ingredientesUsados: Array<{ produtoId: string; quantidade: number }>
  ): { movimentosCriados: Movimento[] } {
    const todosCriados: Movimento[] = [];

    for (const ing of ingredientesUsados) {
      if (!ing.produtoId || ing.quantidade <= 0) continue;
      const res = PantryStore.consumirItem(
        ing.produtoId,
        ing.quantidade,
        `receita:${receita.id}`
      );
      todosCriados.push(...res.movimentosCriados);
    }

    // Record cooked recipe in history
    try {
      const feitas = PantryStore.getReceitasFeitas();
      feitas.unshift({
        id: receita.id || `rec_${Date.now()}`,
        titulo: receita.titulo,
        refeicao: receita.refeicao,
        data: new Date().toISOString(),
      });
      localStorage.setItem(STORAGE_KEYS.RECEITAS_FEITAS, JSON.stringify(feitas));
    } catch {}

    notifyListeners();
    return { movimentosCriados: todosCriados };
  },

  getReceitasFeitas(): Array<{ id: string; titulo: string; refeicao?: string; data: string }> {
    const raw = localStorage.getItem(STORAGE_KEYS.RECEITAS_FEITAS);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    // Fallback: derive from movimentos with origem starting with 'receita:'
    const movimentos = PantryStore.getMovimentos();
    const receitaMovs = movimentos.filter(m => m.origem && m.origem.startsWith('receita:'));
    const uniqueEvents = new Set(receitaMovs.map(m => m.criadoEm.slice(0, 19)));
    return Array.from(uniqueEvents).map((d, i) => ({
      id: `rec_prev_${i}`,
      titulo: 'Receita Preparada',
      data: d,
    }));
  },

  getReceitasFeitasCount(): number {
    return PantryStore.getReceitasFeitas().length;
  },

  // Add a quick manual item to pantry (for fallback / manual entry)
  adicionarItemManual(item: {
    nome: string;
    categoria: Produto['categoria'];
    emoji: string;
    quantidade: number;
    unidade: Produto['unidadePadrao'];
    validadeDias: number;
    preco?: number;
    proteinaAnimal?: boolean;
    derivadoAnimal?: boolean;
  }) {
    const produtos = PantryStore.getProdutos();
    const lotes = PantryStore.getLotes();

    // Look for existing product or create new
    let prod = produtos.find(p => p.nomeCanonico.toLowerCase() === item.nome.trim().toLowerCase());

    const isProteina =
      item.proteinaAnimal !== undefined ? item.proteinaAnimal : item.categoria === 'carnes';
    const isDerivado =
      item.derivadoAnimal !== undefined ? item.derivadoAnimal : item.categoria === 'laticinios';

    if (!prod) {
      prod = {
        id: generateUniqueId('prod_manual'),
        nomeCanonico: item.nome.trim(),
        aliases: [item.nome.trim().toUpperCase()],
        categoria: item.categoria,
        emoji: item.emoji || '📦',
        unidadePadrao: item.unidade,
        conteudoPorUnidade: 1,
        proteinaAnimal: isProteina,
        derivadoAnimal: isDerivado,
        perecivel: item.validadeDias < 30,
        validadePadraoDias: item.validadeDias,
        ehAlimento: item.categoria !== 'limpeza',
      };
      produtos.push(prod);
      localStorage.setItem(STORAGE_KEYS.PRODUTOS, JSON.stringify(produtos));
    }

    const valDate = new Date();
    valDate.setDate(valDate.getDate() + item.validadeDias);

    const novoLote: Lote = {
      id: generateUniqueId('lote_manual'),
      produtoId: prod.id,
      nomeBruto: item.nome.trim(),
      quantidadeInicial: item.quantidade,
      quantidadeRestante: item.quantidade,
      unidade: item.unidade,
      precoUnitario: item.preco || 0,
      compradoEm: new Date().toISOString(),
      validadeEstimada: valDate.toISOString(),
      status: 'ativo',
    };

    lotes.push(novoLote);
    localStorage.setItem(STORAGE_KEYS.LOTES, JSON.stringify(lotes));
    notifyListeners();
  },

  // --- ESSENCIAIS & LISTA DE COMPRAS ---
  getEssenciais(): ItemEssencial[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ESSENCIAIS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ESSENCIAIS, JSON.stringify(DEFAULT_ESSENCIAIS));
      return DEFAULT_ESSENCIAIS;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      if (Array.isArray(parsed) && parsed.length === 0) {
        localStorage.setItem(STORAGE_KEYS.ESSENCIAIS, JSON.stringify(DEFAULT_ESSENCIAIS));
        return DEFAULT_ESSENCIAIS;
      }
    } catch {}
    localStorage.setItem(STORAGE_KEYS.ESSENCIAIS, JSON.stringify(DEFAULT_ESSENCIAIS));
    return DEFAULT_ESSENCIAIS;
  },

  getEssenciaisComStatus(): Array<ItemEssencial & { estoqueAtual: number; emFalta: boolean; produto?: Produto }> {
    const essenciais = PantryStore.getEssenciais();
    const itemsDespensa = PantryStore.getItemsDespensa();
    const produtos = PantryStore.getProdutos();

    return essenciais.map(ess => {
      // Find matching item in pantry by product ID or by exact canonical name match
      let match = itemsDespensa.find(i => ess.produtoId && i.produto.id === ess.produtoId);
      if (!match) {
        match = itemsDespensa.find(
          i => i.produto.nomeCanonico.toLowerCase().trim() === ess.nome.toLowerCase().trim()
        );
      }

      const matchingProduto = match?.produto || produtos.find(p => p.id === ess.produtoId);
      const estoqueAtual = match ? match.quantidadeTotal : 0;
      const emFalta = estoqueAtual < ess.quantidadeMinima;

      return {
        ...ess,
        estoqueAtual,
        emFalta,
        produto: matchingProduto,
      };
    });
  },

  adicionarEssencial(item: Omit<ItemEssencial, 'id' | 'criadoEm'>): ItemEssencial {
    const essenciais = PantryStore.getEssenciais();
    const novo: ItemEssencial = {
      ...item,
      id: `ess_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      criadoEm: new Date().toISOString(),
    };
    essenciais.push(novo);
    localStorage.setItem(STORAGE_KEYS.ESSENCIAIS, JSON.stringify(essenciais));
    notifyListeners();
    return novo;
  },

  removerEssencial(id: string) {
    const essenciais = PantryStore.getEssenciais().filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.ESSENCIAIS, JSON.stringify(essenciais));
    notifyListeners();
  },

  isProdutoEssencial(produtoId: string): boolean {
    const essenciais = PantryStore.getEssenciais();
    return essenciais.some(e => e.produtoId === produtoId);
  },

  toggleEssencialProduto(produto: Produto, quantidadeMinima = 1): boolean {
    const essenciais = PantryStore.getEssenciais();
    const existingIndex = essenciais.findIndex(e => e.produtoId === produto.id || e.nome.toLowerCase() === produto.nomeCanonico.toLowerCase());

    if (existingIndex >= 0) {
      essenciais.splice(existingIndex, 1);
      localStorage.setItem(STORAGE_KEYS.ESSENCIAIS, JSON.stringify(essenciais));
      notifyListeners();
      return false; // Removed
    } else {
      const novo: ItemEssencial = {
        id: `ess_${Date.now()}`,
        nome: produto.nomeCanonico,
        categoria: produto.categoria,
        emoji: produto.emoji,
        unidadePadrao: produto.unidadePadrao,
        quantidadeMinima,
        produtoId: produto.id,
        criadoEm: new Date().toISOString(),
      };
      essenciais.push(novo);
      localStorage.setItem(STORAGE_KEYS.ESSENCIAIS, JSON.stringify(essenciais));
      notifyListeners();
      return true; // Added
    }
  },

  getListaCompras(): ItemListaCompras[] {
    const raw = localStorage.getItem(STORAGE_KEYS.LISTA_COMPRAS);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  },

  adicionarItemLista(item: Omit<ItemListaCompras, 'id' | 'criadoEm'>): ItemListaCompras {
    const lista = PantryStore.getListaCompras();
    // If item already exists unbought, increment quantity
    const existing = lista.find(
      i => !i.comprado && i.nome.toLowerCase().trim() === item.nome.toLowerCase().trim()
    );

    if (existing) {
      existing.quantidade = Number((existing.quantidade + item.quantidade).toFixed(2));
      localStorage.setItem(STORAGE_KEYS.LISTA_COMPRAS, JSON.stringify(lista));
      notifyListeners();
      return existing;
    }

    const novo: ItemListaCompras = {
      ...item,
      id: `compra_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      criadoEm: new Date().toISOString(),
    };
    lista.unshift(novo);
    localStorage.setItem(STORAGE_KEYS.LISTA_COMPRAS, JSON.stringify(lista));
    notifyListeners();
    return novo;
  },

  toggleItemLista(id: string) {
    const lista = PantryStore.getListaCompras();
    const item = lista.find(i => i.id === id);
    if (item) {
      item.comprado = !item.comprado;
      localStorage.setItem(STORAGE_KEYS.LISTA_COMPRAS, JSON.stringify(lista));
      notifyListeners();
    }
  },

  removerItemLista(id: string) {
    const lista = PantryStore.getListaCompras().filter(i => i.id !== id);
    localStorage.setItem(STORAGE_KEYS.LISTA_COMPRAS, JSON.stringify(lista));
    notifyListeners();
  },

  limparComprados() {
    const lista = PantryStore.getListaCompras().filter(i => !i.comprado);
    localStorage.setItem(STORAGE_KEYS.LISTA_COMPRAS, JSON.stringify(lista));
    notifyListeners();
  },

  adicionarFaltantesParaLista(): { adicionadosCount: number } {
    const essenciaisComStatus = PantryStore.getEssenciaisComStatus();
    const faltantes = essenciaisComStatus.filter(e => e.emFalta);
    const listaAtual = PantryStore.getListaCompras();

    let count = 0;
    for (const ess of faltantes) {
      const jaNaLista = listaAtual.some(
        l => !l.comprado && l.nome.toLowerCase().trim() === ess.nome.toLowerCase().trim()
      );

      if (!jaNaLista) {
        const deficit = Math.max(1, ess.quantidadeMinima - ess.estoqueAtual);
        listaAtual.push({
          id: `compra_${Date.now()}_${count}`,
          nome: ess.nome,
          categoria: ess.categoria,
          emoji: ess.emoji,
          quantidade: deficit,
          unidade: ess.unidadePadrao,
          comprado: false,
          essencialId: ess.id,
          criadoEm: new Date().toISOString(),
        });
        count++;
      }
    }

    localStorage.setItem(STORAGE_KEYS.LISTA_COMPRAS, JSON.stringify(listaAtual));
    notifyListeners();
    return { adicionadosCount: count };
  },

  // Meal Prep / Marmitas da Semana Store
  getMealPrepConfig(): MealPrepConfig {
    const raw = localStorage.getItem(STORAGE_KEYS.MEALPREP_CONFIG);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {}
    }
    return {
      numMarmitas: 5,
      metaProteina: 30,
      metaCarbo: 60,
      metaGordura: null,
      metaLegumes: 150,
      tipoMeta: 'nutriente',
      dieta: PantryStore.getConfig().dietaPadrao,
      numPratos: 1,
      preferenciasProteina: [],
      preferenciasCarbo: [],
      priorizarDespensa: true,
      observacoes: '',
    };
  },

  saveMealPrepConfig(config: MealPrepConfig): void {
    localStorage.setItem(STORAGE_KEYS.MEALPREP_CONFIG, JSON.stringify(config));
    notifyListeners();
  },

  getMealPrepPlanos(): PlanoMarmita[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MEALPREP_PLANOS);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  },

  saveMealPrepPlano(plano: PlanoMarmita): void {
    const planos = PantryStore.getMealPrepPlanos().filter(p => p.id !== plano.id);
    planos.unshift(plano);
    // Keep maximum 10 plans
    const trimmed = planos.slice(0, 10);
    localStorage.setItem(STORAGE_KEYS.MEALPREP_PLANOS, JSON.stringify(trimmed));
    notifyListeners();
  },

  deleteMealPrepPlano(id: string): void {
    const planos = PantryStore.getMealPrepPlanos().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.MEALPREP_PLANOS, JSON.stringify(planos));
    notifyListeners();
  },

  getMealPrepVistos(): string[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MEALPREP_VISTOS);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  },

  addMealPrepVistos(titulos: string[]): void {
    const current = PantryStore.getMealPrepVistos();
    const combined = Array.from(new Set([...titulos, ...current]));
    const trimmed = combined.slice(0, 20);
    localStorage.setItem(STORAGE_KEYS.MEALPREP_VISTOS, JSON.stringify(trimmed));
  },

  // Full backup & restore
  exportJson(): string {
    const data = {
      produtos: PantryStore.getProdutos(),
      lotes: PantryStore.getLotes(),
      notas: PantryStore.getNotas(),
      movimentos: PantryStore.getMovimentos(),
      config: PantryStore.getConfig(),
      favoritas: PantryStore.getFavoritas(),
      mealPrepConfig: PantryStore.getMealPrepConfig(),
      mealPrepPlanos: PantryStore.getMealPrepPlanos(),
      mealPrepVistos: PantryStore.getMealPrepVistos(),
      exportDate: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  },

  importJson(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (Array.isArray(data.produtos)) localStorage.setItem(STORAGE_KEYS.PRODUTOS, JSON.stringify(data.produtos));
      if (Array.isArray(data.lotes)) localStorage.setItem(STORAGE_KEYS.LOTES, JSON.stringify(data.lotes));
      if (Array.isArray(data.notas)) localStorage.setItem(STORAGE_KEYS.NOTAS, JSON.stringify(data.notas));
      if (Array.isArray(data.movimentos)) localStorage.setItem(STORAGE_KEYS.MOVIMENTOS, JSON.stringify(data.movimentos));
      if (data.config) localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(data.config));
      if (Array.isArray(data.favoritas)) localStorage.setItem(STORAGE_KEYS.FAVORITAS, JSON.stringify(data.favoritas));
      if (data.mealPrepConfig) localStorage.setItem(STORAGE_KEYS.MEALPREP_CONFIG, JSON.stringify(data.mealPrepConfig));
      if (Array.isArray(data.mealPrepPlanos)) localStorage.setItem(STORAGE_KEYS.MEALPREP_PLANOS, JSON.stringify(data.mealPrepPlanos));
      if (Array.isArray(data.mealPrepVistos)) localStorage.setItem(STORAGE_KEYS.MEALPREP_VISTOS, JSON.stringify(data.mealPrepVistos));
      notifyListeners();
      return true;
    } catch {
      return false;
    }
  },

  resetToDefault() {
    localStorage.clear();
    PantryStore.getProdutos(); // Re-seed
    notifyListeners();
  },
};
