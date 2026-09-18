// src/pages/groups/components/DisputesPanel.tsx
import { useState } from 'react';
import { useDisputedReturns, useResolveDispute } from '../../../hooks/useGroups';
import { useToast, errorMessage } from '../../../hooks/useToast';
import { Scale } from 'lucide-react';

interface DisputesPanelProps {
  groupId: string;
  groupNom: string;
}

export function DisputesPanel({ groupId, groupNom }: DisputesPanelProps) {
  const { data: disputes, isLoading } = useDisputedReturns(groupId);
  const resolveDispute = useResolveDispute();
  const { toast } = useToast();
  const [openId, setOpenId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  if (isLoading || !disputes || disputes.length === 0) return null;

  const handleResolve = async (reservationId: string, rembourser: boolean) => {
    setBusy(true);
    try {
      await resolveDispute.mutateAsync({ reservationId, rembourserCaution: rembourser, notes });
      setOpenId(null);
      setNotes('');
    } catch (err) {
      toast({ title: 'Erreur', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border border-red-200 rounded-lg p-4 mt-3">
      <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
        <Scale className="h-4 w-4 text-red-600" />
        {disputes.length} litige{disputes.length > 1 ? 's' : ''} en attente — {groupNom}
      </p>
      <div className="space-y-3">
        {disputes.map((d) => (
          <div key={d.id} className="bg-red-50 border border-red-100 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-900">{d.book?.titre}</p>
            <p className="text-xs text-gray-600 mb-1">
              Emprunteur : {d.emprunteur?.nom_complet} · État déclaré : {d.etat_retour ?? '—'}
            </p>
            {d.notes && <p className="text-xs text-gray-500 italic mb-2 whitespace-pre-line">{d.notes}</p>}

            {openId !== d.id ? (
              <button
                onClick={() => setOpenId(d.id)}
                className="text-xs font-medium text-red-700 hover:text-red-900"
              >
                Trancher ce litige →
              </button>
            ) : (
              <div className="space-y-2 mt-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Décision et justification..."
                  rows={2}
                  className="w-full px-2 py-1.5 border border-red-200 rounded-lg text-xs"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleResolve(d.id, true)}
                    disabled={busy}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                  >
                    Rembourser la caution
                  </button>
                  <button
                    onClick={() => handleResolve(d.id, false)}
                    disabled={busy}
                    className="px-3 py-1.5 bg-gray-700 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
                  >
                    Ne pas rembourser
                  </button>
                  <button
                    onClick={() => setOpenId(null)}
                    disabled={busy}
                    className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
