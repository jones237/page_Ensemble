// src/components/PWAPrompt.tsx
// Bannière d'installation PWA + bouton de mise à jour
import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Download, RefreshCw, X } from 'lucide-react';

// ── Bouton mise à jour (nouvelle version disponible) ──────────────────────────
export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      // Vérifier les mises à jour toutes les heures
      setInterval(() => r?.update(), 60 * 60 * 1000);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-3 sm:left-6 right-3 sm:right-auto sm:w-80 z-50 animate-slide-up">
      <div className="bg-white border border-blue-200 rounded-xl shadow-xl p-4 flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
          <RefreshCw className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">Mise à jour disponible</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Une nouvelle version de PageEnsemble est prête.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => updateServiceWorker(true)}
              className="flex-1 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              Mettre à jour
            </button>
            <button
              onClick={() => setNeedRefresh(false)}
              className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition"
            >
              Plus tard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Bannière d'installation PWA ───────────────────────────────────────────────
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallBanner() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed]       = useState(false);
  const [installed, setInstalled]       = useState(false);

  useEffect(() => {
    // Déjà installée ?
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    // Déjà ignorée par l'utilisateur ?
    if (localStorage.getItem('pwa_install_dismissed')) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setInstallEvent(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa_install_dismissed', '1');
    setDismissed(true);
  };

  if (installed || dismissed || !installEvent) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-3 sm:left-6 right-3 sm:right-auto sm:w-80 z-50 animate-slide-up">
      <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-4 flex items-start gap-3">
        {/* Icône app */}
        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-gray-100">
          <img src="/icon-192.png" alt="PageEnsemble" className="w-full h-full object-cover" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">Installer PageEnsemble</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-snug">
            Accédez à l'app depuis votre écran d'accueil, même hors ligne.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              <Download className="h-3.5 w-3.5" />
              Installer
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 border border-gray-200 text-gray-500 text-xs rounded-lg hover:bg-gray-50 transition"
            >
              Non merci
            </button>
          </div>
        </div>

        <button onClick={handleDismiss} className="text-gray-300 hover:text-gray-500 shrink-0 -mt-1">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
