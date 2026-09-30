import React, { useState, useEffect, useMemo } from 'react';
import {
  ChefHat,
  Sparkles,
  Clock,
  Users,
  Flame,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  CookingPot,
  RotateCcw,
  X,
  Check,
  Shuffle,
  Dices,
  Boxes,
  Plus,
  WifiOff,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ItemDespensa, Receita } from '../types/pantry';
import { ApiService } from '../services/api';
import { PantryStore } from '../services/storage';
import { MealPrepView } from './MealPrepView';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface RecipeSuggestionsProps {
  itemsDespensa: ItemDespensa[];
  onCooked: (desc: string, movimentoIds: string[]) => void;
  onOpenScan?: () => void;
  onOpenAddManual?: () => void;
}

export const RecipeSuggestions: React.FC<RecipeSuggestionsProps> = ({
  itemsDespensa,
  onCooked,
  onOpenScan,
  onOpenAddManual,
}) => {
  const config = PantryStore.getConfig();
  const isOnline = useOnlineStatus();

  // Top tab selector: Receitas do dia vs Marmitas da semana
  const [recipeTab, setRecipeTab] = useState<'dia' | 'marmitas'>('dia');

  // Filters
  const [diet, setDiet] = useState<'tudo' | 'vegetariano' | 'vegano' | 'com_carne'>(config.dietaPadrao);
  const [meal, setMeal] = useState<'qualquer' | 'cafe' | 'almoco' | 'lanche' | 'jantar'>('qualquer');
  const [maxTime, setMaxTime] = useState<number>(45);
  const [maxMissing, setMaxMissing] = useState<number>(config.toleranciaFaltantes);

  const SESSION_STORAGE_KEY = 'smartpantry_session_recipes';
  const SEEN_TITLES_KEY = 'smartpantry_seen_recipe_titles';

  // Recipes state & pool
  const [allRecipes, setAllRecipes] = useState<Receita[]>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [pageIndex, setPageIndex] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [rerolling, setRerolling] = useState(false);

  const [seenTitles, setSeenTitles] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(SEEN_TITLES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [error, setError] = useState<string | null>(null);

  // Selected recipe detail modal
  const [selectedRecipe, setSelectedRecipe] = useState<Receita | null>(null);

  // "Cozinhei esta" modal state
  const [cookingRecipe, setCookingRecipe] = useState<Receita | null>(null);
  const [deductions, setDeductions] = useState<Array<{ produtoId: string; nome: string; quantidade: number; unidade: string }>>([]);

  // Slice 4 recipes according to pageIndex
  const displayedRecipes = useMemo(() => {
    if (allRecipes.length <= 4) return allRecipes;
    const start = pageIndex * 4;
    const slice = allRecipes.slice(start, start + 4);
    return slice.length > 0 ? slice : allRecipes.slice(0, 4);
  }, [allRecipes, pageIndex]);

  const handleFetchRecipes = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await ApiService.suggestRecipes({
        itemsDespensa,
        diet,
        meal,
        maxPrepTimeMinutes: maxTime,
        maxMissingIngredients: maxMissing,
        pantryBasics: config.basicos,
        excludeTitles: seenTitles,
        shuffleSeed: Date.now(),
      });

      if (results.length === 0) {
        setError('Não encontramos receitas com os filtros atuais. Experimente aceitar mais faltantes ou alterar a refeição.');
      } else {
        setAllRecipes(results);
        setPageIndex(0);
        try {
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(results));
        } catch {}

        const newSeen = Array.from(new Set([...seenTitles, ...results.map(r => r.titulo)]));
        setSeenTitles(newSeen);
        try {
          localStorage.setItem(SEEN_TITLES_KEY, JSON.stringify(newSeen));
        } catch {}
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao buscar receitas.');
    } finally {
      setLoading(false);
    }
  };

  // Roll new recipes: either flip to next 4 in pool or call API for 8 fresh ones
  const handleRerollRecipes = async () => {
    // 1. If currently showing first 4 and pool has more than 4, show next 4 instantly!
    if (pageIndex === 0 && allRecipes.length > 4) {
      setPageIndex(1);
      return;
    }

    // 2. Pool exhausted: query API for next 8 recipes with excludeTitles and new seed
    setRerolling(true);
    setError(null);

    const currentTitles = allRecipes.map(r => r.titulo);
    const updatedSeen = Array.from(new Set([...seenTitles, ...currentTitles]));
    setSeenTitles(updatedSeen);
    try {
      localStorage.setItem(SEEN_TITLES_KEY, JSON.stringify(updatedSeen));
    } catch {}

    try {
      const results = await ApiService.suggestRecipes({
        itemsDespensa,
        diet,
        meal,
        maxPrepTimeMinutes: maxTime,
        maxMissingIngredients: maxMissing,
        pantryBasics: config.basicos,
        excludeTitles: updatedSeen,
        shuffleSeed: Date.now(),
      });

      if (results.length === 0) {
        // If all known combinations were seen, retry excluding only the current titles
        const retry = await ApiService.suggestRecipes({
          itemsDespensa,
          diet,
          meal,
          maxPrepTimeMinutes: maxTime,
          maxMissingIngredients: maxMissing,
          pantryBasics: config.basicos,
          excludeTitles: currentTitles,
          shuffleSeed: Date.now(),
        });

        if (retry.length > 0) {
          setAllRecipes(retry);
          setPageIndex(0);
          try {
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(retry));
          } catch {}
        } else {
          setError('Não encontramos outras combinações no momento. Tente alterar o tempo ou tolerância de faltantes.');
        }
      } else {
        setAllRecipes(results);
        setPageIndex(0);
        try {
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(results));
        } catch {}
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao rodar novas receitas.');
    } finally {
      setRerolling(false);
    }
  };

  // Automatically consult recipes on mount if pantry has items and no session recipes
  useEffect(() => {
    if (allRecipes.length === 0 && itemsDespensa.length > 0) {
      handleFetchRecipes();
    }
  }, []);

  const openCookModal = (recipe: Receita) => {
    const list = recipe.ingredientesUsados.map(ing => {
      const pantryItem = itemsDespensa.find(p => p.produto.id === ing.produtoId);
      const qtdSugestao = Math.min(ing.quantidade, pantryItem?.quantidadeTotal || ing.quantidade);

      return {
        produtoId: ing.produtoId || '',
        nome: ing.nome,
        quantidade: qtdSugestao > 0 ? qtdSugestao : 1,
        unidade: ing.unidade,
      };
    });

    setDeductions(list);
    setCookingRecipe(recipe);
  };

  const handleConfirmCook = () => {
    if (!cookingRecipe) return;

    const res = PantryStore.cozinharReceita(cookingRecipe, deductions);
    const ids = res.movimentosCriados.map(m => m.id);

    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#2E7D5A', '#B45309', '#C2543B', '#E8DFD1'],
      });
    } catch {}

    onCooked(`Receita "${cookingRecipe.titulo}" liquidada no estoque.`, ids);
    setCookingRecipe(null);
    setSelectedRecipe(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Segmented Selector: Receitas do dia vs Marmitas da semana */}
      <div className="flex bg-[#F4EFE6] p-1.5 rounded-xl border-2 border-stone-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] gap-2">
        <button
          type="button"
          onClick={() => setRecipeTab('dia')}
          className={`flex-1 py-2.5 px-3 rounded-lg font-mono text-xs sm:text-sm font-bold transition-all min-h-[44px] flex items-center justify-center gap-2 ${
            recipeTab === 'dia'
              ? 'bg-[#1E3A2F] text-amber-50 border-2 border-stone-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
              : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
          }`}
        >
          <ChefHat className="w-4 h-4" />
          <span>Receitas do dia</span>
        </button>

        <button
          type="button"
          onClick={() => setRecipeTab('marmitas')}
          className={`flex-1 py-2.5 px-3 rounded-lg font-mono text-xs sm:text-sm font-bold transition-all min-h-[44px] flex items-center justify-center gap-2 ${
            recipeTab === 'marmitas'
              ? 'bg-[#1E3A2F] text-amber-50 border-2 border-stone-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
              : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
          }`}
        >
          <Boxes className="w-4 h-4 text-amber-400" />
          <span>Marmitas da semana</span>
        </button>
      </div>

      {recipeTab === 'marmitas' ? (
        <MealPrepView
          itemsDespensa={itemsDespensa}
          onCooked={onCooked}
          onOpenScan={onOpenScan}
          onOpenAddManual={onOpenAddManual}
        />
      ) : (
        <>
          {/* Empty Pantry Warning Banner with Quick Action Buttons */}
          {itemsDespensa.length === 0 && (
            <div className="bg-[#FFFDF9] rounded-2xl border-2 border-stone-800 p-6 sm:p-8 text-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#FAF7F2] border-2 border-stone-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center mx-auto text-2xl">
                📦
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-[#292524]">
                  Sua despensa está vazia no momento
                </h3>
                <p className="text-xs sm:text-sm text-[#625B55] mt-1 max-w-md mx-auto leading-relaxed">
                  Cadastre seus alimentos lendo o QR Code do cupom fiscal ou adicionando itens manualmente para receber sugestões personalizadas do Chef.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {onOpenScan && (
                  <button
                    type="button"
                    onClick={onOpenScan}
                    className="px-4 py-2.5 rounded-xl bg-[#2E7D5A] hover:bg-[#25684A] text-white font-ledger-mono text-xs font-bold border border-[#235F44] shadow-[2px_2px_0px_#1B4934] transition flex items-center gap-2 min-h-[44px]"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>ESCANEAR NOTA FISCAL</span>
                  </button>
                )}
                {onOpenAddManual && (
                  <button
                    type="button"
                    onClick={onOpenAddManual}
                    className="px-4 py-2.5 rounded-xl bg-[#FFFDF9] hover:bg-[#FAF7F2] text-[#292524] font-ledger-mono text-xs font-bold border-2 border-stone-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition flex items-center gap-2 min-h-[44px]"
                  >
                    <Plus className="w-4 h-4 text-stone-700" />
                    <span>ADICIONAR MANUALMENTE</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Recipe Header Notebook Card */}
          <div className="bg-[#FFFDF9] rounded-2xl border border-[#E8DFD1] p-6 sm:p-8 shadow-[2px_2px_0px_#E5DCD0] text-[#292524] relative">
        <div className="max-w-2xl">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-1 text-[#292524]">
            Receitas
          </h2>
          <p className="text-[#625B55] text-xs sm:text-sm leading-relaxed mb-6">
            Sugestões práticas para o dia a dia aproveitando o que você já tem em casa.
          </p>

          {/* Filters Bar styled as Ledger Section */}
          <div className="bg-[#FAF7F2] p-5 rounded-xl border border-[#E8DFD1] space-y-4">
            {/* Diet chips */}
            <div>
              <span className="text-[10px] font-ledger-mono font-bold text-[#625B55] uppercase tracking-wider block mb-2">
                Restrição de Dieta
              </span>
              <div className="flex flex-wrap gap-1.5 font-ledger-mono text-xs">
                {[
                  { id: 'tudo', label: 'TUDO' },
                  { id: 'vegetariano', label: '🌱 VEGETARIANO' },
                  { id: 'vegano', label: '🌿 VEGANO' },
                  { id: 'com_carne', label: '🥩 CARNES' },
                ].map(d => (
                  <button
                    key={d.id}
                    onClick={() => setDiet(d.id as any)}
                    className={`px-3 py-1.5 rounded-lg border transition ${
                      diet === d.id
                        ? 'bg-[#292524] text-[#FFFDF9] border-[#292524] shadow-[1.5px_1.5px_0px_#625B55] font-bold'
                        : 'bg-[#FFFDF9] border-[#E8DFD1] text-[#625B55] hover:text-[#292524]'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Meal chips */}
            <div>
              <span className="text-[10px] font-ledger-mono font-bold text-[#625B55] uppercase tracking-wider block mb-2">
                Tipo de Refeição
              </span>
              <div className="flex flex-wrap gap-1.5 font-ledger-mono text-xs">
                {[
                  { id: 'qualquer', label: 'QUALQUER' },
                  { id: 'cafe', label: '☕ CAFÉ' },
                  { id: 'almoco', label: '🍲 ALMOÇO' },
                  { id: 'lanche', label: '🥪 LANCHE' },
                  { id: 'jantar', label: '🍽️ JANTAR' },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMeal(m.id as any)}
                    className={`px-3 py-1.5 rounded-lg border transition ${
                      meal === m.id
                        ? 'bg-[#B45309] text-white border-[#B45309] shadow-[1.5px_1.5px_0px_#78350F] font-bold'
                        : 'bg-[#FFFDF9] border-[#E8DFD1] text-[#625B55] hover:text-[#292524]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders in Retro Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#E8DFD1] font-ledger-mono text-xs">
              <div>
                <div className="flex justify-between text-[#625B55] mb-1">
                  <span>TEMPO MÁXIMO:</span>
                  <strong className="text-[#292524]">{maxTime} MIN</strong>
                </div>
                <input
                  type="range"
                  min="15"
                  max="90"
                  step="15"
                  value={maxTime}
                  onChange={e => setMaxTime(Number(e.target.value))}
                  className="w-full accent-[#2E7D5A] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[#625B55] mb-1">
                  <span>ACEITO FALTAR ATÉ:</span>
                  <strong className="text-[#292524]">{maxMissing} ITENS</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="4"
                  step="1"
                  value={maxMissing}
                  onChange={e => setMaxMissing(Number(e.target.value))}
                  className="w-full accent-[#2E7D5A] cursor-pointer"
                />
              </div>
            </div>

            {/* Offline notice when disconnected */}
            {!isOnline && (
              <div className="p-3 rounded-xl bg-[#FEF3C7] border border-[#B45309] text-[#B45309] text-xs font-ledger-mono flex items-center gap-2.5">
                <WifiOff className="w-4 h-4 shrink-0" />
                <span>Modo offline: Conecte-se à internet para consultar o Chef IA.</span>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={handleFetchRecipes}
              disabled={loading || itemsDespensa.length === 0 || !isOnline}
              title={!isOnline ? 'Conecte-se à internet para consultar receitas' : undefined}
              className="w-full py-3.5 px-4 rounded-xl bg-[#2E7D5A] hover:bg-[#25684A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-white font-ledger-mono text-xs font-bold border border-[#235F44] shadow-[2px_2px_0px_#1B4934] transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[46px]"
            >
              {loading ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin text-white" />
                  <span>CONSULTANDO LIVRO DE RECEITAS...</span>
                </>
              ) : (
                <>
                  <ChefHat className="w-4 h-4 text-white" />
                  <span>CONSULTAR RECEITAS</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error / Alert notice */}
      {error && (
        <div className="p-4 rounded-xl bg-[#FEF3C7] border border-[#B45309] text-[#B45309] text-xs font-ledger-mono flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Recipes Cards Grid as vintage recipe cards */}
      {displayedRecipes.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-ledger-mono">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#292524]">
                  Receitas Sugeridas
                </h3>
                {allRecipes.length > 4 && (
                  <span className="text-[10px] font-bold text-[#2E7D5A] px-2 py-0.5 rounded border border-[#2E7D5A]/30 bg-[#EBF5F0]">
                    PÁGINA {pageIndex + 1} DE {Math.ceil(allRecipes.length / 4)} &bull; {displayedRecipes.length} DE {allRecipes.length}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#625B55] mt-0.5">
                Opções práticas para preparar agora
              </p>
            </div>

            <button
              onClick={handleRerollRecipes}
              disabled={rerolling || loading}
              className="px-3.5 py-2 rounded-xl bg-[#FFFDF9] hover:bg-[#FAF7F2] border border-[#E8DFD1] shadow-[1.5px_1.5px_0px_#E5DCD0] text-xs font-bold text-[#292524] transition active:translate-x-[0.5px] active:translate-y-[0.5px] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[40px] shrink-0"
              title="Trocar e sortear novas sugestões de receitas"
            >
              <Shuffle className={`w-3.5 h-3.5 text-[#2E7D5A] ${rerolling ? 'animate-spin' : ''}`} />
              <span>{rerolling ? 'RODANDO OUTRAS...' : 'RODAR OUTRAS RECEITAS'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedRecipes.map((recipe: Receita) => {
              const missingCount = recipe.ingredientesFaltando.filter((f: { opcional?: boolean }) => !f.opcional).length;

              return (
                <div
                  key={recipe.id}
                  onClick={() => setSelectedRecipe(recipe)}
                  className="bg-[#FFFDF9] rounded-2xl p-5 border border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0] hover:border-[#D6C8B6] hover:shadow-[3px_3px_0px_#D6C8B6] transition cursor-pointer flex flex-col justify-between group active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                >
                  <div>
                    <h4 className="text-base font-bold text-[#292524] group-hover:text-[#2E7D5A] transition">
                      {recipe.titulo}
                    </h4>
                    <p className="text-xs text-[#625B55] line-clamp-2 mt-1 leading-relaxed">
                      {recipe.descricao}
                    </p>

                    {/* Metadata row in Space Mono */}
                    <div className="flex items-center gap-3 text-xs font-ledger-mono text-[#625B55] my-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#A8A29E]" />
                        {recipe.tempoPreparoMinutos} MIN
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-[#A8A29E]" />
                        {recipe.porcoes} PORÇÕES
                      </span>
                      <span>&bull;</span>
                      <span className="uppercase">{recipe.dificuldade}</span>
                    </div>

                    {/* Ingredients summary */}
                    <div className="pt-3 border-t border-[#E8DFD1] flex flex-wrap items-center gap-1.5 text-[11px] font-ledger-mono">
                      <span className="text-[#625B55] mr-1">USA:</span>
                      {recipe.ingredientesUsados.slice(0, 3).map((ing: { nome: string }, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-[#FAF7F2] border border-[#E8DFD1] text-[#292524]"
                        >
                          {ing.nome}
                        </span>
                      ))}
                      {recipe.ingredientesUsados.length > 3 && (
                        <span className="text-[#A8A29E]">+{recipe.ingredientesUsados.length - 3}</span>
                      )}

                      {missingCount > 0 ? (
                        <span className="ml-auto text-[10px] font-bold text-[#C2543B] bg-[#FBF0ED] border border-[#C2543B] px-1.5 py-0.5 rounded">
                          FALTA {missingCount}
                        </span>
                      ) : (
                        <span className="ml-auto text-[10px] font-bold text-[#2E7D5A] bg-[#EBF5F0] border border-[#2E7D5A] px-1.5 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-[#2E7D5A]" /> TUDO DISPONÍVEL
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-[#E8DFD1] flex items-center justify-between">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        openCookModal(recipe);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#2E7D5A] hover:bg-[#25684A] text-white font-ledger-mono text-xs font-bold border border-[#235F44] shadow-[1.5px_1.5px_0px_#1B4934] transition active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none flex items-center gap-1.5 min-h-[38px]"
                    >
                      <CookingPot className="w-3.5 h-3.5" />
                      <span>COZINHEI ESTA!</span>
                    </button>

                    <span className="text-xs font-ledger-mono font-bold text-[#292524] group-hover:text-[#2E7D5A] transition flex items-center gap-1">
                      <span>VER MODO DE FAZER</span>
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Reroll Action */}
          <div className="pt-3 pb-2 flex justify-center">
            <button
              onClick={handleRerollRecipes}
              disabled={rerolling || loading}
              className="px-5 py-3 rounded-2xl bg-[#FFFDF9] hover:bg-[#FAF7F2] border border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0] text-xs font-ledger-mono font-bold text-[#292524] transition active:translate-x-[0.5px] active:translate-y-[0.5px] flex items-center gap-2.5 cursor-pointer disabled:opacity-50 min-h-[44px]"
            >
              <Dices className={`w-4 h-4 text-[#B45309] ${rerolling ? 'animate-spin' : ''}`} />
              <span>{rerolling ? 'CONSULTANDO OUTRAS OPÇÕES...' : 'NÃO GOSTOU DESSAS? RODAR OUTRAS RECEITAS'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Recipe Detail Modal as culinary paper dossier */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-2xl bg-[#FFFDF9] rounded-2xl border border-[#E8DFD1] shadow-[3px_3px_0px_#E5DCD0] text-[#292524] overflow-hidden flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header in Stone Charcoal */}
            <div className="p-6 bg-[#292524] text-[#FFFDF9] relative">
              <button
                onClick={() => setSelectedRecipe(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg border border-[#44403C] text-[#A8A29E] hover:text-[#FFFDF9] hover:bg-[#44403C] transition"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl sm:text-2xl font-bold text-[#FFFDF9]">{selectedRecipe.titulo}</h3>
              <p className="text-xs sm:text-sm text-[#D6D3D1] mt-1">{selectedRecipe.descricao}</p>

              <div className="flex items-center gap-4 text-xs font-ledger-mono text-[#D6D3D1] mt-4">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#A7F3D0]" />
                  <span>{selectedRecipe.tempoPreparoMinutos} MINUTOS</span>
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#A7F3D0]" />
                  <span>{selectedRecipe.porcoes} PORÇÕES</span>
                </span>
              </div>
            </div>

            {/* Scrollable Recipe Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Ingredients section */}
              <div>
                <h4 className="text-[11px] font-ledger-mono font-bold text-[#625B55] uppercase tracking-wider mb-3">
                  Ingredientes da despensa
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedRecipe.ingredientesUsados.map((ing, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8DFD1] text-xs font-ledger-mono"
                    >
                      <span className="font-bold text-[#292524]">{ing.nome}</span>
                      <span className="text-[#2E7D5A] font-bold">
                        {ing.quantidade} {ing.unidade.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Missing ingredients */}
              {selectedRecipe.ingredientesFaltando.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-ledger-mono font-bold text-[#625B55] uppercase tracking-wider mb-3">
                    Ingredientes extras (opcional)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedRecipe.ingredientesFaltando.map((ing, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[#FEF3C7]/60 border border-[#B45309]/30 text-xs font-ledger-mono"
                      >
                        <span className="text-[#292524]">{ing.nome}</span>
                        <span className="text-[#B45309] font-bold">{ing.quantidadeAprox}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Steps */}
              <div>
                <h4 className="text-[11px] font-ledger-mono font-bold text-[#625B55] uppercase tracking-wider mb-3">
                  Modo de preparo
                </h4>
                <div className="space-y-3">
                  {selectedRecipe.passos.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded bg-[#292524] text-[#FFFDF9] font-ledger-mono font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-xs sm:text-sm text-[#44403C] leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Zero waste tip */}
              {selectedRecipe.dicasDesperdicioZero && (
                <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E8DFD1] text-xs text-[#625B55] flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#292524]">Dica:</strong>{' '}
                    {selectedRecipe.dicasDesperdicioZero}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 sm:p-5 border-t border-[#E8DFD1] bg-[#FAF7F2] flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedRecipe(null)}
                className="px-4 py-2 rounded-xl border border-[#E8DFD1] bg-[#FFFDF9] text-xs font-ledger-mono font-bold text-[#625B55] hover:text-[#292524] transition min-h-[44px]"
              >
                VOLTAR
              </button>

              <button
                onClick={() => openCookModal(selectedRecipe)}
                className="px-6 py-2.5 rounded-xl bg-[#2E7D5A] hover:bg-[#25684A] text-white font-ledger-mono font-bold text-xs sm:text-sm border border-[#235F44] shadow-[2px_2px_0px_#1B4934] transition active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-2 min-h-[44px]"
              >
                <CookingPot className="w-4 h-4" />
                <span>COZINHEI ESTA REFEIÇÃO!</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* "Cozinhei esta" Confirmation modal with stock deduction adjustment */}
      {cookingRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg bg-[#FFFDF9] rounded-2xl border border-[#E8DFD1] shadow-[3px_3px_0px_#E5DCD0] text-[#292524] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-[#E8DFD1] bg-[#FAF7F2] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFFDF9] border border-[#E8DFD1] shadow-[1.5px_1.5px_0px_#E5DCD0] text-[#2E7D5A] flex items-center justify-center">
                  <CookingPot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#292524]">Liquidação de Estoque</h3>
                  <p className="font-ledger-mono text-[11px] text-[#625B55]">Confirmação de saída de insumos</p>
                </div>
              </div>
              <button
                onClick={() => setCookingRecipe(null)}
                className="p-1 rounded-lg border border-[#E8DFD1] bg-[#FFFDF9] text-[#625B55] hover:text-[#292524]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-[#625B55]">
                Confira as quantidades que foram utilizadas para atualizar o livro contábil da cozinha:
              </p>

              <div className="space-y-2.5">
                {deductions.map((ing, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#FAF7F2] border border-[#E8DFD1] text-xs font-ledger-mono"
                  >
                    <span className="font-bold text-[#292524]">{ing.nome}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={ing.quantidade}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          setDeductions(prev =>
                            prev.map((item, i) => (i === idx ? { ...item, quantidade: val } : item))
                          );
                        }}
                        className="w-20 px-2.5 py-1.5 rounded-lg border border-[#E8DFD1] bg-[#FFFDF9] font-bold text-center text-xs focus:border-[#625B55] focus:outline-none"
                      />
                      <span className="text-[#625B55] uppercase w-8">{ing.unidade}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-[#E8DFD1] bg-[#FAF7F2] flex items-center justify-between gap-3">
              <button
                onClick={() => setCookingRecipe(null)}
                className="px-4 py-2 rounded-xl border border-[#E8DFD1] bg-[#FFFDF9] text-xs font-ledger-mono font-bold text-[#625B55] hover:text-[#292524] min-h-[44px]"
              >
                CANCELAR
              </button>

              <button
                onClick={handleConfirmCook}
                className="px-6 py-2.5 rounded-xl bg-[#2E7D5A] hover:bg-[#25684A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-white font-ledger-mono font-bold text-xs sm:text-sm border border-[#235F44] shadow-[2px_2px_0px_#1B4934] transition flex items-center gap-2 min-h-[44px]"
              >
                <Check className="w-4 h-4" />
                <span>CONFIRMAR E BAIXAR</span>
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
