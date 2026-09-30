import React, { useState } from 'react';
import {
  X,
  Check,
  Calendar,
  Sparkles,
  Store,
  Info,
  AlertTriangle,
  CheckSquare,
  Square,
} from 'lucide-react';
import { NfceParseResult, NormalizedItem } from '../services/api';
import { Produto, Lote, NotaFiscal } from '../types/pantry';
import { PantryStore } from '../services/storage';

interface ReviewReceiptModalProps {
  receiptData: NfceParseResult;
  normalizedItems: NormalizedItem[];
  fonte?: 'qr' | 'foto' | 'chave';
  onClose: () => void;
  onSuccess: (count: number) => void;
}

interface EditableReviewItem {
  id: string;
  nomeBruto: string;
  nomeCanonico: string;
  categoria: Produto['categoria'];
  emoji: string;
  quantidade: number;
  unidade: Produto['unidadePadrao'];
  precoUnitario: number;
  validadeDias: number;
  proteinaAnimal: boolean;
  derivadoAnimal: boolean;
  ehAlimento: boolean;
  incluir: boolean;
}

export const ReviewReceiptModal: React.FC<ReviewReceiptModalProps> = ({
  receiptData,
  normalizedItems,
  fonte = 'qr',
  onClose,
  onSuccess,
}) => {
  // Check if this receipt was already imported previously
  const isDuplicateReceipt = PantryStore.getNotas().some(
    nf => nf.chaveAcesso === receiptData.chaveAcesso
  );

  const [confirmDuplicateImport, setConfirmDuplicateImport] = useState(false);
  const [inlineErrorMessage, setInlineErrorMessage] = useState<string | null>(null);

  // Initialize items matching by nomeBruto first, then index
  const [items, setItems] = useState<EditableReviewItem[]>(() => {
    return (receiptData.items || []).map((raw, idx) => {
      const norm =
        normalizedItems.find(n => n.nomeBruto === raw.nomeBruto) ||
        normalizedItems[idx] || {
          nomeBruto: raw.nomeBruto,
          nomeCanonico: raw.nomeBruto,
          categoria: 'mercearia' as const,
          emoji: '📦',
          unidadePadrao: 'un' as const,
          conteudoPorUnidade: 1,
          proteinaAnimal: false,
          derivadoAnimal: false,
          perecivel: true,
          validadePadraoDias: 14,
          ehAlimento: true,
        };

      const autoInclude = norm.ehAlimento !== false;

      return {
        id: `item_review_${idx}`,
        nomeBruto: raw.nomeBruto,
        nomeCanonico: norm.nomeCanonico || raw.nomeBruto,
        categoria: norm.categoria || 'mercearia',
        emoji: norm.emoji || '📦',
        quantidade: raw.quantidade || 1,
        unidade: norm.unidadePadrao || (raw.unidade as Produto['unidadePadrao']) || 'un',
        precoUnitario: raw.precoUnitario || 0,
        validadeDias: norm.validadePadraoDias || 10,
        proteinaAnimal: norm.proteinaAnimal || false,
        derivadoAnimal: norm.derivadoAnimal || false,
        ehAlimento: norm.ehAlimento !== false,
        incluir: autoInclude,
      };
    });
  });

  const toggleInclude = (id: string) => {
    setInlineErrorMessage(null);
    setItems(prev =>
      prev.map(it => (it.id === id ? { ...it, incluir: !it.incluir } : it))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setInlineErrorMessage(null);
    setItems(prev => prev.map(it => ({ ...it, incluir: select })));
  };

  const updateItem = (id: string, updates: Partial<EditableReviewItem>) => {
    setItems(prev =>
      prev.map(it => (it.id === id ? { ...it, ...updates } : it))
    );
  };

  const handleSaveToPantry = () => {
    const includedItems = items.filter(it => it.incluir);
    if (includedItems.length === 0) {
      setInlineErrorMessage('Selecione pelo menos um item para salvar na despensa.');
      return;
    }

    if (isDuplicateReceipt && !confirmDuplicateImport) {
      setInlineErrorMessage('Esta nota fiscal já foi importada anteriormente. Marque a confirmação para importar novamente.');
      return;
    }

    const now = new Date();
    const purchaseDate = receiptData.dataEmissao ? new Date(receiptData.dataEmissao) : now;

    const nota: NotaFiscal = {
      chaveAcesso: receiptData.chaveAcesso,
      uf: receiptData.uf || 'BR',
      emitenteCnpj: receiptData.emitenteCnpj || '',
      emitenteNome: receiptData.emitenteNome || 'Supermercado',
      dataEmissao: purchaseDate.toISOString(),
      total: receiptData.total,
      fonte,
      criadoEm: now.toISOString(),
    };

    const produtosParaCadastrar: Produto[] = [];
    const novosLotes: Omit<Lote, 'id'>[] = [];

    for (const it of includedItems) {
      const prodId = `prod_${it.nomeCanonico.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

      produtosParaCadastrar.push({
        id: prodId,
        nomeCanonico: it.nomeCanonico,
        aliases: [it.nomeBruto],
        categoria: it.categoria,
        emoji: it.emoji,
        unidadePadrao: it.unidade,
        conteudoPorUnidade: 1,
        proteinaAnimal: it.proteinaAnimal,
        derivadoAnimal: it.derivadoAnimal,
        perecivel: it.validadeDias < 30,
        validadePadraoDias: it.validadeDias,
        ehAlimento: it.ehAlimento,
      });

      const validadeEstimada = new Date(purchaseDate);
      validadeEstimada.setDate(validadeEstimada.getDate() + it.validadeDias);

      novosLotes.push({
        produtoId: prodId,
        notaId: receiptData.chaveAcesso,
        nomeBruto: it.nomeBruto,
        quantidadeInicial: it.quantidade,
        quantidadeRestante: it.quantidade,
        unidade: it.unidade,
        precoUnitario: it.precoUnitario,
        compradoEm: purchaseDate.toISOString(),
        validadeEstimada: validadeEstimada.toISOString(),
        status: 'ativo',
      });
    }

    const { novosLotesCount } = PantryStore.salvarNotaComLotes(nota, novosLotes, produtosParaCadastrar);
    onSuccess(novosLotesCount);
    onClose();
  };

  const includedCount = items.filter(i => i.incluir).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-[#FFFDF9] rounded-2xl border border-[#E8DFD1] shadow-[3px_3px_0px_#E5DCD0] text-[#292524] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Receipt Header summary in Stone Charcoal */}
        <div className="p-5 sm:p-6 bg-[#292524] text-[#FFFDF9] relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-4 right-4 p-1.5 rounded-lg border border-[#44403C] text-[#A8A29E] hover:text-[#FFFDF9] hover:bg-[#44403C] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 font-ledger-mono text-[#A7F3D0] text-[10px] font-bold uppercase tracking-wider mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#FEF3C7]" />
            <span>LANÇAMENTO DE NOTA FISCAL &bull; {fonte.toUpperCase()}</span>
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-[#FFFDF9] flex items-center gap-2">
            <Store className="w-5 h-5 text-[#A7F3D0] shrink-0" />
            <span className="truncate">{receiptData.emitenteNome || 'Supermercado'}</span>
          </h3>

          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs font-ledger-mono text-[#D6D3D1]">
            <span className="font-bold text-[#FFFDF9]">TOTAL: R$ {receiptData.total.toFixed(2)}</span>
            <span>&bull;</span>
            <span>{items.length} ITENS LIDOS</span>
            <span>&bull;</span>
            <span className="text-[11px] opacity-80 truncate max-w-[200px]">
              CHAVE: {receiptData.chaveAcesso}
            </span>
          </div>
        </div>

        {/* Warning if receipt is duplicate */}
        {isDuplicateReceipt && (
          <div className="bg-[#FEF3C7] border-b border-[#B45309]/30 px-5 py-3 text-xs font-ledger-mono text-[#B45309] flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Esta nota fiscal já consta no seu histórico. Deseja reimportar os produtos?</span>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer font-bold select-none">
              <input
                type="checkbox"
                checked={confirmDuplicateImport}
                onChange={e => setConfirmDuplicateImport(e.target.checked)}
                className="rounded accent-[#B45309]"
              />
              <span>Confirmar duplicata</span>
            </label>
          </div>
        )}

        {/* Toolbar: Instructions + Select All / None + Counter */}
        <div className="bg-[#FAF7F2] px-4 sm:px-6 py-2.5 border-b border-[#E8DFD1] flex flex-wrap items-center justify-between gap-2 text-xs font-ledger-mono shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSelectAll(true)}
              className="px-2 py-1 rounded border border-[#E8DFD1] bg-[#FFFDF9] hover:bg-[#F5EFE6] text-[#292524] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5 text-[#2E7D5A]" />
              <span>Todos</span>
            </button>
            <button
              onClick={() => handleSelectAll(false)}
              className="px-2 py-1 rounded border border-[#E8DFD1] bg-[#FFFDF9] hover:bg-[#F5EFE6] text-[#625B55] text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Nenhum</span>
            </button>
          </div>

          <span className="font-bold text-[#292524] text-xs">
            {includedCount} de {items.length} itens selecionados
          </span>
        </div>

        {/* Inline Error Message */}
        {inlineErrorMessage && (
          <div className="bg-[#FBF0ED] border-b border-[#C2543B] px-5 py-2.5 text-xs font-ledger-mono text-[#C2543B] flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{inlineErrorMessage}</span>
          </div>
        )}

        {/* Item List: Mobile Stacked Card (No horizontal overflow) */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 space-y-2.5">
          {items.map(it => (
            <div
              key={it.id}
              className={`p-3.5 rounded-xl border transition ${
                it.incluir
                  ? 'bg-[#FFFDF9] border-[#E8DFD1] shadow-[1.5px_1.5px_0px_#E5DCD0]'
                  : 'bg-[#FAF7F2] border-[#E8DFD1]/60 opacity-50'
              }`}
            >
              {/* Top Row: Checkbox + Emoji + Name + Category badge */}
              <div className="flex items-start gap-2.5">
                <button
                  onClick={() => toggleInclude(it.id)}
                  className={`w-6 h-6 rounded-md border flex items-center justify-center transition shrink-0 mt-0.5 cursor-pointer ${
                    it.incluir
                      ? 'bg-[#292524] border-[#292524] text-[#FFFDF9] shadow-[1px_1px_0px_#625B55]'
                      : 'border-[#E8DFD1] bg-[#FFFDF9] hover:border-[#625B55]'
                  }`}
                  aria-label={it.incluir ? 'Desmarcar produto' : 'Marcar produto'}
                >
                  {it.incluir && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>

                <div className="text-2xl select-none shrink-0 leading-none">{it.emoji}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <input
                      type="text"
                      value={it.nomeCanonico}
                      onChange={e => updateItem(it.id, { nomeCanonico: e.target.value })}
                      disabled={!it.incluir}
                      className="font-bold text-sm text-[#292524] border-b border-transparent hover:border-[#E8DFD1] focus:border-[#625B55] focus:outline-none bg-transparent px-0 py-0.5 w-full"
                    />
                    <span className="font-ledger-mono text-[10px] uppercase px-1.5 py-0.5 border border-[#E8DFD1] bg-[#FAF7F2] text-[#625B55] rounded shrink-0">
                      {it.categoria}
                    </span>
                  </div>

                  <p className="font-ledger-mono text-[11px] text-[#A8A29E] truncate mt-0.5">
                    Original: {it.nomeBruto}
                  </p>
                </div>
              </div>

              {/* Bottom Row: Stacked below (Qtd, Unidade, Validade) - no horizontal scrolling */}
              <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-[#E8DFD1] text-xs font-ledger-mono text-[#625B55]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#A8A29E]">QTD:</span>
                  <input
                    type="number"
                    step="0.05"
                    min="0.01"
                    value={it.quantidade}
                    onChange={e => updateItem(it.id, { quantidade: parseFloat(e.target.value) || 1 })}
                    disabled={!it.incluir}
                    className="w-16 px-2 py-1 rounded border border-[#E8DFD1] text-xs font-bold bg-[#FFFDF9] text-center focus:border-[#625B55] focus:outline-none"
                  />
                  <span className="uppercase font-bold text-[#292524]">{it.unidade}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#A8A29E]" />
                  <span className="text-[#A8A29E]">VALIDADE:</span>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={it.validadeDias}
                    onChange={e => updateItem(it.id, { validadeDias: parseInt(e.target.value) || 7 })}
                    disabled={!it.incluir}
                    className="w-14 px-2 py-1 rounded border border-[#E8DFD1] text-xs font-bold bg-[#FFFDF9] text-center focus:border-[#625B55] focus:outline-none"
                  />
                  <span className="text-[#292524]">DIAS</span>
                </div>

                {it.precoUnitario > 0 && (
                  <span className="text-[11px] text-[#625B55]">
                    R$ {it.precoUnitario.toFixed(2)} / {it.unidade}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#E8DFD1] bg-[#FAF7F2] flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#E8DFD1] bg-[#FFFDF9] text-[#625B55] hover:text-[#292524] hover:bg-[#F5EFE6] text-xs font-semibold font-ledger-mono transition min-h-[44px] cursor-pointer"
          >
            CANCELAR
          </button>

          <button
            onClick={handleSaveToPantry}
            disabled={includedCount === 0 || (isDuplicateReceipt && !confirmDuplicateImport)}
            className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-[#2E7D5A] hover:bg-[#25684A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-white text-xs sm:text-sm font-bold font-ledger-mono border border-[#235F44] shadow-[2px_2px_0px_#1B4934] transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>LANÇAR NA DESPENSA ({includedCount} {includedCount === 1 ? 'ITEM' : 'ITENS'})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
