// src/pages/groups/components/DeleteGroupZone.tsx
import { useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useDeleteGroup } from '../../../hooks/useGroups';
import { Trash2, AlertTriangle } from 'lucide-react';

interface DeleteGroupZoneProps {
  groupId: string;
  groupNom: string;
}

type DeleteStep = 'closed' | 'confirm' | 'password';

export function DeleteGroupZone({ groupId, groupNom }: DeleteGroupZoneProps) {
  const [step, setStep] = useState<DeleteStep>('closed');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const deleteGroup = useDeleteGroup();

  const handleDelete = async () => {
    setError(null);
    if (!password) {
      setError('Mot de passe requis');
      return;
    }
    setDeleting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (!email) throw new Error("Impossible de vérifier l'identité du compte");

      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError('Mot de passe incorrect');
        setDeleting(false);
        return;
      }

      await deleteGroup.mutateAsync(groupId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setDeleting(false);
    }
  };

  return (
    <div className="mt-3">
      {step === 'closed' && (
        <button
          onClick={() => setStep('confirm')}
          className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-800 font-medium"
        >
          <Trash2 className="h-3.5 w-3.5" /> Supprimer le groupe "{groupNom}"
        </button>
      )}

      {step === 'confirm' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800 mb-1 font-medium flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" /> Supprimer définitivement "{groupNom}" ?
          </p>
          <p className="text-xs text-red-700 mb-3">
            Tous les livres du groupe et leur historique (avis compris) seront supprimés. Impossible si des emprunts sont en cours.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setStep('closed')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              onClick={() => setStep('password')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
            >
              Continuer
            </button>
          </div>
        </div>
      )}

      {step === 'password' && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4">
          <p className="text-sm text-red-900 mb-2 font-medium">
            Confirmez votre mot de passe pour valider la suppression
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe du compte administrateur"
            className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm mb-2"
            disabled={deleting}
            autoFocus
          />
          {error && <p className="text-xs text-red-700 mb-2">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => { setStep('closed'); setPassword(''); setError(null); }}
              disabled={deleting}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting || !password}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
            >
              {deleting ? 'Suppression...' : 'Supprimer définitivement'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
