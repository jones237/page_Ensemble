import { QueryState } from '../../../components/QueryState';
import { Reservation } from '../../../types';
import { CheckCircle, Clock, Calendar, DollarSign, Loader2, RotateCcw, TrendingUp, X } from 'lucide-react';

type OwnerReservation = Reservation & {
  book?: { titre?: string; prix_location?: number };
  emprunteur?: { nom_complet?: string };
};

export type ReservationTab = 'pending' | 'active' | 'returned';

interface ReservationsPanelProps {
  tab: ReservationTab;
  onTabChange: (tab: ReservationTab) => void;
  pendingCount: number;
  activeCount: number;
  returnedCount: number;
  items: OwnerReservation[];
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  actionLoading: string | null;
  onAccept: (id: string) => void;
  onRefuse: (id: string) => void;
  onMarkReturned: (res: OwnerReservation) => void;
  onCautionPaid: (id: string) => void;
}

export function ReservationsPanel({
  tab, onTabChange, pendingCount, activeCount, returnedCount,
  items, isLoading, error, onRetry, actionLoading,
  onAccept, onRefuse, onMarkReturned, onCautionPaid,
}: ReservationsPanelProps) {
  const tabs: { key: ReservationTab; label: string; count: number }[] = [
    { key: 'pending', label: 'En attente', count: pendingCount },
    { key: 'active', label: 'En cours', count: activeCount },
    { key: 'returned', label: 'Historique', count: returnedCount },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-4 border-b border-gray-100">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition ${
                tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  tab === key ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <QueryState
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        minHeight="py-12"
        isEmpty={items.length === 0}
        empty={
          <div className="text-center py-16 px-6">
            <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucune réservation ici</p>
          </div>
        }
      >
        <div className="divide-y divide-gray-50 max-h-[520px] overflow-y-auto">
          {items.map((res) => {
            const isOverdue = new Date(res.date_fin_prevue) < new Date() && res.statut === 'Actif';
            const isLoadingAccept = actionLoading === res.id + '_accept';
            const isLoadingRefuse = actionLoading === res.id + '_refuse';
            const isLoadingReturn = actionLoading === res.id + '_return';
            const isLoadingCaution = actionLoading === res.id + '_caution';

            return (
              <div key={res.id} className={`p-4 ${isOverdue ? 'bg-red-50' : ''}`}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{res.book?.titre}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {res.emprunteur?.nom_complet?.charAt(0)}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{res.emprunteur?.nom_complet}</p>
                    </div>
                  </div>
                  {isOverdue && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold shrink-0">
                      EN RETARD
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Début: {new Date(res.date_debut).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                      Retour: {new Date(res.date_fin_prevue).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span className={res.caution_payee ? 'text-green-600' : 'text-orange-500'}>
                      Caution: {res.caution_payee ? '✓ Versée' : '⏳ À verser'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span>{res.montant_location || res.book?.prix_location || 500} FCFA</span>
                  </div>
                </div>

                {res.statut === 'Réservé' && (
                  <div className="space-y-2">
                    {!res.caution_payee && (
                      <button
                        onClick={() => onCautionPaid(res.id)}
                        disabled={!!actionLoading}
                        className="w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition text-sm font-medium disabled:opacity-50"
                      >
                        {isLoadingCaution ? <Loader2 className="h-4 w-4 animate-spin" /> : <><DollarSign className="h-4 w-4" /> Marquer caution versée</>}
                      </button>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => onAccept(res.id)}
                        disabled={!!actionLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold disabled:opacity-50"
                      >
                        {isLoadingAccept ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4" /> Accepter</>}
                      </button>
                      <button
                        onClick={() => onRefuse(res.id)}
                        disabled={!!actionLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-semibold disabled:opacity-50"
                      >
                        {isLoadingRefuse ? <Loader2 className="h-4 w-4 animate-spin" /> : <><X className="h-4 w-4" /> Refuser</>}
                      </button>
                    </div>
                  </div>
                )}

                {res.statut === 'Actif' && (
                  <div className="space-y-2">
                    {!res.caution_payee && (
                      <button
                        onClick={() => onCautionPaid(res.id)}
                        disabled={!!actionLoading}
                        className="w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition text-sm font-medium disabled:opacity-50"
                      >
                        {isLoadingCaution ? <Loader2 className="h-4 w-4 animate-spin" /> : <><DollarSign className="h-4 w-4" /> Marquer caution versée</>}
                      </button>
                    )}
                    <button
                      onClick={() => onMarkReturned(res)}
                      disabled={!!actionLoading}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold disabled:opacity-50"
                    >
                      {isLoadingReturn ? <Loader2 className="h-4 w-4 animate-spin" /> : <><RotateCcw className="h-4 w-4" /> Valider le retour</>}
                    </button>
                  </div>
                )}

                {res.statut === 'Retourné' && (
                  <div className="flex items-center gap-2 py-1.5 px-3 bg-green-50 text-green-700 rounded-lg text-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span>
                      Retourné le {res.date_retour_reel ? new Date(res.date_retour_reel).toLocaleDateString('fr-FR') : '—'}
                    </span>
                  </div>
                )}

                {res.notes && (
                  <p className="mt-2 text-xs text-gray-500 italic">📝 {res.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      </QueryState>
    </div>
  );
}
