// src/hooks/useToast.tsx
import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'destructive' | 'default';

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'bg-white border-green-200',
  destructive: 'bg-white border-red-200',
  default: 'bg-white border-gray-200',
};

const VARIANT_ICON: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />,
  destructive: <XCircle className="h-5 w-5 text-red-600 shrink-0" />,
  default: <Info className="h-5 w-5 text-blue-600 shrink-0" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const variant = options.variant ?? 'default';
      const duration = options.duration ?? (variant === 'destructive' ? 6000 : 4000);
      setToasts((prev) => [...prev, { ...options, id, variant }]);
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Conteneur : en haut sur mobile (sous la navbar), en bas à droite sur desktop */}
      <div className="fixed z-[100] top-16 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm sm:left-auto sm:right-4 sm:translate-x-0 sm:bottom-4 sm:top-auto flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={`flex items-start gap-3 border rounded-lg shadow-lg px-4 py-3 animate-in fade-in slide-in-from-top-2 sm:slide-in-from-bottom-2 ${
              VARIANT_STYLES[t.variant ?? 'default']
            }`}
          >
            {VARIANT_ICON[t.variant ?? 'default']}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">{t.title}</p>
              {t.description && (
                <p className="text-xs text-gray-600 mt-0.5 break-words">{t.description}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-gray-400 hover:text-gray-600 shrink-0"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast doit être utilisé à l\'intérieur de <ToastProvider>');
  return ctx;
}

// Convertit une erreur JS quelconque en un message affichable — évite de
// dupliquer `err instanceof Error ? err.message : '...'` partout.
export function errorMessage(err: unknown, fallback = 'Une erreur est survenue'): string {
  return err instanceof Error ? err.message : fallback;
}
