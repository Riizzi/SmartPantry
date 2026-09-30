import React, { useState } from 'react';
import {
  History,
  FileText,
  Undo2,
} from 'lucide-react';
import { PantryStore } from '../services/storage';
import { Movimento } from '../types/pantry';

interface HistoryViewProps {
  onUndo: (desc: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onUndo }) => {
  const [subTab, setSubTab] = useState<'movimentos' | 'notas'>('movimentos');
  const movimentos = PantryStore.getMovimentos();
  const notas = PantryStore.getNotas();
  const produtos = PantryStore.getProdutos();

  const handleUndoSingle = (mov: Movimento) => {
    const success = PantryStore.desfazerMovimentos([mov.id]);
    if (success) {
      const prod = produtos.find(p => p.id === mov.produtoId);
      onUndo(`Desfeita a baixa em ${prod?.nomeCanonico || 'produto'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub tabs in Retro Ledger Style */}
      <div className="flex items-center justify-between">
        <div className="inline-flex p-1.5 rounded-xl bg-[#FAF7F2] border border-[#E8DFD1] text-xs font-ledger-mono">
          <button
            onClick={() => setSubTab('movimentos')}
            className={`px-4 py-2 rounded-lg transition min-h-[38px] ${
              subTab === 'movimentos'
                ? 'bg-[#FFFDF9] text-[#292524] border border-[#E8DFD1] shadow-[1.5px_1.5px_0px_#E5DCD0] font-bold'
                : 'text-[#625B55] hover:text-[#292524]'
            }`}
          >
            HISTÓRICO ({movimentos.length})
          </button>
          <button
            onClick={() => setSubTab('notas')}
            className={`px-4 py-2 rounded-lg transition min-h-[38px] ${
              subTab === 'notas'
                ? 'bg-[#FFFDF9] text-[#292524] border border-[#E8DFD1] shadow-[1.5px_1.5px_0px_#E5DCD0] font-bold'
                : 'text-[#625B55] hover:text-[#292524]'
            }`}
          >
            NOTAS FISCAIS ({notas.length})
          </button>
        </div>
      </div>

      {/* Movements list as accounting journal entries */}
      {subTab === 'movimentos' && (
        <div className="space-y-3">
          {movimentos.length === 0 ? (
            <div className="p-12 text-center bg-[#FFFDF9] rounded-2xl border border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0] text-[#625B55]">
              <History className="w-10 h-10 mx-auto mb-2 text-[#D6C8B6]" />
              <p className="font-ledger-mono text-sm font-bold text-[#292524]">NENHUM LANÇAMENTO REGISTRADO</p>
              <p className="text-xs text-[#625B55] mt-1 max-w-sm mx-auto">
                Conforme você consumir mantimentos ou cozinhar receitas, o extrato contábil aparecerá aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {movimentos.map(mov => {
                const prod = produtos.find(p => p.id === mov.produtoId);

                return (
                  <div
                    key={mov.id}
                    className="p-4 rounded-xl bg-[#FFFDF9] border border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-[#FAF7F2] border border-[#E8DFD1] flex items-center justify-center text-xl shrink-0">
                        {prod?.emoji || '📦'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#292524] truncate">
                            {prod?.nomeCanonico || 'Produto'}
                          </span>
                          <span
                            className={`font-ledger-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                              mov.tipo === 'acabou'
                                ? 'bg-[#FBF0ED] border-[#C2543B] text-[#C2543B]'
                                : mov.tipo === 'receita'
                                ? 'bg-[#EBF5F0] border-[#2E7D5A] text-[#2E7D5A]'
                                : 'bg-[#FAF7F2] border-[#E8DFD1] text-[#625B55]'
                            }`}
                          >
                            {mov.tipo}
                          </span>
                        </div>
                        <div className="font-ledger-mono text-xs text-[#625B55] mt-0.5 flex items-center gap-2">
                          <span className="text-[#C2543B] font-bold">-{mov.delta} {prod?.unidadePadrao.toUpperCase() || 'UN'}</span>
                          <span>&bull;</span>
                          <span className="text-[11px] text-[#A8A29E]">
                            {new Date(mov.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })},{' '}
                            {new Date(mov.criadoEm).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleUndoSingle(mov)}
                      className="px-3 py-1.5 rounded-lg border border-[#E8DFD1] bg-[#FAF7F2] hover:bg-[#FFFDF9] hover:border-[#2E7D5A] text-[#625B55] hover:text-[#2E7D5A] font-ledger-mono text-xs font-bold shadow-[1px_1px_0px_#E5DCD0] transition active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none flex items-center gap-1.5 shrink-0 min-h-[38px]"
                      title="Desfazer este lançamento"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>ESTORNAR</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Receipts list */}
      {subTab === 'notas' && (
        <div className="space-y-3">
          {notas.length === 0 ? (
            <div className="p-12 text-center bg-[#FFFDF9] rounded-2xl border border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0] text-[#625B55]">
              <FileText className="w-10 h-10 mx-auto mb-2 text-[#D6C8B6]" />
              <p className="font-ledger-mono text-sm font-bold text-[#292524]">NENHUMA NOTA ARQUIVADA</p>
              <p className="text-xs text-[#625B55] mt-1">Escaneie um QR Code de mercado para alimentar o livro contábil.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notas.map(n => (
                <div
                  key={n.chaveAcesso}
                  className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0] space-y-2 font-ledger-mono"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-sm text-[#292524]">{n.emitenteNome}</h4>
                      <p className="text-xs text-[#625B55]">CNPJ: {n.emitenteCnpj || 'NÃO INFORMADO'}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sm text-[#2E7D5A]">
                        R$ {n.total ? n.total.toFixed(2) : '0.00'}
                      </span>
                      <span className="block text-[10px] text-[#A8A29E] uppercase tracking-wider">
                        ESTADO: {n.uf}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E8DFD1] flex items-center justify-between text-xs text-[#625B55]">
                    <span className="text-[11px] text-[#A8A29E] truncate max-w-[280px]">
                      CHAVE: {n.chaveAcesso}
                    </span>
                    <span>{new Date(n.dataEmissao).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
