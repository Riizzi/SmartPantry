export type CategoriaProduto =
  | 'hortifruti'
  | 'carnes'
  | 'laticinios'
  | 'graos'
  | 'padaria'
  | 'bebidas'
  | 'congelados'
  | 'mercearia'
  | 'temperos'
  | 'limpeza'
  | 'outros';

export type UnidadeMedida = 'un' | 'kg' | 'g' | 'l' | 'ml';

export interface Produto {
  id: string;
  nomeCanonico: string;
  aliases: string[];
  categoria: CategoriaProduto;
  emoji: string;
  unidadePadrao: UnidadeMedida;
  conteudoPorUnidade?: number;
  proteinaAnimal: boolean;
  derivadoAnimal: boolean;
  perecivel: boolean;
  validadePadraoDias: number;
  ehAlimento: boolean;
}

export interface Lote {
  id: string;
  produtoId: string;
  notaId?: string;
  nomeBruto: string;
  quantidadeInicial: number;
  quantidadeRestante: number;
  unidade: string;
  precoUnitario: number;
  compradoEm: string;
  validadeEstimada: string | null;
  status: 'ativo' | 'acabou' | 'descartado';
}

export interface NotaFiscal {
  chaveAcesso: string;
  uf: string;
  emitenteCnpj: string;
  emitenteNome: string;
  dataEmissao: string;
  total: number;
  urlOrigem?: string;
  fonte: 'qr' | 'foto' | 'chave' | 'manual';
  criadoEm: string;
}

export interface Movimento {
  id: string;
  loteId: string;
  produtoId: string;
  tipo: 'consumo' | 'acabou' | 'descarte' | 'ajuste' | 'receita';
  delta: number;
  origem: 'manual' | string;
  criadoEm: string;
  descricao?: string;
}

export interface ItemDespensa {
  produto: Produto;
  quantidadeTotal: number;
  lotesAtivos: Lote[];
  loteMaisProximo: Lote | null;
  diasAteVencer: number;
  urgencia: 'vencido' | 'vence_hoje' | 'vence_logo' | 'ok' | 'indefinida';
}

export interface IngredienteReceitaUsado {
  produtoId?: string;
  nome: string;
  quantidade: number;
  unidade: string;
  disponivel: boolean;
}

export interface IngredienteReceitaFaltando {
  nome: string;
  quantidadeAprox: string;
  opcional: boolean;
}

export interface Receita {
  id: string;
  titulo: string;
  descricao: string;
  refeicao: 'cafe' | 'almoco' | 'lanche' | 'jantar';
  tempoPreparoMinutos: number;
  porcoes: number;
  dificuldade: 'facil' | 'medio' | 'dificil';
  porQueEsta: string;
  ingredientesUsados: IngredienteReceitaUsado[];
  ingredientesFaltando: IngredienteReceitaFaltando[];
  passos: string[];
  dicasDesperdicioZero?: string;
  favorita?: boolean;
}

export interface ConfigDespensa {
  basicos: string[];
  dietaPadrao: 'tudo' | 'vegetariano' | 'vegano' | 'com_carne';
  toleranciaFaltantes: number;
  notificarValidade: boolean;
}

export interface ItemEssencial {
  id: string;
  nome: string;
  categoria: CategoriaProduto;
  emoji: string;
  unidadePadrao: UnidadeMedida;
  quantidadeMinima: number;
  produtoId?: string;
  criadoEm: string;
}

export interface ItemListaCompras {
  id: string;
  nome: string;
  categoria: CategoriaProduto;
  emoji: string;
  quantidade: number;
  unidade: string;
  comprado: boolean;
  essencialId?: string;
  criadoEm: string;
}

// ----------------------------------------------------
// Meal Prep / Marmitas da Semana Types
// ----------------------------------------------------
export type TipoMetaMarmita = 'nutriente' | 'alimento';

export interface MealPrepConfig {
  numMarmitas: number;
  metaProteina: number;
  metaCarbo: number;
  metaGordura: number | null;
  metaLegumes: number;
  tipoMeta: TipoMetaMarmita;
  dieta: 'tudo' | 'vegetariano' | 'vegano' | 'com_carne';
  numPratos: 1 | 2;
  preferenciasProteina: string[];
  preferenciasCarbo: string[];
  priorizarDespensa: boolean;
  observacoes?: string;
}

export interface IngredienteMarmitaNutri {
  kcal: number;
  proteina: number;
  carbo: number;
  gordura: number;
}

export interface IngredienteMarmitaRaw {
  nome: string;
  papel: 'proteina' | 'carbo' | 'legume' | 'gordura' | 'tempero';
  proporcaoNoPapel: number;
  estado: 'cozido' | 'cru';
  por100g: IngredienteMarmitaNutri;
  rendimentoCozinha: number;
  produtoIdDespensa?: string;
  observacao?: string;
}

export interface IngredienteMarmitaCalculado extends IngredienteMarmitaRaw {
  estimado?: boolean;
  gramasPorMarmita: number;
  totalCozidoG: number;
  totalCruKg: number;
  emEstoqueKg: number;
  faltaKg: number;
}

export interface PratoMarmita {
  id: string;
  nome: string;
  descricao: string;
  numMarmitas: number;
  tempoTotalMin: number;
  modoPreparo: string[];
  armazenamento: string;
  dicaReaquecer: string;
  source: 'ia' | 'reserva';
  ingredientes: IngredienteMarmitaCalculado[];
  macrosPorMarmita: IngredienteMarmitaNutri;
  desvios: {
    proteinaPct: number;
    carboPct: number;
    gorduraPct?: number;
  };
  ilustracaoTextual: string;
}

export interface PlanoMarmita {
  id: string;
  config: MealPrepConfig;
  pratos: PratoMarmita[];
  criadoEm: string;
}
