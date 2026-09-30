import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  Sparkles,
  Flame,
  Scale,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Copy,
  Bookmark,
  BookmarkCheck,
  CookingPot,
  Plus,
  Minus,
  ChefHat,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Info,
  Calendar,
  Trash2,
  ArrowRight,
  X,
  Share2,
  UtensilsCrossed,
  Layers,
  Check,
  WifiOff,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  ItemDespensa,
  MealPrepConfig,
  PlanoMarmita,
  PratoMarmita,
  IngredienteMarmitaCalculado,
} from '../types/pantry';
import { PantryStore } from '../services/storage';
import { ApiService } from '../services/api';
import { solveDishMealPrep, selfTest } from '../services/mealPrep';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface MealPrepViewProps {
  itemsDespensa: ItemDespensa[];
  onCooked?: (desc: string, movimentoIds: string[]) => void;
  onOpenScan?: () => void;
  onOpenAddManual?: () => void;
}

const PREF_PROTEINAS = [
  'Frango',
  'Carne bovina',
  'Peixe',
  'Ovos',
  'Porco',
  'Tofu / Soja',
  'Feijão / Grão-de-bico',
];

const PREF_CARBOS = [
  'Arroz',
  'Batata',
  'Batata-doce',
  'Macarrão',
  'Mandioca',
  'Quinoa',
];

export const MealPrepView: React.FC<MealPrepViewProps> = ({
  itemsDespensa,
  onCooked,
  onOpenScan,
  onOpenAddManual,
}) => {
  const isOnline = useOnlineStatus();

  // Load configuration from localStorage
  const [config, setConfig] = useState<MealPrepConfig>(() =>
    PantryStore.getMealPrepConfig()
  );

  // Active generated or loaded plan
  const [currentPlan, setCurrentPlan] = useState<PlanoMarmita | null>(null);

  // Saved plans list
  const [savedPlans, setSavedPlans] = useState<PlanoMarmita[]>(() =>
    PantryStore.getMealPrepPlanos()
  );

  // UI state
  const [activeTab, setActiveTab] = useState<'form' | 'resultado' | 'salvos'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal "FIZ AS MARMITAS"
  const [dishToCook, setDishToCook] = useState<PratoMarmita | null>(null);
  const [deductions, setDeductions] = useState<
    Array<{
      produtoId: string;
      nome: string;
      quantidade: number;
      unidade: string;
      emEstoque: number;
    }>
  >([]);

  // Expanded cooking steps per dish
  const [expandedPrep, setExpandedPrep] = useState<Record<string, boolean>>({});

  // Sync config changes to localStorage
  useEffect(() => {
    PantryStore.saveMealPrepConfig(config);
  }, [config]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 3200);
  };

  // Real-time macro calculations & improbable check
  const macroCalc = useMemo(() => {
    let pNutri = config.metaProteina;
    let cNutri = config.metaCarbo;
    const gNutri = config.metaGordura ?? 5; // free fat assumes 5g olive oil

    if (config.tipoMeta === 'alimento') {
      // Estimated: cooked chicken is ~31% protein, cooked white rice is ~28% carbo
      pNutri = Math.round(config.metaProteina * 0.31);
      cNutri = Math.round(config.metaCarbo * 0.28);
    }

    const kcalEstimada = Math.round(4 * pNutri + 4 * cNutri + 9 * gNutri);

    // Warning check
    const isImprobable =
      pNutri > 80 ||
      cNutri > 150 ||
      kcalEstimada > 1200 ||
      kcalEstimada < 250;

    return {
      pNutri,
      cNutri,
      gNutri,
      kcalEstimada,
      isImprobable,
    };
  }, [
    config.metaProteina,
    config.metaCarbo,
    config.metaGordura,
    config.tipoMeta,
  ]);

  // Handle plan generation via API
  const handleGeneratePlan = async (isReroll: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      const seenTitles = PantryStore.getMealPrepVistos();
      const response = await ApiService.planMealPrep({
        config,
        pantryItems: itemsDespensa,
        excludeTitles: isReroll ? seenTitles : [],
        shuffleSeed: Date.now(),
      });

      if (!response.pratos || response.pratos.length === 0) {
        throw new Error('Nenhum prato pôde ser planejado no momento.');
      }

      // Solve deterministic mathematical quantities for each dish
      const numPratos = config.numPratos;
      const totalMarmitas = config.numMarmitas;

      const calculatedDishes: PratoMarmita[] = response.pratos.map((rawDish: any, index: number) => {
        let marmitasDoPrato = totalMarmitas;
        if (numPratos === 2) {
          // Half for each: first dish gets the ceiling (majority)
          marmitasDoPrato = index === 0 ? Math.ceil(totalMarmitas / 2) : Math.floor(totalMarmitas / 2);
        }

        return solveDishMealPrep(rawDish, config, marmitasDoPrato, itemsDespensa);
      });

      const newPlan: PlanoMarmita = {
        id: `plano_${Date.now()}`,
        config: { ...config },
        pratos: calculatedDishes,
        criadoEm: new Date().toISOString(),
      };

      // Save dish titles to seen list for reroll diversity
      PantryStore.addMealPrepVistos(calculatedDishes.map(d => d.nome));

      setCurrentPlan(newPlan);
      setActiveTab('resultado');

      if (response.source === 'reserva') {
        showToast('Usando cardápio brasileiro de reserva nutritivo.');
      } else {
        showToast('Cardápio de marmitas calculado com sucesso!');
      }
    } catch (err) {
      console.error('Erro ao gerar marmitas:', err);
      setError(
        err instanceof Error ? err.message : 'Falha na comunicação com o servidor de marmitas.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Toggle preferences chips
  const togglePref = (type: 'prot' | 'carb', item: string) => {
    if (type === 'prot') {
      const curr = config.preferenciasProteina || [];
      const updated = curr.includes(item) ? curr.filter(x => x !== item) : [...curr, item];
      setConfig({ ...config, preferenciasProteina: updated });
    } else {
      const curr = config.preferenciasCarbo || [];
      const updated = curr.includes(item) ? curr.filter(x => x !== item) : [...curr, item];
      setConfig({ ...config, preferenciasCarbo: updated });
    }
  };

  // Save current plan
  const handleSavePlan = () => {
    if (!currentPlan) return;
    PantryStore.saveMealPrepPlano(currentPlan);
    setSavedPlans(PantryStore.getMealPrepPlanos());
    showToast('Cardápio salvo em "Meus cardápios salvos"!');
  };

  // Delete saved plan
  const handleDeletePlan = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    PantryStore.deleteMealPrepPlano(id);
    setSavedPlans(PantryStore.getMealPrepPlanos());
    if (currentPlan?.id === id) {
      setCurrentPlan(null);
    }
    showToast('Cardápio removido dos salvos.');
  };

  // Add missing ingredients to Shopping List
  const handleAddMissingToShoppingList = (prato: PratoMarmita) => {
    let count = 0;
    prato.ingredientes.forEach(ing => {
      if (ing.faltaKg > 0) {
        PantryStore.adicionarItemLista({
          nome: ing.nome,
          quantidade: ing.faltaKg,
          unidade: 'kg',
          categoria: 'mercearia',
          emoji: '🍱',
          comprado: false,
        });
        count++;
      }
    });

    if (count > 0) {
      showToast(`${count} ${count === 1 ? 'item adicionado' : 'itens adicionados'} à lista de compras!`);
    } else {
      showToast('Você já tem todos os ingredientes necessários na despensa!');
    }
  };

  // Copy shopping list text for WhatsApp
  const handleCopyWhatsAppList = (prato: PratoMarmita) => {
    const lines: string[] = [];
    lines.push(`🍱 *LISTA DE COMPRAS - MEAL PREP*`);
    lines.push(`*Prato:* ${prato.nome}`);
    lines.push(`*Rendimento:* ${prato.numMarmitas} marmitas`);
    lines.push(``);
    lines.push(`🛒 *Ingredientes a Comprar (Peso Cru):*`);

    prato.ingredientes.forEach(ing => {
      if (ing.totalCruKg > 0 && ing.papel !== 'tempero') {
        const falta = ing.faltaKg > 0 ? ` (Falta: ${ing.faltaKg} kg)` : ' (Já tenho na despensa)';
        lines.push(`• ${ing.nome}: ${ing.totalCruKg} kg cru${falta}`);
      }
    });

    const temperos = prato.ingredientes.filter(i => i.papel === 'tempero');
    if (temperos.length > 0) {
      lines.push(``);
      lines.push(`🧂 *Temperos:* ${temperos.map(t => t.nome).join(', ')}`);
    }

    lines.push(``);
    lines.push(`✨ Gerado pelo SmartPantry`);

    const text = lines.join('\n');
    navigator.clipboard.writeText(text);
    showToast('Lista copiada para compartilhar no WhatsApp!');
  };

  // Open "FIZ AS MARMITAS" Modal
  const handleOpenCookModal = (prato: PratoMarmita) => {
    setDishToCook(prato);

    // Prepare list of pantry deductions
    const initialDeductions = prato.ingredientes
      .filter(ing => ing.produtoIdDespensa && ing.totalCruKg > 0)
      .map(ing => {
        const itemPantry = itemsDespensa.find(p => p.produto.id === ing.produtoIdDespensa);
        const un = itemPantry?.produto.unidadePadrao || 'kg';
        let qtd = ing.totalCruKg;

        if (un === 'g' || un === 'ml') {
          qtd = Math.round(ing.totalCruKg * 1000);
        } else if (un === 'un') {
          qtd = Math.max(1, Math.round(ing.totalCruKg / 0.05));
        }

        return {
          produtoId: ing.produtoIdDespensa!,
          nome: itemPantry?.produto.nomeCanonico || ing.nome,
          quantidade: Math.min(qtd, itemPantry?.quantidadeTotal || qtd),
          unidade: un,
          emEstoque: itemPantry?.quantidadeTotal || 0,
        };
      });

    setDeductions(initialDeductions);
  };

  // Confirm "FIZ AS MARMITAS"
  const handleConfirmCook = () => {
    if (!dishToCook) return;

    // Execute pantry deductions
    const movIds: string[] = [];
    deductions.forEach(d => {
      if (d.quantidade > 0) {
        const res = PantryStore.consumirItem(
          d.produtoId,
          d.quantidade,
          `receita:marmita_${dishToCook.id}`
        );
        movIds.push(...res.movimentosCriados.map(m => m.id));
      }
    });

    // Record cooked in history: "Marmitas: <nome do prato> x N"
    try {
      const feitas = PantryStore.getReceitasFeitas();
      feitas.unshift({
        id: `marmita_${Date.now()}`,
        titulo: `Marmitas: ${dishToCook.nome} x ${dishToCook.numMarmitas}`,
        refeicao: 'almoco',
        data: new Date().toISOString(),
      });
      localStorage.setItem('smartpantry_receitas_feitas_v1', JSON.stringify(feitas));
    } catch {}

    // Confetti explosion
    confetti({
      particleCount: 75,
      spread: 70,
      origin: { y: 0.6 },
    });

    const desc = `Marmitas: ${dishToCook.nome} (${dishToCook.numMarmitas} un)`;
    showToast(`Parabéns! ${dishToCook.numMarmitas} marmitas preparadas e despensa atualizada.`);

    if (onCooked) {
      onCooked(desc, movIds);
    }

    setDishToCook(null);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Toast feedback */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#1E3A2F] text-amber-50 px-5 py-3 rounded-lg border-2 border-stone-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-mono text-sm flex items-center gap-2 max-w-[90vw] animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner & Sub-Navigation */}
      <div className="bg-[#F4EFE6] border-2 border-stone-800 rounded-xl p-4 sm:p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-[#1E3A2F] text-amber-100 flex items-center justify-center border-2 border-stone-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#E8F3EE] text-[#1E3A2F] border border-stone-700 rounded">
                  MEAL PREP
                </span>
                <span className="font-mono text-xs text-stone-500 font-semibold">
                  Cálculo Determinístico
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 leading-tight">
                Marmitas da Semana
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('form')}
              className={`flex-1 sm:flex-initial px-3 py-2 text-xs font-mono font-bold rounded-lg border-2 border-stone-800 transition-all min-h-[44px] flex items-center justify-center gap-1.5 ${
                activeTab === 'form'
                  ? 'bg-[#1E3A2F] text-amber-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'bg-white text-stone-700 hover:bg-stone-100'
              }`}
            >
              <Scale className="w-4 h-4" />
              Configurar
            </button>

            {currentPlan && (
              <button
                onClick={() => setActiveTab('resultado')}
                className={`flex-1 sm:flex-initial px-3 py-2 text-xs font-mono font-bold rounded-lg border-2 border-stone-800 transition-all min-h-[44px] flex items-center justify-center gap-1.5 ${
                  activeTab === 'resultado'
                    ? 'bg-[#1E3A2F] text-amber-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white text-stone-700 hover:bg-stone-100'
                }`}
              >
                <CookingPot className="w-4 h-4" />
                Cardápio Atual
              </button>
            )}

            <button
              onClick={() => setActiveTab('salvos')}
              className={`flex-1 sm:flex-initial px-3 py-2 text-xs font-mono font-bold rounded-lg border-2 border-stone-800 transition-all min-h-[44px] flex items-center justify-center gap-1.5 ${
                activeTab === 'salvos'
                  ? 'bg-[#1E3A2F] text-amber-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'bg-white text-stone-700 hover:bg-stone-100'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              Salvos ({savedPlans.length})
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: FORMULÁRIO DE CONFIGURAÇÃO */}
      {activeTab === 'form' && (
        <div className="bg-[#FDFBF7] border-2 border-stone-800 rounded-xl p-4 sm:p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-6">
          <div className="border-b-2 border-stone-200 pb-3">
            <h3 className="text-lg font-black text-stone-900">
              Planejamento e Metas Nutricionais
            </h3>
            <p className="text-xs text-stone-600 font-mono mt-0.5">
              Defina suas metas por marmita. A IA escolhe os ingredientes e a matemática calcula as quantidades exatas.
            </p>
          </div>

          {/* Empty Pantry Informational Alert with Action Buttons */}
          {itemsDespensa.length === 0 && (
            <div className="bg-[#FAF7F2] border-2 border-stone-800 rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-600 flex items-center justify-center shrink-0 text-base">
                  📦
                </div>
                <div>
                  <h4 className="font-mono text-xs font-bold uppercase text-stone-900">
                    Sua despensa está vazia no momento
                  </h4>
                  <p className="text-xs text-[#625B55] mt-0.5 leading-relaxed">
                    Você pode planejar o cardápio de marmitas normalmente mesmo sem estoque (o app calculará a lista completa para comprar), ou cadastrar itens da sua despensa para aproveitá-los primeiro.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {onOpenScan && (
                  <button
                    type="button"
                    onClick={onOpenScan}
                    className="px-3 py-1.5 bg-white hover:bg-stone-100 border-2 border-stone-800 rounded-lg font-mono text-xs font-bold text-stone-800 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] min-h-[44px] flex items-center gap-1.5"
                  >
                    <span>📷 Escanear Nota Fiscal</span>
                  </button>
                )}
                {onOpenAddManual && (
                  <button
                    type="button"
                    onClick={onOpenAddManual}
                    className="px-3 py-1.5 bg-white hover:bg-stone-100 border-2 border-stone-800 rounded-lg font-mono text-xs font-bold text-stone-800 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] min-h-[44px] flex items-center gap-1.5"
                  >
                    <span>➕ Adicionar Item Manual</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Improbable / Warning alert */}
          {macroCalc.isImprobable && (
            <div className="bg-amber-50 border-2 border-amber-600 rounded-lg p-3.5 flex items-start gap-3 shadow-[2px_2px_0px_0px_rgba(217,119,6,0.5)]">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <span className="font-bold">Atenção aos valores informados: </span>
                {macroCalc.pNutri > 80 && `Proteína de ${macroCalc.pNutri}g por marmita é muito alta para uma única refeição. `}
                {macroCalc.cNutri > 150 && `Carboidrato de ${macroCalc.cNutri}g é muito elevado para uma marmita padrão. `}
                {macroCalc.kcalEstimada > 1200 && `Calorias estimadas (${macroCalc.kcalEstimada} kcal) parecem excessivas. `}
                {macroCalc.kcalEstimada < 250 && `Calorias estimadas (${macroCalc.kcalEstimada} kcal) estão muito baixas. `}
                <div className="font-mono mt-1 font-semibold text-amber-950">
                  Dica: Se você pretendia informar o peso do alimento cozido (ex: 150g de frango pronto), mude o seletor abaixo para "Peso do ALIMENTO cozido".
                </div>
              </div>
            </div>
          )}

          {/* Seletor Nutriente vs Peso do Alimento */}
          <div className="bg-[#F4EFE6] border-2 border-stone-800 rounded-xl p-3.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-2">
            <label className="block text-xs font-mono font-bold text-stone-800 uppercase tracking-wider">
              As metas de proteína e carboidrato são:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfig({ ...config, tipoMeta: 'nutriente' })}
                className={`px-3 py-2.5 rounded-lg border-2 border-stone-800 font-mono text-xs font-bold transition-all text-left flex items-center justify-between min-h-[44px] ${
                  config.tipoMeta === 'nutriente'
                    ? 'bg-[#1E3A2F] text-amber-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white text-stone-700 hover:bg-stone-100'
                }`}
              >
                <span>Gramas do NUTRIENTE puro</span>
                {config.tipoMeta === 'nutriente' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </button>

              <button
                type="button"
                onClick={() => setConfig({ ...config, tipoMeta: 'alimento' })}
                className={`px-3 py-2.5 rounded-lg border-2 border-stone-800 font-mono text-xs font-bold transition-all text-left flex items-center justify-between min-h-[44px] ${
                  config.tipoMeta === 'alimento'
                    ? 'bg-[#1E3A2F] text-amber-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white text-stone-700 hover:bg-stone-100'
                }`}
              >
                <span>Peso do ALIMENTO cozido</span>
                {config.tipoMeta === 'alimento' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>
            <p className="text-[11px] font-mono text-stone-600">
              {config.tipoMeta === 'nutriente'
                ? 'Exemplo: 30g de proteína equivale a ~100g de peito de frango pronto.'
                : 'Exemplo: 150g de frango pronto e 200g de arroz cozido na balança.'}
            </p>
          </div>

          {/* Grid de Metas & Steppers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Número de Marmitas (Stepper) */}
            <div className="bg-white border-2 border-stone-800 rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-2">
              <label className="block text-xs font-mono font-bold text-stone-700 uppercase tracking-wider">
                Total de Marmitas da Semana (1 a 14)
              </label>
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, numMarmitas: Math.max(1, config.numMarmitas - 1) })}
                  aria-label="Diminuir quantidade de marmitas"
                  className="w-12 h-12 rounded-lg bg-stone-100 hover:bg-stone-200 border-2 border-stone-800 flex items-center justify-center font-black text-xl text-stone-800 active:translate-y-0.5 min-h-[44px] min-w-[44px]"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <div className="text-center font-mono">
                  <div className="text-3xl font-black text-stone-900 leading-none">
                    {config.numMarmitas}
                  </div>
                  <div className="text-[11px] text-stone-500 font-bold uppercase mt-1">
                    {config.numMarmitas === 1 ? 'marmita' : 'marmitas'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, numMarmitas: Math.min(14, config.numMarmitas + 1) })}
                  aria-label="Aumentar quantidade de marmitas"
                  className="w-12 h-12 rounded-lg bg-stone-100 hover:bg-stone-200 border-2 border-stone-800 flex items-center justify-center font-black text-xl text-stone-800 active:translate-y-0.5 min-h-[44px] min-w-[44px]"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Resumo de Calorias em Tempo Real */}
            <div className="bg-[#E8F3EE] border-2 border-stone-800 rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#1E3A2F]">
                  ESTIMATIVA POR MARMITA
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-[#1E3A2F]">
                    ~{macroCalc.kcalEstimada}
                  </span>
                  <span className="font-mono text-sm font-bold text-stone-600">kcal</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-emerald-900/20 font-mono text-xs">
                <div>
                  <div className="text-stone-500 text-[10px]">PROTEÍNA</div>
                  <div className="font-bold text-stone-900">{macroCalc.pNutri}g</div>
                </div>
                <div>
                  <div className="text-stone-500 text-[10px]">CARBO</div>
                  <div className="font-bold text-stone-900">{macroCalc.cNutri}g</div>
                </div>
                <div>
                  <div className="text-stone-500 text-[10px]">GORDURA</div>
                  <div className="font-bold text-stone-900">{macroCalc.gNutri}g</div>
                </div>
              </div>
            </div>
          </div>

          {/* Inputs de Metas por Marmita */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Proteína */}
            <div className="bg-white border-2 border-stone-800 rounded-xl p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <label className="block text-[11px] font-mono font-bold text-stone-700 uppercase">
                Proteína ({config.tipoMeta === 'nutriente' ? 'g nutriente' : 'g alimento'})
              </label>
              <div className="mt-1 flex items-center gap-1">
                <input
                  type="number"
                  min="5"
                  max="400"
                  value={config.metaProteina}
                  onChange={e => setConfig({ ...config, metaProteina: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border-2 border-stone-800 rounded-lg font-mono font-bold text-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
                <span className="font-mono text-xs font-bold text-stone-500">g</span>
              </div>
            </div>

            {/* Carboidrato */}
            <div className="bg-white border-2 border-stone-800 rounded-xl p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <label className="block text-[11px] font-mono font-bold text-stone-700 uppercase">
                Carboidrato ({config.tipoMeta === 'nutriente' ? 'g nutriente' : 'g alimento'})
              </label>
              <div className="mt-1 flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={config.metaCarbo}
                  onChange={e => setConfig({ ...config, metaCarbo: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border-2 border-stone-800 rounded-lg font-mono font-bold text-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
                <span className="font-mono text-xs font-bold text-stone-500">g</span>
              </div>
            </div>

            {/* Gordura (Opcional) */}
            <div className="bg-white border-2 border-stone-800 rounded-xl p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <label className="block text-[11px] font-mono font-bold text-stone-700 uppercase">
                Gordura (g nutriente)
              </label>
              <div className="mt-1 flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Livre"
                  value={config.metaGordura ?? ''}
                  onChange={e =>
                    setConfig({
                      ...config,
                      metaGordura: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border-2 border-stone-800 rounded-lg font-mono font-bold text-lg text-stone-900 placeholder:text-stone-400 placeholder:font-normal placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
                <span className="font-mono text-xs font-bold text-stone-500">g</span>
              </div>
            </div>

            {/* Legumes e Verduras */}
            <div className="bg-white border-2 border-stone-800 rounded-xl p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <label className="block text-[11px] font-mono font-bold text-stone-700 uppercase">
                Legumes / Verduras
              </label>
              <div className="mt-1 flex items-center gap-1">
                <input
                  type="number"
                  min="50"
                  max="500"
                  value={config.metaLegumes}
                  onChange={e => setConfig({ ...config, metaLegumes: Number(e.target.value) || 150 })}
                  className="w-full px-3 py-2 border-2 border-stone-800 rounded-lg font-mono font-bold text-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
                <span className="font-mono text-xs font-bold text-stone-500">g</span>
              </div>
            </div>
          </div>

          {/* Variedade de Pratos (1 vs 2) */}
          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold text-stone-800 uppercase tracking-wider">
              Variedade de Pratos no Cardápio:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfig({ ...config, numPratos: 1 })}
                className={`px-4 py-3 rounded-lg border-2 border-stone-800 font-mono text-xs font-bold text-left transition-all flex items-center justify-between min-h-[44px] ${
                  config.numPratos === 1
                    ? 'bg-[#1E3A2F] text-amber-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white text-stone-700 hover:bg-stone-100'
                }`}
              >
                <div>
                  <div className="font-black text-sm">1 prato único</div>
                  <div className="text-[11px] font-normal opacity-80">Todas as {config.numMarmitas} marmitas iguais (mais prático)</div>
                </div>
                {config.numPratos === 1 && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => setConfig({ ...config, numPratos: 2 })}
                className={`px-4 py-3 rounded-lg border-2 border-stone-800 font-mono text-xs font-bold text-left transition-all flex items-center justify-between min-h-[44px] ${
                  config.numPratos === 2
                    ? 'bg-[#1E3A2F] text-amber-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white text-stone-700 hover:bg-stone-100'
                }`}
              >
                <div>
                  <div className="font-black text-sm">2 pratos diferentes</div>
                  <div className="text-[11px] font-normal opacity-80">
                    {Math.ceil(config.numMarmitas / 2)} de um + {Math.floor(config.numMarmitas / 2)} de outro (para variar)
                  </div>
                </div>
                {config.numPratos === 2 && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
              </button>
            </div>
          </div>

          {/* Dieta */}
          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold text-stone-800 uppercase tracking-wider">
              Dieta:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'tudo', label: 'Tudo' },
                { id: 'vegetariano', label: 'Vegetariano' },
                { id: 'vegano', label: 'Vegano' },
                { id: 'com_carne', label: 'Só Carnes' },
              ].map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setConfig({ ...config, dieta: d.id as any })}
                  className={`px-3 py-2 rounded-lg border-2 border-stone-800 font-mono text-xs font-bold transition-all min-h-[44px] ${
                    config.dieta === d.id
                      ? 'bg-[#1E3A2F] text-amber-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-white text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preferências Opcionais de Proteína */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-mono font-bold text-stone-800 uppercase tracking-wider">
                Preferência de Proteína (Opcional):
              </label>
              <span className="text-[11px] font-mono text-stone-500">
                {config.preferenciasProteina?.length ? `${config.preferenciasProteina.length} selecionadas` : 'Livre'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PREF_PROTEINAS.map(p => {
                const selected = config.preferenciasProteina?.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePref('prot', p)}
                    className={`px-3 py-1.5 rounded-full border-2 border-stone-800 font-mono text-xs font-bold transition-all min-h-[44px] flex items-center gap-1.5 ${
                      selected
                        ? 'bg-[#1E3A2F] text-amber-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                        : 'bg-white text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <span>{p}</span>
                    {selected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preferências Opcionais de Carboidrato */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-mono font-bold text-stone-800 uppercase tracking-wider">
                Preferência de Carboidrato (Opcional):
              </label>
              <span className="text-[11px] font-mono text-stone-500">
                {config.preferenciasCarbo?.length ? `${config.preferenciasCarbo.length} selecionadas` : 'Livre'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PREF_CARBOS.map(c => {
                const selected = config.preferenciasCarbo?.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => togglePref('carb', c)}
                    className={`px-3 py-1.5 rounded-full border-2 border-stone-800 font-mono text-xs font-bold transition-all min-h-[44px] flex items-center gap-1.5 ${
                      selected
                        ? 'bg-[#1E3A2F] text-amber-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                        : 'bg-white text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <span>{c}</span>
                    {selected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interruptor Priorizar Despensa */}
          <div className="flex items-center justify-between bg-stone-50 border-2 border-stone-800 rounded-xl p-3.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <div>
              <div className="font-mono font-bold text-xs text-stone-900 uppercase">
                Priorizar o que já tenho na despensa
              </div>
              <div className="text-[11px] text-stone-500 font-mono">
                Usa primeiro produtos com validade próxima para evitar desperdício.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setConfig({ ...config, priorizarDespensa: !config.priorizarDespensa })}
              className={`w-14 h-8 rounded-full border-2 border-stone-800 transition-colors relative flex items-center p-0.5 min-h-[44px] min-w-[44px] ${
                config.priorizarDespensa ? 'bg-[#1E3A2F]' : 'bg-stone-300'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-white border border-stone-800 shadow-sm transition-transform ${
                  config.priorizarDespensa ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Observações Opcionais */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold text-stone-800 uppercase tracking-wider">
              Observações (Opcional):
            </label>
            <input
              type="text"
              placeholder="Ex.: sem pimenta, gosto de comida bem temperada, sem glúten..."
              value={config.observacoes || ''}
              onChange={e => setConfig({ ...config, observacoes: e.target.value })}
              className="w-full px-3 py-2.5 border-2 border-stone-800 rounded-lg font-mono text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-500 rounded-lg p-3 text-xs font-mono text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Offline notice when disconnected */}
          {!isOnline && (
            <div className="bg-[#FEF3C7] border-2 border-[#B45309] rounded-xl p-3.5 shadow-[2px_2px_0px_0px_rgba(180,83,9,0.4)] flex items-center gap-2.5 font-mono text-xs text-[#B45309]">
              <WifiOff className="w-5 h-5 shrink-0" />
              <span>Modo offline: Conecte-se à internet para planejar novos cardápios com IA. Você ainda pode consultar seus cardápios salvos na aba &quot;Salvos&quot;.</span>
            </div>
          )}

          {/* Botão Grande GERAR CARDÁPIO DAS MARMITAS */}
          <button
            type="button"
            disabled={loading || !isOnline}
            title={!isOnline ? 'Conecte-se à internet para gerar cardápios de marmitas' : undefined}
            onClick={() => handleGeneratePlan(false)}
            className="w-full py-4 px-6 bg-[#1E3A2F] text-amber-50 hover:bg-[#2D5A46] active:translate-y-0.5 rounded-xl border-2 border-stone-800 font-mono font-black text-base uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-3 disabled:opacity-50 min-h-[52px]"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-amber-50 border-t-transparent rounded-full animate-spin" />
                <span>PLANEJANDO E CALCULANDO MARMITAS...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>GERAR CARDÁPIO DAS MARMITAS</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* TAB 2: TELA DO RESULTADO */}
      {activeTab === 'resultado' && currentPlan && (
        <div className="space-y-6">
          {/* Cardápio Action Bar */}
          <div className="bg-[#F4EFE6] border-2 border-stone-800 rounded-xl p-3.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-stone-700">
                Plano: {currentPlan.pratos.length} {currentPlan.pratos.length === 1 ? 'prato' : 'pratos'} • {currentPlan.config.numMarmitas} marmitas
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSavePlan}
                className="px-3 py-1.5 bg-white hover:bg-stone-100 border-2 border-stone-800 rounded-lg font-mono text-xs font-bold text-stone-800 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5 min-h-[44px]"
              >
                <Bookmark className="w-4 h-4 text-emerald-700" />
                Salvar cardápio
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleGeneratePlan(true)}
                className="px-3 py-1.5 bg-white hover:bg-stone-100 border-2 border-stone-800 rounded-lg font-mono text-xs font-bold text-stone-800 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5 min-h-[44px] disabled:opacity-50"
              >
                <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Gerar outro cardápio
              </button>
            </div>
          </div>

          {/* Cards dos Pratos */}
          {currentPlan.pratos.map((prato, pIndex) => (
            <div
              key={prato.id || pIndex}
              className="bg-[#FDFBF7] border-2 border-stone-800 rounded-xl p-4 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-6"
            >
              {/* Header do Prato */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b-2 border-stone-200 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="font-mono text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-[#1E3A2F] text-amber-100 border border-stone-800 rounded">
                      PRATO {pIndex + 1} DE {currentPlan.pratos.length}
                    </span>

                    <span
                      className={`font-mono text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-stone-800 ${
                        prato.source === 'ia'
                          ? 'bg-purple-100 text-purple-900'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {prato.source === 'ia' ? '✨ GERADO POR IA' : '📋 RESERVA NUTRITIVA'}
                    </span>

                    <span className="font-mono text-xs font-bold text-stone-700 flex items-center gap-1">
                      <CookingPot className="w-3.5 h-3.5 text-stone-500" />
                      Rende {prato.numMarmitas} {prato.numMarmitas === 1 ? 'marmita' : 'marmitas'}
                    </span>

                    <span className="font-mono text-xs font-bold text-stone-700 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-500" />
                      {prato.tempoTotalMin} min total
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-stone-900">
                    {prato.nome}
                  </h3>
                  <p className="text-xs text-stone-600 mt-1">
                    {prato.descricao}
                  </p>
                </div>

                <div className="text-right sm:shrink-0 bg-[#E8F3EE] border-2 border-stone-800 rounded-lg p-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <div className="text-[10px] font-mono font-bold uppercase text-[#1E3A2F]">
                    CALORIAS / MARMITA
                  </div>
                  <div className="text-2xl font-black text-[#1E3A2F]">
                    {prato.macrosPorMarmita.kcal} <span className="text-xs font-normal">kcal</span>
                  </div>
                </div>
              </div>

              {/* Barras de Progresso: Meta vs Atingido */}
              <div className="bg-[#F4EFE6] border-2 border-stone-800 rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-stone-800">
                    Meta vs Atingido por Marmita
                  </span>
                  {(Math.abs(prato.desvios.proteinaPct) > 10 || Math.abs(prato.desvios.carboPct) > 10) && (
                    <span className="text-[11px] font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                      Desvio &gt; 10%
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                  {/* Proteína */}
                  <div className="bg-white p-3 rounded-lg border border-stone-300 space-y-1.5">
                    <div className="flex justify-between items-center text-stone-600">
                      <span>Proteína</span>
                      <span className="font-bold text-stone-900">
                        {prato.macrosPorMarmita.proteina}g / {currentPlan.config.metaProteina}g
                      </span>
                    </div>
                    <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden border border-stone-300">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (prato.macrosPorMarmita.proteina / (currentPlan.config.metaProteina || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-stone-500 text-right">
                      {prato.desvios.proteinaPct > 0 ? `+${prato.desvios.proteinaPct}%` : `${prato.desvios.proteinaPct}%`} vs meta
                    </div>
                  </div>

                  {/* Carboidrato */}
                  <div className="bg-white p-3 rounded-lg border border-stone-300 space-y-1.5">
                    <div className="flex justify-between items-center text-stone-600">
                      <span>Carboidrato</span>
                      <span className="font-bold text-stone-900">
                        {prato.macrosPorMarmita.carbo}g / {currentPlan.config.metaCarbo}g
                      </span>
                    </div>
                    <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden border border-stone-300">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (prato.macrosPorMarmita.carbo / (currentPlan.config.metaCarbo || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-stone-500 text-right">
                      {prato.desvios.carboPct > 0 ? `+${prato.desvios.carboPct}%` : `${prato.desvios.carboPct}%`} vs meta
                    </div>
                  </div>

                  {/* Gordura */}
                  <div className="bg-white p-3 rounded-lg border border-stone-300 space-y-1.5">
                    <div className="flex justify-between items-center text-stone-600">
                      <span>Gordura</span>
                      <span className="font-bold text-stone-900">
                        {prato.macrosPorMarmita.gordura}g
                        {currentPlan.config.metaGordura ? ` / ${currentPlan.config.metaGordura}g` : ' (azeite + natural)'}
                      </span>
                    </div>
                    <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden border border-stone-300">
                      <div
                        className="bg-stone-500 h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            (prato.macrosPorMarmita.gordura / (currentPlan.config.metaGordura || 15)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-stone-500 text-right">
                      Inclui 5g azeite de cocção
                    </div>
                  </div>
                </div>

                {/* Offer "Ajustar ingredientes" if deviation > 10% */}
                {(Math.abs(prato.desvios.proteinaPct) > 10 || Math.abs(prato.desvios.carboPct) > 10) && (
                  <div className="flex items-center justify-between bg-amber-50 border border-amber-300 rounded-lg p-2.5 text-xs font-mono text-amber-900">
                    <span>Deseja testar outra combinação de ingredientes para melhor precisão?</span>
                    <button
                      type="button"
                      onClick={() => handleGeneratePlan(true)}
                      className="px-2.5 py-1 bg-amber-600 text-white font-bold rounded hover:bg-amber-700 min-h-[44px] flex items-center justify-center"
                    >
                      Ajustar ingredientes
                    </button>
                  </div>
                )}
              </div>

              {/* Seção CADA MARMITA (Ilustração e porção individual) */}
              <div className="border-2 border-stone-800 rounded-xl p-4 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-2">
                <span className="font-mono text-[10px] font-black uppercase tracking-wider text-stone-500">
                  CADA MARMITA (PESO COZIDO NA BALANÇA)
                </span>
                <div className="bg-[#E8F3EE] p-3 rounded-lg border border-stone-300 font-mono text-sm font-bold text-[#1E3A2F] flex items-center gap-2 overflow-x-auto">
                  <span>{prato.ilustracaoTextual}</span>
                </div>
              </div>

              {/* Seção NA PANELA (quanto fazer no total) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-stone-600" />
                    NA PANELA: Quanto Fazer no Total ({prato.numMarmitas} marmitas)
                  </span>
                </div>

                {/* Mobile stacked cards */}
                <div className="space-y-2">
                  {prato.ingredientes
                    .filter(ing => ing.papel !== 'tempero')
                    .map((ing, iIdx) => (
                      <div
                        key={iIdx}
                        className="bg-white border-2 border-stone-800 rounded-lg p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-bold text-stone-900">
                            {ing.nome}
                          </span>
                          {ing.estimado && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-stone-100 text-stone-600 border border-stone-300 rounded">
                              estimado
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2 font-mono text-xs pt-1 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                          <div className="bg-stone-50 p-1.5 rounded border border-stone-200">
                            <div className="text-[10px] text-stone-500">Comprar Cru</div>
                            <div className="font-black text-stone-900">{ing.totalCruKg} kg</div>
                          </div>

                          <div className="bg-stone-50 p-1.5 rounded border border-stone-200">
                            <div className="text-[10px] text-stone-500">Pronto Panela</div>
                            <div className="font-bold text-stone-800">{ing.totalCozidoG} g</div>
                          </div>

                          <div className="bg-emerald-50 p-1.5 rounded border border-emerald-200">
                            <div className="text-[10px] text-emerald-700">Por Marmita</div>
                            <div className="font-black text-emerald-900">{ing.gramasPorMarmita} g</div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Seção Da despensa / Falta comprar */}
              <div className="bg-[#F4EFE6] border-2 border-stone-800 rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-black uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-emerald-800" />
                      Da Despensa vs Falta Comprar
                    </span>
                    <p className="text-[11px] text-stone-600 font-mono mt-0.5">
                      Verifique o que você já tem no armário e o que precisa ser comprado.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddMissingToShoppingList(prato)}
                    className="px-3 py-2 bg-emerald-800 hover:bg-emerald-900 text-amber-50 rounded-lg border-2 border-stone-800 font-mono text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 flex items-center justify-center gap-1.5 min-h-[44px]"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar o que falta à lista de compras
                  </button>
                </div>

                <div className="space-y-1.5">
                  {prato.ingredientes
                    .filter(i => i.totalCruKg > 0)
                    .map((ing, iIdx) => (
                      <div
                        key={iIdx}
                        className="bg-white p-2.5 rounded-lg border border-stone-300 font-mono text-xs flex items-center justify-between"
                      >
                        <span className="font-bold text-stone-800">{ing.nome}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-stone-500">
                            Tenho: <strong className="text-stone-700">{ing.emEstoqueKg} kg</strong>
                          </span>
                          <span
                            className={
                              ing.faltaKg > 0 ? 'text-red-600 font-bold' : 'text-emerald-700 font-bold'
                            }
                          >
                            {ing.faltaKg > 0 ? `Falta: ${ing.faltaKg} kg` : '✓ Completo'}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Modo de Preparo em Lote (Passos Numerados) */}
              <div className="border-2 border-stone-800 rounded-xl p-4 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-3">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedPrep({
                      ...expandedPrep,
                      [prato.id]: !expandedPrep[prato.id],
                    })
                  }
                  className="w-full flex items-center justify-between text-left font-mono font-bold text-xs uppercase tracking-wider text-stone-800 min-h-[44px]"
                >
                  <span className="flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4 text-stone-600" />
                    Modo de Preparo em Lote ({prato.modoPreparo.length} passos)
                  </span>
                  {expandedPrep[prato.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {expandedPrep[prato.id] && (
                  <div className="space-y-2 pt-2 border-t border-stone-200">
                    {prato.modoPreparo.map((passo, sIdx) => (
                      <div key={sIdx} className="flex items-start gap-3 text-xs leading-relaxed text-stone-800">
                        <span className="w-6 h-6 rounded-full bg-[#1E3A2F] text-amber-50 font-mono font-bold flex items-center justify-center shrink-0 border border-stone-800 text-[11px]">
                          {sIdx + 1}
                        </span>
                        <p className="mt-0.5">{passo}</p>
                      </div>
                    ))}

                    <div className="mt-4 pt-3 border-t border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                      <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                        <span className="font-bold text-stone-900 block mb-1">Armazenamento:</span>
                        <p className="text-stone-600">{prato.armazenamento}</p>
                      </div>

                      <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                        <span className="font-bold text-stone-900 block mb-1">Como Reaquecer:</span>
                        <p className="text-stone-600">{prato.dicaReaquecer}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Botões de Ação do Prato */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleCopyWhatsAppList(prato)}
                  className="px-4 py-3 bg-white hover:bg-stone-100 border-2 border-stone-800 rounded-xl font-mono text-xs font-bold text-stone-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 flex items-center gap-2 min-h-[44px]"
                >
                  <Share2 className="w-4 h-4 text-emerald-700" />
                  Copiar lista de compras (WhatsApp)
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenCookModal(prato)}
                  className="flex-1 sm:flex-initial px-6 py-3 bg-amber-400 hover:bg-amber-500 text-stone-900 border-2 border-stone-800 rounded-xl font-mono font-black text-sm uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <CookingPot className="w-5 h-5 text-stone-900" />
                  FIZ AS MARMITAS
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: CARDÁPIOS SALVOS */}
      {activeTab === 'salvos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-stone-900">
              Meus Cardápios Salvos ({savedPlans.length}/10)
            </h3>
          </div>

          {savedPlans.length === 0 ? (
            <div className="bg-[#FDFBF7] border-2 border-stone-800 rounded-xl p-8 text-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-3">
              <Bookmark className="w-10 h-10 text-stone-400 mx-auto" />
              <div className="font-mono font-bold text-stone-800 text-sm">
                Nenhum cardápio salvo ainda
              </div>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Quando você gerar um cardápio das marmitas, clique no botão "Salvar cardápio" para guardá-lo aqui.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className="mt-2 px-4 py-2 bg-[#1E3A2F] text-amber-50 rounded-lg border-2 border-stone-800 font-mono text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] min-h-[44px]"
              >
                Planejar agora
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedPlans.map(plan => (
                <div
                  key={plan.id}
                  onClick={() => {
                    setCurrentPlan(plan);
                    setActiveTab('resultado');
                  }}
                  className="bg-[#FDFBF7] border-2 border-stone-800 rounded-xl p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-stone-50 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-stone-500 font-mono text-[10px]">
                      <span>{new Date(plan.criadoEm).toLocaleDateString('pt-BR')}</span>
                      <button
                        type="button"
                        onClick={e => handleDeletePlan(plan.id, e)}
                        aria-label="Excluir cardápio"
                        className="p-1 hover:text-red-600 transition-colors rounded min-h-[32px] min-w-[32px] flex items-center justify-center"
                        title="Excluir cardápio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h4 className="font-black text-stone-900 text-base leading-snug">
                      {plan.pratos.map(p => p.nome).join(' + ')}
                    </h4>

                    <div className="flex flex-wrap gap-2 text-xs font-mono text-stone-600">
                      <span className="bg-[#E8F3EE] px-2 py-0.5 rounded border border-emerald-300 font-bold text-[#1E3A2F]">
                        {plan.config.numMarmitas} marmitas
                      </span>
                      <span className="bg-stone-100 px-2 py-0.5 rounded border border-stone-300">
                        {plan.config.metaProteina}g P • {plan.config.metaCarbo}g C
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-xs font-mono font-bold text-[#1E3A2F]">
                    <span>Ver detalhes do cardápio</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL "FIZ AS MARMITAS" (Baixa de Estoque) */}
      {dishToCook && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-[#FDFBF7] border-t-2 sm:border-2 border-stone-800 rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <CookingPot className="w-6 h-6 text-amber-500" />
                <h3 className="font-black text-stone-900 text-lg sm:text-xl">
                  Dar Baixa na Despensa
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDishToCook(null)}
                aria-label="Fechar"
                className="w-8 h-8 rounded-lg border-2 border-stone-800 flex items-center justify-center hover:bg-stone-100 text-stone-700 min-h-[44px] min-w-[44px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-600 font-mono">
              Confirme as quantidades em peso CRU que foram consumidas da sua despensa para preparar as{' '}
              <strong>{dishToCook.numMarmitas} marmitas</strong> de <strong>{dishToCook.nome}</strong>:
            </p>

            <div className="space-y-2.5">
              {deductions.length === 0 ? (
                <div className="p-3 bg-stone-100 rounded-lg text-xs font-mono text-stone-600 text-center">
                  Nenhum ingrediente deste prato foi encontrado na despensa para baixa automática.
                </div>
              ) : (
                deductions.map((d, dIdx) => (
                  <div
                    key={dIdx}
                    className="p-3 bg-white border-2 border-stone-800 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-mono font-bold text-xs text-stone-900">{d.nome}</div>
                      <div className="text-[10px] font-mono text-stone-500">
                        Em estoque: {d.emEstoque} {d.unidade}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        min="0"
                        step="0.05"
                        value={d.quantidade}
                        onChange={e => {
                          const val = Number(e.target.value) || 0;
                          const updated = [...deductions];
                          updated[dIdx].quantidade = val;
                          setDeductions(updated);
                        }}
                        className="w-20 px-2 py-1.5 border-2 border-stone-800 rounded font-mono font-bold text-sm text-stone-900 text-right min-h-[44px]"
                      />
                      <span className="font-mono text-xs font-bold text-stone-600 w-8">
                        {d.unidade}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t-2 border-stone-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDishToCook(null)}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 border-2 border-stone-800 rounded-lg font-mono text-xs font-bold text-stone-800 min-h-[44px]"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmCook}
                className="px-5 py-2.5 bg-[#1E3A2F] text-amber-50 hover:bg-[#2D5A46] border-2 border-stone-800 rounded-lg font-mono font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 flex items-center gap-1.5 min-h-[44px]"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                Confirmar e Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
