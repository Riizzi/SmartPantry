/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { PantryView } from './components/PantryView';
import { RecipeSuggestions } from './components/RecipeSuggestions';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { EssentialsAndShoppingView } from './components/EssentialsAndShoppingView';
import { ItemSheet } from './components/ItemSheet';
import { ScanReceiptModal } from './components/ScanReceiptModal';
import { ReviewReceiptModal } from './components/ReviewReceiptModal';
import { AddManualItemModal } from './components/AddManualItemModal';
import { Toast, ToastMessage } from './components/Toast';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PantryStore, subscribeToPantry } from './services/storage';
import { ItemDespensa } from './types/pantry';
import { NfceParseResult, NormalizedItem } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('despensa');
  const [itemsDespensa, setItemsDespensa] = useState<ItemDespensa[]>(() =>
    PantryStore.getItemsDespensa()
  );

  // Selected item for bottom sheet
  const [selectedItem, setSelectedItem] = useState<ItemDespensa | null>(null);

  // Modals state
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isAddManualOpen, setIsAddManualOpen] = useState(false);

  // Review modal after scan
  const [reviewReceiptData, setReviewReceiptData] = useState<NfceParseResult | null>(null);
  const [reviewNormalizedItems, setReviewNormalizedItems] = useState<NormalizedItem[]>([]);
  const [reviewFonte, setReviewFonte] = useState<'qr' | 'foto' | 'chave'>('qr');

  // Toast state
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Refresh reactive pantry items when store updates
  const [faltantesCount, setFaltantesCount] = useState<number>(() => {
    return PantryStore.getEssenciaisComStatus().filter(e => e.emFalta).length;
  });

  const refreshPantry = useCallback(() => {
    setItemsDespensa(PantryStore.getItemsDespensa());
    setFaltantesCount(PantryStore.getEssenciaisComStatus().filter(e => e.emFalta).length);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToPantry(refreshPantry);
    return () => unsubscribe();
  }, [refreshPantry]);

  // Keep selected item updated if still active
  useEffect(() => {
    if (selectedItem) {
      const updated = itemsDespensa.find(i => i.produto.id === selectedItem.produto.id);
      if (updated) {
        setSelectedItem(updated);
      } else {
        setSelectedItem(null);
      }
    }
  }, [itemsDespensa]);

  // Trigger Toast with Undo
  const triggerUndoToast = (description: string, movimentoIds: string[]) => {
    setToast({
      id: String(Date.now()),
      text: description,
      actionText: 'Desfazer',
      onAction: () => {
        PantryStore.desfazerMovimentos(movimentoIds);
        setToast({
          id: String(Date.now()),
          text: 'Ação desfeita com sucesso!',
        });
      },
    });
  };

  const showNotification = (msg: string) => {
    setToast({
      id: String(Date.now()),
      text: msg,
    });
  };

  // Callback when scanner completes and sends items for review
  const handleReceiptParsed = (
    receipt: NfceParseResult,
    normalized: NormalizedItem[],
    fonte: 'qr' | 'foto' | 'chave' = 'qr'
  ) => {
    setReviewReceiptData(receipt);
    setReviewNormalizedItems(normalized);
    setReviewFonte(fonte);
  };

  const handleReviewSuccess = (count: number) => {
    showNotification(`Nota cadastrada! ${count} lotes adicionados à despensa.`);
    setActiveTab('despensa');
  };

  const urgentCount = itemsDespensa.filter(
    it => it.diasAteVencer >= 0 && it.diasAteVencer <= 3
  ).length;

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#292524] pb-24 md:pb-12 flex flex-col font-sans">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenScan={() => setIsScanOpen(true)}
        urgentCount={urgentCount}
        faltantesCount={faltantesCount}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6">
        {activeTab === 'despensa' && (
          <PantryView
            items={itemsDespensa}
            onSelectItem={item => setSelectedItem(item)}
            onOpenScan={() => setIsScanOpen(true)}
            onOpenAddManual={() => setIsAddManualOpen(true)}
            onConsumed={(desc, ids) => triggerUndoToast(desc, ids)}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'essenciais' && (
          <EssentialsAndShoppingView
            onNotify={showNotification}
          />
        )}

        {activeTab === 'receitas' && (
          <RecipeSuggestions
            itemsDespensa={itemsDespensa}
            onCooked={(desc, ids) => triggerUndoToast(desc, ids)}
            onOpenScan={() => setIsScanOpen(true)}
            onOpenAddManual={() => setIsAddManualOpen(true)}
          />
        )}

        {activeTab === 'historico' && (
          <HistoryView
            onUndo={desc => showNotification(desc)}
          />
        )}

        {activeTab === 'ajustes' && (
          <SettingsView
            onNotify={msg => showNotification(msg)}
          />
        )}
      </main>

      {/* Item Consumption Bottom Sheet */}
      <ItemSheet
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onConsumed={(desc, ids) => triggerUndoToast(desc, ids)}
      />

      {/* Scan Receipt Modal */}
      <ScanReceiptModal
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        onReceiptParsed={handleReceiptParsed}
        onOpenAddManual={() => setIsAddManualOpen(true)}
      />

      {/* Review Receipt Modal */}
      {reviewReceiptData && (
        <ReviewReceiptModal
          key={reviewReceiptData.chaveAcesso}
          receiptData={reviewReceiptData}
          normalizedItems={reviewNormalizedItems}
          fonte={reviewFonte}
          onClose={() => setReviewReceiptData(null)}
          onSuccess={handleReviewSuccess}
        />
      )}

      {/* Manual Item Add Modal (Plano B) */}
      <AddManualItemModal
        isOpen={isAddManualOpen}
        onClose={() => setIsAddManualOpen(false)}
        onItemAdded={name => showNotification(`"${name}" adicionado à despensa!`)}
      />

      {/* Floating Undo Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Offline Mode Indicator */}
      <OfflineIndicator />
    </div>
  );
}
