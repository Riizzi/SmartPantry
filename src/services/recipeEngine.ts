import { GoogleGenAI, Type } from '@google/genai';
import { Receita } from '../types/pantry';
import { GEMINI_MODEL } from './config';

export interface PantryItemCandidate {
  id: string;
  produtoId: string;
  nome: string;
  quantidadeRestante: number;
  unidade: string;
  diasAteVencer: number;
  proteinaAnimal: boolean;
  derivadoAnimal: boolean;
  categoria: string;
}

export interface RecipeRequestParams {
  pantryItems: PantryItemCandidate[];
  diet?: 'tudo' | 'vegetariano' | 'vegano' | 'com_carne';
  meal?: 'qualquer' | 'cafe' | 'almoco' | 'lanche' | 'jantar';
  maxPrepTimeMinutes?: number;
  maxMissingIngredients?: number;
  pantryBasics?: string[];
  excludeTitles?: string[];
  shuffleSeed?: number;
}

// Translation & Normalization Map from Brazilian pantry terms to TheMealDB terms
const THEMEALDB_MAP: Record<string, string> = {
  frango: 'chicken_breast',
  peito: 'chicken_breast',
  filé: 'chicken_breast',
  coxa: 'chicken',
  carne: 'beef',
  alcatra: 'beef',
  patinho: 'beef',
  moída: 'minced_beef',
  bife: 'beef',
  ovo: 'egg',
  ovos: 'egg',
  arroz: 'rice',
  tomate: 'tomato',
  batata: 'potato',
  queijo: 'cheese',
  mussarela: 'cheese',
  macarrao: 'pasta',
  espaguete: 'pasta',
  massa: 'pasta',
  peixe: 'fish',
  salmao: 'salmon',
  tilapia: 'fish',
  cenoura: 'carrot',
  cebola: 'onion',
  alho: 'garlic',
  leite: 'milk',
  cogumelo: 'mushroom',
  bacon: 'bacon',
  linguica: 'sausage',
  espinafre: 'spinach',
};

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Searches TheMealDB for real, tested global recipes using available pantry ingredients
 */
export async function fetchTheMealDBReferenceRecipes(
  pantryFoodNames: string[],
  rng: () => number = Math.random
): Promise<Array<{ title: string; category: string; instructions: string; ingredients: string[] }>> {
  try {
    const searchTerms: string[] = [];

    // Map Portuguese food names to TheMealDB ingredient keys
    for (const name of pantryFoodNames) {
      const lower = name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      for (const [ptKey, enTerm] of Object.entries(THEMEALDB_MAP)) {
        if (lower.includes(ptKey) && !searchTerms.includes(enTerm)) {
          searchTerms.push(enTerm);
          break;
        }
      }
      if (searchTerms.length >= 6) break;
    }

    if (searchTerms.length === 0) {
      searchTerms.push('egg', 'chicken_breast', 'rice');
    }

    // Shuffle search terms using the seed RNG and take at most 2
    const shuffledTerms = [...searchTerms].sort(() => rng() - 0.5);

    const matchedMeals: Array<{ idMeal: string; strMeal: string }> = [];

    // Query TheMealDB filter endpoints in parallel with tight timeout
    await Promise.all(
      shuffledTerms.slice(0, 2).map(async term => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);
          const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${term}`, {
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.meals) && data.meals.length > 0) {
              const shuffledMeals = [...data.meals].sort(() => rng() - 0.5);
              matchedMeals.push(...shuffledMeals.slice(0, 2));
            }
          }
        } catch {
          // Ignore network timeouts for external API
        }
      })
    );

    if (matchedMeals.length === 0) return [];

    // Lookup up to 2 meals details
    const detailedRecipes: Array<{ title: string; category: string; instructions: string; ingredients: string[] }> = [];

    await Promise.all(
      matchedMeals.slice(0, 2).map(async meal => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);
          const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`, {
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            const m = data.meals?.[0];
            if (m) {
              const ingList: string[] = [];
              for (let i = 1; i <= 20; i++) {
                const ing = m[`strIngredient${i}`];
                if (ing && ing.trim()) ingList.push(ing.trim());
              }
              detailedRecipes.push({
                title: m.strMeal,
                category: m.strCategory || 'Prato Principal',
                instructions: (m.strInstructions || '').slice(0, 800),
                ingredients: ingList,
              });
            }
          }
        } catch {}
      })
    );

    return detailedRecipes;
  } catch {
    return [];
  }
}

/**
 * High-Standard Culinary Fallback Engine:
 * Returns realistic, mouthwatering, authentic Brazilian home recipes tailored strictly
 * to the ingredients that the user actually has.
 */
export function getCuratedBrazilianRecipes(
  availableItems: PantryItemCandidate[],
  diet: string,
  meal: string,
  excludeTitles: string[] = []
): Receita[] {
  const stripAccents = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const hasItem = (pattern: RegExp) =>
    availableItems.some(i => pattern.test(stripAccents(i.nome)));

  const getItem = (pattern: RegExp) =>
    availableItems.find(i => pattern.test(stripAccents(i.nome)));

  const urgentItem = availableItems.find(i => i.diasAteVencer <= 3);

  const curated: Receita[] = [];

  // 1. Omelete Francesa de Queijo e Tomates Confit
  if (hasItem(/ovo/i) && (diet === 'tudo' || diet === 'vegetariano')) {
    const ovoItem = getItem(/ovo/i)!;
    const queijoItem = getItem(/queijo|mussarela|prato/i);
    const tomateItem = getItem(/tomate/i);

    const used = [
      {
        produtoId: ovoItem.produtoId,
        nome: ovoItem.nome,
        quantidade: 2,
        unidade: 'un',
        disponivel: true,
      },
    ];

    if (queijoItem) {
      used.push({
        produtoId: queijoItem.produtoId,
        nome: queijoItem.nome,
        quantidade: 40,
        unidade: 'g',
        disponivel: true,
      });
    }

    if (tomateItem) {
      used.push({
        produtoId: tomateItem.produtoId,
        nome: tomateItem.nome,
        quantidade: 1,
        unidade: 'un',
        disponivel: true,
      });
    }

    curated.push({
      id: 'rec_curated_omelete',
      titulo: 'Omelete Francesa com Queijo e Tomates Confit',
      descricao:
        'Cremosa por dentro e dourada por fora. Uma das preparações mais rápidas e nutritivas para aproveitar ovos e laticínios da despensa.',
      refeicao: meal === 'cafe' || meal === 'lanche' ? (meal as any) : 'jantar',
      tempoPreparoMinutos: 12,
      porcoes: 1,
      dificuldade: 'facil',
      porQueEsta: 'Aproveita ovos frescos e queijo com técnica clássica de frigideira em 12 minutos.',
      ingredientesUsados: used,
      ingredientesFaltando: [
        { nome: 'Cheiro-verde ou orégano', quantidadeAprox: '1 pitada', opcional: true },
      ],
      passos: [
        'Quebre 2 ovos em uma tigela funda e bata com um garfo por 1 minuto até espumar levemente. Tempere com sal e pimenta-do-reino.',
        'Aqueça uma frigideira antiaderente pequena em fogo médio-baixo com uma colher de manteiga ou azeite.',
        'Despeje os ovos batidos e mexa suavemente o centro com uma espátula de silicone nos primeiros 30 segundos para formar dobras cremosas.',
        'Quando a base estiver quase firme mas a superfície ainda úmida, distribua o queijo e o tomate em cubos finos em uma das metades.',
        'Dobre a omelete cuidadosamente ao meio, deixe dourar por 30 segundos e deslize para o prato. Sirva imediatamente.',
      ],
      dicasDesperdicioZero: 'Se tiver tomate maduro quase passando, corte em cubinhos e doure na frigideira antes dos ovos.',
    });
  }

  // 2. Arroz de Forno Cremoso Gratinado
  if (hasItem(/arroz/i)) {
    const arrozItem = getItem(/arroz/i)!;
    const queijoItem = getItem(/queijo|mussarela|requeijao/i);
    const tomateItem = getItem(/tomate/i);

    const used = [
      {
        produtoId: arrozItem.produtoId,
        nome: arrozItem.nome,
        quantidade: 1,
        unidade: arrozItem.unidade || 'un',
        disponivel: true,
      },
    ];

    if (queijoItem) {
      used.push({
        produtoId: queijoItem.produtoId,
        nome: queijoItem.nome,
        quantidade: 60,
        unidade: 'g',
        disponivel: true,
      });
    }

    if (tomateItem) {
      used.push({
        produtoId: tomateItem.produtoId,
        nome: tomateItem.nome,
        quantidade: 1,
        unidade: 'un',
        disponivel: true,
      });
    }

    curated.push({
      id: 'rec_curated_arroz_forno',
      titulo: 'Arroz de Forno Gratinado com Queijo e Tomate',
      descricao:
        'O clássico reconfortante da culinária brasileira para transformar arroz e frios em um prato único suculento e dourado.',
      refeicao: 'almoco',
      tempoPreparoMinutos: 25,
      porcoes: 2,
      dificuldade: 'facil',
      porQueEsta: 'Aproveita o arroz da casa e combina perfeitamente com os queijos e legumes disponíveis.',
      ingredientesUsados: used,
      ingredientesFaltando: [
        { nome: 'Orégano seco', quantidadeAprox: '1 colher de chá', opcional: true },
      ],
      passos: [
        'Em uma panela, aqueça um fio de azeite e refogue meia cebola picada e um dente de alho até ficarem translúcidos (3 minutos).',
        'Acrescente o tomate em cubos e refogue por 2 minutos até soltar o caldo avermelhado aromático.',
        'Misture o arroz cozido com o refogado de legumes e acerte o sal.',
        'Transfira tudo para uma travessa refratária média untada com azeite e cubra com as fatias de queijo.',
        'Leve ao forno pré-aquecido a 200°C por 12 a 15 minutos até o queijo borbulhar e criar uma crosta gratinada apetitosa.',
      ],
      dicasDesperdicioZero: 'Ótima receita para incorporar pontas de queijo ou sobras de legumes cozidos da geladeira.',
    });
  }

  // 3. Picadinho de Frango Dourado com Cebola e Alho
  if (hasItem(/frango|peito/i) && (diet === 'tudo' || diet === 'com_carne')) {
    const frangoItem = getItem(/frango|peito/i)!;
    const tomateItem = getItem(/tomate/i);

    const used = [
      {
        produtoId: frangoItem.produtoId,
        nome: frangoItem.nome,
        quantidade: frangoItem.quantidadeRestante > 1 ? 1 : frangoItem.quantidadeRestante,
        unidade: frangoItem.unidade,
        disponivel: true,
      },
    ];

    if (tomateItem) {
      used.push({
        produtoId: tomateItem.produtoId,
        nome: tomateItem.nome,
        quantidade: 1,
        unidade: 'un',
        disponivel: true,
      });
    }

    curated.push({
      id: 'rec_curated_frango_dourado',
      titulo: 'Picadinho de Frango Dourado com Cebola Acebolada',
      descricao:
        'Cubos suculentos de peito de frango selados em fogo alto com crosta dourada e cebolas adocicadas.',
      refeicao: 'almoco',
      tempoPreparoMinutos: 20,
      porcoes: 2,
      dificuldade: 'facil',
      porQueEsta: 'Preparo rápido de 20 minutos que garante frango macio sem ressecar.',
      ingredientesUsados: used,
      ingredientesFaltando: [
        { nome: 'Suco de meio limão', quantidadeAprox: '1 colher de sopa', opcional: true },
      ],
      passos: [
        'Corte o peito de frango em cubos de 2 cm e tempere com sal, pimenta-do-reino e suco de limão ou vinagre.',
        'Aqueça uma frigideira larga em fogo alto com um fio de azeite ou óleo até ficar bem quente.',
        'Coloque os cubos de frango sem amontoar e deixe selar por 4 minutos sem mexer, até formar uma crosta dourada apetitosa.',
        'Vire os pedaços, adicione 1 cebola em rodelas e 2 dentes de alho picados, refogando em fogo médio por 4 minutos até a cebola murchar.',
        'Adicione 2 colheres de sopa de água para soltar o fundinho caramelizado da frigideira e sirva quente com arroz.',
      ],
      dicasDesperdicioZero: 'A crosta dourada no fundo da frigideira concentra todo o sabor: nunca lave antes de deglacear com um pingo de água.',
    });
  }

  // 4. Macarrão Rápido ao Alho e Óleo com Tomates Salteados
  if (hasItem(/macarrao|espaguete|massa/i)) {
    const massaItem = getItem(/macarrao|espaguete|massa/i)!;
    const tomateItem = getItem(/tomate/i);
    const queijoItem = getItem(/queijo|mussarela/i);

    const used = [
      {
        produtoId: massaItem.produtoId,
        nome: massaItem.nome,
        quantidade: 250,
        unidade: 'g',
        disponivel: true,
      },
    ];

    if (tomateItem) {
      used.push({
        produtoId: tomateItem.produtoId,
        nome: tomateItem.nome,
        quantidade: 2,
        unidade: 'un',
        disponivel: true,
      });
    }

    if (queijoItem) {
      used.push({
        produtoId: queijoItem.produtoId,
        nome: queijoItem.nome,
        quantidade: 30,
        unidade: 'g',
        disponivel: true,
      });
    }

    curated.push({
      id: 'rec_curated_macarrao_alho_oleo',
      titulo: 'Macarrão ao Alho e Óleo com Tomates Salteados',
      descricao:
        'A clássica massa italiana abrasileirada: alho laminado lentamente no azeite com tomates frescos e queijo ralado.',
      refeicao: 'jantar',
      tempoPreparoMinutos: 15,
      porcoes: 2,
      dificuldade: 'facil',
      porQueEsta: 'Usa a massa da despensa e temperos básicos com resultado de restaurante em 15 minutos.',
      ingredientesUsados: used,
      ingredientesFaltando: [],
      passos: [
        'Ferva 2 litros de água com 1 colher de sopa de sal. Cozinhe o macarrão até ficar al dente (cerca de 8 minutos). Reserve meia xícara da água do cozimento.',
        'Enquanto a massa cozinha, aqueça 3 colheres de azeite em fogo baixo em uma frigideira grande.',
        'Adicione 3 dentes de alho em fatias finas e doure lentamente por 2 minutos, sem deixar queimar.',
        'Junte os tomates picados e refogue por 2 minutos para soltar suco e cor no azeite aromatizado.',
        'Despeje a massa escorrida e a água reservada na frigideira, salteie vigorosamente em fogo alto por 1 minuto e sirva com queijo ralado.',
      ],
      dicasDesperdicioZero: 'A água do cozimento rica em amido emulsifica o azeite e cria um molho cremoso sem precisar de creme de leite.',
    });
  }

  // 5. Ovos no Purgatório (Shakshuka Rústica)
  if (hasItem(/ovo/i) && hasItem(/tomate/i) && (diet === 'tudo' || diet === 'vegetariano')) {
    const ovoItem = getItem(/ovo/i)!;
    const tomateItem = getItem(/tomate/i)!;

    curated.push({
      id: 'rec_curated_shakshuka',
      titulo: 'Ovos no Purgatório com Molho de Tomate Rústico',
      descricao:
        'Ovos pochê cozidos lentamente dentro de um molho caseiro espesso de tomates frescos bem temperados.',
      refeicao: meal === 'cafe' ? 'cafe' : 'jantar',
      tempoPreparoMinutos: 18,
      porcoes: 1,
      dificuldade: 'facil',
      porQueEsta: 'Combinação gastronômica perfeita entre o molho ácido de tomates e a gema cremosa de ovos.',
      ingredientesUsados: [
        {
          produtoId: ovoItem.produtoId,
          nome: ovoItem.nome,
          quantidade: 2,
          unidade: 'un',
          disponivel: true,
        },
        {
          produtoId: tomateItem.produtoId,
          nome: tomateItem.nome,
          quantidade: 2,
          unidade: 'un',
          disponivel: true,
        },
      ],
      ingredientesFaltando: [
        { nome: 'Pão para acompanhar', quantidadeAprox: '2 fatias', opcional: true },
      ],
      passos: [
        'Pique os tomates em cubos médios com casca e sementes.',
        'Em uma frigideira média com tampa, doure meia cebola e um dente de alho no azeite por 3 minutos.',
        'Acrescente os tomates picados, sal, orégano e uma pitada de açúcar. Tampe e cozinhe em fogo baixo por 7 minutos até desmancharem.',
        'Abra duas cavidades no molho encorpado com uma colher e quebre os ovos delicadamente dentro de cada uma.',
        'Tampe a frigideira e cozinhe por 4 a 5 minutos até a clara cozinhar e a gema permanecer cremosa. Sirva quente direto na frigideira.',
      ],
      dicasDesperdicioZero: 'Prato perfeito para consumir tomates maduros que não servem mais para salada crua.',
    });
  }

  // 6. Picadinho de Carne Bovina Acebolado
  if (hasItem(/carne|bife|alcatra|patinho/i) && (diet === 'tudo' || diet === 'com_carne')) {
    const carneItem = getItem(/carne|bife|alcatra|patinho/i)!;
    const tomateItem = getItem(/tomate/i);

    const used = [
      {
        produtoId: carneItem.produtoId,
        nome: carneItem.nome,
        quantidade: 1,
        unidade: carneItem.unidade,
        disponivel: true,
      },
    ];

    if (tomateItem) {
      used.push({
        produtoId: tomateItem.produtoId,
        nome: tomateItem.nome,
        quantidade: 1,
        unidade: 'un',
        disponivel: true,
      });
    }

    curated.push({
      id: 'rec_curated_carne_acebolada',
      titulo: 'Picadinho de Carne Acebolado na Frigideira',
      descricao:
        'Tiras de carne bovina seladas em fogo alto com bastante cebola caramelizada e molho encorpado.',
      refeicao: 'almoco',
      tempoPreparoMinutos: 20,
      porcoes: 2,
      dificuldade: 'facil',
      porQueEsta: 'Preparo tradicional brasileiro em panela única, mantendo a carne macia e suculenta.',
      ingredientesUsados: used,
      ingredientesFaltando: [
        { nome: 'Molho shoyu ou vinagre', quantidadeAprox: '1 colher de sopa', opcional: true },
      ],
      passos: [
        'Corte a carne em tiras ou cubos médios contra o sentido das fibras e tempere com sal, alho amassado e pimenta-do-reino.',
        'Aqueça uma frigideira funda em fogo bem alto com um fio de óleo até fumegar levemente.',
        'Adicione a carne aos poucos e sele por 3 minutos sem mexer para dourar bem.',
        'Junte 1 cebola cortada em rodelas médias e refogue por mais 3 minutos até murchar e absorver os sucos da carne.',
        'Pingue 2 colheres de água quente ou molho shoyu para deglacear o fundo da panela, desligue o fogo e sirva.',
      ],
      dicasDesperdicioZero: 'Cortar a carne contra a fibra é o segredo para garantir maciez mesmo em cortes mais magros.',
    });
  }

  // 7. Tostex Crocante de Frigideira com Queijo e Ovos
  if (hasItem(/pao|torrada/i)) {
    const paoItem = getItem(/pao|torrada/i)!;
    const queijoItem = getItem(/queijo|mussarela/i);
    const ovoItem = getItem(/ovo/i);

    const used = [
      {
        produtoId: paoItem.produtoId,
        nome: paoItem.nome,
        quantidade: 2,
        unidade: 'un',
        disponivel: true,
      },
    ];

    if (queijoItem) {
      used.push({
        produtoId: queijoItem.produtoId,
        nome: queijoItem.nome,
        quantidade: 40,
        unidade: 'g',
        disponivel: true,
      });
    }

    if (ovoItem) {
      used.push({
        produtoId: ovoItem.produtoId,
        nome: ovoItem.nome,
        quantidade: 1,
        unidade: 'un',
        disponivel: true,
      });
    }

    curated.push({
      id: 'rec_curated_tostex_gourmet',
      titulo: 'Tostex Crocante de Frigideira com Queijo Dourado',
      descricao:
        'Pão dourado na manteiga com crosta de queijo crocante e recheio cremoso para lanches rápidos.',
      refeicao: meal === 'cafe' ? 'cafe' : 'lanche',
      tempoPreparoMinutos: 10,
      porcoes: 1,
      dificuldade: 'facil',
      porQueEsta: 'Lanche rápido de 10 minutos que transforma pão e queijo da despensa em um tostex de padaria.',
      ingredientesUsados: used,
      ingredientesFaltando: [],
      passos: [
        'Passe uma camada fina de manteiga na parte externa de cada fatia de pão.',
        'Recheie com as fatias de queijo e, se desejar, rodelas finas de tomate ou orégano.',
        'Aqueça uma frigideira em fogo baixo e coloque o sanduíche com a face amanteigada para baixo.',
        'Pressione suavemente com uma espátula por 3 minutos até dourar uniformemente e o queijo começar a derreter.',
        'Vire com cuidado, toste o outro lado por mais 2 minutos até ficar crocante e sirva imediatamente.',
      ],
      dicasDesperdicioZero: 'Mesmo pão amanhecido de 2 ou 3 dias recupera toda a maciez interna e crocância ao tostar na frigideira com manteiga.',
    });
  }

  // 8. Se ainda não gerou nenhuma receita (ex: despensa com itens isolados)
  if (curated.length === 0 && availableItems.length > 0) {
    const item = urgentItem || availableItems[0];
    curated.push({
      id: 'rec_curated_refogado_caseiro',
      titulo: `Salteado Aromático de ${item.nome} com Alho e Azeite`,
      descricao: `Preparo limpo e focado em valorizar o sabor fresco e natural de ${item.nome}, aproveitando os temperos básicos da casa.`,
      refeicao: 'almoco',
      tempoPreparoMinutos: 15,
      porcoes: 2,
      dificuldade: 'facil',
      porQueEsta: `Destaque para ${item.nome} aproveitando seu frescor com cocção rápida.`,
      ingredientesUsados: [
        {
          produtoId: item.produtoId,
          nome: item.nome,
          quantidade: 1,
          unidade: item.unidade || 'un',
          disponivel: true,
        },
      ],
      ingredientesFaltando: [],
      passos: [
        `Higienize e corte ${item.nome} em pedaços ou fatias uniformes.`,
        'Aqueça 2 colheres de azeite em fogo médio em uma frigideira ampla.',
        'Adicione 2 dentes de alho picados e doure por 1 minuto até perfumar o ambiente.',
        `Junte ${item.nome}, tempere com sal e pimenta-do-reino e salteie por 5 a 6 minutos até amaciar e dourar levemente.`,
        'Acerte o sal, salpique ervas se tiver e sirva como acompanhamento nobre.',
      ],
      dicasDesperdicioZero: 'Saltear em fogo vivo mantém a cor viva e a textura al dente dos vegetais.',
    });
  }

  // If excludeTitles were provided, filter them out so user gets new options
  let filtered = curated;
  if (excludeTitles.length > 0) {
    const withoutExcluded = curated.filter(
      r => !excludeTitles.some(ex => ex.toLowerCase().trim() === r.titulo.toLowerCase().trim())
    );
    if (withoutExcluded.length > 0) {
      filtered = withoutExcluded;
    }
  }

  // Shuffle order so consecutive rolls provide variety
  return [...filtered].sort(() => Math.random() - 0.5);
}

/**
 * Intelligent Master Chef Generator:
 * Generates coherent, delicious, realistic recipes using Gemini with strict culinary rules.
 */
export async function generateMasterChefRecipes(
  ai: GoogleGenAI,
  params: RecipeRequestParams,
  modelName: string = GEMINI_MODEL
): Promise<Receita[]> {
  const {
    pantryItems,
    diet = 'tudo',
    meal = 'qualquer',
    maxPrepTimeMinutes = 45,
    maxMissingIngredients = 2,
    pantryBasics = ['Sal', 'Óleo', 'Azeite', 'Água', 'Alho', 'Cebola', 'Açúcar'],
    shuffleSeed = Date.now(),
    excludeTitles = [],
  } = params;

  // Pseudo-random deterministic generator for consistent variety per roll
  const rng = mulberry32(shuffleSeed);

  // 1. Filter out NON-FOOD items strictly
  const foodItems = pantryItems.filter(it => {
    if (it.categoria === 'limpeza') return false;
    const name = it.nome.toLowerCase();
    if (/detergente|sabao|amaciante|papel|desinfetante|sacola|esponja|guardanapo/i.test(name)) return false;
    return true;
  });

  // 2. Strict dietary filter
  let dietFiltered = [...foodItems];
  if (diet === 'vegetariano') {
    dietFiltered = dietFiltered.filter(i => !i.proteinaAnimal);
  } else if (diet === 'vegano') {
    dietFiltered = dietFiltered.filter(i => !i.proteinaAnimal && !i.derivadoAnimal);
  }

  if (dietFiltered.length === 0) {
    return [];
  }

  // Shuffle order of non-urgent items while keeping urgent ones prioritary
  const urgentItems = dietFiltered.filter(i => i.diasAteVencer <= 3);
  const regularItems = dietFiltered.filter(i => i.diasAteVencer > 3).sort(() => rng() - 0.5);
  const orderedItems = [...urgentItems, ...regularItems];

  // Pick 1 to 2 star ingredients to give distinct personality to each generation
  const candidateStars = orderedItems.filter(i => i.categoria !== 'temperos' && i.quantidadeRestante > 0);
  const starItems: PantryItemCandidate[] = [];
  if (candidateStars.length > 0) {
    const shuffledStars = [...candidateStars].sort(() => rng() - 0.5);
    starItems.push(...shuffledStars.slice(0, Math.min(2, shuffledStars.length)));
  }
  const starGuideline =
    starItems.length > 0
      ? `\n- INGREDIENTES ESTRELA DA RODADA: Dê destaque culinário especial para: ${starItems.map(s => s.nome).join(' e ')}.`
      : '';

  // Pick random culinary style and flavor profile
  const ESTILOS_CULINARIOS = [
    'refogado rápido de frigideira',
    'prato gratinado de forno',
    'preparo prático de panela única',
    'frigideira dourada com molho encorpado',
    'salada morna salteada',
    'caldo ou sopa reconfortante',
    'crepioca, omelete ou tortilha recheada',
    'bowl substancial com grãos e proteína',
    'marmita caseira completa e prática',
  ];
  const PERFIS_SABOR = [
    'rápido e funcional para o dia a dia',
    'reconfortante, afetivo e acolhedor',
    'leve, fresco e equilibrado',
    'nutritivo, proteico e substancial',
  ];
  const estiloEscolhido = ESTILOS_CULINARIOS[Math.floor(rng() * ESTILOS_CULINARIOS.length)];
  const perfilEscolhido = PERFIS_SABOR[Math.floor(rng() * PERFIS_SABOR.length)];

  // 3. Try to fetch external verified dishes from TheMealDB in parallel (max 2.5s)
  const foodNames = orderedItems.map(i => i.nome);
  const theMealDBReferences = await fetchTheMealDBReferenceRecipes(foodNames, rng);

  // 4. Build prompt with Michelin-standard Brazilian culinary guidelines
  const inventoryPayload = orderedItems.map(it => ({
    produtoId: it.produtoId,
    nome: it.nome,
    quantidadeDisponivel: it.quantidadeRestante,
    unidade: it.unidade,
    diasAteVencer: it.diasAteVencer,
    prioridadeUrgente: it.diasAteVencer <= 3,
  }));

  const dietGuideline =
    diet === 'vegano'
      ? 'A receita DEVE ser 100% VEGANA (sem carne, peixe, frango, ovos, laticínios, manteiga, mel).'
      : diet === 'vegetariano'
      ? 'A receita DEVE ser OVOLACTOVEGETARIANA (sem carnes, peixes, aves ou embutidos).'
      : diet === 'com_carne'
      ? 'Dê preferência a preparações saborosas com carnes ou aves disponíveis.'
      : 'Qualquer dieta permitida.';

  const mealGuideline =
    meal === 'cafe'
      ? 'Refeição de CAFÉ DA MANHÃ: ovos mexidos, omeletes, panquecas, torradas, frutas ou mingau.'
      : meal === 'almoco'
      ? 'Refeição de ALMOÇO: pratos substanciais brasileiros (arroz com feijão e proteína, refogados, massas, cozidos ou risotos de forno).'
      : meal === 'lanche'
      ? 'Refeição de LANCHE: tostex, sanduíches rápidos, crepiocas, bolinhos de frigideira ou saladas leves.'
      : meal === 'jantar'
      ? 'Refeição de JANTAR: preparações leves e reconfortantes (omeletes, sopas, salteados, massas leves ou grelhados com legumes).'
      : 'Sugira opções variadas adequadas para refeições caseiras brasileiras.';

  const excludeInstruction =
    excludeTitles && excludeTitles.length > 0
      ? `\n5. ROTAÇÃO DE SUGESTÕES (O usuário pediu para rodar/trocar as receitas):\n   NÃO repita nem sugira receitas com estes nomes ou preparos idênticos aos anteriores: ${excludeTitles.slice(-20).join(
          ', '
        )}.\n   Gere 8 opções COMPLETAMENTE NOVAS, diferentes e criativas com o estoque disponível!`
      : '';

  const referenceText =
    theMealDBReferences.length > 0
      ? `\nREFERÊNCIAS DE PRATOS REAIS DA BASE THEMEALDB (adapte para o paladar e ingredientes brasileiros):\n${JSON.stringify(
          theMealDBReferences,
          null,
          2
        )}`
      : '';

  const systemPrompt = `Você é um Chef Executivo de gastronomia brasileira caseira do SmartPantry.
Sua missão é sugerir refeições deliciosas, práticas e 100% COERENTES com a culinária do dia a dia.

DIRETRIZ DE INOVAÇÃO DESTA RODADA:
- Estilo gastronômico em foco: ${estiloEscolhido}.
- Perfil de sabor: ${perfilEscolhido}.${starGuideline}

LEIS CULINÁRIAS INEGOCIÁVEIS:
1. HARMONIA E COERÊNCIA GASTRONÔMICA:
   - NUNCA junte ingredientes que não combinam (ex: NUNCA misture leite com carnes ensopadas; NUNCA coloque frutas em pratos salgados a menos que seja agridoce clássico; NUNCA misture café com almoço salgado).
   - As receitas devem pertencer a pratos clássicos reconhecidos do cotidiano.
2. MODO DE PREPARO TÉCNICO E DETALHADO (Passo a Passo Profissional):
   - Cada passo DEVE conter o verbo técnico exato (Pique, Aqueça, Sele, Refogue, Deglaceie, Cozinhe, Gratine).
   - Indique SEMPRE a intensidade do fogo (fogo baixo, fogo médio, fogo alto) e o utensílio (frigideira antiaderente, panela de fundo grosso, refratário).
   - Indique o TEMPO EXATO em minutos de cada etapa.
   - Indique o PONTO VISUAL do alimento.
3. GESTÃO DE ESTOQUE E FALTANTES:
   - Ingredientes básicos (${pantryBasics.join(', ')}) são considerados presentes na cozinha e NÃO contam como faltantes!
   - Use os ingredientes com prioridadeUrgente=true primeiro.
   - Máximo de ${maxMissingIngredients} ingrediente(s) faltando não-básico(s).
4. RESTRIÇÕES:
   - Dieta: ${dietGuideline}
   - Refeição: ${mealGuideline}
   - Tempo máximo de preparo: até ${maxPrepTimeMinutes} minutos.${excludeInstruction}`;

  const userContent = `ESTOQUE DISPONÍVEL NA DESPENSA:
${JSON.stringify(inventoryPayload, null, 2)}

TEMPEROS BÁSICOS (Sempre disponíveis):
${JSON.stringify(pantryBasics)}
${referenceText}
${excludeTitles && excludeTitles.length > 0 ? `\nATENÇÃO: O usuário pediu para rodar receitas. NÃO repita nenhuma destas anteriores: ${excludeTitles.slice(-20).join(', ')}.\n` : ''}
Gere exatamente 8 receitas realistas, muito bem elaboradas, variadas e criativas, com modo de preparo impecável e ingredientes harmônicos.`;

  // Use a 20s timeout as required
  const responsePromise = ai.models.generateContent({
    model: modelName,
    contents: userContent,
    config: {
      systemInstruction: systemPrompt,
      temperature: 1.0,
      topP: 0.95,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            titulo: { type: Type.STRING },
            descricao: { type: Type.STRING },
            refeicao: {
              type: Type.STRING,
              enum: ['cafe', 'almoco', 'lanche', 'jantar'],
            },
            tempoPreparoMinutos: { type: Type.INTEGER },
            porcoes: { type: Type.INTEGER },
            dificuldade: {
              type: Type.STRING,
              enum: ['facil', 'medio', 'dificil'],
            },
            porQueEsta: { type: Type.STRING },
            ingredientesUsados: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  produtoId: { type: Type.STRING },
                  nome: { type: Type.STRING },
                  quantidade: { type: Type.NUMBER },
                  unidade: { type: Type.STRING },
                  disponivel: { type: Type.BOOLEAN },
                },
                required: ['nome', 'quantidade', 'unidade', 'disponivel'],
              },
            },
            ingredientesFaltando: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  nome: { type: Type.STRING },
                  quantidadeAprox: { type: Type.STRING },
                  opcional: { type: Type.BOOLEAN },
                },
                required: ['nome', 'quantidadeAprox', 'opcional'],
              },
            },
            passos: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            dicasDesperdicioZero: { type: Type.STRING },
          },
          required: [
            'titulo',
            'descricao',
            'refeicao',
            'tempoPreparoMinutos',
            'porcoes',
            'dificuldade',
            'porQueEsta',
            'ingredientesUsados',
            'ingredientesFaltando',
            'passos',
          ],
        },
      },
    },
  });

  const response = await Promise.race([
    responsePromise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout de 20s na geração culinária')), 20000)
    ),
  ]);

  if (!response.text) {
    throw new Error('Retorno vazio do modelo.');
  }

  const generatedRecipes: Receita[] = JSON.parse(response.text);

  const normalizeStr = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  const normalizedExcludes = (excludeTitles || []).map(normalizeStr);

  // Cross-validate recipes with strict post-processing
  const verified = generatedRecipes
    .map((r, index) => {
      const id = r.id || `rec_ai_${Date.now()}_${index}`;

      const matchedUsed = r.ingredientesUsados.map(ing => {
        const match = dietFiltered.find(
          p =>
            (ing.produtoId && p.produtoId === ing.produtoId) ||
            p.nome.toLowerCase().includes(ing.nome.toLowerCase()) ||
            ing.nome.toLowerCase().includes(p.nome.toLowerCase())
        );

        return {
          ...ing,
          produtoId: match?.produtoId || ing.produtoId || '',
          disponivel: !!match && match.quantidadeRestante > 0,
        };
      });

      const filteredMissing = (r.ingredientesFaltando || []).filter(miss => {
        const isBasic = pantryBasics.some(b => b.toLowerCase() === miss.nome.toLowerCase());
        const inPantry = dietFiltered.some(p => p.nome.toLowerCase().includes(miss.nome.toLowerCase()));
        return !isBasic && !inPantry;
      });

      return {
        ...r,
        id,
        source: 'ia' as const,
        ingredientesUsados: matchedUsed,
        ingredientesFaltando: filteredMissing,
      };
    })
    .filter(r => {
      // Must have at least 1 valid pantry item used
      const hasRealUsed = r.ingredientesUsados.some(u => u.disponivel);
      if (!hasRealUsed) return false;

      // Post-filtering: exclude if title matches any excluded titles
      const normTitle = normalizeStr(r.titulo);
      if (normalizedExcludes.includes(normTitle)) {
        return false;
      }

      // Dietary verification
      if (diet === 'vegetariano') {
        const hasMeat = r.ingredientesUsados.some(u => {
          const item = pantryItems.find(p => p.produtoId === u.produtoId);
          return item?.proteinaAnimal;
        });
        if (hasMeat) return false;
      }
      if (diet === 'vegano') {
        const hasAnimal = r.ingredientesUsados.some(u => {
          const item = pantryItems.find(p => p.produtoId === u.produtoId);
          return item?.proteinaAnimal || item?.derivadoAnimal;
        });
        if (hasAnimal) return false;
      }

      // Check missing tolerance
      const nonOptionalMissing = r.ingredientesFaltando.filter(m => !m.opcional).length;
      if (nonOptionalMissing > maxMissingIngredients) return false;

      return true;
    });

  return verified;
}
