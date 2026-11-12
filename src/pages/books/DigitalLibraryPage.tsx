// src/pages/books/DigitalLibraryPage.tsx
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSearchGutenberg, useSearchOpenLibrary } from '../../hooks/useDigitalBooks';
import { PDFReader } from '../../components/PDFReader';
import { supabase } from '../../lib/supabaseClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, BookOpen, Download, Loader2, ExternalLink, Library, Globe } from 'lucide-react';

type GutenbergBook = { id: number; title: string; author: string; cover_url: string | null; pdf_url: string | null; download_count: number };
type OpenLibBook   = { key: string; title: string; author: string; cover_url: string | null; year: number };

function useAddGutenbergBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (p: { title: string; author: string; cover_url: string | null; pdf_url: string; groupe_id: string; proprietaire_id: string }) => {
      const { data, error } = await supabase.from('books').insert({
        titre: p.title, auteur: p.author, image_url: p.cover_url,
        groupe_id: p.groupe_id, proprietaire_id: p.proprietaire_id,
        type: 'numerique', source: 'gutenberg', fichier_url: p.pdf_url,
        prix_lecture: 0, prix_location: 0, categorie: 'Fiction',
        condition: 'Excellent', statut: 'Disponible',
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['books'] }),
  });
}

function GutenbergCard({ book, groupeId, userId }: { book: GutenbergBook; groupeId: string; userId: string }) {
  const addBook = useAddGutenbergBook();
  const [reading, setReading] = useState(false);
  const [added,   setAdded]   = useState(false);

  return (
    <>
      {reading && book.pdf_url && (
        <PDFReader url={book.pdf_url} bookId={String(book.id)} userId={userId}
          bookTitle={book.title} onClose={() => setReading(false)} />
      )}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col overflow-hidden">
        <div className="relative h-40 bg-gradient-to-br from-blue-50 to-blue-100 overflow-hidden">
          {book.cover_url
            ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><BookOpen className="h-10 w-10 text-blue-300" /></div>
          }
          <span className="absolute top-2 right-2 text-xs bg-green-600 text-white px-1.5 py-0.5 rounded-full font-bold">GRATUIT</span>
          <span className="absolute top-2 left-2 text-xs bg-gray-900/70 text-white px-1.5 py-0.5 rounded-full">Gutenberg</span>
        </div>
        <div className="p-3 flex-1 flex flex-col">
          <h3 className="font-bold text-gray-900 text-xs line-clamp-2 mb-1">{book.title}</h3>
          <p className="text-xs text-gray-500 mb-1 truncate">{book.author}</p>
          <p className="text-xs text-gray-500 mb-3">📥 {book.download_count.toLocaleString()}</p>
          <div className="mt-auto space-y-1.5">
            {book.pdf_url && (
              <button onClick={() => setReading(true)}
                className="w-full py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" /> Lire maintenant
              </button>
            )}
            <button
              onClick={async () => {
                if (!book.pdf_url || added) return;
                await addBook.mutateAsync({ title: book.title, author: book.author, cover_url: book.cover_url, pdf_url: book.pdf_url, groupe_id: groupeId, proprietaire_id: userId });
                setAdded(true);
              }}
              disabled={addBook.isPending || added}
              className="w-full py-1.5 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-1.5 disabled:opacity-50">
              {addBook.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : added ? '✅ Ajouté au catalogue'
                : <><Download className="h-3.5 w-3.5" /> Ajouter au catalogue</>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function DigitalLibraryPage() {
  const { profile }  = useAuth();
  const [query,  setQuery]  = useState('');
  const [search, setSearch] = useState('');
  const [tab,    setTab]    = useState<'gutenberg' | 'openlibrary'>('gutenberg');

  const { data: gutenbergResults, isLoading: gLoading } = useSearchGutenberg(search);
  const { data: openLibResults,   isLoading: oLoading } = useSearchOpenLibrary(search);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setSearch(query.trim()); };
  const isLoading = tab === 'gutenberg' ? gLoading : oLoading;

  if (!profile?.groupe_id) return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <Library className="h-14 w-14 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Rejoignez un groupe</h2>
        <p className="text-gray-500 text-sm">La bibliothèque numérique est accessible aux membres d'un groupe.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-6 overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">

        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 mb-1">
            <Library className="h-6 w-6 text-blue-600" /> Bibliothèque numérique
          </h1>
          <p className="text-sm text-gray-500">Lisez des milliers de livres libres de droits directement dans l'app.</p>
        </div>

        {/* Onglets */}
        <div className="flex gap-2 mb-5">
          {[
            { key: 'gutenberg'   as const, label: 'Project Gutenberg', icon: '📚' },
            { key: 'openlibrary' as const, label: 'Open Library',      icon: '🌍' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition ${
                tab === t.key ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Recherche */}
        <form onSubmit={handleSearch} className="bg-white rounded-xl border border-gray-200 p-3 mb-6 flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder={tab === 'gutenberg' ? 'Rechercher (ex: Bible, Victor Hugo, Molière...)' : 'Titre ou auteur...'}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <button type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm flex items-center gap-2">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="hidden sm:inline">Rechercher</span>
          </button>
        </form>

        {/* Banner info */}
        {!search && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-start gap-3">
            <Globe className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">
                {tab === 'gutenberg' ? '70 000+ livres libres de droits avec lecture PDF intégrée' : '20 millions de livres archivés dans le monde'}
              </p>
              <p className="text-xs text-blue-700">
                {tab === 'gutenberg'
                  ? 'Tapez le nom d\'un auteur ou d\'un titre. Vous pouvez lire directement ou ajouter le livre au catalogue de votre groupe.'
                  : 'Archive mondiale de livres. Cliquez sur "Voir sur Open Library" pour accéder au livre.'}
              </p>
            </div>
          </div>
        )}

        {/* Résultats */}
        {search && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {isLoading ? 'Recherche…' : `${tab === 'gutenberg' ? gutenbergResults?.length : openLibResults?.length ?? 0} résultat(s) pour "${search}"`}
            </p>

            {isLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 text-blue-500 animate-spin" /></div>
            ) : tab === 'gutenberg' ? (
              gutenbergResults?.length === 0 ? (
                <div className="text-center py-16">
                  <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-1">Aucun résultat pour "{search}"</p>
                  <p className="text-xs text-gray-500">Essayez en anglais ou français. Ex: "Les Misérables", "Bible", "Molière"</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                  {(gutenbergResults ?? []).map((book: GutenbergBook) => (
                    <GutenbergCard key={book.id} book={book} groupeId={profile.groupe_id!} userId={profile.id} />
                  ))}
                </div>
              )
            ) : (
              openLibResults?.length === 0 ? (
                <div className="text-center py-16">
                  <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Aucun résultat pour "{search}"</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                  {((openLibResults ?? []) as OpenLibBook[]).map((book: OpenLibBook) => (
                    <div key={book.key} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col">
                      <div className="h-40 bg-gradient-to-br from-blue-50 to-blue-100 overflow-hidden">
                        {book.cover_url
                          ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><BookOpen className="h-10 w-10 text-blue-300" /></div>
                        }
                      </div>
                      <div className="p-3 flex-1 flex flex-col">
                        <h3 className="font-bold text-gray-900 text-xs line-clamp-2 mb-1">{book.title}</h3>
                        <p className="text-xs text-gray-500 mb-1 truncate">{book.author}</p>
                        {book.year && <p className="text-xs text-gray-500 mb-3">{book.year}</p>}
                        <a href={`https://openlibrary.org${book.key}`} target="_blank" rel="noopener noreferrer"
                          className="mt-auto w-full py-1.5 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-1.5">
                          <ExternalLink className="h-3.5 w-3.5" /> Voir sur Open Library
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
