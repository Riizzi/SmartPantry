import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl bg-[#FFFDF9] text-[#292524] px-3.5 py-2 text-xs font-ledger-mono shadow-[2px_2px_0px_#E5DCD0] border border-[#E8DFD1]">
      <span className="w-2 h-2 rounded-full bg-[#B45309] animate-pulse shrink-0" />
      <WifiOff className="w-3.5 h-3.5 text-[#B45309]" />
      <span>[MODO ANALÓGICO OFFLINE &bull; GRAVADO LOCAL]</span>
    </div>
  );
};
