// src/pages/dashboard/CatalogPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useBooks } from '../../hooks/useBooks';
import { useCreateReservation } from '../../hooks/useReservations';
import { useToast, errorMessage } from '../../hooks/useToast';
import { BookCard } from '../../components/BookCard';
import { QueryState } from '../../components/QueryState';
import { BOOK_CATEGORIES, BookCategory, BookFilter } from '../../types';
import { BookOpen, Search, Filter, X, SlidersHorizontal } from 'lucide-react';

// Simple hook to detect mobile
function useIsMobile() {
  const [mobile, setMobile] = React.useState(window.innerWidth < 640);
  React.useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 640);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

export default function CatalogPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // ── State ──────────────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [filterOpen, setFilterOpen]     = useState(false);
  const [filters, setFilters]           = useState<BookFilter>({});
  const searchRef = useRef<HTMLInputElement>(null);

  const activeFilters = {
    ...filters,
    search: appliedSearch || undefined,
  };

  const { data: allBooks, isLoading, error, refetch } = useBooks(
    profile?.groupe_id || '',
    activeFilters
  );
  // Les livres numériques se lisent en ligne : ils ne se réservent pas comme un livre papier
  const books = allBooks?.filter((b) => b.type !== 'numerique');
  const createReservation  = useCreateReservation();
  const [reservingBookId, setReservingBookId] = useState<string | null>(null);

  // Appliquer la recherche via Entrée ou bouton
  const applySearch = () => setAppliedSearch(searchInput.trim());

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') applySearch();
    if (e.key === 'Escape') {
      setSearchInput('');
      setAppliedSearch('');
    }
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

  const handleReserve = async (bookId: string) => {
    if (!profile?.id) return;
    setReservingBookId(bookId);
    try {
      await createReservation.mutateAsync({ book_id: bookId, emprunteur_id: profile.id });
      toast({ title: 'Livre réservé avec succès', variant: 'success' });
      navigate('/my-reservations');
    } catch (err) {
      toast({ title: 'Erreur', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setReservingBookId(null);
    }
  };

  // Grouper les catégories par section
  const categoriesByGroup = BOOK_CATEGORIES.reduce<Record<string, typeof BOOK_CATEGORIES>>(
    (acc, cat) => {
      if (!acc[cat.group]) acc[cat.group] = [];
      acc[cat.group].push(cat);
      return acc;
    },
    {}
  );

  const hasActiveFilters =
    !!appliedSearch || !!filters.categorie || !!filters.condition || !!filters.statut;

  if (!profile?.groupe_id) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pas de groupe assigné</h1>
          <p className="text-gray-600 mb-6">
            Vous devez rejoindre un groupe pour accéder au catalogue.
          </p>
          <button
            onClick={() => navigate('/groups')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Rejoindre un groupe
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-6 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BookOpen className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" /> Catalogue de Livres
          </h1>
          <p className="text-gray-500 mt-1">
            Découvrez et réservez des livres de notre communauté
          </p>
        </div>

        {/* Barre de Recherche + Filtres */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">

          {/* Ligne principale */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Input de recherche */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Titre, auteur… (Entrée pour chercher)"
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              {searchInput && (
                <button
                  onClick={clearSearch}
                  aria-label="Effacer la recherche"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              {/* Bouton Rechercher */}
              <button
                onClick={applySearch}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm whitespace-nowrap"
              >
                <Search className="h-4 w-4" />
                Rechercher
              </button>

              {/* Bouton Filtres */}
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition font-medium text-sm ${
                  hasActiveFilters
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtres
                {hasActiveFilters && (
                  <span className="bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {[appliedSearch, filters.categorie, filters.condition, filters.statut]
                      .filter(Boolean).length}
                  </span>
                )}
              </button>

              {/* Reset */}
              {hasActiveFilters && (
                <button
                  onClick={resetAll}
                  className="flex items-center justify-center gap-1 px-3 py-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition text-sm"
                  title="Réinitialiser"
                >
                  <X className="h-4 w-4" /> Tout effacer
                </button>
              )}
            </div>
          </div>

          {/* Panneau Filtres */}
          {filterOpen && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                {/* Catégorie avec groupes */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    Catégorie
                  </label>
                  <select
                    value={filters.categorie || ''}
                    onChange={e => handleFilterChange('categorie', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Toutes les catégories</option>
                    {Object.entries(categoriesByGroup).map(([group, cats]) => (
                      <optgroup key={group} label={`── ${group} ──`}>
                        {cats.map(c => (
                          <option key={c.value} value={c.value}>
                            {c.icon} {c.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* État */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    État
                  </label>
                  <select
                    value={filters.condition || ''}
                    onChange={e => handleFilterChange('condition', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Tous les états</option>
                    <option value="Excellent">⭐ Excellent</option>
                    <option value="Bon">👍 Bon</option>
                    <option value="Acceptable">✓ Acceptable</option>
                  </select>
                </div>

                {/* Disponibilité */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    Disponibilité
                  </label>
                  <select
                    value={filters.statut || ''}
                    onChange={e => handleFilterChange('statut', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Tous les statuts</option>
                    <option value="Disponible">🟢 Disponible</option>
                    <option value="Reservé">🟡 Réservé</option>
                    <option value="Emprunté">🔴 Emprunté</option>
                  </select>
                </div>
              </div>

              {/* Filtres rapides par catégorie chrétienne */}
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Accès rapide — Catégories chrétiennes
                </p>
                <div className="flex flex-wrap gap-2">
                  {BOOK_CATEGORIES.filter(c => c.group === 'Chrétien').map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => handleFilterChange('categorie',
                        filters.categorie === cat.value ? '' : cat.value
                      )}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
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

        {/* Résultats */}
        <QueryState
          skeleton={
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
                  <div className="h-40 bg-gray-200" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          }
          isLoading={isLoading}
          error={error}
          onRetry={() => refetch()}
          isEmpty={!books || books.length === 0}
          empty={
            <div className="text-center py-20">
              <div className="text-5xl sm:text-6xl mb-4">🔍</div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Aucun livre trouvé</h2>
              <p className="text-gray-500 mb-4">
                {hasActiveFilters
                  ? 'Essayez de modifier vos filtres ou votre recherche.'
                  : 'Le catalogue est vide pour l\'instant.'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={resetAll}
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                >
                  <X className="h-4 w-4" /> Effacer tous les filtres
                </button>
              )}
            </div>
          }
        >
          {books && books.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-gray-900">{books.length}</span> livre{books.length > 1 ? 's' : ''} trouvé{books.length > 1 ? 's' : ''}
                  {appliedSearch && (
                    <span className="ml-1">pour <em>"{appliedSearch}"</em></span>
                  )}
                </p>
                {filters.categorie && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                    {BOOK_CATEGORIES.find(c => c.value === filters.categorie)?.icon}{' '}
                    {filters.categorie}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
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
            </>
          )}
        </QueryState>
      </div>
    </div>
  );
}
