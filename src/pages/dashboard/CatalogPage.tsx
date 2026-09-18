// src/pages/dashboard/CatalogPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useBooksPaginated } from '../../hooks/useBooks';
import { useCreateReservation } from '../../hooks/useReservations';
import { useToast, errorMessage } from '../../hooks/useToast';
import { BookCard } from '../../components/BookCard';
import { Pagination } from '../../components/Pagination';
import { BOOK_CATEGORIES, BookFilter } from '../../types';
import { BookOpen, Search, X, SlidersHorizontal } from 'lucide-react';

function useIsMobile() {
  const [mobile, setMobile] = React.useState(window.innerWidth < 640);
  React.useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 640);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

const PAGE_SIZE = 12;

export default function CatalogPage() {
  const navigate        = useNavigate();
  const { profile }     = useAuth();
  const { toast }       = useToast();
  const isMobile        = useIsMobile();

  // ── State ────────────────────────────────────────────────────────────────
  const [page, setPage]               = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [filterOpen, setFilterOpen]   = useState(false);
  const [filters, setFilters]         = useState<BookFilter>({});
  const [reservingBookId, setReservingBookId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const topRef    = useRef<HTMLDivElement>(null);

  const activeFilters: BookFilter = {
    ...filters,
    search: appliedSearch || undefined,
  };

  const { data: paginatedBooks, isLoading, isFetching, error } = useBooksPaginated(
    profile?.groupe_id || '',
    page,
    activeFilters
  );

  const createReservation = useCreateReservation();

  // Remonter en haut quand on change de page
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Remettre page à 1 quand les filtres changent
  useEffect(() => { setPage(1); }, [appliedSearch, filters]);

  // ── Recherche ─────────────────────────────────────────────────────────────
  const applySearch = () => setAppliedSearch(searchInput.trim());

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') applySearch();
    if (e.key === 'Escape') { setSearchInput(''); setAppliedSearch(''); }
  };

  const clearSearch = () => {
    setSearchInput('');
    setAppliedSearch('');
    searchRef.current?.focus();
  };

  const handleFilterChange = (key: keyof BookFilter, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
  };

  const resetAll = () => {
    setSearchInput('');
    setAppliedSearch('');
    setFilters({});
  };

  // ── Réservation ───────────────────────────────────────────────────────────
  const handleReserve = async (bookId: string) => {
    if (!profile?.id) return;
    setReservingBookId(bookId);
    try {
      await createReservation.mutateAsync({ book_id: bookId, emprunteur_id: profile.id });
      toast({ title: '✅ Réservé !', description: 'Votre réservation a bien été enregistrée.' });
      navigate('/my-reservations');
    } catch (err) {
      toast({ title: 'Erreur', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setReservingBookId(null);
    }
  };

  // ── Catégories groupées ───────────────────────────────────────────────────
  const categoriesByGroup = BOOK_CATEGORIES.reduce<Record<string, typeof BOOK_CATEGORIES>>(
    (acc, cat) => {
      if (!acc[cat.group]) acc[cat.group] = [];
      acc[cat.group].push(cat);
      return acc;
    },
    {}
  );

  const hasActiveFilters = !!appliedSearch || !!filters.categorie || !!filters.condition || !!filters.statut;
  const books            = paginatedBooks?.data ?? [];
  const total            = paginatedBooks?.total ?? 0;
  const totalPages       = paginatedBooks?.totalPages ?? 1;

  if (!profile?.groupe_id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <BookOpen className="h-14 w-14 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Pas de groupe assigné</h1>
          <p className="text-gray-500 mb-6 text-sm">
            Vous devez rejoindre un groupe pour accéder au catalogue.
          </p>
          <button onClick={() => navigate('/groups')}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 font-medium">
            Rejoindre un groupe
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 overflow-x-hidden" ref={topRef}>
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="mb-5">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 mb-1">
            <BookOpen className="h-6 w-6 text-blue-600 shrink-0" /> Catalogue
          </h1>
          <p className="text-sm text-gray-500">
            Découvrez et réservez des livres de votre communauté
          </p>
        </div>

        {/* ── Barre de recherche & filtres ─────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 mb-5">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Titre ou auteur…"
                className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              {searchInput && (
                <button onClick={clearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button onClick={applySearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium flex items-center gap-1.5">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Rechercher</span>
            </button>

            <button
              onClick={() => setFilterOpen(o => !o)}
              className={`px-3 py-2 rounded-lg border transition text-sm font-medium flex items-center gap-1.5 ${
                hasActiveFilters
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filtres</span>
              {hasActiveFilters && (
                <span className="bg-blue-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {[appliedSearch, filters.categorie, filters.condition, filters.statut].filter(Boolean).length}
                </span>
              )}
            </button>

            {hasActiveFilters && (
              <button onClick={resetAll}
                className="px-2.5 py-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                title="Effacer les filtres">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* ── Panneau filtres ─────────────────────────────────────────── */}
          {filterOpen && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Catégorie
                  </label>
                  <select value={filters.categorie || ''}
                    onChange={e => handleFilterChange('categorie', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="">Toutes</option>
                    {Object.entries(categoriesByGroup).map(([group, cats]) => (
                      <optgroup key={group} label={`── ${group} ──`}>
                        {cats.map(c => (
                          <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    État
                  </label>
                  <select value={filters.condition || ''}
                    onChange={e => handleFilterChange('condition', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="">Tous</option>
                    <option value="Excellent">⭐ Excellent</option>
                    <option value="Bon">👍 Bon</option>
                    <option value="Acceptable">✓ Acceptable</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Disponibilité
                  </label>
                  <select value={filters.statut || ''}
                    onChange={e => handleFilterChange('statut', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="">Tous</option>
                    <option value="Disponible">🟢 Disponible</option>
                    <option value="Reservé">🟡 Réservé</option>
                    <option value="Emprunté">🔴 Emprunté</option>
                  </select>
                </div>
              </div>

              {/* Raccourcis catégories chrétiennes */}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">
                  Accès rapide chrétien
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {BOOK_CATEGORIES.filter(c => c.group === 'Chrétien').map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => handleFilterChange('categorie',
                        filters.categorie === cat.value ? '' : cat.value
                      )}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                        filters.categorie === cat.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                      }`}
                    >
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Résultats ─────────────────────────────────────────────────── */}
        {/* Loading skeleton */}
        {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
                  <div className="w-full aspect-[4/3] bg-gray-200" />
                  <div className="p-2 sm:p-4 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-8 bg-gray-200 rounded mt-3" />
                  </div>
                </div>
              ))}
            </div>
        ) : !isLoading && books.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">{hasActiveFilters ? '🔍' : '📚'}</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {hasActiveFilters ? 'Aucun résultat' : 'Catalogue vide'}
              </h3>
              <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
                {hasActiveFilters
                  ? 'Aucun livre ne correspond à vos critères.'
                  : "Aucun livre n'a encore été ajouté à votre groupe."}
              </p>
              {hasActiveFilters ? (
                <button onClick={resetAll}
                  className="px-5 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium">
                  Effacer les filtres
                </button>
              ) : (
                <button onClick={() => navigate('/books/add')}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium">
                  + Ajouter un livre
                </button>
              )}
            </div>
        ) : (
          <>
          {/* Compteur de résultats */}
          <div className={`flex items-center justify-between mb-3 transition-opacity ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-900">{total}</span>
              {' '}livre{total > 1 ? 's' : ''} trouvé{total > 1 ? 's' : ''}
              {appliedSearch && <> pour <em>"{appliedSearch}"</em></>}
            </p>
            {filters.categorie && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium truncate max-w-[160px]">
                {BOOK_CATEGORIES.find(c => c.value === filters.categorie)?.icon}{' '}
                {filters.categorie}
              </span>
            )}
          </div>

          {/* Grille livres */}
          <div className={`grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 transition-opacity ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
            {books.map(book => (
              <BookCard
                key={book.id}
                book={book}
                onReserve={handleReserve}
                isReserving={reservingBookId === book.id}
                showOwner
                compact={isMobile}
              />
            ))}
          </div>

          {/* ── Pagination ──────────────────────────────────────────────── */}
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            onPageChange={handlePageChange}
            isLoading={isFetching}
          />
          </>
        )}
      </div>
    </div>
  );
}
