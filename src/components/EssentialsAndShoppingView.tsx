import React, { useState, useEffect, useCallback } from 'react';
import {
  Star,
  ShoppingCart,
  Plus,
  Trash2,
  Check,
  Share2,
  AlertCircle,
  PackageCheck,
  Sparkles,
  Layers,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { ItemEssencial, ItemListaCompras, CategoriaProduto, UnidadeMedida } from '../types/pantry';
import { PantryStore, subscribeToPantry } from '../services/storage';

interface EssentialsAndShoppingViewProps {
  onNotify: (msg: string) => void;
}

export const EssentialsAndShoppingView: React.FC<EssentialsAndShoppingViewProps> = ({
  onNotify,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'essenciais' | 'lista'>('essenciais');
  const [essentialsFilter, setEssentialsFilter] = useState<'todos' | 'faltando' | 'em_estoque'>('todos');

  // Essentials list and shopping list kept in reactive React state
  const [essenciaisComStatus, setEssenciaisComStatus] = useState(() =>
    PantryStore.getEssenciaisComStatus()
  );
  const [listaCompras, setListaCompras] = useState(() =>
    PantryStore.getListaCompras()
  );

  const refreshData = useCallback(() => {
    setEssenciaisComStatus(PantryStore.getEssenciaisComStatus());
    setListaCompras(PantryStore.getListaCompras());
  }, []);

  useEffect(() => {
    refreshData();
    const unsubscribe = subscribeToPantry(refreshData);
    return () => unsubscribe();
  }, [refreshData]);

  // New Essential form state
  const [showAddEssential, setShowAddEssential] = useState(false);
  const [newEssNome, setNewEssNome] = useState('');
  const [newEssEmoji, setNewEssEmoji] = useState('✨');
  const [newEssCategoria, setNewEssCategoria] = useState<CategoriaProduto>('mercearia');
  const [newEssQtdMin, setNewEssQtdMin] = useState<number>(1);
  const [newEssUnidade, setNewEssUnidade] = useState<UnidadeMedida>('un');

  // Quick shopping item input
  const [quickItemNome, setQuickItemNome] = useState('');
  const [quickItemQtd, setQuickItemQtd] = useState<number>(1);
  const [quickItemUnidade, setQuickItemUnidade] = useState<string>('un');

  const faltantes = essenciaisComStatus.filter(e => e.emFalta);
  const emEstoque = essenciaisComStatus.filter(e => !e.emFalta);
  const pendentesCompras = listaCompras.filter(i => !i.comprado);
  const compradosCompras = listaCompras.filter(i => i.comprado);

  const filteredEssenciais = essenciaisComStatus.filter(e => {
    if (essentialsFilter === 'faltando') return e.emFalta;
    if (essentialsFilter === 'em_estoque') return !e.emFalta;
    return true;
  });

  const handleAddAllMissingToList = () => {
    const res = PantryStore.adicionarFaltantesParaLista();
    if (res.adicionadosCount > 0) {
      onNotify(`${res.adicionadosCount} essenciais em falta adicionados à Lista de Compras!`);
      setActiveSubTab('lista');
    } else {
      onNotify('Todos os essenciais em falta já estão na sua lista de compras.');
      setActiveSubTab('lista');
    }
  };

  const handleAddQuickShoppingItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickItemNome.trim()) return;

    PantryStore.adicionarItemLista({
      nome: quickItemNome.trim(),
      categoria: 'mercearia',
      emoji: '🛒',
      quantidade: quickItemQtd || 1,
      unidade: quickItemUnidade || 'un',
      comprado: false,
    });

    setQuickItemNome('');
    setQuickItemQtd(1);
    onNotify('Item adicionado à lista de compras!');
  };

  const handleAddSingleEssentialToList = (ess: ItemEssencial & { estoqueAtual: number; emFalta: boolean }) => {
    const deficit = Math.max(1, ess.quantidadeMinima - ess.estoqueAtual);
    PantryStore.adicionarItemLista({
      nome: ess.nome,
      categoria: ess.categoria,
      emoji: ess.emoji,
      quantidade: deficit,
      unidade: ess.unidadePadrao,
      comprado: false,
      essencialId: ess.id,
    });
    onNotify(`"${ess.nome}" adicionado à lista de compras!`);
  };

  // Toggle stock manually for an essential item: mark as missing (0 stock) or replenished
  const handleToggleMissing = (ess: ItemEssencial & { estoqueAtual: number; emFalta: boolean }) => {
    if (ess.emFalta) {
      // Mark as replenished (add minimum quantity to pantry)
      PantryStore.adicionarItemManual({
        nome: ess.nome,
        categoria: ess.categoria,
        emoji: ess.emoji,
        quantidade: ess.quantidadeMinima,
        unidade: ess.unidadePadrao,
        validadeDias: 30,
      });
      onNotify(`"${ess.nome}" marcado como abastecido na despensa!`);
    } else {
      // Mark as out of stock / missing
      if (ess.produtoId) {
        PantryStore.marcarAcabou(ess.produtoId);
      } else {
        const prod = PantryStore.getProdutos().find(
          p => p.nomeCanonico.toLowerCase() === ess.nome.toLowerCase()
        );
        if (prod) {
          PantryStore.marcarAcabou(prod.id);
        }
      }
      onNotify(`"${ess.nome}" marcado como FALTANDO / ACABOU.`);
    }
  };

  const handleCreateEssential = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEssNome.trim()) return;

    PantryStore.adicionarEssencial({
      nome: newEssNome.trim(),
      categoria: newEssCategoria,
      emoji: newEssEmoji.trim() || '⭐',
      unidadePadrao: newEssUnidade,
      quantidadeMinima: newEssQtdMin || 1,
    });

    setNewEssNome('');
    setShowAddEssential(false);
    onNotify('Novo item essencial cadastrado!');
  };

  // Quick preset suggestions
  const presetEssentials = [
    { nome: 'Azeite Extra Virgem', emoji: '🫒', cat: 'temperos' as CategoriaProduto, un: 'un' as UnidadeMedida, qtd: 1 },
    { nome: 'Café em Pó', emoji: '☕', cat: 'mercearia' as CategoriaProduto, un: 'un' as UnidadeMedida, qtd: 1 },
    { nome: 'Arroz Branco', emoji: '🍚', cat: 'graos' as CategoriaProduto, un: 'kg' as UnidadeMedida, qtd: 1 },
    { nome: 'Feijão Carioca', emoji: '🫘', cat: 'graos' as CategoriaProduto, un: 'kg' as UnidadeMedida, qtd: 1 },
    { nome: 'Sal Refinado', emoji: '🧂', cat: 'temperos' as CategoriaProduto, un: 'un' as UnidadeMedida, qtd: 1 },
    { nome: 'Ovos Caipiras', emoji: '🥚', cat: 'laticinios' as CategoriaProduto, un: 'un' as UnidadeMedida, qtd: 6 },
    { nome: 'Leite', emoji: '🥛', cat: 'laticinios' as CategoriaProduto, un: 'l' as UnidadeMedida, qtd: 2 },
    { nome: 'Papel Higiênico', emoji: '🧻', cat: 'limpeza' as CategoriaProduto, un: 'un' as UnidadeMedida, qtd: 1 },
  ];

  const handleApplyPreset = (p: typeof presetEssentials[0]) => {
    setNewEssNome(p.nome);
    setNewEssEmoji(p.emoji);
    setNewEssCategoria(p.cat);
    setNewEssUnidade(p.un);
    setNewEssQtdMin(p.qtd);
  };

  const handleShareList = () => {
    if (listaCompras.length === 0) {
      onNotify('Sua lista de compras está vazia.');
      return;
    }

    const unbought = listaCompras.filter(i => !i.comprado);
    const bought = listaCompras.filter(i => i.comprado);

    let text = `🛒 *Lista de Compras — SmartPantry*\n`;
    text += `📅 Data: ${new Date().toLocaleDateString('pt-BR')}\n\n`;

    if (unbought.length > 0) {
      text += `*A Comprar (${unbought.length}):*\n`;
      unbought.forEach(i => {
        text += `• ${i.emoji} ${i.nome} — ${i.quantidade} ${i.unidade.toUpperCase()}\n`;
      });
    }

    if (bought.length > 0) {
      text += `\n*Já no Carrinho (${bought.length}):*\n`;
      bought.forEach(i => {
        text += `✓ ~${i.nome}~\n`;
      });
    }

    if (navigator.share) {
      navigator
        .share({
          title: 'Lista de Compras - SmartPantry',
          text,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      onNotify('Lista de compras copiada para a área de transferência!');
    }
  };

  // Convert bought items into real pantry lots when returning from supermarket
  const handleStockPurchasedItemsToPantry = () => {
    if (compradosCompras.length === 0) {
      onNotify('Nenhum item marcado como comprado no carrinho.');
      return;
    }

    let count = 0;
    compradosCompras.forEach(item => {
      const validUnits: UnidadeMedida[] = ['un', 'kg', 'g', 'l', 'ml'];
      const unit: UnidadeMedida = validUnits.includes(item.unidade as UnidadeMedida)
        ? (item.unidade as UnidadeMedida)
        : 'un';

      PantryStore.adicionarItemManual({
        nome: item.nome,
        categoria: item.categoria,
        emoji: item.emoji || '🛒',
        quantidade: item.quantidade,
        unidade: unit,
        validadeDias: 30,
      });
      count++;
    });

    PantryStore.limparComprados();
    onNotify(`${count} itens comprados foram abastecidos na despensa!`);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-6">
      {/* Sub-tabs styled as Archival Dossier Tabs */}
      <div className="flex items-center justify-between">
        <div className="inline-flex p-1.5 rounded-xl bg-[#FAF7F2] border border-[#E8DFD1] text-xs font-ledger-mono w-full">
          <button
            onClick={() => setActiveSubTab('essenciais')}
            className={`flex-1 py-2.5 px-3 rounded-lg transition min-h-[44px] flex items-center justify-center gap-2 cursor-pointer ${
              activeSubTab === 'essenciais'
                ? 'bg-[#FFFDF9] text-[#292524] border border-[#E8DFD1] shadow-[1.5px_1.5px_0px_#E5DCD0] font-bold'
                : 'text-[#625B55] hover:text-[#292524]'
            }`}
          >
            <Star className="w-4 h-4 text-[#B45309]" />
            <span className="truncate">ITENS ESSENCIAIS</span>
          </button>

          <button
            onClick={() => setActiveSubTab('lista')}
            className={`flex-1 py-2.5 px-3 rounded-lg transition min-h-[44px] flex items-center justify-center gap-2 cursor-pointer ${
              activeSubTab === 'lista'
                ? 'bg-[#FFFDF9] text-[#292524] border border-[#E8DFD1] shadow-[1.5px_1.5px_0px_#E5DCD0] font-bold'
                : 'text-[#625B55] hover:text-[#292524]'
            }`}
          >
            <ShoppingCart className="w-4 h-4 text-[#2E7D5A]" />
            <span className="truncate">LISTA DE COMPRAS</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. SEÇÃO DE ESSENCIAIS */}
      {/* ============================================================ */}
      {activeSubTab === 'essenciais' && (
        <div className="space-y-4">
          {/* Header Card / Action banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#292524] flex items-center gap-2">
                  <Star className="w-4 h-4 text-[#B45309] fill-[#B45309]" />
                  <span>Itens Essenciais</span>
                </h3>
                <p className="text-xs text-[#625B55] mt-0.5">
                  Itens básicos que não podem faltar no dia a dia.
                </p>
              </div>

              <button
                onClick={() => setShowAddEssential(!showAddEssential)}
                className="px-3.5 py-2 rounded-xl bg-[#FFFDF9] hover:bg-[#FAF7F2] border border-[#E8DFD1] shadow-[1.5px_1.5px_0px_#E5DCD0] text-xs font-ledger-mono font-bold text-[#292524] transition active:translate-x-[0.5px] active:translate-y-[0.5px] min-h-[44px] flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#2E7D5A]" />
                <span>+ NOVO ESSENCIAL</span>
              </button>
            </div>

            {/* Mass Add Missing Action */}
            {faltantes.length > 0 ? (
              <div className="pt-3 border-t border-[#E8DFD1] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF7F2] p-3 rounded-xl border border-[#E8DFD1]">
                <div className="flex items-center gap-2 text-xs font-ledger-mono text-[#C2543B]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>{faltantes.length} {faltantes.length === 1 ? 'item essencial está' : 'itens essenciais estão'} faltando</strong> na casa!
                  </span>
                </div>

                <button
                  onClick={handleAddAllMissingToList}
                  className="px-4 py-2.5 rounded-xl bg-[#2E7D5A] hover:bg-[#25684A] text-white font-ledger-mono text-xs font-bold border border-[#235F44] shadow-[1.5px_1.5px_0px_#1B4934] transition active:translate-x-[0.5px] active:translate-y-[0.5px] min-h-[44px] flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>LANÇAR FALTANTES NA LISTA</span>
                </button>
              </div>
            ) : (
              <div className="pt-2 border-t border-[#E8DFD1] flex items-center gap-2 text-xs font-ledger-mono text-[#2E7D5A]">
                <span>✓</span>
                <span>Tudo certo! Todos os seus itens essenciais estão abastecidos na despensa.</span>
              </div>
            )}

            {/* Sub-filter chips */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-[#E8DFD1] overflow-x-auto no-scrollbar">
              <button
                onClick={() => setEssentialsFilter('todos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-ledger-mono transition border cursor-pointer ${
                  essentialsFilter === 'todos'
                    ? 'bg-[#292524] text-white border-[#292524] font-bold'
                    : 'bg-[#FAF7F2] text-[#625B55] border-[#E8DFD1]'
                }`}
              >
                TODOS ({essenciaisComStatus.length})
              </button>
              <button
                onClick={() => setEssentialsFilter('faltando')}
                className={`px-3 py-1.5 rounded-lg text-xs font-ledger-mono transition border cursor-pointer flex items-center gap-1.5 ${
                  essentialsFilter === 'faltando'
                    ? 'bg-[#C2543B] text-white border-[#C2543B] font-bold'
                    : 'bg-[#FBF0ED] text-[#C2543B] border-[#C2543B]/40'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>FALTANDO ({faltantes.length})</span>
              </button>
              <button
                onClick={() => setEssentialsFilter('em_estoque')}
                className={`px-3 py-1.5 rounded-lg text-xs font-ledger-mono transition border cursor-pointer ${
                  essentialsFilter === 'em_estoque'
                    ? 'bg-[#2E7D5A] text-white border-[#2E7D5A] font-bold'
                    : 'bg-[#EBF5F0] text-[#2E7D5A] border-[#2E7D5A]/40'
                }`}
              >
                EM ESTOQUE ({emEstoque.length})
              </button>
            </div>
          </div>

          {/* Form Modal / Inset to Add New Essential */}
          {showAddEssential && (
            <form
              onSubmit={handleCreateEssential}
              className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0] space-y-3 font-ledger-mono text-xs animate-in fade-in"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#E8DFD1]">
                <span className="font-bold text-[#292524] uppercase">Adicionar Novo Essencial</span>
                <button
                  type="button"
                  onClick={() => setShowAddEssential(false)}
                  className="text-[#625B55] hover:text-[#292524] p-1"
                >
                  ✕
                </button>
              </div>

              {/* Presets shortcuts */}
              <div>
                <span className="block text-[10px] text-[#625B55] uppercase mb-1.5">Sugestões rápidas:</span>
                <div className="flex flex-wrap gap-1.5">
                  {presetEssentials.map(p => (
                    <button
                      type="button"
                      key={p.nome}
                      onClick={() => handleApplyPreset(p)}
                      className="px-2 py-1 rounded-md bg-[#FAF7F2] border border-[#E8DFD1] hover:border-[#625B55] text-[#292524] text-[11px] flex items-center gap-1 transition"
                    >
                      <span>{p.emoji}</span>
                      <span>{p.nome}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="sm:col-span-2">
                  <label className="block text-[#625B55] mb-1 font-bold uppercase">Nome do Produto</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newEssEmoji}
                      onChange={e => setNewEssEmoji(e.target.value)}
                      className="w-12 text-center text-xl p-2 rounded-xl bg-[#FFFDF9] border border-[#E8DFD1] focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Ex: Manteiga, Sal, Feijão..."
                      value={newEssNome}
                      onChange={e => setNewEssNome(e.target.value)}
                      className="flex-1 p-2.5 rounded-xl bg-[#FFFDF9] border border-[#E8DFD1] font-sans font-bold text-xs focus:border-[#625B55] focus:outline-none min-h-[44px]"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#625B55] mb-1 font-bold uppercase">Mínimo Desejado</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={newEssQtdMin}
                      onChange={e => setNewEssQtdMin(parseFloat(e.target.value) || 1)}
                      className="w-16 p-2.5 rounded-xl bg-[#FFFDF9] border border-[#E8DFD1] text-center font-bold text-xs min-h-[44px]"
                    />
                    <select
                      value={newEssUnidade}
                      onChange={e => setNewEssUnidade(e.target.value as UnidadeMedida)}
                      className="flex-1 p-2.5 rounded-xl bg-[#FFFDF9] border border-[#E8DFD1] font-bold text-xs min-h-[44px]"
                    >
                      <option value="un">UN</option>
                      <option value="kg">KG</option>
                      <option value="g">G</option>
                      <option value="l">L</option>
                      <option value="ml">ML</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E8DFD1]">
                <button
                  type="button"
                  onClick={() => setShowAddEssential(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E8DFD1] bg-[#FAF7F2] text-[#625B55] min-h-[44px]"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#2E7D5A] hover:bg-[#25684A] text-white font-bold border border-[#235F44] shadow-[1px_1px_0px_#1B4934] min-h-[44px] cursor-pointer"
                >
                  SALVAR ESSENCIAL
                </button>
              </div>
            </form>
          )}

          {/* List of Essentials Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredEssenciais.map(ess => {
              return (
                <div
                  key={ess.id}
                  className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                    ess.emFalta
                      ? 'bg-[#FFFDF9] border-[#C2543B] shadow-[2px_2px_0px_#C2543B]'
                      : 'bg-[#FFFDF9] border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0]'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      {/* Status Stamp */}
                      {ess.emFalta ? (
                        <span className="ledger-stamp border-[#C2543B] text-[#C2543B] bg-[#FBF0ED]">
                          <AlertCircle className="w-3 h-3 text-[#C2543B]" />
                          <span>FALTANDO / ACABOU</span>
                        </span>
                      ) : (
                        <span className="ledger-stamp border-[#2E7D5A] text-[#2E7D5A] bg-[#EBF5F0]">
                          <span>EM ESTOQUE: {ess.estoqueAtual} {ess.unidadePadrao.toUpperCase()}</span>
                        </span>
                      )}

                      <button
                        onClick={() => PantryStore.removerEssencial(ess.id)}
                        className="text-[#A8A29E] hover:text-[#C2543B] p-1.5 transition"
                        title="Remover da lista de essenciais"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 my-2">
                      <div className="w-12 h-12 rounded-xl bg-[#FAF7F2] border border-[#E8DFD1] flex items-center justify-center text-3xl select-none shrink-0">
                        {ess.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-[#292524] truncate">{ess.nome}</h4>
                        <div className="text-[11px] font-ledger-mono text-[#625B55] mt-0.5">
                          Meta mínima: <strong className="text-[#292524]">{ess.quantidadeMinima} {ess.unidadePadrao.toUpperCase()}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Footer */}
                  <div className="mt-3 pt-3 border-t border-[#E8DFD1] flex items-center justify-between gap-2 font-ledger-mono text-xs">
                    {/* 1-Tap Toggle Missing / Replenished */}
                    <button
                      onClick={() => handleToggleMissing(ess)}
                      className={`px-3 py-2 rounded-xl border text-[11px] font-bold transition flex items-center gap-1.5 min-h-[40px] cursor-pointer ${
                        ess.emFalta
                          ? 'bg-[#EBF5F0] hover:bg-[#D5EFE3] text-[#2E7D5A] border-[#2E7D5A]/40'
                          : 'bg-[#FBF0ED] hover:bg-[#F6DCD4] text-[#C2543B] border-[#C2543B]/40'
                      }`}
                      title={ess.emFalta ? 'Marcar que já comprou / abasteceu' : 'Marcar que acabou'}
                    >
                      {ess.emFalta ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>ABASTECI</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>ACABOU</span>
                        </>
                      )}
                    </button>

                    {/* Add to shopping list */}
                    <button
                      onClick={() => handleAddSingleEssentialToList(ess)}
                      className={`px-3.5 py-2 rounded-xl border font-bold text-xs transition active:translate-x-[0.5px] active:translate-y-[0.5px] flex items-center gap-1.5 min-h-[40px] cursor-pointer ${
                        ess.emFalta
                          ? 'bg-[#C2543B] hover:bg-[#A8452F] text-white border-[#A8452F] shadow-[1.5px_1.5px_0px_#782B1C]'
                          : 'bg-[#FAF7F2] hover:bg-[#E8DFD1]/50 border-[#E8DFD1] text-[#292524]'
                      }`}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>+ COMPRAR</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. SEÇÃO DE LISTA DE COMPRAS */}
      {/* ============================================================ */}
      {activeSubTab === 'lista' && (
        <div className="space-y-4">
          {/* Quick Input Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#292524] flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-[#2E7D5A]" />
                  <span>Lista de Compras</span>
                </h3>
                <p className="text-xs text-[#625B55] mt-0.5">
                  Anote o que precisa comprar e risque conforme for pegando.
                </p>
              </div>

              {listaCompras.length > 0 && (
                <button
                  onClick={handleShareList}
                  className="px-3 py-1.5 rounded-xl border border-[#E8DFD1] bg-[#FAF7F2] hover:bg-[#F5EFE6] text-[#292524] text-xs font-ledger-mono font-bold transition flex items-center gap-1.5 shrink-0 min-h-[40px] shadow-[1px_1px_0px_#E5DCD0] cursor-pointer"
                  title="Compartilhar lista no WhatsApp ou copiar"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#2E7D5A]" />
                  <span>COMPARTILHAR</span>
                </button>
              )}
            </div>

            {/* Quick Add Form with quantity and unit */}
            <form onSubmit={handleAddQuickShoppingItem} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Digitar item para comprar (ex: Café, Sabão em pó, Pão...)"
                value={quickItemNome}
                onChange={e => setQuickItemNome(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#E8DFD1] text-xs sm:text-sm text-[#292524] placeholder-[#A8A29E] focus:border-[#625B55] focus:outline-none min-h-[44px]"
              />
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={quickItemQtd}
                onChange={e => setQuickItemQtd(parseFloat(e.target.value) || 1)}
                className="w-14 px-2 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#E8DFD1] text-center font-ledger-mono font-bold text-xs min-h-[44px]"
                title="Quantidade"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-[#2E7D5A] hover:bg-[#25684A] text-white font-ledger-mono text-xs font-bold border border-[#235F44] shadow-[1.5px_1.5px_0px_#1B4934] transition active:translate-x-[0.5px] active:translate-y-[0.5px] min-h-[44px] flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">ADICIONAR</span>
              </button>
            </form>
          </div>

          {/* Shopping items list */}
          {listaCompras.length === 0 ? (
            <div className="p-12 text-center bg-[#FFFDF9] rounded-2xl border border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0] text-[#625B55]">
              <ShoppingCart className="w-12 h-12 mx-auto text-[#D6C8B6] mb-3" />
              <h4 className="font-ledger-mono text-sm font-bold text-[#292524]">LISTA DE COMPRAS VAZIA</h4>
              <p className="text-xs text-[#625B55] mt-1 max-w-sm mx-auto">
                Adicione itens avulsos acima ou traga os essenciais em falta da despensa.
              </p>
              {faltantes.length > 0 && (
                <button
                  onClick={handleAddAllMissingToList}
                  className="mt-4 px-4 py-2.5 rounded-xl bg-[#2E7D5A] hover:bg-[#25684A] text-white font-ledger-mono text-xs font-bold border border-[#235F44] shadow-[1.5px_1.5px_0px_#1B4934] transition cursor-pointer min-h-[44px]"
                >
                  Puxar {faltantes.length} Essenciais em Falta
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Header stats & actions */}
              <div className="flex flex-wrap items-center justify-between text-xs font-ledger-mono text-[#625B55] px-1 gap-2">
                <span>
                  {pendentesCompras.length} PENDENTES &bull; {compradosCompras.length} NO CARRINHO
                </span>

                <div className="flex items-center gap-3">
                  {compradosCompras.length > 0 && (
                    <>
                      <button
                        onClick={handleStockPurchasedItemsToPantry}
                        className="text-[#2E7D5A] hover:underline font-bold flex items-center gap-1"
                        title="Adicionar itens comprados direto no estoque da despensa"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>ABASTECER DESPENSA</span>
                      </button>

                      <button
                        onClick={() => PantryStore.limparComprados()}
                        className="text-[#C2543B] hover:underline font-bold"
                      >
                        LIMPAR COMPRADOS
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                {listaCompras.map(item => {
                  return (
                    <div
                      key={item.id}
                      onClick={() => PantryStore.toggleItemLista(item.id)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 min-h-[52px] select-none active:translate-x-[0.5px] active:translate-y-[0.5px] ${
                        item.comprado
                          ? 'bg-[#FAF7F2] border-[#E8DFD1]/70 opacity-60'
                          : 'bg-[#FFFDF9] border-[#E8DFD1] shadow-[1.5px_1.5px_0px_#E5DCD0]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Mechanical tactile checkbox */}
                        <div
                          className={`w-6 h-6 rounded-md border flex items-center justify-center transition shrink-0 ${
                            item.comprado
                              ? 'bg-[#2E7D5A] border-[#2E7D5A] text-white'
                              : 'bg-[#FFFDF9] border-[#E8DFD1] hover:border-[#625B55]'
                          }`}
                        >
                          {item.comprado && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        <span className="text-xl select-none shrink-0">{item.emoji}</span>

                        <div className="min-w-0">
                          <span
                            className={`font-bold text-sm block truncate ${
                              item.comprado ? 'line-through text-[#625B55]' : 'text-[#292524]'
                            }`}
                          >
                            {item.nome}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 font-ledger-mono text-xs">
                        <span className="text-[#292524] font-bold">
                          {item.quantidade} {item.unidade.toUpperCase()}
                        </span>

                        <button
                          onClick={e => {
                            e.stopPropagation();
                            PantryStore.removerItemLista(item.id);
                          }}
                          className="text-[#A8A29E] hover:text-[#C2543B] p-1.5 transition"
                          title="Remover da lista"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
