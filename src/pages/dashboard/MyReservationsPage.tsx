// src/pages/dashboard/MyReservationsPage.tsx
import { useState } from 'react';
import { useAuth } from "../../hooks/useAuth";
import { useMyReservations, useReservationContactPhone, useConfirmBookReturn } from '../../hooks/useReservations';
import { Reservation } from '../../types';
import { useToast, errorMessage } from '../../hooks/useToast';
import { QueryState } from '../../components/QueryState';
import { BookOpen, AlertCircle, Calendar, DollarSign, CheckCircle, Clock, RotateCcw, Phone, ThumbsUp, ThumbsDown, ImageIcon } from 'lucide-react';

const STATUS_FILTERS = [
  { value: 'all',      label: 'Tous'       },
  { value: 'Réservé',  label: 'En attente' },
  { value: 'Actif',    label: 'En cours'   },
  { value: 'Retourné', label: 'Retournés'  },
  { value: 'Annulé',   label: 'Annulés'    },
] as const;

function ContactOwnerLink({ reservationId, ownerName }: { reservationId: string; ownerName?: string }) {
  const { data: phone } = useReservationContactPhone(reservationId);
  const [copied, setCopied] = useState(false);
  if (!phone) return null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    await navigator.clipboard.writeText(phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-3 flex items-center gap-3 text-xs">
      <a
        href={`tel:${phone}`}
        className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium"
      >
        <Phone className="h-3 w-3" />
        Appeler {ownerName ?? 'le propriétaire'} ({phone})
      </a>
      <button
        onClick={handleCopy}
        className="text-gray-500 hover:text-gray-700 font-medium underline"
        title="Sur ordinateur, le lien d'appel ne fait rien sans logiciel configuré — copiez le numéro à la place"
      >
        {copied ? 'Copié !' : 'Copier le numéro'}
      </button>
    </div>
  );
}

type ReturnableReservation = Reservation & { book?: { titre?: string } };

function ConfirmReturnCard({ reservation }: { reservation: ReturnableReservation }) {
  const confirmReturn = useConfirmBookReturn();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [comment, setComment] = useState('');

  if (reservation.confirme_par_emprunteur !== null) return null;

  const handle = async (confirme: boolean) => {
    setBusy(true);
    try {
      await confirmReturn.mutateAsync({
        reservationId: reservation.id,
        confirme,
        commentaire: confirme ? undefined : comment,
      });
    } catch (err) {
      toast({ title: 'Erreur', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
      <p className="text-xs font-semibold text-amber-900 mb-2">
        Le propriétaire a déclaré l'état : <strong>{reservation.etat_retour ?? '—'}</strong>
      </p>
      {reservation.photo_retour_url && (
        <a
          href={reservation.photo_retour_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mb-2"
        >
          <ImageIcon className="h-3 w-3" /> Voir la photo
        </a>
      )}
      <p className="text-xs text-amber-800 mb-2">Cela correspond-il à l'état réel du livre au retour ?</p>

      {!showDispute ? (
        <div className="flex gap-2">
          <button
            onClick={() => handle(true)}
            disabled={busy}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            <ThumbsUp className="h-3 w-3" /> Oui, ça correspond
          </button>
          <button
            onClick={() => setShowDispute(true)}
            disabled={busy}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-amber-300 text-amber-800 text-xs font-medium rounded-lg hover:bg-amber-100 transition disabled:opacity-50"
          >
            <ThumbsDown className="h-3 w-3" /> Signaler un problème
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Expliquez le désaccord..."
            rows={2}
            className="w-full px-2 py-1.5 border border-amber-300 rounded-lg text-xs"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowDispute(false)}
              className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800"
            >
              Annuler
            </button>
            <button
              onClick={() => handle(false)}
              disabled={busy || !comment.trim()}
              className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition disabled:opacity-50"
            >
              Envoyer le signalement
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyReservationsPage() {
  const { profile } = useAuth();
  const [filter, setFilter] = useState<string>('all');
  const { data: reservations, isLoading, error, refetch } = useMyReservations(profile?.id || '');

  if (!profile?.id) return null;

  const filtered = filter === 'all'
    ? (reservations || [])
    : (reservations || []).filter((r) => r.statut === filter);

  const isOverdue = (dateFin: string, statut: string) =>
    statut === 'Actif' && new Date(dateFin) < new Date();

  const daysLeft = (dateFin: string) =>
    Math.ceil((new Date(dateFin).getTime() - Date.now()) / 86_400_000);

  return (
    <div className="min-h-screen bg-gray-50 py-6 overflow-x-hidden">
      <div className="max-w-3xl mx-auto px-3 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">🔖 Mes Réservations</h1>
          <p className="text-gray-600 mt-1">Suivi de tous vos emprunts</p>
        </div>

        {/* Filtres */}
        <div className="flex gap-2 flex-wrap mb-6">
          {STATUS_FILTERS.map((f) => {
            const count = f.value === 'all'
              ? (reservations?.length || 0)
              : (reservations?.filter((r) => r.statut === f.value).length || 0);
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition ${
                  filter === f.value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
                }`}
              >
                {f.label}
                {count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    filter === f.value ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Contenu */}
        <QueryState
          isLoading={isLoading}
          error={error}
          onRetry={() => refetch()}
          minHeight="py-16"
          isEmpty={filtered.length === 0}
          empty={
            <div className="text-center py-20">
              <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Aucune réservation</h2>
              <p className="text-gray-500 mb-6">Commencez par réserver un livre dans le catalogue.</p>
              <a href="/catalog"
                className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition font-medium">
                Parcourir le catalogue
              </a>
            </div>
          }
        >
          <div className="space-y-4">
            {filtered.map((res) => {
              const overdue = isOverdue(res.date_fin_prevue, res.statut);
              const days = daysLeft(res.date_fin_prevue);

              return (
                <div
                  key={res.id}
                  className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
                    overdue ? 'border-red-200' : 'border-gray-100'
                  }`}
                >
                  {/* Barre de statut couleur */}
                  <div className={`h-1 w-full ${
                    res.statut === 'Réservé'  ? 'bg-yellow-400' :
                    res.statut === 'Actif'    ? (overdue ? 'bg-red-500' : 'bg-blue-500') :
                    res.statut === 'Retourné' ? 'bg-green-500' : 'bg-gray-300'
                  }`} />

                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Couverture */}
                      <div className="w-14 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg shrink-0 overflow-hidden flex items-center justify-center">
                        {res.book?.image_url
                          ? <img src={res.book.image_url} alt={res.book?.titre} className="w-full h-full object-cover" />
                          : <BookOpen className="h-6 w-6 text-gray-400" />
                        }
                      </div>

                      {/* Infos livre */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-gray-900 truncate">{res.book?.titre}</h3>
                            <p className="text-sm text-gray-500">{res.book?.auteur}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Propriétaire : {res.book?.proprietaire?.nom_complet}
                            </p>
                          </div>
                          <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold ${
                            res.statut === 'Réservé'  ? 'bg-yellow-100 text-yellow-800' :
                            res.statut === 'Actif'    ? (overdue ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800') :
                            res.statut === 'Retourné' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {overdue ? '⚠ En retard' : res.statut}
                          </span>
                        </div>

                        {/* Détails */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            <span>Début: {new Date(res.date_debut).toLocaleDateString('fr-FR')}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <RotateCcw className="h-3.5 w-3.5 text-gray-400" />
                            <span className={overdue ? 'text-red-600 font-semibold' : ''}>
                              Retour: {new Date(res.date_fin_prevue).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                            <span>{res.montant_location || res.book?.prix_location} FCFA</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                            <span className={res.caution_payee ? 'text-green-600' : 'text-orange-500'}>
                              {res.caution_payee ? '✓ Caution versée' : '⏳ Caution en attente'}
                            </span>
                          </div>
                        </div>

                        {/* Jours restants pour emprunt actif */}
                        {res.statut === 'Actif' && (
                          <div className={`mt-3 flex items-center gap-2 text-sm font-medium ${
                            overdue ? 'text-red-600' : days <= 3 ? 'text-orange-500' : 'text-blue-600'
                          }`}>
                            <Clock className="h-4 w-4" />
                            {overdue
                              ? `${Math.abs(days)} jour(s) de retard — contactez le propriétaire`
                              : `${days} jour(s) restant(s)`
                            }
                          </div>
                        )}

                        {/* Retour réel */}
                        {res.statut === 'Retourné' && res.date_retour_reel && (
                          <div className="mt-3 flex items-center gap-2 text-sm text-green-600 font-medium">
                            <CheckCircle className="h-4 w-4" />
                            Retourné le {new Date(res.date_retour_reel).toLocaleDateString('fr-FR')}
                          </div>
                        )}

                        {/* Confirmation de l'état déclaré au retour */}
                        {res.statut === 'Retourné' && <ConfirmReturnCard reservation={res} />}

                        {/* Notes */}
                        {res.notes && (
                          <p className="mt-2 text-xs text-gray-400 italic">📝 {res.notes}</p>
                        )}

                        {/* Contact propriétaire si actif */}
                        {res.statut === 'Actif' && (
                          <ContactOwnerLink reservationId={res.id} ownerName={res.book?.proprietaire?.nom_complet} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </QueryState>
      </div>
    </div>
  );
}
