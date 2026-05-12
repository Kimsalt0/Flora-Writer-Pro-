import React, { useState, useEffect } from 'react';
import { Download, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function InstallPWA({ manualTrigger, onManualClose }: { manualTrigger?: boolean, onManualClose?: () => void }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    // Check if in iframe
    setIsInIframe(window.self !== window.top);

    // Check if it is iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: any) => {
      console.log('beforeinstallprompt fired');
      e.preventDefault();
      setDeferredPrompt(e);
      if (!manualTrigger) setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Manual check for service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        console.log('Service Worker ready');
      });
    }

    if (manualTrigger) {
      setIsVisible(true);
    }

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsVisible(false);
    }

    // Attempt to focus or wake up SW
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          console.log('SW active');
        }
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [manualTrigger]);

  const handleClose = () => {
    setIsVisible(false);
    if (onManualClose) onManualClose();
  };

  const handleInstallClick = async () => {
    if (isInIframe) {
      window.open(window.location.href, '_blank');
      return;
    }

    if (isIOS) {
      alert("Sur iOS, appuyez sur le bouton 'Partager' (carré avec flèche) puis sur 'Sur l'écran d'accueil'.");
      return;
    }
    
    if (!deferredPrompt) {
      if (!isIOS) {
        window.location.reload();
      } else {
        alert("L'installation n'est pas encore prête. Essayez de rafraîchir la page ou d'attendre quelques secondes.");
      }
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    handleClose();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-6 right-6 md:left-auto md:right-10 md:w-80 z-[100]"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-emerald-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2">
              <button 
                onClick={handleClose}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase italic tracking-tighter text-zinc-900 dark:text-white">Installer Flora</h3>
                  <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">Utilisation hors connexion</p>
                </div>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                {isInIframe 
                  ? "Pour installer Flora, vous devez d'abord ouvrir l'application hors de l'aperçu."
                  : isIOS 
                    ? "Pour installer Flora sur votre iPhone, appuyez sur le bouton Partager puis 'Sur l'écran d'accueil'."
                    : "Téléchargez Flora sur votre téléphone pour écrire n'importe où, même sans internet."}
              </p>

              <button
                onClick={handleInstallClick}
                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95"
              >
                <Sparkles className="h-3 w-3" />
                {isInIframe ? "Ouvrir dans un nouvel onglet" : !deferredPrompt && !isIOS ? "Actualiser & Installer" : "Installer maintenant"}
              </button>

              {!isInIframe && !isIOS && !deferredPrompt && (
                <div className="flex flex-col gap-2 mt-2">
                  <p className="text-[8px] text-zinc-400 text-center uppercase tracking-widest font-bold">
                    Si l'installateur n'apparaît toujours pas :
                  </p>
                  <p className="text-[7px] text-zinc-500 text-center uppercase tracking-[0.1em] leading-relaxed">
                    1. Cliquez sur le bouton ci-dessus<br/>
                    2. Ou : Chrome Menu {'->'} "Installer l'application"<br/>
                    (Si vous voyez "Ajouter à l'écran d'accueil", l'app n'est pas encore prête)
                  </p>
                </div>
              )}
            </div>
            
            <div className="absolute -bottom-4 -right-4 h-20 w-20 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
