// src/pages/books/BookDetailPage.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useBook, useReviewableReservations, useCreateReview } from '../../hooks/useBooks';
import { useCreateReservation } from '../../hooks/useReservations';
import { useToast, errorMessage } from '../../hooks/useToast';
import { Review } from '../../types';
import { isNetworkError } from '../../hooks/useOnlineStatus';
import { Star, ChevronLeft, MapPin, Calendar, DollarSign, User, AlertCircle, WifiOff, Loader2, Edit2, RefreshCw } from 'lucide-react';

export default function BookDetailPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { data: book, isLoading, error, refetch } = useBook(bookId || '');
  const createReservation = useCreateReservation();

  const reviewedReservationIds = (book?.reviews ?? [])
    .filter((r: Review) => r.reviewer_id === profile?.id)
    .map((r: Review & { reservation_id?: string }) => r.reservation_id)
    .filter(Boolean);
  const { data: reviewableReservations } = useReviewableReservations(
    bookId,
    profile?.id,
    reviewedReservationIds
  );
  const createReview = useCreateReview();
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContenu, setReviewContenu] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  if (!bookId) {
    return <div>ID du livre invalide</div>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  // Erreur réseau/serveur : le livre existe peut-être, on n'a juste pas pu
  // vérifier — on propose de réessayer plutôt que d'affirmer qu'il a disparu.
  if (error) {
    const network = isNetworkError(error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          {network
            ? <WifiOff className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            : <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {network ? 'Pas de connexion internet' : 'Une erreur est survenue'}
          </h1>
          <p className="text-gray-600 mb-6">
            {network
              ? "Vérifie ta connexion et réessaie pour charger ce livre."
              : "Le serveur n'a pas pu répondre. Réessaie dans un instant."}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" /> Réessayer
            </button>
            <button
              onClick={() => navigate('/catalog')}
              className="inline-block bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200"
            >
              Retourner au catalogue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Chargement terminé, pas d'erreur, mais rien retourné : le livre
  // n'existe vraiment pas (ou a été supprimé) — un vrai 404.
  if (!book) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Livre non trouvé</h1>
          <p className="text-gray-600 mb-6">Le livre que vous cherchez n'existe pas ou a été supprimé.</p>
          <button
            onClick={() => navigate('/catalog')}
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Retourner au catalogue
          </button>
        </div>
      </div>
    );
  }

  const handleReserve = async () => {
    if (!profile?.id) return;

    try {
      await createReservation.mutateAsync({
        book_id: bookId,
        emprunteur_id: profile.id,
      });
      toast({ title: 'Livre réservé avec succès', variant: 'success' });
      navigate('/my-reservations');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la réservation';
      toast({ title: 'Erreur', description: message, variant: 'destructive' });
    }
  };

  const averageRating = book.reviews && book.reviews.length > 0
    ? (book.reviews.reduce((sum: number, r: Review) => sum + r.rating, 0) / book.reviews.length).toFixed(1)
    : null;

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Excellent':
        return 'bg-green-100 text-green-800';
      case 'Bon':
        return 'bg-blue-100 text-blue-800';
      case 'Acceptable':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 overflow-x-hidden">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <button
            onClick={() => navigate('/catalog')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition"
          >
            <ChevronLeft className="h-5 w-5" />
            Retour au catalogue
          </button>

          {(book.proprietaire_id === profile?.id || book.groupe?.admin_id === profile?.id) && (
            <button
              onClick={() => navigate(`/books/edit/${book.id}`)}
              className="flex items-center gap-2 text-sm bg-gray-100 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-200 transition font-medium"
            >
              <Edit2 className="h-4 w-4" />
              Modifier
            </button>
          )}
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 p-4 sm:p-8">
            {/* Image & Statut */}
            <div className="md:col-span-1">
              <div className="relative w-full aspect-video bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg overflow-hidden flex items-center justify-center mb-4">
                {book.image_url ? (
                  <img
                    src={book.image_url}
                    alt={book.titre}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-gray-400">
                    <span className="text-6xl">📖</span>
                  </div>
                )}
              </div>

              {/* Badges */}
              <div className="space-y-3 mb-6">
                <div className={`px-4 py-2 rounded-lg text-center font-semibold ${
                  book.statut === 'Disponible'
                    ? 'bg-green-100 text-green-800'
                    : book.statut === 'Reservé'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {book.statut}
                </div>

                <div className={`px-4 py-2 rounded-lg text-center font-semibold ${getConditionColor(book.condition)}`}>
                  État: {book.condition}
                </div>
              </div>

              {/* Prix & Caution */}
              <div className="space-y-4 mb-6 py-6 border-t border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Tarif de location</p>
                    <p className="text-2xl font-bold text-blue-600">{book.prix_location} FCFA</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Caution</p>
                    <p className="text-xl font-bold text-gray-900">2000 FCFA</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Durée</p>
                    <p className="text-lg font-bold text-gray-900">14 jours</p>
                  </div>
                </div>
              </div>

              {/* Bouton de Réservation */}
              <button
                onClick={handleReserve}
                disabled={book.statut !== 'Disponible'}
                className={`w-full py-3 px-4 rounded-lg font-bold transition text-lg ${
                  book.statut === 'Disponible'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                }`}
              >
                {book.statut === 'Disponible' ? '🔖 Réserver' : 'Indisponible'}
              </button>
            </div>

            {/* Détails & Propriétaire */}
            <div className="md:col-span-2">
              {/* Titre et Auteur */}
              <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{book.titre}</h1>
                <p className="text-xl text-gray-600 mb-4">
                  par <span className="font-semibold">{book.auteur}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {book.categorie}
                  </span>
                  {book.isbn && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                      ISBN: {book.isbn}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              {book.resume && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">Résumé</h2>
                  <p className="text-gray-700 leading-relaxed">{book.resume}</p>
                </div>
              )}

              {/* Informations du Livre */}
              <div className="mb-8 py-6 border-t border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Informations</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {book.nombre_pages && (
                    <div>
                      <p className="text-sm text-gray-600">Nombre de pages</p>
                      <p className="text-lg font-semibold text-gray-900">{book.nombre_pages}</p>
                    </div>
                  )}
                  {book.edition && (
                    <div>
                      <p className="text-sm text-gray-600">Édition</p>
                      <p className="text-lg font-semibold text-gray-900">{book.edition}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Condition</p>
                    <p className="text-lg font-semibold text-gray-900">{book.condition}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Catégorie</p>
                    <p className="text-lg font-semibold text-gray-900">{book.categorie}</p>
                  </div>
                </div>
              </div>

              {/* Propriétaire */}
              {book.proprietaire && (
                <div className="py-6 border-t border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Propriétaire</h2>
                  <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
                    {book.proprietaire.avatar_url ? (
                      <img
                        src={book.proprietaire.avatar_url}
                        alt={book.proprietaire.nom_complet}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                        {book.proprietaire.nom_complet?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {book.proprietaire.nom_complet}
                      </h3>
                      <p className="text-xs text-gray-500">
                        Le téléphone est communiqué une fois votre réservation acceptée.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Écrire un avis (si un emprunt rendu n'a pas encore été noté) */}
              {reviewableReservations && reviewableReservations.length > 0 && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900 mb-3">Laisser un avis</h2>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setReviewRating(n)}
                          className="focus:outline-none"
                        >
                          <Star
                            className={`h-7 w-7 transition ${
                              n <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={reviewContenu}
                      onChange={(e) => setReviewContenu(e.target.value)}
                      placeholder="Votre avis sur ce livre (optionnel)..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-3"
                      disabled={reviewSubmitting}
                    />
                    <button
                      onClick={async () => {
                        if (!reviewableReservations[0]) return;
                        setReviewSubmitting(true);
                        try {
                          await createReview.mutateAsync({
                            bookId: book.id,
                            reservationId: reviewableReservations[0].id,
                            rating: reviewRating,
                            contenu: reviewContenu,
                          });
                          setReviewContenu('');
                          setReviewRating(5);
                        } catch (err) {
                          toast({ title: 'Erreur', description: errorMessage(err), variant: 'destructive' });
                        } finally {
                          setReviewSubmitting(false);
                        }
                      }}
                      disabled={reviewSubmitting}
                      className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {reviewSubmitting ? 'Envoi...' : 'Publier mon avis'}
                    </button>
                  </div>
                </div>
              )}

              {/* Avis */}
              {book.reviews && book.reviews.length > 0 && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">Avis</h2>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-5 w-5 ${
                              i < Math.round(parseFloat(averageRating || '0'))
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-lg font-bold text-gray-900">
                        {averageRating}/5 ({book.reviews.length})
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {book.reviews.map((review: Review) => (
                      <div key={review.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {review.reviewer?.avatar_url ? (
                              <img
                                src={review.reviewer.avatar_url}
                                alt={review.reviewer.nom_complet}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                {review.reviewer?.nom_complet?.charAt(0)}
                              </div>
                            )}
                            <p className="font-medium text-gray-900">
                              {review.reviewer?.nom_complet || 'Anonyme'}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.contenu && (
                          <p className="text-sm text-gray-700">{review.contenu}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
