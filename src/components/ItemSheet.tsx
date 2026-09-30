import React, { useState } from 'react';
import { X, Minus, Plus, AlertCircle, Calendar, PackageCheck, Flame, Star } from 'lucide-react';
import { ItemDespensa } from '../types/pantry';
import { PantryStore } from '../services/storage';

interface ItemSheetProps {
  item: ItemDespensa | null;
  onClose: () => void;
  onConsumed: (desc: string, movimentoIds: string[]) => void;
}

export const ItemSheet: React.FC<ItemSheetProps> = ({ item, onClose, onConsumed }) => {
  const [customDelta, setCustomDelta] = useState<number>(1);

  if (!item) return null;

  const { produto, quantidadeTotal, lotesAtivos, loteMaisProximo, diasAteVencer, urgencia } = item;
  const isEssential = PantryStore.isProdutoEssencial(produto.id);

  const handleToggleEssential = () => {
    const isNowEssential = PantryStore.toggleEssencialProduto(produto, 1);
    if (isNowEssential) {
      onConsumed(`"${produto.nomeCanonico}" marcado como Item Essencial!`, []);
    } else {
      onConsumed(`"${produto.nomeCanonico}" removido dos Essenciais.`, []);
    }
  };

  const handleConsume = (amount: number) => {
    if (amount <= 0) return;
    const res = PantryStore.consumirItem(produto.id, amount, 'manual');
    if (res.sucesso && res.movimentosCriados.length > 0) {
      const ids = res.movimentosCriados.map(m => m.id);
      onConsumed(`Baixa de ${amount} ${produto.unidadePadrao} em ${produto.nomeCanonico}`, ids);
      onClose();
    }
  };

  const handleAcabou = () => {
    const res = PantryStore.marcarAcabou(produto.id);
    const ids = res.movimentosCriados.map(m => m.id);
    onConsumed(`${produto.nomeCanonico} baixado integralmente (Acabou)`, ids);
    onClose();
  };

  const handleFraction = (fraction: number) => {
    const amount = Number((quantidadeTotal * fraction).toFixed(2));
    if (amount > 0) {
      handleConsume(amount);
    }
  };

  const formatExpiryLabel = () => {
    if (!loteMaisProximo?.validadeEstimada) return 'SEM DATA DE VALIDADE';
    if (diasAteVencer < 0) return `VENCIDO HÁ ${Math.abs(diasAteVencer)} DIAS`;
    if (diasAteVencer === 0) return 'VENCE HOJE!';
    if (diasAteVencer === 1) return 'VENCE AMANHÃ';
    return `VENCE EM ${diasAteVencer} DIAS`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-[#FFFDF9] rounded-t-3xl sm:rounded-2xl border border-[#E8DFD1] shadow-[3px_3px_0px_#E5DCD0] p-6 sm:p-7 text-[#292524] animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#E8DFD1]">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-[#FAF7F2] border border-[#E8DFD1] flex items-center justify-center text-4xl select-none">
              {produto.emoji}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-[#292524] tracking-tight">
                  {produto.nomeCanonico}
                </h3>
                <span className="font-ledger-mono text-[10px] uppercase px-1.5 py-0.5 border border-[#E8DFD1] bg-[#FAF7F2] text-[#625B55] rounded">
                  {produto.categoria}
                </span>
              </div>
              <p className="text-xs text-[#625B55] mt-1 font-ledger-mono">
                SALDO ATUAL: <strong className="text-[#292524]">{quantidadeTotal} {produto.unidadePadrao.toUpperCase()}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-lg border border-[#E8DFD1] bg-[#FAF7F2] text-[#625B55] hover:text-[#292524] transition active:translate-x-[0.5px] active:translate-y-[0.5px]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Expiry Banner as Ledger Stamp */}
        <div className="my-4">
          <div
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-ledger-mono ${
              urgencia === 'vencido'
                ? 'bg-[#FBF0ED] border-[#C2543B] text-[#C2543B]'
                : urgencia === 'vence_hoje' || urgencia === 'vence_logo'
                ? 'bg-[#FEF3C7] border-[#B45309] text-[#B45309]'
                : 'bg-[#EBF5F0] border-[#2E7D5A] text-[#2E7D5A]'
            }`}
          >
            <div className="flex items-center gap-2 font-bold tracking-wide">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>{formatExpiryLabel()}</span>
            </div>
            {urgencia === 'vence_logo' && (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5 text-[#B45309] animate-pulse" /> Priorizar
              </span>
            )}
          </div>
        </div>

        {/* Quick Stepper Box: Mechanical physical ledger counter */}
        <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E8DFD1] mb-4">
          <label className="block text-[11px] font-ledger-mono font-bold text-[#625B55] uppercase tracking-wider mb-2.5">
            Lançar Baixa de Consumo
          </label>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center bg-[#FFFDF9] rounded-xl border border-[#E8DFD1] shadow-[1.5px_1.5px_0px_#E5DCD0] p-1">
              <button
                onClick={() => setCustomDelta(Math.max(0.25, Number((customDelta - (customDelta > 1 ? 1 : 0.25)).toFixed(2))))}
                className="w-11 h-11 rounded-lg bg-[#FAF7F2] hover:bg-[#E8DFD1]/50 border border-[#E8DFD1] flex items-center justify-center text-[#292524] transition active:translate-x-[0.5px] active:translate-y-[0.5px]"
                title="Diminuir"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="px-4 text-center min-w-[70px] font-ledger-mono">
                <span className="text-xl font-bold text-[#292524]">{customDelta}</span>
                <span className="text-xs text-[#625B55] ml-1 uppercase">{produto.unidadePadrao}</span>
              </div>
              <button
                onClick={() => setCustomDelta(Number((customDelta + (customDelta >= 1 ? 1 : 0.25)).toFixed(2)))}
                className="w-11 h-11 rounded-lg bg-[#FAF7F2] hover:bg-[#E8DFD1]/50 border border-[#E8DFD1] flex items-center justify-center text-[#292524] transition active:translate-x-[0.5px] active:translate-y-[0.5px]"
                title="Aumentar"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => handleConsume(customDelta)}
              disabled={quantidadeTotal <= 0}
              className="flex-1 py-3 px-4 rounded-xl bg-[#2E7D5A] hover:bg-[#25684A] text-white font-ledger-mono text-xs font-bold border border-[#235F44] shadow-[2px_2px_0px_#1B4934] transition active:translate-x-[1px] active:translate-y-[1px] active:shadow-none min-h-[48px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PackageCheck className="w-4 h-4" />
              <span>BAIXAR {customDelta} {produto.unidadePadrao.toUpperCase()}</span>
            </button>
          </div>

          {/* Typewriter fraction shortcuts */}
          <div className="mt-3 pt-3 border-t border-[#E8DFD1] flex items-center justify-between gap-2">
            <span className="font-ledger-mono text-[10px] text-[#625B55] uppercase">Frações:</span>
            <div className="flex items-center gap-1.5 font-ledger-mono">
              <button
                onClick={() => handleFraction(0.25)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#FFFDF9] border border-[#E8DFD1] text-[#292524] shadow-[1px_1px_0px_#E5DCD0] hover:bg-[#FAF7F2] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none transition"
              >
                ¼ (25%)
              </button>
              <button
                onClick={() => handleFraction(0.5)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#FFFDF9] border border-[#E8DFD1] text-[#292524] shadow-[1px_1px_0px_#E5DCD0] hover:bg-[#FAF7F2] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none transition"
              >
                ½ (50%)
              </button>
              <button
                onClick={() => handleFraction(0.75)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#FFFDF9] border border-[#E8DFD1] text-[#292524] shadow-[1px_1px_0px_#E5DCD0] hover:bg-[#FAF7F2] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none transition"
              >
                ¾ (75%)
              </button>
              <button
                onClick={() => handleFraction(1)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#FFFDF9] border border-[#E8DFD1] text-[#292524] shadow-[1px_1px_0px_#E5DCD0] hover:bg-[#FAF7F2] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none transition"
              >
                TUDO
              </button>
            </div>
          </div>
        </div>

        {/* Toggle Essential Button */}
        <div className="mb-3">
          <button
            onClick={handleToggleEssential}
            className={`w-full py-2.5 px-4 rounded-xl border font-ledger-mono text-xs font-bold transition flex items-center justify-center gap-2 active:translate-x-[1px] active:translate-y-[1px] min-h-[44px] ${
              isEssential
                ? 'bg-[#FEF3C7] border-[#B45309] text-[#B45309]'
                : 'bg-[#FFFDF9] border-[#E8DFD1] text-[#625B55] hover:text-[#292524]'
            }`}
          >
            <Star className={`w-4 h-4 ${isEssential ? 'fill-[#B45309]' : ''}`} />
            <span>{isEssential ? '★ ITEM ESSENCIAL (AVISAR SE ACABAR)' : '☆ MARCAR COMO ITEM ESSENCIAL'}</span>
          </button>
        </div>

        {/* 1-Tap Acabou Action: Terracotta stamp */}
        <div className="mb-4">
          <button
            onClick={handleAcabou}
            className="w-full py-2.5 px-4 rounded-xl border border-[#C2543B] bg-[#FBF0ED] hover:bg-[#F7E5E0] text-[#C2543B] font-ledger-mono text-xs font-bold transition flex items-center justify-center gap-2 active:translate-x-[1px] active:translate-y-[1px] min-h-[44px]"
          >
            <AlertCircle className="w-4 h-4" />
            <span>[LIQUIDAR ESTOQUE - MARCAR ACABOU]</span>
          </button>
        </div>

        {/* Active Lots Ledger Table */}
        <div className="mt-4 pt-3 border-t border-[#E8DFD1]">
          <h4 className="font-ledger-mono text-[11px] font-bold text-[#625B55] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Fichário de Lotes ({lotesAtivos.length})</span>
            <span className="text-[10px] text-[#A8A29E]">REGRA FIFO</span>
          </h4>
          <div className="space-y-2">
            {lotesAtivos.map((lote, idx) => (
              <div
                key={lote.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[#FAF7F2] border border-[#E8DFD1] text-xs font-ledger-mono"
              >
                <div>
                  <div className="font-bold text-[#292524]">
                    LOTE #{idx + 1} &bull; {lote.quantidadeRestante} {lote.unidade.toUpperCase()}
                  </div>
                  <div className="text-[11px] text-[#625B55]">
                    Entrada: {new Date(lote.compradoEm).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                      idx === 0
                        ? 'bg-[#EBF5F0] border-[#2E7D5A] text-[#2E7D5A]'
                        : 'bg-[#FFFDF9] border-[#E8DFD1] text-[#625B55]'
                    }`}
                  >
                    {idx === 0 ? 'PRÓXIMO A SAIR' : 'NA FILA'}
                  </span>
                  {lote.validadeEstimada && (
                    <div className="text-[10px] text-[#625B55] mt-0.5">
                      Vence: {new Date(lote.validadeEstimada).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
