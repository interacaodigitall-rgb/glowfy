import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Share, PlusSquare, X, Smartphone, CheckCircle, MoreVertical } from 'lucide-react';

interface PWAInstallBannerProps {
  appName?: string;
  appLogo?: string;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  appName = 'Glowfy Hub',
  appLogo = 'https://i.postimg.cc/j2DZ0wxr/glowfy-hub-logo.png',
}) => {
  const { isInstallable, isInstalled, isIOS, isDismissed, installPWA, dismissBanner } = usePWAInstall();
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);

  if (isInstalled || isDismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowInstructionsModal(true);
    } else {
      const installed = await installPWA();
      if (!installed) {
        setShowInstructionsModal(true);
      }
    }
  };

  return (
    <>
      {/* Discrete Bottom Floating Banner */}
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="bg-slate-900/95 backdrop-blur-md border border-[#e5a93b]/40 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between space-x-3 text-white">
          <div className="flex items-center space-x-3 min-w-0">
            <img
              src={appLogo}
              alt={appName}
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://i.postimg.cc/j2DZ0wxr/glowfy-hub-logo.png';
              }}
              className="w-11 h-11 rounded-xl object-contain bg-slate-950 border border-slate-800 p-1 flex-shrink-0"
            />
            <div className="min-w-0">
              <h4 className="font-bold text-xs text-white truncate">Instalar {appName}</h4>
              <p className="text-[10px] text-slate-300 truncate">Aceda mais rápido diretamente do seu ecrã inicial</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={handleInstallClick}
              className="bg-[#e5a93b] hover:bg-amber-400 text-slate-950 font-black text-xs px-3 py-2 rounded-xl transition-all shadow-md flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar App</span>
            </button>

            <button
              onClick={dismissBanner}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS & Android Step-by-Step Guidance Modal */}
      {showInstructionsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-5 shadow-2xl text-white animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <Smartphone className="w-5 h-5 text-[#e5a93b]" />
                <h3 className="font-bold text-sm">Como Instalar no Telemóvel</h3>
              </div>
              <button
                onClick={() => setShowInstructionsModal(false)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              /* iOS Safari Instructions */
              <div className="space-y-4 text-xs">
                <p className="text-slate-300">
                  Para instalar o aplicativo <strong className="text-white">{appName}</strong> no seu iPhone ou iPad:
                </p>

                <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-[#e5a93b]/20 text-[#e5a93b] font-bold flex items-center justify-center flex-shrink-0 text-xs">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-white flex items-center gap-1.5">
                        Toque no botão Partilhar <Share className="w-4 h-4 text-blue-400 inline" />
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Localizado na barra inferior do navegador Safari.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 border-t border-slate-800/80 pt-3">
                    <div className="w-6 h-6 rounded-full bg-[#e5a93b]/20 text-[#e5a93b] font-bold flex items-center justify-center flex-shrink-0 text-xs">
                      2
                    </div>
                    <div>
                      <p className="font-semibold text-white flex items-center gap-1.5">
                        Selecione "Adicionar ao Ecrã Principal" <PlusSquare className="w-4 h-4 text-amber-400 inline" />
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Deslize a lista de opções para baixo até encontrar.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 border-t border-slate-800/80 pt-3">
                    <div className="w-6 h-6 rounded-full bg-[#e5a93b]/20 text-[#e5a93b] font-bold flex items-center justify-center flex-shrink-0 text-xs">
                      3
                    </div>
                    <div>
                      <p className="font-semibold text-white">Toque em "Adicionar" no canto superior direito</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">O ícone será criado instantaneamente no seu ecrã.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Android / Chrome Manual Instructions */
              <div className="space-y-4 text-xs">
                <p className="text-slate-300">
                  Siga os passos abaixo para instalar o app <strong className="text-white">{appName}</strong> no seu Android:
                </p>

                <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-[#e5a93b]/20 text-[#e5a93b] font-bold flex items-center justify-center flex-shrink-0 text-xs">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-white flex items-center gap-1">
                        Abra o menu do navegador <MoreVertical className="w-4 h-4 text-[#e5a93b] inline" />
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Toque nos 3 pontos no canto superior direito.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 border-t border-slate-800/80 pt-3">
                    <div className="w-6 h-6 rounded-full bg-[#e5a93b]/20 text-[#e5a93b] font-bold flex items-center justify-center flex-shrink-0 text-xs">
                      2
                    </div>
                    <div>
                      <p className="font-semibold text-white">Selecione "Instalar aplicativo" ou "Adicionar ao ecrã principal"</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 border-t border-slate-800/80 pt-3">
                    <div className="w-6 h-6 rounded-full bg-[#e5a93b]/20 text-[#e5a93b] font-bold flex items-center justify-center flex-shrink-0 text-xs">
                      3
                    </div>
                    <div>
                      <p className="font-semibold text-white">Confirme a instalação</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">O ícone estará pronto para ser usado no seu telemóvel.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setShowInstructionsModal(false);
                dismissBanner();
              }}
              className="w-full bg-[#e5a93b] hover:bg-amber-400 text-slate-950 font-black text-xs py-3 rounded-2xl transition-all flex items-center justify-center space-x-2 shadow-lg"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Entendido</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
