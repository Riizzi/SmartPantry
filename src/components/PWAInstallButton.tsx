import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#FFFDF9] border border-[#E8DFD1] text-[#292524] shadow-[2px_2px_0px_#E5DCD0] hover:bg-[#FAF7F2] transition active:translate-x-[1px] active:translate-y-[1px] active:shadow-none min-h-[38px]"
        title="Instalar SmartPantry no celular/desktop"
      >
        <Download className="w-3.5 h-3.5 text-[#2E7D5A]" />
        <span className="font-ledger-mono text-[11px] font-bold">INSTALAR APP</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#FFFDF9] border border-[#E8DFD1] text-[#292524] shadow-[2px_2px_0px_#E5DCD0] hover:bg-[#FAF7F2] transition active:translate-x-[1px] active:translate-y-[1px] active:shadow-none min-h-[38px]"
          title="Instalar no iPhone"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#B45309]" />
          <span className="font-ledger-mono text-[11px] font-bold">INSTALAR IOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-[#FFFDF9] border border-[#E8DFD1] p-6 shadow-[3px_3px_0px_#E5DCD0] text-[#292524] relative">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 p-1 rounded-lg text-[#625B55] hover:text-[#292524] hover:bg-[#FAF7F2]"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E8DFD1] text-xl flex items-center justify-center">
                  🥑
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#292524]">Instalar SmartPantry</h3>
                  <p className="font-ledger-mono text-[11px] text-[#625B55]">Ficha de instalação iOS</p>
                </div>
              </div>

              <div className="space-y-3 my-4 text-xs text-[#44403C] bg-[#FAF7F2] p-4 rounded-xl border border-[#E8DFD1]">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded bg-[#292524] text-[#FFFDF9] font-ledger-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Toque no botão <strong>Compartilhar</strong> (ícone quadrado com a seta para cima) na barra do Safari.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded bg-[#292524] text-[#FFFDF9] font-ledger-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Role a lista para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded bg-[#292524] text-[#FFFDF9] font-ledger-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Pronto! O app abre em tela cheia e funciona offline na bancada da cozinha.
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-[#292524] hover:bg-[#1C1917] text-[#FFFDF9] font-ledger-mono text-xs font-bold transition active:translate-x-[1px] active:translate-y-[1px]"
              >
                ENTENDIDO
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
