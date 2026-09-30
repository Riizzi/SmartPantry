import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Flame,
  AlertTriangle,
  Calendar,
  ChefHat,
  PackageX,
  Minus,
} from 'lucide-react';
import { ItemDespensa } from '../types/pantry';
import { PantryStore } from '../services/storage';

interface PantryViewProps {
  items: ItemDespensa[];
  onSelectItem: (item: ItemDespensa) => void;
  onOpenScan: () => void;
  onOpenAddManual: () => void;
  onConsumed: (desc: string, movimentoIds: string[]) => void;
  onNavigateTab?: (tab: 'despensa' | 'essenciais' | 'receitas' | 'historico' | 'ajustes') => void;
}

export const PantryView: React.FC<PantryViewProps> = ({
  items,
  onSelectItem,
  onOpenScan,
  onOpenAddManual,
  onConsumed,
  onNavigateTab,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [urgencyFilter, setUrgencyFilter] = useState<'todos' | 'vence_logo' | 'vencidos'>('todos');

  const cookedRecipesCount = PantryStore.getReceitasFeitasCount();

  // Categories list with counts (styled as archival folder tabs)
  const categoriesList = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(it => {
      counts[it.produto.categoria] = (counts[it.produto.categoria] || 0) + 1;
    });

    return [
      { id: 'todas', label: 'Todas', emoji: '🧺', count: items.length },
      { id: 'hortifruti', label: 'Hortifrúti', emoji: '🍅', count: counts['hortifruti'] || 0 },
      { id: 'carnes', label: 'Carnes', emoji: '🥩', count: counts['carnes'] || 0 },
      { id: 'laticinios', label: 'Laticínios', emoji: '🧀', count: counts['laticinios'] || 0 },
      { id: 'graos', label: 'Grãos', emoji: '🍚', count: counts['graos'] || 0 },
      { id: 'padaria', label: 'Padaria', emoji: '🍞', count: counts['padaria'] || 0 },
      { id: 'bebidas', label: 'Bebidas', emoji: '🧃', count: counts['bebidas'] || 0 },
      { id: 'mercearia', label: 'Mercearia', emoji: '🥫', count: counts['mercearia'] || 0 },
      { id: 'temperos', label: 'Temperos', emoji: '🧂', count: counts['temperos'] || 0 },
    ].filter(c => c.id === 'todas' || c.count > 0);
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(it => {
      const matchSearch =
        it.produto.nomeCanonico.toLowerCase().includes(search.toLowerCase()) ||
        it.produto.aliases.some(a => a.toLowerCase().includes(search.toLowerCase()));

      const matchCategory =
        selectedCategory === 'todas' || it.produto.categoria === selectedCategory;

      let matchUrgency = true;
      if (urgencyFilter === 'vence_logo') {
        matchUrgency = it.diasAteVencer >= 0 && it.diasAteVencer <= 3;
      } else if (urgencyFilter === 'vencidos') {
        matchUrgency = it.diasAteVencer < 0;
      }

      return matchSearch && matchCategory && matchUrgency;
    });
  }, [items, search, selectedCategory, urgencyFilter]);

  const urgentCount = useMemo(() => {
    return items.filter(it => it.diasAteVencer >= 0 && it.diasAteVencer <= 3).length;
  }, [items]);

  const expiredCount = useMemo(() => {
    return items.filter(it => it.diasAteVencer < 0).length;
  }, [items]);

  const handleQuickMinusOne = (e: React.MouseEvent, it: ItemDespensa) => {
    e.stopPropagation();
    const amount = it.quantidadeTotal <= 1 ? it.quantidadeTotal : 1;
    const res = PantryStore.consumirItem(it.produto.id, amount, 'manual');
    if (res.sucesso && res.movimentosCriados.length > 0) {
      const ids = res.movimentosCriados.map(m => m.id);
      onConsumed(`Baixa de 1 ${it.produto.unidadePadrao} em ${it.produto.nomeCanonico}`, ids);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Ledger Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Card */}
        <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-ledger-mono uppercase tracking-wider text-[#625B55] block">
              TOTAL ITENS
            </span>
            <span className="font-ledger-mono text-2xl font-bold text-[#292524]">
              {String(items.length).padStart(2, '0')}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E8DFD1] flex items-center justify-center text-lg">
            🥗
          </div>
        </div>

        {/* Expiring Soon Card */}
        <button
          onClick={() => setUrgencyFilter(prev => (prev === 'vence_logo' ? 'todos' : 'vence_logo'))}
          className={`p-4 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer min-h-[44px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
            urgencyFilter === 'vence_logo'
              ? 'bg-[#FEF3C7] border-[#B45309] shadow-[2px_2px_0px_#B45309]'
              : 'bg-[#FFFDF9] border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0] hover:border-[#D6C8B6]'
          }`}
        >
          <div>
            <span className="text-[11px] font-ledger-mono uppercase tracking-wider text-[#B45309] font-bold block">
              VENCE EM BREVE
            </span>
            <span className="font-ledger-mono text-2xl font-bold text-[#B45309]">
              {String(urgentCount).padStart(2, '0')}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E8DFD1] flex items-center justify-center text-[#B45309]">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
        </button>

        {/* Expired / Waste Control Card */}
        {expiredCount > 0 ? (
          <button
            onClick={() => setUrgencyFilter(prev => (prev === 'vencidos' ? 'todos' : 'vencidos'))}
            className={`p-4 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer min-h-[44px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
              urgencyFilter === 'vencidos'
                ? 'bg-[#FBF0ED] border-[#C2543B] shadow-[2px_2px_0px_#C2543B]'
                : 'bg-[#FFFDF9] border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0] hover:border-[#C2543B]'
            }`}
          >
            <div>
              <span className="text-[11px] font-ledger-mono uppercase tracking-wider text-[#C2543B] font-bold block">
                VENCIDOS
              </span>
              <span className="font-ledger-mono text-2xl font-bold text-[#C2543B]">
                {String(expiredCount).padStart(2, '0')}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E8DFD1] flex items-center justify-center text-[#C2543B]">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </button>
        ) : (
          <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-ledger-mono uppercase tracking-wider text-[#625B55] block">
                STATUS VALIDADE
              </span>
              <span className="font-ledger-mono text-xs font-bold text-[#2E7D5A] block mt-1">
                [100% EM DIA]
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#EBF5F0] border border-[#2E7D5A]/30 flex items-center justify-center text-[#2E7D5A]">
              ✓
            </div>
          </div>
        )}

        {/* Cooked Recipes Card (Receitas) */}
        <button
          onClick={() => onNavigateTab && onNavigateTab('receitas')}
          className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0] hover:border-[#D6C8B6] transition flex items-center justify-between cursor-pointer col-span-2 sm:col-span-1 min-h-[44px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          title="Ver aba de Receitas"
        >
          <div>
            <span className="text-[11px] font-ledger-mono uppercase tracking-wider text-[#625B55] block">
              RECEITAS FEITAS
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="font-ledger-mono text-2xl font-bold text-[#B45309]">
                {String(cookedRecipesCount).padStart(2, '0')}
              </span>
              <span className="font-ledger-mono text-[10px] uppercase text-[#625B55]">
                COZINHADAS
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E8DFD1] flex items-center justify-center text-[#B45309]">
            <ChefHat className="w-5 h-5 text-[#B45309]" />
          </div>
        </button>
      </div>

      {/* Search and Archival File Tabs */}
      <div className="space-y-3">
        {/* Search bar + Manual add button */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#625B55] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar itens na despensa..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#FFFDF9] rounded-xl border border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0] focus:border-[#625B55] focus:outline-none text-xs sm:text-sm text-[#292524] placeholder-[#A8A29E]"
            />
          </div>

          <button
            onClick={onOpenAddManual}
            className="px-3.5 py-2.5 rounded-xl border border-[#E8DFD1] bg-[#FFFDF9] hover:bg-[#FAF7F2] text-[#292524] text-xs font-semibold shadow-[2px_2px_0px_#E5DCD0] transition active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1.5 shrink-0 min-h-[44px] cursor-pointer"
            title="Cadastrar produto manualmente"
          >
            <Plus className="w-4 h-4 text-[#2E7D5A]" />
            <span className="hidden sm:inline font-ledger-mono text-xs">ITEM MANUAL</span>
          </button>
        </div>

        {/* Archival File Tabs ("Zero-Pill") */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categoriesList.map(cat => {
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 shrink-0 border ${
                  isSelected
                    ? 'bg-[#292524] text-[#FFFDF9] border-[#292524] shadow-[1.5px_1.5px_0px_#625B55]'
                    : 'bg-[#FFFDF9] border-[#E8DFD1] text-[#625B55] hover:text-[#292524] hover:border-[#D6C8B6]'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
                <span
                  className={`font-ledger-mono text-[10px] px-1 py-0.2 rounded border ${
                    isSelected
                      ? 'bg-[#44403C] text-[#FFFDF9] border-[#44403C]'
                      : 'bg-[#FAF7F2] text-[#625B55] border-[#E8DFD1]'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Food Ledger Cards */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-[#FFFDF9] rounded-2xl border border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0] text-[#625B55]">
          <PackageX className="w-12 h-12 mx-auto text-[#D6C8B6] mb-3" />
          <h3 className="text-base font-bold text-[#292524]">Nenhum registro encontrado</h3>
          <p className="text-xs text-[#625B55] mt-1 max-w-sm mx-auto">
            {search
              ? 'Nenhum item corresponde à sua pesquisa.'
              : 'Esta seção da despensa está vazia. Escaneie um cupom fiscal para lançar novos lotes.'}
          </p>
          <div className="mt-5">
            <button
              onClick={onOpenScan}
              className="px-4 py-2 rounded-xl bg-[#2E7D5A] hover:bg-[#25684A] text-white font-semibold text-xs border border-[#235F44] shadow-[2px_2px_0px_#1B4934] transition active:translate-x-[1px] active:translate-y-[1px]"
            >
              Escanear Cupom Fiscal
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredItems.map(item => {
            const { produto, quantidadeTotal, loteMaisProximo, diasAteVencer, urgencia } = item;

            // Stamp styles (analog stamp aesthetics)
            let stampClass = 'border-[#625B55] text-[#625B55] bg-[#FAF7F2]';
            let stampLabel = 'SEM DATA';

            if (loteMaisProximo?.validadeEstimada) {
              if (diasAteVencer < 0) {
                stampClass = 'border-[#C2543B] text-[#C2543B] bg-[#FBF0ED]';
                stampLabel = `VENCIDO (${Math.abs(diasAteVencer)}D)`;
              } else if (diasAteVencer === 0) {
                stampClass = 'border-[#C2543B] text-[#C2543B] bg-[#FBF0ED] font-bold';
                stampLabel = 'VENCE HOJE!';
              } else if (diasAteVencer === 1) {
                stampClass = 'border-[#B45309] text-[#B45309] bg-[#FEF3C7] font-bold';
                stampLabel = 'VENCE AMANHÃ';
              } else if (diasAteVencer <= 3) {
                stampClass = 'border-[#B45309] text-[#B45309] bg-[#FEF3C7]';
                stampLabel = `${diasAteVencer}D RESTANTES`;
              } else {
                stampClass = 'border-[#2E7D5A] text-[#2E7D5A] bg-[#EBF5F0]';
                stampLabel = `${diasAteVencer}D RESTANTES`;
              }
            }

            return (
              <div
                key={produto.id}
                onClick={() => onSelectItem(item)}
                className="bg-[#FFFDF9] rounded-2xl p-4 sm:p-5 border border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0] hover:border-[#D6C8B6] hover:shadow-[3px_3px_0px_#D6C8B6] transition-all cursor-pointer flex flex-col justify-between group active:translate-x-[1px] active:translate-y-[1px] active:shadow-none relative"
              >
                {/* Header row: Stamp badge and quick minus action */}
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span
                    className={`ledger-stamp ${stampClass}`}
                  >
                    <span>{stampLabel}</span>
                  </span>

                  {/* 1-Tap Mechanical Minus Button */}
                  <button
                    onClick={e => handleQuickMinusOne(e, item)}
                    className="w-7 h-7 rounded-lg bg-[#FAF7F2] border border-[#E8DFD1] text-[#625B55] hover:text-[#292524] hover:border-[#D6C8B6] flex items-center justify-center transition active:translate-x-[0.5px] active:translate-y-[0.5px]"
                    title={`Dar baixa rápida em 1 ${produto.unidadePadrao}`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Big Food Icon with natural paper inset */}
                <div className="py-2.5 flex items-center justify-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[#FAF7F2] border border-[#E8DFD1]/60 flex items-center justify-center text-4xl sm:text-5xl select-none transition group-hover:scale-105 duration-150">
                    {produto.emoji}
                  </div>
                </div>

                {/* Name & Quantity in Space Mono */}
                <div className="mt-2 text-center">
                  <h4 className="font-bold text-sm text-[#292524] truncate">
                    {produto.nomeCanonico}
                  </h4>
                  <div className="mt-1 flex items-baseline justify-center gap-1.5 font-ledger-mono">
                    <span className="text-lg sm:text-xl font-bold text-[#292524]">
                      {quantidadeTotal}
                    </span>
                    <span className="text-xs uppercase text-[#625B55]">
                      {produto.unidadePadrao}
                    </span>
                  </div>
                </div>

                {/* Analog Ledger Meter Bar */}
                <div className="mt-3 w-full bg-[#FAF7F2] border border-[#E8DFD1] rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      urgencia === 'vencido'
                        ? 'bg-[#C2543B]'
                        : urgencia === 'vence_logo' || urgencia === 'vence_hoje'
                        ? 'bg-[#B45309]'
                        : 'bg-[#2E7D5A]'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(15, quantidadeTotal * 30))}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
