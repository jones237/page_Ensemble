// src/components/PDFReader.tsx
import { safeHttpsUrl } from '../lib/safeUrl';
import { useState, useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X, Loader2, BookOpen } from 'lucide-react';
import { useSaveProgress } from '../hooks/useDigitalBooks';

interface PDFReaderProps {
  url: string; bookId: string; userId: string;
  bookTitle: string; initialPage?: number; onClose: () => void;
}

export function PDFReader({ url, bookId, userId, bookTitle, initialPage = 1, onClose }: PDFReaderProps) {
  const [pageNumber, setPageNumber] = useState(initialPage);
  const [scale,      setScale]      = useState(1.0);
  const contentRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);

  // Adapter la page PDF à la largeur de l'écran (mobile → desktop)
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const update = () => setContainerW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const pageWidth = Math.max(240, Math.min(containerW - 32, 900)) * scale;
  const [numPages,   setNumPages]   = useState(0);
  const [inputPage,  setInputPage]  = useState(String(initialPage));
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(false);
  const saveProgress = useSaveProgress();

  // Charger dynamiquement react-pdf pour éviter les erreurs SSR
  const [PDFComponents, setPDFComponents] = useState<{ Document: React.ComponentType<Record<string, unknown>>; Page: React.ComponentType<Record<string, unknown>> } | null>(null);

  useEffect(() => {
    import('react-pdf').then(mod => {
      // Worker servi depuis notre propre domaine (la CSP bloque unpkg.com,
      // et pdfjs-dist ≥ 4 n'a plus de pdf.worker.min.js : c'est un .mjs)
      mod.pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString();
      setPDFComponents({ Document: mod.Document as React.ComponentType<Record<string, unknown>>, Page: mod.Page as React.ComponentType<Record<string, unknown>> });
    }).catch(() => setError(true));
  }, []);

  // book_access.book_id est un UUID : les livres externes (Gutenberg, id numérique) n'ont pas de suivi
  const canSaveProgress = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookId);
  useEffect(() => {
    if (!canSaveProgress) return;
    const t = setInterval(() => {
      saveProgress.mutate({ book_id: bookId, user_id: userId, pages_read: pageNumber });
    }, 30_000);
    return () => clearInterval(t);
  }, [pageNumber, bookId, userId]);

  const handleClose = () => {
    if (canSaveProgress) saveProgress.mutate({ book_id: bookId, user_id: userId, pages_read: pageNumber });
    onClose();
  };

  const goTo = useCallback((p: number) => {
    const clamped = Math.min(Math.max(1, p), numPages || 999);
    setPageNumber(clamped);
    setInputPage(String(clamped));
  }, [numPages]);

  const progress = numPages > 0 ? Math.round((pageNumber / numPages) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-gray-950 z-[100] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="h-5 w-5 text-blue-400 shrink-0" />
          <p className="text-white font-semibold text-sm truncate max-w-[180px] sm:max-w-sm">{bookTitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => goTo(pageNumber - 1)} disabled={pageNumber <= 1}
            className="p-1.5 text-gray-500 hover:text-white disabled:opacity-30">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-1 text-sm text-gray-300">
            <input type="number" value={inputPage} min={1} max={numPages || 999}
              onChange={e => setInputPage(e.target.value)}
              onBlur={() => goTo(parseInt(inputPage) || 1)}
              onKeyDown={e => e.key === 'Enter' && goTo(parseInt(inputPage) || 1)}
              className="w-12 text-center bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-white text-sm focus:outline-none focus:border-blue-500"
            />
            {numPages > 0 && <span className="text-gray-500">/ {numPages}</span>}
          </div>
          <button onClick={() => goTo(pageNumber + 1)} disabled={numPages > 0 && pageNumber >= numPages}
            className="p-1.5 text-gray-500 hover:text-white disabled:opacity-30">
            <ChevronRight className="h-5 w-5" />
          </button>
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-1.5 text-gray-500 hover:text-white hidden sm:block">
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs text-gray-500 hidden sm:block">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(2.5, s + 0.2))} className="p-1.5 text-gray-500 hover:text-white hidden sm:block">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button onClick={handleClose} aria-label="Fermer le lecteur" className="p-1.5 text-gray-500 hover:text-red-400 ml-2">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-800 shrink-0">
        <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Content */}
      <div ref={contentRef} className="flex-1 overflow-auto flex items-start justify-center py-4 sm:py-6 px-4 bg-gray-950">
        {error ? (
          <div className="text-center py-16">
            <p className="text-red-400 mb-4">Impossible de charger le PDF.</p>
            <a href={safeHttpsUrl(url) ?? '#'} target="_blank" rel="noopener noreferrer"
              className="text-blue-400 underline text-sm">Ouvrir dans un nouvel onglet</a>
          </div>
        ) : !PDFComponents ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
            <p className="text-gray-500 text-sm">Chargement du lecteur…</p>
          </div>
        ) : (
          <PDFComponents.Document
            file={url}
            onLoadSuccess={({ numPages }: { numPages: number }) => { setNumPages(numPages); setLoading(false); }}
            onLoadError={() => setError(true)}
            loading={<div className="flex items-center gap-2 text-gray-500 py-16"><Loader2 className="h-6 w-6 animate-spin" /><span>Chargement…</span></div>}
          >
            <PDFComponents.Page
              pageNumber={pageNumber}
              width={containerW ? pageWidth : undefined}
              scale={containerW ? 1 : scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="shadow-2xl"
            />
          </PDFComponents.Document>
        )}
      </div>

      {/* Footer mobile */}
      <div className="sm:hidden flex items-center justify-between px-4 py-2 bg-gray-900 border-t border-gray-800 shrink-0">
        <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-2 text-gray-500"><ZoomOut className="h-5 w-5" /></button>
        <span className="text-sm text-gray-500">{progress}% lu</span>
        <button onClick={() => setScale(s => Math.min(2.5, s + 0.2))} className="p-2 text-gray-500"><ZoomIn className="h-5 w-5" /></button>
      </div>
    </div>
  );
}
