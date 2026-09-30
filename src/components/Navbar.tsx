import React from 'react';
import {
  UtensilsCrossed,
  ChefHat,
  QrCode,
  History,
  Settings,
  Star,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { MealIcon } from './MealIcon';

export type ActiveTab = 'despensa' | 'essenciais' | 'receitas' | 'historico' | 'ajustes';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenScan: () => void;
  urgentCount: number;
  faltantesCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenScan,
  urgentCount,
  faltantesCount = 0,
}) => {
  return (
    <>
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E8DFD1]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo and Brand with Cell Phone Themed Gray/Black Apple Icon */}
          <div
            onClick={() => onTabChange('despensa')}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#CECFD2] border-2 border-stone-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center p-1 transition group-active:translate-x-[1px] group-active:translate-y-[1px] group-active:shadow-none shrink-0">
              <MealIcon className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg text-[#292524] tracking-tight">
                  SmartPantry
                </h1>
              </div>
              <p className="text-[11px] text-[#625B55] hidden sm:block">
                Despensa e receitas da casa
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-2">
            <button
              onClick={() => onTabChange('despensa')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === 'despensa'
                  ? 'bg-[#FFFDF9] text-[#292524] border border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0]'
                  : 'text-[#625B55] hover:text-[#292524] hover:bg-[#FAF7F2]'
              }`}
            >
              <UtensilsCrossed className="w-4 h-4 text-[#2E7D5A]" />
              <span>Despensa</span>
            </button>

            <button
              onClick={() => onTabChange('essenciais')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === 'essenciais'
                  ? 'bg-[#FFFDF9] text-[#292524] border border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0]'
                  : 'text-[#625B55] hover:text-[#292524] hover:bg-[#FAF7F2]'
              }`}
            >
              <Star className="w-4 h-4 text-[#B45309]" />
              <span>Essenciais &amp; Compras</span>
            </button>

            <button
              onClick={() => onTabChange('receitas')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === 'receitas'
                  ? 'bg-[#FFFDF9] text-[#292524] border border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0]'
                  : 'text-[#625B55] hover:text-[#292524] hover:bg-[#FAF7F2]'
              }`}
            >
              <ChefHat className="w-4 h-4 text-[#B45309]" />
              <span>Receitas</span>
            </button>

            <button
              onClick={() => onTabChange('historico')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === 'historico'
                  ? 'bg-[#FFFDF9] text-[#292524] border border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0]'
                  : 'text-[#625B55] hover:text-[#292524] hover:bg-[#FAF7F2]'
              }`}
            >
              <History className="w-4 h-4 text-[#625B55]" />
              <span>Histórico</span>
            </button>

            <button
              onClick={() => onTabChange('ajustes')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === 'ajustes'
                  ? 'bg-[#FFFDF9] text-[#292524] border border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0]'
                  : 'text-[#625B55] hover:text-[#292524] hover:bg-[#FAF7F2]'
              }`}
            >
              <Settings className="w-4 h-4 text-[#625B55]" />
              <span>Ajustes</span>
            </button>
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2">
            <PWAInstallButton />

            <button
              onClick={() => onTabChange('ajustes')}
              className={`p-2 rounded-xl border border-[#E8DFD1] md:hidden transition active:translate-x-[0.5px] active:translate-y-[0.5px] min-h-[40px] min-w-[40px] flex items-center justify-center ${
                activeTab === 'ajustes'
                  ? 'bg-[#FFFDF9] text-[#292524] shadow-[1.5px_1.5px_0px_#E5DCD0]'
                  : 'bg-[#FAF7F2] text-[#625B55]'
              }`}
              title="Ajustes e Básicos"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenScan}
              className="px-3.5 py-2 rounded-xl bg-[#2E7D5A] hover:bg-[#25684A] text-white font-semibold text-xs border border-[#235F44] shadow-[2px_2px_0px_#1B4934] transition active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1.5 cursor-pointer min-h-[40px]"
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">Escanear Nota</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Optimized for One-Hand Thumb Reach) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-t border-[#E8DFD1] px-1 py-1.5 flex items-center justify-around shadow-sm safe-bottom">
        {/* 1. Despensa */}
        <button
          onClick={() => onTabChange('despensa')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition min-w-[56px] min-h-[44px] justify-center ${
            activeTab === 'despensa' ? 'text-[#2E7D5A] font-bold' : 'text-[#625B55]'
          }`}
        >
          <UtensilsCrossed className="w-5 h-5" />
          <span className="text-[10px]">Despensa</span>
        </button>

        {/* 2. Essenciais & Compras */}
        <button
          onClick={() => onTabChange('essenciais')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition min-w-[56px] min-h-[44px] justify-center relative ${
            activeTab === 'essenciais' ? 'text-[#B45309] font-bold' : 'text-[#625B55]'
          }`}
        >
          <Star className={`w-5 h-5 ${activeTab === 'essenciais' ? 'fill-[#B45309]' : ''}`} />
          <span className="text-[10px]">Essenciais</span>
        </button>

        {/* 3. Center Floating Scan Action */}
        <button
          onClick={onOpenScan}
          className="w-12 h-12 -mt-4 rounded-2xl bg-[#2E7D5A] hover:bg-[#25684A] text-white border border-[#235F44] shadow-[2px_2px_0px_#1B4934] flex items-center justify-center transition active:translate-x-[1px] active:translate-y-[1px] active:shadow-none shrink-0"
          title="Escanear Nota Fiscal"
        >
          <QrCode className="w-5 h-5" />
        </button>

        {/* 4. Receitas */}
        <button
          onClick={() => onTabChange('receitas')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition min-w-[56px] min-h-[44px] justify-center relative ${
            activeTab === 'receitas' ? 'text-[#B45309] font-bold' : 'text-[#625B55]'
          }`}
        >
          <ChefHat className="w-5 h-5" />
          <span className="text-[10px]">Receitas</span>
        </button>

        {/* 5. Histórico */}
        <button
          onClick={() => onTabChange('historico')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition min-w-[56px] min-h-[44px] justify-center ${
            activeTab === 'historico' ? 'text-[#292524] font-bold' : 'text-[#625B55]'
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-[10px]">Histórico</span>
        </button>
      </nav>
    </>
  );
};
