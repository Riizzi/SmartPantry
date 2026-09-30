import {
  MealPrepConfig,
  PratoMarmita,
  PlanoMarmita,
  IngredienteMarmitaRaw,
  IngredienteMarmitaCalculado,
  IngredienteMarmitaNutri,
  ItemDespensa,
} from '../types/pantry';
import { PantryStore } from './storage';

// ----------------------------------------------------
// 1. Tabela Nutricional de Referência (Alimento Cozido / 100g)
// ----------------------------------------------------
export interface NutriRef {
  nome: string;
  keywords: string[];
  papel: 'proteina' | 'carbo' | 'legume' | 'gordura';
  por100g: IngredienteMarmitaNutri;
  rendimento: number; // cooked / raw ratio
  emoji: string;
}

export const TABELA_NUTRI: NutriRef[] = [
  {
    nome: 'Arroz branco cozido',
    keywords: ['arroz branco', 'arroz agulhinha', 'arroz'],
    papel: 'carbo',
    por100g: { kcal: 128, proteina: 2.5, carbo: 28, gordura: 0.2 },
    rendimento: 2.4,
    emoji: '🍚',
  },
  {
    nome: 'Arroz integral cozido',
    keywords: ['arroz integral'],
    papel: 'carbo',
    por100g: { kcal: 124, proteina: 2.6, carbo: 26, gordura: 1.0 },
    rendimento: 2.4,
    emoji: '🌾',
  },
  {
    nome: 'Feijão carioca cozido',
    keywords: ['feijao', 'feijao carioca', 'feijao preto'],
    papel: 'carbo',
    por100g: { kcal: 76, proteina: 4.8, carbo: 13.6, gordura: 0.5 },
    rendimento: 2.3,
    emoji: '🫘',
  },
  {
    nome: 'Lentilha cozida',
    keywords: ['lentilha'],
    papel: 'carbo',
    por100g: { kcal: 93, proteina: 6.3, carbo: 16.3, gordura: 0.5 },
    rendimento: 2.3,
    emoji: '🥣',
  },
  {
    nome: 'Grão-de-bico cozido',
    keywords: ['grao de bico', 'grao-de-bico'],
    papel: 'carbo',
    por100g: { kcal: 130, proteina: 7.0, carbo: 21.0, gordura: 2.5 },
    rendimento: 2.3,
    emoji: '🫘',
  },
  {
    nome: 'Macarrão cozido',
    keywords: ['macarrao', 'espaguete', 'penne', 'massa'],
    papel: 'carbo',
    por100g: { kcal: 130, proteina: 4.5, carbo: 26.0, gordura: 0.6 },
    rendimento: 2.2,
    emoji: '🍝',
  },
  {
    nome: 'Batata inglesa cozida',
    keywords: ['batata inglesa', 'batata cozida', 'batata'],
    papel: 'carbo',
    por100g: { kcal: 52, proteina: 1.2, carbo: 11.9, gordura: 0.0 },
    rendimento: 0.95,
    emoji: '🥔',
  },
  {
    nome: 'Batata-doce cozida',
    keywords: ['batata doce', 'batata-doce'],
    papel: 'carbo',
    por100g: { kcal: 77, proteina: 0.6, carbo: 18.4, gordura: 0.1 },
    rendimento: 0.95,
    emoji: '🍠',
  },
  {
    nome: 'Mandioca cozida',
    keywords: ['mandioca', 'aipim', 'macaxeira'],
    papel: 'carbo',
    por100g: { kcal: 125, proteina: 0.6, carbo: 30.0, gordura: 0.3 },
    rendimento: 0.95,
    emoji: '🥔',
  },
  {
    nome: 'Quinoa cozida',
    keywords: ['quinoa'],
    papel: 'carbo',
    por100g: { kcal: 120, proteina: 4.4, carbo: 21.0, gordura: 1.9 },
    rendimento: 2.5,
    emoji: '🌾',
  },
  {
    nome: 'Peito de frango grelhado',
    keywords: ['peito de frango', 'frango grelhado', 'frango', 'file de frango'],
    papel: 'proteina',
    por100g: { kcal: 159, proteina: 32.0, carbo: 0.0, gordura: 2.5 },
    rendimento: 0.75,
    emoji: '🍗',
  },
  {
    nome: 'Coxa de frango sem pele cozida',
    keywords: ['coxa de frango', 'sobrecoxa'],
    papel: 'proteina',
    por100g: { kcal: 170, proteina: 27.0, carbo: 0.0, gordura: 6.0 },
    rendimento: 0.75,
    emoji: '🍗',
  },
  {
    nome: 'Patinho moído cozido',
    keywords: ['patinho', 'carne moida', 'patinho moido'],
    papel: 'proteina',
    por100g: { kcal: 219, proteina: 35.9, carbo: 0.0, gordura: 7.3 },
    rendimento: 0.7,
    emoji: '🥩',
  },
  {
    nome: 'Alcatra grelhada',
    keywords: ['alcatra', 'bife bovino', 'carne bovina'],
    papel: 'proteina',
    por100g: { kcal: 240, proteina: 31.0, carbo: 0.0, gordura: 12.0 },
    rendimento: 0.75,
    emoji: '🥩',
  },
  {
    nome: 'Tilápia/peixe branco grelhado',
    keywords: ['tilapia', 'peixe branco', 'file de peixe', 'peixe'],
    papel: 'proteina',
    por100g: { kcal: 128, proteina: 26.0, carbo: 0.0, gordura: 2.7 },
    rendimento: 0.8,
    emoji: '🐟',
  },
  {
    nome: 'Ovo cozido',
    keywords: ['ovo', 'ovos', 'ovo cozido', 'omelete'],
    papel: 'proteina',
    por100g: { kcal: 146, proteina: 13.0, carbo: 0.6, gordura: 9.5 },
    rendimento: 1.0,
    emoji: '🥚',
  },
  {
    nome: 'Carne suína lombo assado',
    keywords: ['lombo', 'carne suina', 'porco'],
    papel: 'proteina',
    por100g: { kcal: 210, proteina: 30.0, carbo: 0.0, gordura: 9.0 },
    rendimento: 0.75,
    emoji: '🥓',
  },
  {
    nome: 'Tofu',
    keywords: ['tofu', 'soja'],
    papel: 'proteina',
    por100g: { kcal: 76, proteina: 8.0, carbo: 1.9, gordura: 4.8 },
    rendimento: 1.0,
    emoji: '🧊',
  },
  {
    nome: 'Brócolis cozido',
    keywords: ['brocolis'],
    papel: 'legume',
    por100g: { kcal: 25, proteina: 2.1, carbo: 4.4, gordura: 0.5 },
    rendimento: 0.9,
    emoji: '🥦',
  },
  {
    nome: 'Cenoura cozida',
    keywords: ['cenoura'],
    papel: 'legume',
    por100g: { kcal: 30, proteina: 0.8, carbo: 6.7, gordura: 0.2 },
    rendimento: 0.9,
    emoji: '🥕',
  },
  {
    nome: 'Abobrinha cozida',
    keywords: ['abobrinha'],
    papel: 'legume',
    por100g: { kcal: 17, proteina: 1.1, carbo: 3.0, gordura: 0.2 },
    rendimento: 0.9,
    emoji: '🥒',
  },
  {
    nome: 'Couve-flor cozida',
    keywords: ['couve flor', 'couve-flor'],
    papel: 'legume',
    por100g: { kcal: 23, proteina: 1.9, carbo: 4.5, gordura: 0.3 },
    rendimento: 0.9,
    emoji: '🥦',
  },
  {
    nome: 'Vagem cozida',
    keywords: ['vagem'],
    papel: 'legume',
    por100g: { kcal: 25, proteina: 1.5, carbo: 5.5, gordura: 0.2 },
    rendimento: 0.9,
    emoji: '🫛',
  },
  {
    nome: 'Abóbora cozida',
    keywords: ['abobora', 'cabotia'],
    papel: 'legume',
    por100g: { kcal: 30, proteina: 0.8, carbo: 7.0, gordura: 0.1 },
    rendimento: 0.9,
    emoji: '🎃',
  },
  {
    nome: 'Chuchu cozido',
    keywords: ['chuchu'],
    papel: 'legume',
    por100g: { kcal: 19, proteina: 0.4, carbo: 4.8, gordura: 0.0 },
    rendimento: 0.9,
    emoji: '🥬',
  },
  {
    nome: 'Azeite de oliva',
    keywords: ['azeite', 'oleo'],
    papel: 'gordura',
    por100g: { kcal: 900, proteina: 0.0, carbo: 0.0, gordura: 100.0 },
    rendimento: 1.0,
    emoji: '🫒',
  },
];

// Helper to normalize strings (remove accents and lowercase)
export function normalizeStr(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Find closest reference match from TABELA_NUTRI
export function matchNutriRef(name: string): NutriRef | null {
  const norm = normalizeStr(name);
  for (const ref of TABELA_NUTRI) {
    for (const kw of ref.keywords) {
      if (norm.includes(kw)) {
        return ref;
      }
    }
  }
  return null;
}

// ----------------------------------------------------
// 2. Solver Determinístico por Prato
// ----------------------------------------------------
export function solveDishMealPrep(
  dishRaw: {
    nome: string;
    descricao: string;
    tempoTotalMin: number;
    modoPreparo: string[];
    armazenamento: string;
    dicaReaquecer: string;
    source: 'ia' | 'reserva';
    ingredientes: IngredienteMarmitaRaw[];
  },
  config: MealPrepConfig,
  numMarmitasDoPrato: number,
  pantryItems: ItemDespensa[]
): PratoMarmita {
  const sanitized = dishRaw.ingredientes.map(ing => {
    const ref = matchNutriRef(ing.nome);
    let por100g = { ...ing.por100g };
    let rendimento = ing.rendimentoCozinha || 1.0;
    let estimado = false;

    if (ref) {
      // Check divergence > 25% on calories or macros
      const diffP = Math.abs((por100g.proteina || 0) - ref.por100g.proteina) / (ref.por100g.proteina || 1);
      const diffC = Math.abs((por100g.carbo || 0) - ref.por100g.carbo) / (ref.por100g.carbo || 1);
      if (diffP > 0.25 || diffC > 0.25 || !por100g.kcal) {
        por100g = { ...ref.por100g };
        rendimento = ref.rendimento;
      }
    } else {
      estimado = true;
      if (!rendimento || rendimento <= 0) {
        rendimento = ing.papel === 'proteina' ? 0.75 : ing.papel === 'carbo' ? 2.3 : 0.9;
      }
    }

    return {
      ...ing,
      por100g,
      rendimentoCozinha: rendimento,
      estimado,
      proporcaoNoPapel: ing.proporcaoNoPapel > 0 ? ing.proporcaoNoPapel : 1.0,
    };
  });

  // Separate by papel
  const proteinaGroup = sanitized.filter(i => i.papel === 'proteina');
  const carboGroup = sanitized.filter(i => i.papel === 'carbo');
  const legumeGroup = sanitized.filter(i => i.papel === 'legume');
  const temperos = sanitized.filter(i => i.papel === 'tempero');

  // Normalize proportions inside groups if missing
  const normalizeGroupProps = (group: typeof sanitized) => {
    const sum = group.reduce((acc, it) => acc + (it.proporcaoNoPapel || 0), 0);
    if (sum > 0) {
      group.forEach(it => (it.proporcaoNoPapel = it.proporcaoNoPapel / sum));
    } else if (group.length > 0) {
      group.forEach(it => (it.proporcaoNoPapel = 1 / group.length));
    }
  };
  normalizeGroupProps(proteinaGroup);
  normalizeGroupProps(carboGroup);
  normalizeGroupProps(legumeGroup);

  // Fallback defaults if groups are completely empty
  if (proteinaGroup.length === 0) {
    const defRef = TABELA_NUTRI.find(t => t.nome.includes('frango'))!;
    proteinaGroup.push({
      nome: 'Peito de frango grelhado',
      papel: 'proteina',
      proporcaoNoPapel: 1,
      estado: 'cozido',
      por100g: defRef.por100g,
      rendimentoCozinha: defRef.rendimento,
      estimado: false,
    });
  }

  if (carboGroup.length === 0) {
    const defRef = TABELA_NUTRI.find(t => t.nome.includes('Arroz branco'))!;
    carboGroup.push({
      nome: 'Arroz branco cozido',
      papel: 'carbo',
      proporcaoNoPapel: 1,
      estado: 'cozido',
      por100g: defRef.por100g,
      rendimentoCozinha: defRef.rendimento,
      estimado: false,
    });
  }

  if (legumeGroup.length === 0) {
    const defRef = TABELA_NUTRI.find(t => t.nome.includes('Brócolis'))!;
    legumeGroup.push({
      nome: 'Brócolis cozido',
      papel: 'legume',
      proporcaoNoPapel: 1,
      estado: 'cozido',
      por100g: defRef.por100g,
      rendimentoCozinha: defRef.rendimento,
      estimado: false,
    });
  }

  // Determine Target Nutrient Grams
  let pAlvo = config.metaProteina;
  let cAlvo = config.metaCarbo;

  if (config.tipoMeta === 'alimento') {
    // If user specified food weight, convert to nutrient grams
    const pRefP = proteinaGroup.reduce((acc, it) => acc + (it.por100g.proteina * it.proporcaoNoPapel) / 100, 0);
    const cRefC = carboGroup.reduce((acc, it) => acc + (it.por100g.carbo * it.proporcaoNoPapel) / 100, 0);
    pAlvo = config.metaProteina * (pRefP > 0 ? pRefP : 0.3);
    cAlvo = config.metaCarbo * (cRefC > 0 ? cRefC : 0.28);
  }

  // 1. Calculate contribution from legumes and olive oil
  const metaLegumesG = config.metaLegumes || 150;
  let vegP = 0;
  let vegC = 0;
  let vegG = 0;
  let vegKcal = 0;

  legumeGroup.forEach(leg => {
    const gLegume = metaLegumesG * leg.proporcaoNoPapel;
    vegP += (leg.por100g.proteina * gLegume) / 100;
    vegC += (leg.por100g.carbo * gLegume) / 100;
    vegG += (leg.por100g.gordura * gLegume) / 100;
    vegKcal += (leg.por100g.kcal * gLegume) / 100;
  });

  // Olive oil cooking fat: 5g
  const azeiteG = 5;
  const azeiteGordura = 5;
  const azeiteKcal = 45;

  // 2. Weighted average per 100g of protein and carbo groups
  const pP = proteinaGroup.reduce((acc, it) => acc + it.por100g.proteina * it.proporcaoNoPapel, 0);
  const pC = proteinaGroup.reduce((acc, it) => acc + it.por100g.carbo * it.proporcaoNoPapel, 0);

  const cP = carboGroup.reduce((acc, it) => acc + it.por100g.proteina * it.proporcaoNoPapel, 0);
  const cC = carboGroup.reduce((acc, it) => acc + it.por100g.carbo * it.proporcaoNoPapel, 0);

  // 3. Solve 2x2 system:
  // pP·gP + cP·gC = pAlvo - vegP
  // pC·gP + cC·gC = cAlvo - vegC
  // (with g in units of 100g food)
  const targetP_rem = Math.max(0, pAlvo - vegP);
  const targetC_rem = Math.max(0, cAlvo - vegC);

  const det = pP * cC - cP * pC;
  let gP = 0;
  let gC = 0;

  if (Math.abs(det) < 0.0001) {
    gC = targetC_rem / (cC || 1);
    gP = Math.max(0, (targetP_rem - cP * gC) / (pP || 1));
  } else {
    gP = (targetP_rem * cC - targetC_rem * cP) / det;
    gC = (pP * targetC_rem - pC * targetP_rem) / det;

    if (gP < 0 || gC < 0) {
      gC = Math.max(0, targetC_rem / (cC || 1));
      gP = Math.max(0, (targetP_rem - cP * gC) / (pP || 1));
    }
  }

  // Convert to actual grams of food per meal
  const totalProtFoodG = Math.max(10, Math.round(gP * 100));
  const totalCarbFoodG = Math.max(10, Math.round(gC * 100));

  // Build list of calculated ingredients
  const allCalculated: IngredienteMarmitaCalculado[] = [];

  // Helper to find pantry item in stock
  const findPantryStock = (name: string): { produtoId?: string; estoqueKg: number } => {
    const norm = normalizeStr(name);
    const item = pantryItems.find(p => {
      const pNorm = normalizeStr(p.produto.nomeCanonico);
      return (
        norm.includes(pNorm) ||
        pNorm.includes(norm) ||
        p.produto.aliases.some(a => normalizeStr(a).includes(norm) || norm.includes(normalizeStr(a)))
      );
    });

    if (!item) return { estoqueKg: 0 };

    let inKg = item.quantidadeTotal;
    if (item.produto.unidadePadrao === 'g' || item.produto.unidadePadrao === 'ml') {
      inKg = item.quantidadeTotal / 1000;
    } else if (item.produto.unidadePadrao === 'un') {
      // 1 egg ~ 0.05kg
      inKg = item.quantidadeTotal * 0.05;
    }
    return { produtoId: item.produto.id, estoqueKg: Math.round(inKg * 100) / 100 };
  };

  // 1. Proteins
  proteinaGroup.forEach(it => {
    const gPorMarmita = Math.round(totalProtFoodG * it.proporcaoNoPapel);
    const totalCozidoG = gPorMarmita * numMarmitasDoPrato;
    const rawRatio = it.rendimentoCozinha > 0 ? it.rendimentoCozinha : 0.75;
    const rawG = totalCozidoG / rawRatio;
    const totalCruKg = Math.ceil(rawG / 50) * 50 / 1000;
    const stock = findPantryStock(it.nome);
    const faltaKg = Math.max(0, Math.round((totalCruKg - stock.estoqueKg) * 100) / 100);

    allCalculated.push({
      ...it,
      gramasPorMarmita: gPorMarmita,
      totalCozidoG,
      totalCruKg: Math.round(totalCruKg * 100) / 100,
      emEstoqueKg: stock.estoqueKg,
      faltaKg,
      produtoIdDespensa: stock.produtoId,
    });
  });

  // 2. Carbs
  carboGroup.forEach(it => {
    const gPorMarmita = Math.round(totalCarbFoodG * it.proporcaoNoPapel);
    const totalCozidoG = gPorMarmita * numMarmitasDoPrato;
    const rawRatio = it.rendimentoCozinha > 0 ? it.rendimentoCozinha : 2.3;
    const rawG = totalCozidoG / rawRatio;
    const totalCruKg = Math.ceil(rawG / 50) * 50 / 1000;
    const stock = findPantryStock(it.nome);
    const faltaKg = Math.max(0, Math.round((totalCruKg - stock.estoqueKg) * 100) / 100);

    allCalculated.push({
      ...it,
      gramasPorMarmita: gPorMarmita,
      totalCozidoG,
      totalCruKg: Math.round(totalCruKg * 100) / 100,
      emEstoqueKg: stock.estoqueKg,
      faltaKg,
      produtoIdDespensa: stock.produtoId,
    });
  });

  // 3. Legumes
  legumeGroup.forEach(it => {
    const gPorMarmita = Math.round(metaLegumesG * it.proporcaoNoPapel);
    const totalCozidoG = gPorMarmita * numMarmitasDoPrato;
    const rawRatio = it.rendimentoCozinha > 0 ? it.rendimentoCozinha : 0.9;
    const rawG = totalCozidoG / rawRatio;
    const totalCruKg = Math.ceil(rawG / 50) * 50 / 1000;
    const stock = findPantryStock(it.nome);
    const faltaKg = Math.max(0, Math.round((totalCruKg - stock.estoqueKg) * 100) / 100);

    allCalculated.push({
      ...it,
      gramasPorMarmita: gPorMarmita,
      totalCozidoG,
      totalCruKg: Math.round(totalCruKg * 100) / 100,
      emEstoqueKg: stock.estoqueKg,
      faltaKg,
      produtoIdDespensa: stock.produtoId,
    });
  });

  // 4. Olive oil & Seasonings
  allCalculated.push({
    nome: 'Azeite de oliva extra virgem',
    papel: 'gordura',
    proporcaoNoPapel: 1,
    estado: 'cru',
    por100g: { kcal: 900, proteina: 0, carbo: 0, gordura: 100 },
    rendimentoCozinha: 1.0,
    gramasPorMarmita: azeiteG,
    totalCozidoG: azeiteG * numMarmitasDoPrato,
    totalCruKg: (azeiteG * numMarmitasDoPrato) / 1000,
    emEstoqueKg: 0.5,
    faltaKg: 0,
    observacao: 'Fio de azeite para cocção e sabor',
  });

  temperos.forEach(t => {
    allCalculated.push({
      ...t,
      gramasPorMarmita: 0,
      totalCozidoG: 0,
      totalCruKg: 0,
      emEstoqueKg: 0,
      faltaKg: 0,
      observacao: 'A gosto',
    });
  });

  // Calculate actual macros per meal achieved
  let totP = 0;
  let totC = 0;
  let totG = 0;
  let totKcal = 0;

  allCalculated.forEach(it => {
    if (it.gramasPorMarmita > 0) {
      totP += (it.por100g.proteina * it.gramasPorMarmita) / 100;
      totC += (it.por100g.carbo * it.gramasPorMarmita) / 100;
      totG += (it.por100g.gordura * it.gramasPorMarmita) / 100;
      totKcal += (it.por100g.kcal * it.gramasPorMarmita) / 100;
    }
  });

  totP = Math.round(totP * 10) / 10;
  totC = Math.round(totC * 10) / 10;
  totG = Math.round(totG * 10) / 10;
  totKcal = Math.round(totKcal);

  const desvioP = pAlvo > 0 ? Math.round(((totP - pAlvo) / pAlvo) * 100) : 0;
  const desvioC = cAlvo > 0 ? Math.round(((totC - cAlvo) / cAlvo) * 100) : 0;
  const desvioG = config.metaGordura ? Math.round(((totG - config.metaGordura) / config.metaGordura) * 100) : undefined;

  // Textual mini-illustration: "🍗 69 g + 🍚 191 g + 🥦 150 g"
  const illustrationParts: string[] = [];
  const mainP = allCalculated.find(i => i.papel === 'proteina');
  if (mainP) {
    const ref = matchNutriRef(mainP.nome);
    illustrationParts.push(`${ref?.emoji || '🍗'} ${mainP.gramasPorMarmita} g`);
  }
  const mainC = allCalculated.find(i => i.papel === 'carbo');
  if (mainC) {
    const ref = matchNutriRef(mainC.nome);
    illustrationParts.push(`${ref?.emoji || '🍚'} ${mainC.gramasPorMarmita} g`);
  }
  const mainL = allCalculated.find(i => i.papel === 'legume');
  if (mainL) {
    const ref = matchNutriRef(mainL.nome);
    illustrationParts.push(`${ref?.emoji || '🥦'} ${metaLegumesG} g`);
  }

  const ilustracaoTextual = illustrationParts.join(' + ');

  return {
    id: `prato_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    nome: dishRaw.nome,
    descricao: dishRaw.descricao,
    numMarmitas: numMarmitasDoPrato,
    tempoTotalMin: dishRaw.tempoTotalMin || 45,
    modoPreparo: dishRaw.modoPreparo && dishRaw.modoPreparo.length > 0
      ? dishRaw.modoPreparo
      : [
          'Higienize e corte todos os ingredientes em porções uniformes.',
          'Cozinhe o carboidrato e a proteína em panelas separadas para controle do ponto.',
          'Salteie ou cozinhe no vapor os legumes até ficarem al dente.',
          'Pese e monte cada marmita nas proporções calculadas e deixe esfriar antes de tampar.',
        ],
    armazenamento: dishRaw.armazenamento || '4 dias na geladeira em pote hermético; congelar por até 30 dias.',
    dicaReaquecer: dishRaw.dicaReaquecer || 'Aqueça no micro-ondas por 2 a 3 minutos com a tampa semi-aberta ou salpique 1 colher de água.',
    source: dishRaw.source,
    ingredientes: allCalculated,
    macrosPorMarmita: { kcal: totKcal, proteina: totP, carbo: totC, gordura: totG },
    desvios: { proteinaPct: desvioP, carboPct: desvioC, gorduraPct: desvioG },
    ilustracaoTextual,
  };
}

// ----------------------------------------------------
// 3. Cardápios de Reserva (Fallback Offline / Erro IA)
// ----------------------------------------------------
export const PRATOS_RESERVA: Array<{
  nome: string;
  descricao: string;
  dieta: Array<'tudo' | 'vegetariano' | 'vegano' | 'com_carne'>;
  proteinaKey: string;
  carboKey: string;
  legumeKey: string;
  tempoTotalMin: number;
  modoPreparo: string[];
  armazenamento: string;
  dicaReaquecer: string;
}> = [
  {
    nome: 'Peito de Frango Grelhado com Arroz Branco e Brócolis ao Vapor',
    descricao: 'Clássico nutritivo e funcional, perfeito para digestão leve e ótima durabilidade na semana.',
    dieta: ['tudo', 'com_carne'],
    proteinaKey: 'Peito de frango grelhado',
    carboKey: 'Arroz branco cozido',
    legumeKey: 'Brócolis cozido',
    tempoTotalMin: 35,
    modoPreparo: [
      'Coloque o arroz para cozinhar em panela com água fervente e sal por 15 minutos até secar.',
      'Corte o peito de frango em bifes médios e tempere com sal, alho e pimenta-do-reino.',
      'Aqueça uma frigideira grande em fogo médio-alto com um fio de azeite e grelhe o frango por 4 minutos de cada lado até dourar.',
      'Cozinhe os floretes de brócolis no vapor por 4 a 5 minutos até ficarem verde-vivos e macios.',
      'Distribua as porções pesadas nas marmitas, espere amornar e leve à refrigeração.',
    ],
    armazenamento: 'Geladeira por até 4 dias; congelador por até 30 dias.',
    dicaReaquecer: 'No micro-ondas por 2m30s com tampa entreaberta; adicione 1 colher de chá de água sobre o arroz para manter a maciez.',
  },
  {
    nome: 'Patinho Moído Ensopadinho com Batata-Doce e Vagem',
    descricao: 'Carne moída suculenta com tempero caseiro brasileiro, carboidrato de baixo índice glicêmico e vagem fresca.',
    dieta: ['tudo', 'com_carne'],
    proteinaKey: 'Patinho moído cozido',
    carboKey: 'Batata-doce cozida',
    legumeKey: 'Vagem cozida',
    tempoTotalMin: 40,
    modoPreparo: [
      'Descasque e corte as batatas-doces em cubos de 2 cm e cozinhe em água fervente com sal por 12 minutos até amaciar.',
      'Em uma panela média em fogo alto, doure a cebola e o alho em azeite.',
      'Acrescente o patinho moído e refogue por 8 minutos desfazendo os grumos até secar e dourar.',
      'Corte a vagem em pedaços pequenos, adicione à panela da carne nos últimos 4 minutos com um toque de cheiro-verde.',
      'Monte as marmitas dividindo os cubos de batata e a carne ensopadinha.',
    ],
    armazenamento: 'Geladeira por 4 dias; congela perfeitamente por 30 dias.',
    dicaReaquecer: 'Micro-ondas por 3 minutos; a umidade da carne moída reidrata a batata.',
  },
  {
    nome: 'Filé de Tilápia com Arroz Branco e Cenoura Salteada',
    descricao: 'Opção leve e rica em proteína magra, com cenoura em rodelas na manteiga de azeite.',
    dieta: ['tudo', 'com_carne'],
    proteinaKey: 'Tilápia/peixe branco grelhado',
    carboKey: 'Arroz branco cozido',
    legumeKey: 'Cenoura cozida',
    tempoTotalMin: 30,
    modoPreparo: [
      'Inicie cozinhando o arroz com alho e sal.',
      'Tempere os filés de tilápia com limão, sal e uma pitada de páprica doce.',
      'Em frigideira antiaderente bem quente com azeite, sele a tilápia por 3 minutos de um lado e 2 minutos do outro.',
      'Na mesma frigideira, salteie a cenoura fatiada finamente até ficar macia.',
      'Monte as marmitas imediatamente e refrigere após esfriar.',
    ],
    armazenamento: 'Consumir em até 3 dias na geladeira; congelar por até 20 dias.',
    dicaReaquecer: 'Aqueça em potência média no micro-ondas para não ressecar o peixe.',
  },
  {
    nome: 'Omelete de Ervas Finas com Batata Inglesa e Abobrinha',
    descricao: 'Prato ovolactovegetariano acolhedor, rápido de preparar em grande quantidade e rico em sabor.',
    dieta: ['tudo', 'vegetariano'],
    proteinaKey: 'Ovo cozido',
    carboKey: 'Batata inglesa cozida',
    legumeKey: 'Abobrinha cozida',
    tempoTotalMin: 25,
    modoPreparo: [
      'Cozinhe as batatas cortadas em cubos até ficarem macias por dentro.',
      'Bata os ovos com uma pitada de orégano, cheiro-verde, sal e pimenta.',
      'Em frigideira antiaderente com azeite, prepare as omeletes dourando ambos os lados.',
      'Grelhe fatias de abobrinha rapidamente em fogo alto.',
      'Distribua as porções nas marmitas.',
    ],
    armazenamento: 'Geladeira por até 4 dias.',
    dicaReaquecer: '2 minutos em potência média no micro-ondas.',
  },
  {
    nome: 'Feijão Carioca Tradicional com Arroz Branco e Couve-Flor Gratinada',
    descricao: 'A combinação máxima brasileira de aminoácidos com couve-flor aromática.',
    dieta: ['tudo', 'vegetariano', 'vegano'],
    proteinaKey: 'Feijão carioca cozido',
    carboKey: 'Arroz branco cozido',
    legumeKey: 'Couve-flor cozida',
    tempoTotalMin: 35,
    modoPreparo: [
      'Cozinhe o arroz em panela com alho refogado.',
      'Em outra panela, refogue bastante alho e louro, adicione o feijão cozido e deixe apurar até o caldo encorpar.',
      'Cozinhe a couve-flor no vapor até ficar al dente e finalize com um fio de azeite e ervas.',
      'Pese e monte as marmitas com arroz, concha de feijão e couve-flor.',
    ],
    armazenamento: 'Geladeira por 4 dias; excelente para congelar por até 30 dias.',
    dicaReaquecer: '3 minutos no micro-ondas; mexa o feijão na metade do tempo.',
  },
  {
    nome: 'Grão-de-Bico ao Curry com Quinoa e Cenoura Dourada',
    descricao: 'Refeição 100% vegana com perfil de proteína completa, especiarias suaves e grãos nobres.',
    dieta: ['tudo', 'vegetariano', 'vegano'],
    proteinaKey: 'Grão-de-bico cozido',
    carboKey: 'Quinoa cozida',
    legumeKey: 'Cenoura cozida',
    tempoTotalMin: 30,
    modoPreparo: [
      'Cozinhe a quinoa em água fervente com sal na proporção 1:2 por 12 minutos.',
      'Refogue cebola, alho e uma colher rasa de curry em pó no azeite.',
      'Adicione o grão-de-bico cozido e as cenouras raladas ou em cubos finos, deixando refogar por 6 minutos.',
      'Ajuste o sal e salpique coentro ou salsinha fresca.',
      'Divida a quinoa e o refogado nas marmitas.',
    ],
    armazenamento: 'Geladeira por até 5 dias; congelar por até 30 dias.',
    dicaReaquecer: '2m30s no micro-ondas.',
  },
];

export function getReserveDish(
  config: MealPrepConfig,
  numMarmitasDoPrato: number,
  pantryItems: ItemDespensa[],
  excludeTitles: string[] = []
): PratoMarmita {
  const normExcludes = excludeTitles.map(normalizeStr);

  // Filter candidates matching diet
  let candidates = PRATOS_RESERVA.filter(p => p.dieta.includes(config.dieta));
  if (candidates.length === 0) {
    candidates = PRATOS_RESERVA;
  }

  // Filter out excluded titles if possible
  const notExcluded = candidates.filter(c => !normExcludes.includes(normalizeStr(c.nome)));
  const chosen = (notExcluded.length > 0 ? notExcluded : candidates)[0];

  const protRef = TABELA_NUTRI.find(t => t.nome === chosen.proteinaKey)!;
  const carboRef = TABELA_NUTRI.find(t => t.nome === chosen.carboKey)!;
  const legRef = TABELA_NUTRI.find(t => t.nome === chosen.legumeKey)!;

  const rawDish = {
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
        papel: 'proteina' as const,
        proporcaoNoPapel: 1.0,
        estado: 'cozido' as const,
        por100g: protRef.por100g,
        rendimentoCozinha: protRef.rendimento,
      },
      {
        nome: carboRef.nome,
        papel: 'carbo' as const,
        proporcaoNoPapel: 1.0,
        estado: 'cozido' as const,
        por100g: carboRef.por100g,
        rendimentoCozinha: carboRef.rendimento,
      },
      {
        nome: legRef.nome,
        papel: 'legume' as const,
        proporcaoNoPapel: 1.0,
        estado: 'cozido' as const,
        por100g: legRef.por100g,
        rendimentoCozinha: legRef.rendimento,
      },
    ],
  };

  return solveDishMealPrep(rawDish, config, numMarmitasDoPrato, pantryItems);
}

// ----------------------------------------------------
// 4. Teste de Autoverificação (Exemplo de Conferência do Usuário)
// ----------------------------------------------------
export function selfTest(): { success: boolean; details: any } {
  const configTest: MealPrepConfig = {
    numMarmitas: 5,
    metaProteina: 30,
    metaCarbo: 60,
    metaGordura: null,
    metaLegumes: 150,
    tipoMeta: 'nutriente',
    dieta: 'tudo',
    numPratos: 1,
    preferenciasProteina: [],
    preferenciasCarbo: [],
    priorizarDespensa: false,
  };

  const protRef = TABELA_NUTRI.find(t => t.nome.includes('Peito de frango'))!;
  const carbRef = TABELA_NUTRI.find(t => t.nome.includes('Arroz branco'))!;
  const legRef = TABELA_NUTRI.find(t => t.nome.includes('Brócolis'))!;

  const testDishRaw = {
    nome: 'Peito de Frango com Arroz e Brócolis',
    descricao: 'Cenário teste de conferência',
    tempoTotalMin: 35,
    modoPreparo: ['Passo 1'],
    armazenamento: 'Geladeira',
    dicaReaquecer: 'Micro-ondas',
    source: 'reserva' as const,
    ingredientes: [
      {
        nome: protRef.nome,
        papel: 'proteina' as const,
        proporcaoNoPapel: 1.0,
        estado: 'cozido' as const,
        por100g: protRef.por100g,
        rendimentoCozinha: protRef.rendimento,
      },
      {
        nome: carbRef.nome,
        papel: 'carbo' as const,
        proporcaoNoPapel: 1.0,
        estado: 'cozido' as const,
        por100g: carbRef.por100g,
        rendimentoCozinha: carbRef.rendimento,
      },
      {
        nome: legRef.nome,
        papel: 'legume' as const,
        proporcaoNoPapel: 1.0,
        estado: 'cozido' as const,
        por100g: legRef.por100g,
        rendimentoCozinha: legRef.rendimento,
      },
    ],
  };

  const calculated = solveDishMealPrep(testDishRaw, configTest, 5, []);

  const pReal = calculated.macrosPorMarmita.proteina;
  const cReal = calculated.macrosPorMarmita.carbo;
  const kcalReal = calculated.macrosPorMarmita.kcal;

  const pDeviation = Math.abs(pReal - 30) / 30;
  const cDeviation = Math.abs(cReal - 60) / 60;

  const success = pDeviation <= 0.05 && cDeviation <= 0.05;

  console.log('[MealPrep selfTest Result]', {
    success,
    pReal,
    cReal,
    kcalReal,
    pDeviation: `${(pDeviation * 100).toFixed(1)}%`,
    cDeviation: `${(cDeviation * 100).toFixed(1)}%`,
    ilustracao: calculated.ilustracaoTextual,
    ingredientes: calculated.ingredientes.map(i => ({
      nome: i.nome,
      porMarmita: `${i.gramasPorMarmita}g`,
      totalCruKg: `${i.totalCruKg}kg`,
    })),
  });

  return {
    success,
    details: {
      pReal,
      cReal,
      kcalReal,
      ingredientes: calculated.ingredientes,
    },
  };
}

// Make selfTest available in browser console for verification
if (typeof window !== 'undefined') {
  (window as any).mealPrepSelfTest = selfTest;
}
