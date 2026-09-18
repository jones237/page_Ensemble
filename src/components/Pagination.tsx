// src/components/Pagination.tsx
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  isLoading = false,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

  // Générer les numéros de page à afficher (avec ellipsis)
  const getPages = (): (number | 'ellipsis')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

    if (page <= 4)
      return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
    if (page >= totalPages - 3)
      return [1, 'ellipsis', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, 'ellipsis', page - 1, page, page + 1, 'ellipsis', totalPages];
  };

  const pages = getPages();

  const btnBase =
    'flex items-center justify-center h-9 w-9 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-100 mt-6">

      {/* Info résultats */}
      <p className="text-sm text-gray-500 order-2 sm:order-1">
        {isLoading ? (
          <span className="animate-pulse bg-gray-200 rounded h-4 w-32 inline-block" />
        ) : (
          <>
            <span className="font-semibold text-gray-900">{from}–{to}</span>
            {' '}sur{' '}
            <span className="font-semibold text-gray-900">{total}</span>
            {' '}livre{total > 1 ? 's' : ''}
          </>
        )}
      </p>

      {/* Contrôles */}
      <div className="flex items-center gap-1 order-1 sm:order-2">

        {/* Précédent */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1 || isLoading}
          className={`${btnBase} border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300`}
          aria-label="Page précédente"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Numéros */}
        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`ellipsis-${i}`} className="w-9 text-center text-gray-400 text-sm select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              disabled={isLoading}
              className={`${btnBase} ${
                p === page
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
              }`}
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}

        {/* Suivant */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages || isLoading}
          className={`${btnBase} border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300`}
          aria-label="Page suivante"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Saut de page rapide — affiché seulement si beaucoup de pages */}
      {totalPages > 7 && (
        <div className="flex items-center gap-2 order-3 text-sm text-gray-500">
          <span>Aller à</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            defaultValue={page}
            key={page}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const v = parseInt((e.target as HTMLInputElement).value);
                if (v >= 1 && v <= totalPages) onPageChange(v);
              }
            }}
            className="w-14 h-9 border border-gray-200 rounded-lg text-center text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}
    </div>
  );
}
