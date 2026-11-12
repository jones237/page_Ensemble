// src/pages/dashboard/PublicCatalogPage.tsx
// Catalogue consultable SANS compte. Les données viennent de la fonction `public_catalog`
// (champs non sensibles uniquement). Réserver ou voir le détail demande une connexion.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { BookOpen, Search, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { BOOK_CATEGORIES } from '../../types';
import { QueryState } from '../../components/QueryState';

type PublicBook = {
  id: string; titre: string; auteur: string | null; categorie: string | null;
  condition: string | null; statut: string | null; image_url: string | null;
  prix_location: number | null; montant_caution: number | null; groupe_nom: string | null;
};
type Page = { total: number; items: PublicBook[] };
const PAGE = 24;

function usePublicCatalog(search: string, categorie: string) {
  return useInfiniteQuery({
    queryKey: ['publicCatalog', search, categorie],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<Page> => {
      const { data, error } = await supabase.rpc('public_catalog', {
        p_search: search || null,
        p_categorie: categorie || null,
        p_limit: PAGE,
        p_offset: pageParam as number,
      });
      if (error) throw error;
      return data as Page;
    },
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.items.length, 0);
      return loaded < last.total ? loaded : undefined;
    },
  });
}

export default function PublicCatalogPage() {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [categorie, setCategorie] = useState('');
  const q = usePublicCatalog(search, categorie);
  const books = q.data?.pages.flatMap((p) => p.items) ?? [];
  const total = q.data?.pages[0]?.total ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Catalogue</h1>
      <p className="text-gray-600 mt-1 mb-5">
        Parcourez les livres des groupes. Pour réserver, créez un compte gratuit.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <form
          className="relative flex-1"
          onSubmit={(e) => { e.preventDefault(); setSearch(input.trim()); }}
          role="search"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" aria-hidden="true" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Titre ou auteur… (Entrée pour chercher)"
            aria-label="Rechercher un livre"
            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          {input && (
            <button
              type="button"
              aria-label="Effacer la recherche"
              onClick={() => { setInput(''); setSearch(''); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600 p-2"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>
        <select
          value={categorie}
          onChange={(e) => setCategorie(e.target.value)}
          aria-label="Filtrer par catégorie"
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">Toutes les catégories</option>
          {BOOK_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
          ))}
        </select>
      </div>

      <QueryState
        isLoading={q.isLoading}
        error={q.error}
        onRetry={() => q.refetch()}
        isEmpty={books.length === 0}
        skeleton={
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
                <div className="h-40 bg-gray-200" />
                <div className="p-3 space-y-2"><div className="h-4 bg-gray-200 rounded w-3/4" /><div className="h-3 bg-gray-200 rounded w-1/2" /></div>
              </div>
            ))}
          </div>
        }
        empty={
          <div className="text-center py-20">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Aucun livre trouvé</h2>
            <p className="text-gray-600">Essayez un autre titre ou une autre catégorie.</p>
          </div>
        }
      >
        <p className="text-sm text-gray-600 mb-3" aria-live="polite">{total} livre{total > 1 ? 's' : ''}</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
          {books.map((b) => (
            <Link
              key={b.id}
              to={`/books/${b.id}`}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden flex flex-col border border-gray-100"
            >
              <div className="h-40 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center overflow-hidden">
                {b.image_url
                  ? <img src={b.image_url} alt={b.titre} loading="lazy" className="w-full h-full object-cover" />
                  : <BookOpen className="h-8 w-8 text-gray-300" aria-hidden="true" />}
              </div>
              <div className="p-3 flex-1 flex flex-col gap-1">
                <p className="font-semibold text-gray-900 text-sm line-clamp-2">{b.titre}</p>
                {b.auteur && <p className="text-xs text-gray-600 line-clamp-1">{b.auteur}</p>}
                <div className="mt-auto pt-2 flex items-center justify-between gap-2 text-xs">
                  <span className="text-green-700 font-medium">
                    {b.prix_location ? `${b.prix_location} FCFA` : 'Gratuit'}
                  </span>
                  {b.groupe_nom && <span className="text-gray-500 truncate">{b.groupe_nom}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {q.hasNextPage && (
          <div className="text-center mt-8">
            <button
              onClick={() => q.fetchNextPage()}
              disabled={q.isFetchingNextPage}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
            >
              {q.isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />}
              Voir plus de livres
            </button>
          </div>
        )}
      </QueryState>

      <div className="mt-10 bg-blue-50 border border-blue-100 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-blue-900">
          <strong>Envie d'emprunter ?</strong> Créez un compte gratuit et rejoignez un groupe pour réserver.
        </p>
        <div className="flex gap-2">
          <Link to="/signup" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Rejoindre</Link>
          <Link to="/signin" className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-50">Se connecter</Link>
        </div>
      </div>
    </div>
  );
}
