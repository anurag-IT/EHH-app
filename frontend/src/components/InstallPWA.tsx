import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const InstallPWA: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallVisible, setIsInstallVisible] = useState(false);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstallVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
    setIsInstallVisible(false);
  };

  const closeUpdate = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <>
      <AnimatePresence>
        {isInstallVisible && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[110] w-[90%] max-w-md"
          >
            <div className="bg-slate-900/95 backdrop-blur-2xl border border-slate-700/50 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Download className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">Install EHH App</h3>
                  <p className="text-slate-400 text-[10px] uppercase tracking-wider">Fast, offline, tracking</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleInstallClick}
                  className="px-4 py-2 bg-white text-slate-900 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-colors"
                >
                  Install
                </button>
                <button
                  onClick={() => setIsInstallVisible(false)}
                  className="p-2 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {(offlineReady || needRefresh) && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 right-6 z-[120] max-w-sm"
          >
            <div className="bg-indigo-600 p-4 rounded-2xl shadow-2xl text-white flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <RefreshCw className={`w-5 h-5 ${needRefresh ? 'animate-spin' : ''}`} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">
                      {offlineReady ? 'App Ready Offline' : 'Update Available'}
                    </h4>
                    <p className="text-[10px] opacity-80 uppercase tracking-widest mt-0.5">
                      {offlineReady 
                        ? 'App is cached and ready for offline use.' 
                        : 'A new version is available. Content has updated.'}
                    </p>
                  </div>
                </div>
                <button onClick={closeUpdate} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {needRefresh && (
                <button
                  onClick={() => updateServiceWorker(true)}
                  className="w-full py-2 bg-white text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors shadow-lg"
                >
                  Update Now
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default InstallPWA;
