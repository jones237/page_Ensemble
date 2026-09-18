// src/pages/groups/components/MembersPanel.tsx
import { useState } from 'react';
import { useGroupMembers, useRemoveMember, useTransferGroupAdmin } from '../../../hooks/useGroups';
import { useToast, errorMessage } from '../../../hooks/useToast';
import { Crown, UserMinus } from 'lucide-react';

interface MembersPanelProps {
  groupId: string;
  adminId: string;
  currentUserId?: string;
}

export function MembersPanel({ groupId, adminId, currentUserId }: MembersPanelProps) {
  const { data: members, isLoading } = useGroupMembers(groupId);
  const removeMember = useRemoveMember();
  const transferAdmin = useTransferGroupAdmin();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState<{ id: string; nom: string } | null>(null);
  const [transferConfirmText, setTransferConfirmText] = useState('');
  const [transferring, setTransferring] = useState(false);

  const handleRemove = async (id: string, nom: string) => {
    if (!window.confirm(`Retirer ${nom} du groupe ?`)) return;
    setBusyId(id);
    try {
      await removeMember.mutateAsync(id);
    } catch (err) {
      toast({ title: 'Erreur', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const handleTransfer = async () => {
    if (!transferTarget) return;
    setTransferring(true);
    try {
      await transferAdmin.mutateAsync({ groupId, newAdminId: transferTarget.id });
      setTransferTarget(null);
      setTransferConfirmText('');
    } catch (err) {
      toast({ title: 'Erreur', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setTransferring(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mt-3">
      <p className="text-sm font-semibold text-gray-900 mb-3">
        Membres ({members?.length ?? 0})
      </p>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {members?.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              {m.avatar_url ? (
                <img src={m.avatar_url} alt={m.nom_complet} className="w-8 h-8 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {m.nom_complet?.charAt(0)}
                </div>
              )}
              <p className="text-sm text-gray-900 truncate">
                {m.nom_complet}
                {m.id === adminId && <span className="ml-1.5 text-xs text-purple-700">👑 Admin</span>}
                {m.id === currentUserId && <span className="ml-1.5 text-xs text-gray-400">(vous)</span>}
              </p>
            </div>
            {m.id !== adminId && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setTransferTarget({ id: m.id, nom: m.nom_complet })}
                  className="p-2.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                  title="Transférer l'administration"
                >
                  <Crown className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleRemove(m.id, m.nom_complet)}
                  disabled={busyId === m.id}
                  className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Retirer du groupe"
                >
                  <UserMinus className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {transferTarget && (
        <div className="mt-3 bg-purple-50 border border-purple-200 rounded-lg p-3">
          <p className="text-sm text-purple-900 font-medium mb-1">
            Transférer l'administration à {transferTarget.nom} ?
          </p>
          <p className="text-xs text-purple-800 mb-2">
            Vous perdrez immédiatement vos droits d'administrateur sur ce groupe. Tapez{' '}
            <strong>TRANSFERER</strong> pour confirmer.
          </p>
          <input
            value={transferConfirmText}
            onChange={(e) => setTransferConfirmText(e.target.value)}
            placeholder="TRANSFERER"
            className="w-full px-3 py-1.5 border border-purple-300 rounded-lg text-sm mb-2"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setTransferTarget(null); setTransferConfirmText(''); }}
              disabled={transferring}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800"
            >
              Annuler
            </button>
            <button
              onClick={handleTransfer}
              disabled={transferring || transferConfirmText !== 'TRANSFERER'}
              className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition disabled:opacity-40"
            >
              {transferring ? 'Transfert...' : 'Confirmer le transfert'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
