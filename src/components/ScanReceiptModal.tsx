import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Camera,
  QrCode,
  Upload,
  Keyboard,
  Sparkles,
  Loader2,
  AlertTriangle,
  RotateCcw,
  PlusCircle,
  HelpCircle,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { ApiService, NfceParseResult, NormalizedItem } from '../services/api';

interface ScanReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReceiptParsed: (
    receiptData: NfceParseResult,
    normalizedItems: NormalizedItem[],
    fonte: 'qr' | 'foto' | 'chave'
  ) => void;
  onOpenAddManual?: () => void;
}

export const ScanReceiptModal: React.FC<ScanReceiptModalProps> = ({
  isOpen,
  onClose,
  onReceiptParsed,
  onOpenAddManual,
}) => {
  const [activeTab, setActiveTab] = useState<'qr' | 'foto' | 'manual'>('qr');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [cameraStarting, setCameraStarting] = useState(false);

  // Fallback state when SEFAZ portal is unavailable (HTTP 422)
  const [sefazUnavailable, setSefazUnavailable] = useState<{
    chave?: string;
    qrUrl?: string;
    origin?: 'qr' | 'foto' | 'chave';
  } | null>(null);

  // Manual inputs
  const [chaveInput, setChaveInput] = useState('');
  const [urlInput, setUrlInput] = useState('');

  // Scanner refs
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isStartingRef = useRef(false);
  const processingRef = useRef(false);
  const scannerContainerId = 'qr-reader-container';

  // Stop scanner safely
  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Error clearing scanner instance:', e);
      } finally {
        html5QrCodeRef.current = null;
        isStartingRef.current = false;
        setCameraStarting(false);
      }
    }
  }, []);

  // Process receipt data from SEFAZ or OCR
  const processReceiptData = async (
    payload: { qrUrl?: string; chaveAcesso?: string },
    origin: 'qr' | 'foto' | 'chave'
  ) => {
    setLoading(true);
    setLoadingStep('Consultando dados da nota fiscal na SEFAZ...');
    setError(null);
    setSefazUnavailable(null);

    try {
      const parsed = await ApiService.parseNfce(payload);
      if (!parsed.items || parsed.items.length === 0) {
        throw new Error('Nenhum produto foi encontrado nesta nota fiscal.');
      }

      setLoadingStep('IA normalizando nomes ("LEITE UHT" → "Leite Integral")...');
      const normalized = await ApiService.normalizeProducts(parsed.items);

      onReceiptParsed(parsed, normalized, origin);
      onClose();
    } catch (err: any) {
      console.error('Error processing receipt:', err);
      // Check if SEFAZ was blocked or unavailable (HTTP 422)
      if (err?.code === 'SEFAZ_INDISPONIVEL' || err?.message?.includes('SEFAZ_INDISPONIVEL')) {
        setSefazUnavailable({
          chave: payload.chaveAcesso,
          qrUrl: payload.qrUrl,
          origin,
        });
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao processar nota fiscal.');
      }
    } finally {
      setLoading(false);
      setLoadingStep('');
      processingRef.current = false;
    }
  };

  // Start QR scanner with robust camera detection
  const startScanner = useCallback(async () => {
    if (!isOpen || activeTab !== 'qr' || loading || isStartingRef.current) return;

    // Check DOM container presence
    const container = document.getElementById(scannerContainerId);
    if (!container) return;

    isStartingRef.current = true;
    setCameraStarting(true);
    setError(null);

    try {
      await stopScanner();

      const scanner = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        verbose: false,
      });
      html5QrCodeRef.current = scanner;

      const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const qrboxSize = Math.max(200, Math.floor(minEdge * 0.7));
        return { width: qrboxSize, height: qrboxSize };
      };

      const config = {
        fps: 10,
        qrbox: qrboxFunction,
      };

      const onScanSuccess = async (decodedText: string) => {
        if (processingRef.current) return;
        processingRef.current = true;
        try {
          await stopScanner();
        } catch {}
        processReceiptData({ qrUrl: decodedText, chaveAcesso: decodedText }, 'qr');
      };

      // Try environment camera first
      try {
        await scanner.start({ facingMode: 'environment' }, config, onScanSuccess, () => {});
      } catch (envErr: any) {
        const name = envErr?.name || '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          throw envErr;
        }

        // Try getting cameras explicitly
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          throw new Error('NotFoundError');
        }
        // Use last camera (typically back camera on mobile)
        const lastCamera = cameras[cameras.length - 1];
        await scanner.start(lastCamera.id, config, onScanSuccess, () => {});
      }
    } catch (err: any) {
      console.error('Failed to start scanner:', err);
      await stopScanner();
      const errStr = String(err?.name || err?.message || err);
      if (errStr.includes('NotAllowed') || errStr.includes('Permission')) {
        setError('Permissão da câmera negada. Libere a câmera nas configurações do navegador.');
      } else if (errStr.includes('NotFound') || errStr.includes('DevicesNotFoundError')) {
        setError('Nenhuma câmera encontrada no dispositivo.');
      } else if (typeof window !== 'undefined' && (!window.isSecureContext || window.self !== window.top)) {
        setError('A câmera pode estar bloqueada nesta visualização. Abra o app em uma aba própria/pelo link publicado.');
      } else {
        setError('Não foi possível iniciar a câmera. Tente novamente ou use a foto do cupom.');
      }
    } finally {
      setCameraStarting(false);
      isStartingRef.current = false;
    }
  }, [isOpen, activeTab, loading, stopScanner]);

  // Lifecycle control: mount/unmount and tab change
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isOpen && activeTab === 'qr' && !loading && !error && !sefazUnavailable) {
      timer = setTimeout(() => {
        startScanner();
      }, 250);
    } else {
      stopScanner();
    }

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen, activeTab, loading, error, sefazUnavailable, startScanner, stopScanner]);

  // Photo upload handler with QR detection fallback before Gemini OCR
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setLoadingStep('Analisando imagem...');
    setError(null);
    setSefazUnavailable(null);

    try {
      // 1. First attempt: decode QR code directly from the image file
      let detectedQrText: string | null = null;
      try {
        const fileScanner = new Html5Qrcode('hidden-qr-detector');
        detectedQrText = await fileScanner.scanFile(file, false);
        fileScanner.clear();
      } catch {
        // No QR detected in image file, proceeding to visual OCR
      }

      if (detectedQrText) {
        setLoadingStep('QR Code detectado na foto! Consultando SEFAZ...');
        await processReceiptData({ qrUrl: detectedQrText, chaveAcesso: detectedQrText }, 'foto');
        return;
      }

      // 2. If no QR was found in the image, perform multimodal OCR with Gemini Flash
      setLoadingStep('Lendo texto e produtos da foto com IA...');
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Str = reader.result as string;
          const ocrResult = await ApiService.ocrReceipt(base64Str, file.type || 'image/jpeg');

          if (!ocrResult.items || ocrResult.items.length === 0) {
            throw new Error('Não identificamos os produtos nesta imagem. Tente uma foto mais nítida e bem iluminada.');
          }

          setLoadingStep('Normalizando produtos e validade...');
          const normalized = await ApiService.normalizeProducts(ocrResult.items);

          onReceiptParsed(ocrResult, normalized, 'foto');
          onClose();
        } catch (ocrErr) {
          setError(ocrErr instanceof Error ? ocrErr.message : 'Falha na leitura visual da nota.');
        } finally {
          setLoading(false);
          setLoadingStep('');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar imagem.');
      setLoading(false);
      setLoadingStep('');
    }
  };

  // Demo receipt generator for instant testing
  const handleUseDemoReceipt = async () => {
    setLoading(true);
    setLoadingStep('Simulando leitura de cupom fiscal...');
    setError(null);
    setSefazUnavailable(null);

    try {
      const demoItems = [
        { nomeBruto: 'LEITE UHT INT ITALAC 1L', quantidade: 3, unidade: 'l', precoUnitario: 5.29, precoTotal: 15.87 },
        { nomeBruto: 'QUEIJO PRATO FAT KG', quantidade: 0.35, unidade: 'kg', precoUnitario: 48.90, precoTotal: 17.11 },
        { nomeBruto: 'PEITO DE FRANGO CONG KG', quantidade: 1.2, unidade: 'kg', precoUnitario: 19.90, precoTotal: 23.88 },
        { nomeBruto: 'TOMATE ITALIANO KG', quantidade: 0.95, unidade: 'kg', precoUnitario: 9.80, precoTotal: 9.31 },
        { nomeBruto: 'CEBOLA NACIONAL KG', quantidade: 0.6, unidade: 'kg', precoUnitario: 6.50, precoTotal: 3.90 },
        { nomeBruto: 'ARROZ BRANCO T1 CAMIL 1KG', quantidade: 2, unidade: 'un', precoUnitario: 6.99, precoTotal: 13.98 },
        { nomeBruto: 'SACOLA PLASTICA BIOD', quantidade: 2, unidade: 'un', precoUnitario: 0.15, precoTotal: 0.30 },
      ];

      setLoadingStep('IA normalizando nomes brutos e categorias...');
      const normalized = await ApiService.normalizeProducts(demoItems);

      const demoReceipt: NfceParseResult = {
        success: true,
        chaveAcesso: `3524090000000000010065001000${Math.floor(100000000 + Math.random() * 900000000)}1234`,
        uf: 'SP',
        emitenteNome: 'Supermercado Carrefour Express',
        emitenteCnpj: '45.543.915/0001-81',
        dataEmissao: new Date().toISOString(),
        total: 84.35,
        itemsCount: demoItems.length,
        items: demoItems,
      };

      onReceiptParsed(demoReceipt, normalized, 'qr');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao processar nota.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      {/* Hidden element for single-file QR decoding */}
      <div id="hidden-qr-detector" className="hidden" aria-hidden="true" />

      {/* Global style override to ensure injected video in html5-qrcode fills container properly */}
      <style>{`
        #qr-reader-container video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
          border-radius: 1rem;
        }
        #qr-reader-container {
          border: none !important;
        }
        #qr-reader-container__scan_region {
          border-radius: 1rem;
          overflow: hidden;
        }
      `}</style>

      <div
        className="w-full max-w-lg bg-[#FFFDF9] rounded-2xl border border-[#E8DFD1] shadow-[3px_3px_0px_#E5DCD0] text-[#292524] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E8DFD1] bg-[#FAF7F2]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFFDF9] border border-[#E8DFD1] text-[#2E7D5A] flex items-center justify-center shadow-[1.5px_1.5px_0px_#E5DCD0]">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#292524] leading-tight">Cadastrar Nota Fiscal</h3>
              <p className="font-ledger-mono text-[11px] text-[#625B55]">Importação automática de compras</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-lg border border-[#E8DFD1] bg-[#FFFDF9] text-[#625B55] hover:text-[#292524] transition active:translate-x-[0.5px] active:translate-y-[0.5px] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Archival Tabs */}
        <div className="grid grid-cols-3 p-2 bg-[#FAF7F2] border-b border-[#E8DFD1] text-xs font-semibold gap-1.5">
          <button
            onClick={() => {
              setError(null);
              setSefazUnavailable(null);
              setActiveTab('qr');
            }}
            className={`py-2 px-3 rounded-lg border flex items-center justify-center gap-1.5 transition font-ledger-mono text-xs cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-[#FFFDF9] text-[#292524] border-[#E8DFD1] shadow-[1.5px_1.5px_0px_#E5DCD0] font-bold'
                : 'border-transparent text-[#625B55] hover:text-[#292524]'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-[#2E7D5A]" />
            <span>CÂMERA QR</span>
          </button>
          <button
            onClick={() => {
              setError(null);
              setSefazUnavailable(null);
              setActiveTab('foto');
            }}
            className={`py-2 px-3 rounded-lg border flex items-center justify-center gap-1.5 transition font-ledger-mono text-xs cursor-pointer ${
              activeTab === 'foto'
                ? 'bg-[#FFFDF9] text-[#292524] border-[#E8DFD1] shadow-[1.5px_1.5px_0px_#E5DCD0] font-bold'
                : 'border-transparent text-[#625B55] hover:text-[#292524]'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-[#B45309]" />
            <span>FOTO CUPOM</span>
          </button>
          <button
            onClick={() => {
              setError(null);
              setSefazUnavailable(null);
              setActiveTab('manual');
            }}
            className={`py-2 px-3 rounded-lg border flex items-center justify-center gap-1.5 transition font-ledger-mono text-xs cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-[#FFFDF9] text-[#292524] border-[#E8DFD1] shadow-[1.5px_1.5px_0px_#E5DCD0] font-bold'
                : 'border-transparent text-[#625B55] hover:text-[#292524]'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5 text-[#625B55]" />
            <span>CHAVE 44D</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Friendly SEFAZ 422 Card with 3 Big Buttons */}
          {sefazUnavailable && (
            <div className="mb-4 p-5 rounded-2xl bg-[#FFFDF9] border-2 border-[#B45309] shadow-[2px_2px_0px_#B45309] text-[#292524] space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FEF3C7] text-[#B45309] border border-[#B45309] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#292524]">
                    Portal da SEFAZ Temporariamente Indisponível
                  </h4>
                  <p className="text-xs text-[#625B55] mt-1 leading-relaxed">
                    Não conseguimos acessar os itens automaticamente no portal da receita estadual agora. Como prefere lançar?
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1 font-ledger-mono">
                <button
                  onClick={() => {
                    setSefazUnavailable(null);
                    setError(null);
                    setActiveTab('foto');
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-[#2E7D5A] hover:bg-[#25684A] text-white text-xs font-bold border border-[#235F44] shadow-[1.5px_1.5px_0px_#1B4934] transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>FOTOGRAFAR O CUPOM (IA LÊ OS ITENS)</span>
                </button>

                {onOpenAddManual && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenAddManual();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#FFFDF9] hover:bg-[#FAF7F2] text-[#292524] text-xs font-bold border border-[#E8DFD1] shadow-[1.5px_1.5px_0px_#E5DCD0] transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 text-[#2E7D5A]" />
                    <span>ADICIONAR ITENS MANUALMENTE</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    const saved = sefazUnavailable;
                    setSefazUnavailable(null);
                    if (saved.chave || saved.qrUrl) {
                      processReceiptData({ chaveAcesso: saved.chave, qrUrl: saved.qrUrl }, saved.origin || 'qr');
                    } else {
                      startScanner();
                    }
                  }}
                  className="w-full py-2 px-3 text-xs text-[#625B55] hover:text-[#292524] flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Tentar de novo</span>
                </button>
              </div>
            </div>
          )}

          {/* General Error Notice with Retry and Shortcuts */}
          {error && !sefazUnavailable && (
            <div className="mb-4 p-4 rounded-2xl bg-[#FBF0ED] border border-[#C2543B] text-[#C2543B] text-xs font-ledger-mono space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">
                  <strong>AVISO:</strong> {error}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    setError(null);
                    startScanner();
                  }}
                  className="py-1.5 px-3 rounded-lg bg-[#FFFDF9] border border-[#C2543B] text-[#C2543B] hover:bg-[#FAF7F2] font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Tentar novamente</span>
                </button>
                <button
                  onClick={() => {
                    setError(null);
                    setActiveTab('foto');
                  }}
                  className="py-1.5 px-3 rounded-lg bg-[#FFFDF9] border border-[#E8DFD1] text-[#292524] hover:bg-[#FAF7F2] transition flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[#B45309]" />
                  <span>Foto do cupom</span>
                </button>
                <button
                  onClick={() => {
                    setError(null);
                    setActiveTab('manual');
                  }}
                  className="py-1.5 px-3 rounded-lg bg-[#FFFDF9] border border-[#E8DFD1] text-[#292524] hover:bg-[#FAF7F2] transition flex items-center gap-1 cursor-pointer"
                >
                  <Keyboard className="w-3.5 h-3.5 text-[#625B55]" />
                  <span>Chave 44 dígitos</span>
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#FAF7F2] border border-[#E8DFD1] text-[#2E7D5A] flex items-center justify-center mb-4 animate-spin">
                <Loader2 className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-[#292524] mb-1">Processando Cupom Fiscal</h4>
              <p className="font-ledger-mono text-xs text-[#625B55] max-w-xs">{loadingStep}</p>
            </div>
          ) : (
            <>
              {activeTab === 'qr' && !sefazUnavailable && (
                <div className="flex flex-col items-center">
                  {/* Viewfinder Container: strictly EMPTY div without React children */}
                  <div className="relative w-full max-w-[320px] aspect-square rounded-2xl overflow-hidden border-2 border-[#E8DFD1] shadow-inner bg-[#292524] flex items-center justify-center">
                    <div id={scannerContainerId} className="w-full h-full" />

                    {/* Sibling absolute overlays for camera starting or feedback */}
                    {cameraStarting && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#292524]/80 text-[#FFFDF9] text-xs font-ledger-mono gap-2 pointer-events-none z-10">
                        <Loader2 className="w-6 h-6 animate-spin text-[#2E7D5A]" />
                        <span>Iniciando câmera...</span>
                      </div>
                    )}
                  </div>

                  <p className="font-ledger-mono text-xs text-[#625B55] text-center mt-4 max-w-xs">
                    Aponte para o QR Code impresso no cupom da NFC-e. A leitura é automática.
                  </p>
                </div>
              )}

              {activeTab === 'foto' && !sefazUnavailable && (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <label className="w-full border-2 border-dashed border-[#E8DFD1] hover:border-[#2E7D5A] bg-[#FAF7F2] rounded-2xl p-8 cursor-pointer transition flex flex-col items-center justify-center group">
                    <div className="w-12 h-12 rounded-xl bg-[#FFFDF9] border border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0] flex items-center justify-center text-[#2E7D5A] mb-3 transition group-hover:scale-105">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-[#292524]">
                      Carregar foto ou print do cupom
                    </span>
                    <span className="font-ledger-mono text-xs text-[#625B55] mt-1 max-w-xs">
                      Se a imagem tiver um QR Code visível, leremos pela SEFAZ. Se não, a IA transcreverá os itens da foto.
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {activeTab === 'manual' && !sefazUnavailable && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-ledger-mono font-bold text-[#625B55] uppercase tracking-wider mb-1.5">
                      Chave de Acesso (44 dígitos)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 35240958123456000192650010001234561001234567"
                      value={chaveInput}
                      onChange={e => setChaveInput(e.target.value.replace(/\D/g, '').substring(0, 44))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0] focus:border-[#625B55] outline-none text-xs font-ledger-mono tracking-wide"
                    />
                    <p className="font-ledger-mono text-[11px] text-[#625B55] mt-1">
                      {chaveInput.length} de 44 dígitos
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-ledger-mono font-bold text-[#625B55] uppercase tracking-wider mb-1.5">
                      Ou URL do QR Code da SEFAZ
                    </label>
                    <input
                      type="url"
                      placeholder="https://www.nfce.fazenda.sp.gov.br/..."
                      value={urlInput}
                      onChange={e => setUrlInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#E8DFD1] shadow-[2px_2px_0px_#E5DCD0] focus:border-[#625B55] outline-none text-xs"
                    />
                  </div>

                  <button
                    onClick={() => processReceiptData({ chaveAcesso: chaveInput, qrUrl: urlInput }, 'chave')}
                    disabled={!chaveInput && !urlInput}
                    className="w-full py-3 rounded-xl bg-[#2E7D5A] hover:bg-[#25684A] text-white font-ledger-mono text-xs font-bold border border-[#235F44] shadow-[2px_2px_0px_#1B4934] transition active:translate-x-[1px] active:translate-y-[1px] active:shadow-none min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    CONSULTAR SEFAZ
                  </button>
                </div>
              )}
            </>
          )}

          {/* Demo Button: Vintage Archive Sample */}
          <div className="mt-6 pt-5 border-t border-[#E8DFD1]">
            <button
              onClick={handleUseDemoReceipt}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl border border-[#E8DFD1] bg-[#FAF7F2] hover:bg-[#F5EFE6] text-[#292524] text-xs font-semibold shadow-[1.5px_1.5px_0px_#E5DCD0] transition active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none flex items-center justify-center gap-2 min-h-[42px] cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#B45309]" />
              <span className="font-ledger-mono text-[11px]">TESTAR COM CUPOM DE AMOSTRA</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
