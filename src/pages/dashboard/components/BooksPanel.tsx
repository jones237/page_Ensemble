import { useNavigate } from 'react-router-dom';
import { QueryState } from '../../../components/QueryState';
import { Book } from '../../../types';
import { BookOpen, Edit2, Plus, Trash2 } from 'lucide-react';

type OwnedBook = Book & { proprietaire?: { nom_complet?: string } };

interface BooksPanelProps {
  view: 'mine' | 'group';
  onViewChange: (view: 'mine' | 'group') => void;
  showToggle: boolean;
  books?: OwnedBook[];
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  currentUserId?: string;
  onDeleteRequest: (bookId: string, titre: string) => void;
}

export function BooksPanel({
  view, onViewChange, showToggle, books, isLoading, error, onRetry, currentUserId, onDeleteRequest,
}: BooksPanelProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-xl font-bold text-gray-900">
            {view === 'group' ? 'Livres du groupe' : 'Mes Livres'}
          </h2>
          {showToggle && (
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg text-sm">
              <button
                onClick={() => onViewChange('mine')}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  view === 'mine' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                }`}
              >
                Mes livres
              </button>
              <button
                onClick={() => onViewChange('group')}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  view === 'group' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                }`}
              >
                👑 Tout le groupe
              </button>
            </div>
          )}
        </div>
      </div>

      <QueryState
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        minHeight="py-12"
        isEmpty={!books || books.length === 0}
        empty={
          <div className="text-center py-16 px-6">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">
              {view === 'group' ? 'Aucun livre dans ce groupe' : 'Aucun livre dans votre stock'}
            </p>
            <button
              onClick={() => navigate('/books/add')}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
            >
              <Plus className="h-4 w-4" /> Ajouter votre premier livre
            </button>
          </div>
        }
      >
        <div className="divide-y divide-gray-50 max-h-[520px] overflow-y-auto">
          {books?.map((book) => (
            <div key={book.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition">
              <div className="w-12 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg shrink-0 overflow-hidden flex items-center justify-center">
                {book.image_url
                  ? <img src={book.image_url} alt={book.titre} className="w-full h-full object-cover" />
                  : <BookOpen className="h-5 w-5 text-gray-400" />
                }
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{book.titre}</p>
                <p className="text-sm text-gray-500 truncate">{book.auteur}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    book.statut === 'Disponible' ? 'bg-green-100 text-green-800'
                    : book.statut === 'Reservé'  ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-blue-100 text-blue-800'
                  }`}>
                    {book.statut}
                  </span>
                  <span className="text-xs text-gray-500">{book.prix_location} FCFA</span>
                  {view === 'group' && book.proprietaire_id !== currentUserId && (
                    <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                      {book.proprietaire?.nom_complet ?? 'Autre membre'}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => navigate(`/books/edit/${book.id}`)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="Modifier"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDeleteRequest(book.id, book.titre)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Supprimer"
                  disabled={book.statut !== 'Disponible'}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </QueryState>
    </div>
  );
}
