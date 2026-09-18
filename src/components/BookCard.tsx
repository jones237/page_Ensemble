// src/components/BookCard.tsx
import { Link } from 'react-router-dom';
import { Book, GroupMember } from '../types';
import { BookOpen } from 'lucide-react';

interface BookCardProps {
  book: Book & { proprietaire?: GroupMember };
  onReserve?: (bookId: string) => void;
  showOwner?: boolean;
  isReserving?: boolean;
  compact?: boolean; // true when displayed in 2-col grid on mobile
}

export const BookCard = ({
  book,
  onReserve,
  showOwner = true,
  isReserving = false,
  compact = false,
}: BookCardProps) => {
  // Déterminer la couleur du badge de statut
  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'Disponible':
        return 'bg-green-100 text-green-800';
      case 'Réservé':
        return 'bg-yellow-100 text-yellow-800';
      case 'Emprunté':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Déterminer l'icône de condition
  const getConditionIcon = (condition: string) => {
    switch (condition) {
      case 'Excellent':
        return '⭐⭐⭐⭐⭐';
      case 'Bon':
        return '⭐⭐⭐⭐';
      case 'Acceptable':
        return '⭐⭐⭐';
      default:
        return '⭐⭐⭐';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden h-full flex flex-col border border-gray-100">

      {/* ── Image ─────────────────────────────────────────────────────── */}
      <div className={`relative w-full ${compact ? 'aspect-[4/3]' : 'h-48'} bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden`}>
        {book.image_url ? (
          <img
            src={book.image_url}
            alt={book.titre}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {compact ? (
              <BookOpen className="h-8 w-8 text-gray-300" />
            ) : (
              <div className="text-center">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Pas d'image</p>
              </div>
            )}
          </div>
        )}

        {/* Badge de Statut */}
        <div className={`absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadge(book.statut)}`}>
          {book.statut}
        </div>

        {/* Badge de Condition */}
        <div className={`absolute top-1.5 left-1.5 ${compact ? 'text-xs' : 'text-sm'}`}>
          {getConditionIcon(book.condition)}
        </div>
      </div>

      {/* ── Contenu ───────────────────────────────────────────────────── */}
      <div className={`${compact ? 'p-2' : 'p-4'} flex-1 flex flex-col gap-1`}>
        {/* Titre et Auteur */}
        <h3 className={`${compact ? 'text-xs' : 'text-lg'} font-bold text-gray-900 line-clamp-2 leading-tight hover:text-blue-600`}>
          <Link to={`/books/${book.id}`}>{book.titre}</Link>
        </h3>
        <p className={`${compact ? 'text-xs' : 'text-sm'} text-gray-600 line-clamp-1`}>{book.auteur}</p>
        {!compact && <p className="text-xs text-gray-500 mt-1">{book.categorie}</p>}

        {/* Résumé — masqué en mode compact pour gagner de la place */}
        {!compact && book.resume && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-1">
            {book.resume}
          </p>
        )}

        {/* Propriétaire — masqué en mode compact */}
        {showOwner && book.proprietaire && !compact && (
          <div className="flex items-center gap-2 py-2 border-t border-gray-100 mt-1">
            {book.proprietaire.avatar_url ? (
              <img
                src={book.proprietaire.avatar_url}
                alt={book.proprietaire.nom_complet}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                {book.proprietaire.nom_complet?.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-900">
                {book.proprietaire.nom_complet}
              </p>
              <p className="text-xs text-gray-500">Propriétaire</p>
            </div>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Prix et Caution */}
        <div className={`flex items-center justify-between border-t border-gray-100 ${compact ? 'pt-1.5 mt-1' : 'pt-3 mt-2'}`}>
          <div>
            <p className="text-xs text-gray-400">Location</p>
            <p className={`${compact ? 'text-xs' : 'text-lg'} font-bold text-blue-600`}>
              {book.prix_location} <span className="font-normal">FCFA</span>
            </p>
          </div>
          {!compact && (
            <div className="text-right">
              <p className="text-xs text-gray-400">Caution</p>
              <p className="text-lg font-bold text-gray-700">2000 <span className="font-normal">FCFA</span></p>
            </div>
          )}
        </div>

        {/* Bouton de Réservation / Lien vers Détails */}
        {onReserve ? (
          <button
            onClick={() => onReserve(book.id)}
            disabled={book.statut !== 'Disponible' || isReserving}
            className={`w-full rounded-lg font-semibold transition
              ${compact ? 'py-1.5 text-xs' : 'py-2 text-sm'}
              ${book.statut === 'Disponible'
                ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
          >
            {isReserving ? '...' : book.statut === 'Disponible' ? 'Réserver' : book.statut}
          </button>
        ) : (
          <Link
            to={`/books/${book.id}`}
            className={`w-full rounded-lg font-semibold text-center transition bg-gray-100 hover:bg-gray-200 text-gray-900
              ${compact ? 'py-1.5 text-xs' : 'py-2 text-sm'}`}
          >
            Voir Détails
          </Link>
        )}
      </div>
    </div>
  );
};
