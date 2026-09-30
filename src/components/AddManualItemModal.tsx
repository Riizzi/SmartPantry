import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, PackagePlus, Check, AlertCircle, Info, ChevronRight, Plus } from 'lucide-react';
import { CategoriaProduto, UnidadeMedida, Produto } from '../types/pantry';
import { PantryStore } from '../services/storage';

interface AddManualItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemAdded: (name: string) => void;
}

interface CategoryConfig {
  cat: CategoriaProduto;
  label: string;
  defaultValidadeDias: number;
  defaultUnidade: UnidadeMedida;
  emojis: string[];
}

const CATEGORIES_CONFIG: CategoryConfig[] = [
  {
    cat: 'hortifruti',
    label: 'Hortifrúti',
    defaultValidadeDias: 7,
    defaultUnidade: 'un',
    emojis: ['🍎', '🍅', '🍌', '🥕', '🥔', '🥬', '🍋'],
  },
  {
    cat: 'carnes',
    label: 'Carnes & Aves',
    defaultValidadeDias: 4,
    defaultUnidade: 'kg',
    emojis: ['🥩', '🍗', '🍖', '🥓', '🐟', '🍤'],
  },
  {
    cat: 'laticinios',
    label: 'Laticínios & Ovos',
    defaultValidadeDias: 10,
    defaultUnidade: 'un',
    emojis: ['🧀', '🥛', '🥚', '🧈', '🍦', '🥣'],
  },
  {
    cat: 'graos',
    label: 'Grãos & Cereais',
    defaultValidadeDias: 180,
    defaultUnidade: 'kg',
    emojis: ['🍚', '🌾', '🌽', '🫘', '🥣'],
  },
  {
    cat: 'padaria',
    label: 'Padaria & Massas',
    defaultValidadeDias: 5,
    defaultUnidade: 'un',
    emojis: ['🍞', '🥖', '🥐', '🥯', '🍰', '🍪'],
  },
  {
    cat: 'bebidas',
    label: 'Bebidas',
    defaultValidadeDias: 90,
    defaultUnidade: 'l',
    emojis: ['🧃', '☕', '🍵', '🥤', '🍶', '🍺'],
  },
  {
    cat: 'congelados',
    label: 'Congelados',
    defaultValidadeDias: 90,
    defaultUnidade: 'kg',
    emojis: ['🧊', '🍟', '🍕', '🥟', '🥦'],
  },
  {
    cat: 'mercearia',
    label: 'Mercearia & Conservas',
    defaultValidadeDias: 180,
    defaultUnidade: 'un',
    emojis: ['🥫', '🫒', '🍯', '📦', '🍫'],
  },
  {
    cat: 'temperos',
    label: 'Temperos & Ervas',
    defaultValidadeDias: 365,
    defaultUnidade: 'g',
    emojis: ['🧂', '🌿', '🌶️', '🧄', '🧅'],
  },
  {
    cat: 'outros',
    label: 'Outros Alimentos',
    defaultValidadeDias: 30,
    defaultUnidade: 'un',
    emojis: ['🍴', '📦', '🥡', '🍱'],
  },
];

const MEAT_WORDS_REGEX =
  /carne|bov|suin|frango|ave|peixe|salmao|tilapia|camarao|bacon|linguica|presunto|peru|patinho|alcatra|costela|moida|bife|file/i;
const DAIRY_WORDS_REGEX =
  /leite|ovo|queijo|mussarela|prato|parmesao|requeijao|iogurte|manteiga|mel|creme de leite|nata|whey|ricota/i;

export const AddManualItemModal: React.FC<AddManualItemModalProps> = ({
  isOpen,
  onClose,
  onItemAdded,
}) => {
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState<CategoriaProduto>('hortifruti');
  const [emoji, setEmoji] = useState('🍎');
  const [isCustomEmoji, setIsCustomEmoji] = useState(false);
  const [customEmojiInput, setCustomEmojiInput] = useState('');

  // Stored as strings in local component state to allow natural typing/deleting ("0,5" or "0.5")
  const [quantidadeStr, setQuantidadeStr] = useState('1');
  const [unidade, setUnidade] = useState<UnidadeMedida>('un');
  const [validadeDiasStr, setValidadeDiasStr] = useState('7');

  // Dietary checkboxes
  const [proteinaAnimal, setProteinaAnimal] = useState(false);
  const [derivadoAnimal, setDerivadoAnimal] = useState(false);

  // Existing product match
  const [lockedExistingProduct, setLockedExistingProduct] = useState<Produto | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Validation error message
  const [validationError, setValidationError] = useState<string | null>(null);

  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Reset all fields to initial defaults
  const resetForm = () => {
    setNome('');
    setCategoria('hortifruti');
    setEmoji('🍎');
    setIsCustomEmoji(false);
    setCustomEmojiInput('');
    setQuantidadeStr('1');
    setUnidade('un');
    setValidadeDiasStr('7');
    setProteinaAnimal(false);
    setDerivadoAnimal(false);
    setLockedExistingProduct(null);
    setShowSuggestions(false);
    setValidationError(null);
  };

  // Reset fields on modal open
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Query existing products for autocomplete
  const existingProducts = useMemo(() => {
    if (!isOpen) return [];
    return PantryStore.getProdutos();
  }, [isOpen]);

  const suggestions = useMemo(() => {
    const trimmed = nome.trim().toLowerCase();
    if (!trimmed || trimmed.length < 2 || lockedExistingProduct) return [];
    return existingProducts
      .filter(
        p =>
          p.nomeCanonico.toLowerCase().includes(trimmed) ||
          p.aliases.some(a => a.toLowerCase().includes(trimmed))
      )
      .slice(0, 5);
  }, [nome, existingProducts, lockedExistingProduct]);

  // Close suggestions if clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // When category changes, apply sensible defaults
  const handleCategoryChange = (c: CategoriaProduto) => {
    setCategoria(c);
    const cfg = CATEGORIES_CONFIG.find(item => item.cat === c);
    if (cfg) {
      if (!isCustomEmoji) {
        setEmoji(cfg.emojis[0] || '📦');
      }
      if (!lockedExistingProduct) {
        setUnidade(cfg.defaultUnidade);
        setValidadeDiasStr(String(cfg.defaultValidadeDias));
      }
    }

    // Auto-suggest dietary flags based on category unless already edited
    if (c === 'carnes') {
      setProteinaAnimal(true);
    } else if (c === 'laticinios') {
      setDerivadoAnimal(true);
    } else {
      // Re-evaluate against name keywords
      setProteinaAnimal(MEAT_WORDS_REGEX.test(nome));
      setDerivadoAnimal(DAIRY_WORDS_REGEX.test(nome));
    }
  };

  // Auto-detect dietary flags while typing name
  const handleNameChange = (val: string) => {
    setNome(val);
    setValidationError(null);
    setShowSuggestions(true);

    if (lockedExistingProduct && val.trim().toLowerCase() !== lockedExistingProduct.nomeCanonico.toLowerCase()) {
      setLockedExistingProduct(null);
    }

    // If not locked, evaluate keywords
    if (!lockedExistingProduct) {
      if (MEAT_WORDS_REGEX.test(val)) {
        setProteinaAnimal(true);
      }
      if (DAIRY_WORDS_REGEX.test(val)) {
        setDerivadoAnimal(true);
      }
    }
  };

  // Choose an existing product from autocomplete
  const handleSelectExistingProduct = (prod: Produto) => {
    setNome(prod.nomeCanonico);
    setCategoria(prod.categoria);
    setEmoji(prod.emoji || '📦');
    setUnidade(prod.unidadePadrao);
    setValidadeDiasStr(String(prod.validadePadraoDias || 10));
    setProteinaAnimal(!!prod.proteinaAnimal);
    setDerivadoAnimal(!!prod.derivadoAnimal);
    setLockedExistingProduct(prod);
    setShowSuggestions(false);
  };

  // Validate and submit
  const validateAndSubmit = (keepOpenAfterSave: boolean) => {
    setValidationError(null);

    const cleanName = nome.trim();
    if (!cleanName) {
      setValidationError('Por favor, informe o nome do produto.');
      return;
    }

    // Parse and validate quantidade
    const parsedQtd = parseFloat(quantidadeStr.replace(',', '.'));
    if (isNaN(parsedQtd) || parsedQtd <= 0) {
      setValidationError('A quantidade deve ser um número maior que zero (ex: 1 ou 0,5).');
      return;
    }

    // Parse and validate validade
    const parsedValidade = parseInt(validadeDiasStr, 10);
    if (isNaN(parsedValidade) || parsedValidade < 1 || parsedValidade > 3650) {
      setValidationError('A validade deve estar entre 1 e 3650 dias.');
      return;
    }

    const finalEmoji = isCustomEmoji ? customEmojiInput.trim() || emoji : emoji;

    PantryStore.adicionarItemManual({
      nome: cleanName,
      categoria,
      emoji: finalEmoji,
      quantidade: parsedQtd,
      unidade,
      validadeDias: parsedValidade,
      proteinaAnimal,
      derivadoAnimal,
    });

    onItemAdded(cleanName);

    if (keepOpenAfterSave) {
      resetForm();
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const currentCategoryConfig =
    CATEGORIES_CONFIG.find(c => c.cat === categoria) || CATEGORIES_CONFIG[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-[#FFFDF9] rounded-2xl border border-[#E8DFD1] shadow-[3px_3px_0px_#E5DCD0] p-5 sm:p-6 text-[#292524] animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#E8DFD1] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FAF7F2] border border-[#E8DFD1] text-[#2E7D5A] flex items-center justify-center shadow-[1px_1px_0px_#E5DCD0]">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#292524] leading-tight">Cadastrar Item Manual</h3>
              <p className="font-ledger-mono text-[11px] text-[#625B55]">Lançamento rápido no estoque</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-lg border border-[#E8DFD1] bg-[#FAF7F2] text-[#625B55] hover:text-[#292524] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Validation Error Message */}
        {validationError && (
          <div className="mt-3 p-3 rounded-xl bg-[#FBF0ED] border border-[#C2543B] text-[#C2543B] text-xs font-ledger-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <form
          onSubmit={e => {
            e.preventDefault();
            validateAndSubmit(false);
          }}
          className="space-y-4 mt-4 text-xs font-ledger-mono flex-1"
        >
          {/* Nome com Autocomplete */}
          <div className="relative" ref={autocompleteRef}>
            <label className="block font-bold text-[#625B55] uppercase tracking-wider mb-1.5">
              Nome do Produto
            </label>
            <input
              type="text"
              placeholder="Ex: Abacate Manteiga, Peito de Frango, Arroz..."
              value={nome}
              onChange={e => handleNameChange(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              className="w-full p-2.5 rounded-xl bg-[#FFFDF9] border border-[#E8DFD1] focus:border-[#625B55] focus:outline-none text-xs font-bold text-[#292524] font-sans shadow-[1px_1px_0px_#E5DCD0]"
              autoFocus
              required
            />

            {/* Existing product link badge */}
            {lockedExistingProduct && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#2E7D5A] font-semibold">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Vinculado ao produto cadastrado: "{lockedExistingProduct.nomeCanonico}" ({lockedExistingProduct.unidadePadrao})</span>
              </div>
            )}

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-[#FFFDF9] border border-[#E8DFD1] rounded-xl shadow-[3px_3px_0px_#E5DCD0] overflow-hidden">
                <div className="p-1.5 text-[10px] uppercase font-bold text-[#625B55] bg-[#FAF7F2] border-b border-[#E8DFD1]">
                  Produtos já cadastrados na despensa:
                </div>
                {suggestions.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectExistingProduct(p)}
                    className="w-full px-3 py-2 text-left hover:bg-[#FAF7F2] flex items-center justify-between transition cursor-pointer text-xs font-sans text-[#292524] border-b border-[#E8DFD1]/50 last:border-0"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-base">{p.emoji}</span>
                      <span className="font-bold">{p.nomeCanonico}</span>
                      <span className="text-[10px] font-ledger-mono text-[#625B55] px-1 py-0.5 border border-[#E8DFD1] rounded bg-[#FFFDF9]">
                        {p.categoria}
                      </span>
                    </div>
                    <span className="text-[11px] font-ledger-mono text-[#2E7D5A] shrink-0 font-bold ml-2">
                      unidade: {p.unidadePadrao}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Categoria */}
          <div>
            <label className="block font-bold text-[#625B55] uppercase tracking-wider mb-1.5">
              Categoria
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {CATEGORIES_CONFIG.map(c => (
                <button
                  key={c.cat}
                  type="button"
                  onClick={() => handleCategoryChange(c.cat)}
                  className={`p-2 rounded-xl border text-[11px] flex items-center gap-1.5 transition text-left cursor-pointer ${
                    categoria === c.cat
                      ? 'bg-[#292524] text-[#FFFDF9] border-[#292524] shadow-[1.5px_1.5px_0px_#625B55] font-bold'
                      : 'bg-[#FFFDF9] border-[#E8DFD1] text-[#625B55] hover:text-[#292524]'
                  }`}
                >
                  <span className="text-sm">{c.emojis[0]}</span>
                  <span className="truncate">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Seletor de Emoji por categoria */}
          <div>
            <label className="block font-bold text-[#625B55] uppercase tracking-wider mb-1.5">
              Ícone / Emoji
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {currentCategoryConfig.emojis.map(em => (
                <button
                  key={em}
                  type="button"
                  onClick={() => {
                    setEmoji(em);
                    setIsCustomEmoji(false);
                  }}
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xl transition cursor-pointer ${
                    !isCustomEmoji && emoji === em
                      ? 'bg-[#2E7D5A]/10 border-[#2E7D5A] shadow-[1.5px_1.5px_0px_#2E7D5A]'
                      : 'bg-[#FFFDF9] border-[#E8DFD1] hover:border-[#625B55]'
                  }`}
                >
                  {em}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setIsCustomEmoji(true)}
                className={`px-3 h-10 rounded-xl border flex items-center justify-center text-[11px] font-bold transition cursor-pointer ${
                  isCustomEmoji
                    ? 'bg-[#2E7D5A]/10 border-[#2E7D5A] text-[#2E7D5A]'
                    : 'bg-[#FFFDF9] border-[#E8DFD1] text-[#625B55] hover:text-[#292524]'
                }`}
              >
                Outro...
              </button>

              {isCustomEmoji && (
                <input
                  type="text"
                  maxLength={4}
                  placeholder="🌟"
                  value={customEmojiInput}
                  onChange={e => setCustomEmojiInput(e.target.value)}
                  className="w-12 h-10 text-center text-xl rounded-xl border border-[#2E7D5A] bg-[#FFFDF9] focus:outline-none"
                  autoFocus
                />
              )}
            </div>
          </div>

          {/* Quantidade e Unidade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#625B55] uppercase tracking-wider mb-1.5">
                Quantidade
              </label>
              <input
                type="text"
                placeholder="Ex: 1 ou 0.5"
                value={quantidadeStr}
                onChange={e => {
                  setQuantidadeStr(e.target.value);
                  setValidationError(null);
                }}
                className="w-full p-2.5 rounded-xl bg-[#FFFDF9] border border-[#E8DFD1] focus:border-[#625B55] focus:outline-none text-xs font-bold text-[#292524] shadow-[1px_1px_0px_#E5DCD0]"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-[#625B55] uppercase tracking-wider mb-1.5">
                Unidade
              </label>
              <select
                value={unidade}
                onChange={e => setUnidade(e.target.value as UnidadeMedida)}
                disabled={!!lockedExistingProduct}
                className="w-full p-2.5 rounded-xl bg-[#FFFDF9] border border-[#E8DFD1] focus:border-[#625B55] focus:outline-none text-xs font-bold text-[#292524] shadow-[1px_1px_0px_#E5DCD0] cursor-pointer disabled:opacity-70"
              >
                <option value="un">un (unidade)</option>
                <option value="kg">kg (quilos)</option>
                <option value="g">g (gramas)</option>
                <option value="l">l (litros)</option>
                <option value="ml">ml (mililitros)</option>
              </select>
            </div>
          </div>

          {/* Validade em Dias */}
          <div>
            <label className="block font-bold text-[#625B55] uppercase tracking-wider mb-1.5">
              Validade Estimada (dias a partir de hoje)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Ex: 7"
                value={validadeDiasStr}
                onChange={e => {
                  setValidadeDiasStr(e.target.value.replace(/\D/g, ''));
                  setValidationError(null);
                }}
                className="w-24 p-2.5 rounded-xl bg-[#FFFDF9] border border-[#E8DFD1] focus:border-[#625B55] focus:outline-none text-xs font-bold text-[#292524] shadow-[1px_1px_0px_#E5DCD0]"
                required
              />
              <span className="text-[#625B55] text-xs">dias no estoque</span>
            </div>
          </div>

          {/* Checkboxes de Proteína e Derivado Animal */}
          <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E8DFD1] space-y-2.5">
            <span className="block text-[10px] font-bold text-[#625B55] uppercase tracking-wider mb-1">
              Classificação para Filtros de Dieta
            </span>

            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#292524]">
              <input
                type="checkbox"
                checked={proteinaAnimal}
                onChange={e => setProteinaAnimal(e.target.checked)}
                className="w-4 h-4 rounded accent-[#2E7D5A] cursor-pointer"
              />
              <span>Proteína animal (carne bovina, frango, peixe, suíno)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#292524]">
              <input
                type="checkbox"
                checked={derivadoAnimal}
                onChange={e => setDerivadoAnimal(e.target.checked)}
                className="w-4 h-4 rounded accent-[#2E7D5A] cursor-pointer"
              />
              <span>Derivado animal (leite, ovos, queijo, manteiga, mel)</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[#E8DFD1] flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => validateAndSubmit(true)}
              className="py-2.5 px-4 rounded-xl border border-[#E8DFD1] bg-[#FAF7F2] hover:bg-[#F5EFE6] text-[#292524] text-xs font-bold shadow-[1.5px_1.5px_0px_#E5DCD0] transition active:translate-x-[0.5px] active:translate-y-[0.5px] flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
            >
              <Plus className="w-4 h-4 text-[#2E7D5A]" />
              <span>Adicionar e cadastrar outro</span>
            </button>

            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#2E7D5A] hover:bg-[#25684A] text-white text-xs font-bold border border-[#235F44] shadow-[2px_2px_0px_#1B4934] transition active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
            >
              <Check className="w-4 h-4" />
              <span>Adicionar à despensa</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
