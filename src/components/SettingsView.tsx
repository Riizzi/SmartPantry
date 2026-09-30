import React, { useState } from 'react';
import {
  Plus,
  X,
  Download,
  Upload,
  RotateCcw,
} from 'lucide-react';
import { PantryStore } from '../services/storage';
import { ConfigDespensa } from '../types/pantry';

interface SettingsViewProps {
  onNotify: (msg: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onNotify }) => {
  const [config, setConfig] = useState<ConfigDespensa>(() => PantryStore.getConfig());
  const [newBasic, setNewBasic] = useState('');

  const handleAddBasic = () => {
    if (!newBasic.trim()) return;
    const clean = newBasic.trim();
    if (!config.basicos.includes(clean)) {
      const updated = [...config.basicos, clean];
      setConfig(prev => ({ ...prev, basicos: updated }));
      PantryStore.saveConfig({ basicos: updated });
      onNotify(`Item "${clean}" adicionado à lista básica.`);
    }
    setNewBasic('');
  };

  const handleRemoveBasic = (item: string) => {
    const updated = config.basicos.filter(b => b !== item);
    setConfig(prev => ({ ...prev, basicos: updated }));
    PantryStore.saveConfig({ basicos: updated });
    onNotify(`Item "${item}" removido.`);
  };

  const handleExport = () => {
    const jsonStr = PantryStore.exportJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartpantry-ledger-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify('Backup contábil exportado com sucesso!');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const ok = PantryStore.importJson(content);
      if (ok) {
        setConfig(PantryStore.getConfig());
        onNotify('Backup contábil restaurado com sucesso!');
      } else {
        alert('Arquivo de backup inválido.');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (confirm('Deseja resetar a despensa para os lançamentos de demonstração?')) {
      PantryStore.resetToDefault();
      setConfig(PantryStore.getConfig());
      onNotify('Despensa restaurada para amostra inicial!');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Basics Management */}
      <div className="p-6 bg-[#FFFDF9] rounded-2xl border border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0] space-y-4">
        <div>
          <h3 className="text-base font-bold text-[#292524]">Itens Básicos de Cozinha</h3>
          <p className="text-xs text-[#625B55] mt-0.5 font-ledger-mono">
            Ingredientes que o livro de receitas sempre considera em estoque (nunca faltam).
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {config.basicos.map(basic => (
            <span
              key={basic}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E8DFD1] text-[#292524] text-xs font-semibold font-ledger-mono shadow-[1px_1px_0px_#E5DCD0]"
            >
              <span>{basic}</span>
              <button
                onClick={() => handleRemoveBasic(basic)}
                className="text-[#625B55] hover:text-[#C2543B] transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="text"
            placeholder="Ex: Azeite de Oliva, Canela..."
            value={newBasic}
            onChange={e => setNewBasic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddBasic()}
            className="flex-1 px-3.5 py-2 rounded-xl bg-[#FFFDF9] border border-[#E8DFD1] text-xs font-ledger-mono focus:border-[#625B55] focus:outline-none min-h-[44px]"
          />
          <button
            onClick={handleAddBasic}
            className="px-4 py-2 rounded-xl bg-[#2E7D5A] hover:bg-[#25684A] text-white font-ledger-mono text-xs font-bold border border-[#235F44] shadow-[1.5px_1.5px_0px_#1B4934] transition active:translate-x-[0.5px] active:translate-y-[0.5px] min-h-[44px] flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADICIONAR</span>
          </button>
        </div>
      </div>

      {/* Preferences */}
      <div className="p-6 bg-[#FFFDF9] rounded-2xl border border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0] space-y-4">
        <div>
          <h3 className="text-base font-bold text-[#292524]">Preferências de Dieta</h3>
          <p className="text-xs text-[#625B55] mt-0.5 font-ledger-mono">Padrão para consultas do chef inteligente.</p>
        </div>

        <div>
          <label className="block text-[11px] font-ledger-mono font-bold text-[#625B55] uppercase tracking-wider mb-2">
            Dieta Padrão
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-ledger-mono text-xs">
            {[
              { id: 'tudo', label: 'TUDO' },
              { id: 'vegetariano', label: 'VEGETARIANO' },
              { id: 'vegano', label: 'VEGANO' },
              { id: 'com_carne', label: 'CARNES' },
            ].map(d => (
              <button
                key={d.id}
                onClick={() => {
                  setConfig(prev => ({ ...prev, dietaPadrao: d.id as any }));
                  PantryStore.saveConfig({ dietaPadrao: d.id as any });
                }}
                className={`py-2 px-3 rounded-lg border transition min-h-[40px] ${
                  config.dietaPadrao === d.id
                    ? 'bg-[#292524] text-[#FFFDF9] border-[#292524] shadow-[1.5px_1.5px_0px_#625B55] font-bold'
                    : 'bg-[#FFFDF9] border-[#E8DFD1] text-[#625B55] hover:text-[#292524]'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Backup and Restore */}
      <div className="p-6 bg-[#FFFDF9] rounded-2xl border border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0] space-y-4">
        <div>
          <h3 className="text-base font-bold text-[#292524]">Fichário Local (Backup)</h3>
          <p className="text-xs text-[#625B55] mt-0.5 font-ledger-mono">
            Armazenamento físico no navegador. Você pode extrair cópias dos seus registros a qualquer momento.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 pt-2 font-ledger-mono text-xs">
          <button
            onClick={handleExport}
            className="px-4 py-2.5 rounded-xl border border-[#E8DFD1] bg-[#FAF7F2] hover:bg-[#F5EFE6] text-[#292524] font-bold shadow-[1.5px_1.5px_0px_#E5DCD0] transition active:translate-x-[0.5px] active:translate-y-[0.5px] min-h-[44px] flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-[#2E7D5A]" />
            <span>EXPORTAR LIVRO (JSON)</span>
          </button>

          <label className="px-4 py-2.5 rounded-xl border border-[#E8DFD1] bg-[#FAF7F2] hover:bg-[#F5EFE6] text-[#292524] font-bold shadow-[1.5px_1.5px_0px_#E5DCD0] transition active:translate-x-[0.5px] active:translate-y-[0.5px] min-h-[44px] flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4 text-[#B45309]" />
            <span>RESTAURAR LIVRO</span>
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>

          <button
            onClick={handleReset}
            className="px-4 py-2.5 rounded-xl border border-[#C2543B] bg-[#FBF0ED] hover:bg-[#F7E5E0] text-[#C2543B] font-bold shadow-[1.5px_1.5px_0px_#C2543B] transition active:translate-x-[0.5px] active:translate-y-[0.5px] min-h-[44px] flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESETAR AMOSTRA</span>
          </button>
        </div>
      </div>
    </div>
  );
};
