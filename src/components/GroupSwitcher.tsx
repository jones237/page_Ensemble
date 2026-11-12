// src/components/GroupSwitcher.tsx
// Sélecteur du groupe actif : visible seulement si l'utilisateur appartient à 2 groupes ou plus.
import { useAuth } from '../hooks/useAuth';
import { useMyGroups, useSwitchGroup } from '../hooks/useGroups';
import { useToast, errorMessage } from '../hooks/useToast';

export function GroupSwitcher({ className = '' }: { className?: string }) {
  const { profile, refreshProfile } = useAuth();
  const { data: groups } = useMyGroups(profile?.id);
  const switchGroup = useSwitchGroup();
  const { toast } = useToast();

  if (!profile || !groups || groups.length < 2) return null;

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const groupId = e.target.value;
    if (!groupId || groupId === profile.groupe_id) return;
    try {
      await switchGroup.mutateAsync(groupId);
      await refreshProfile();
    } catch (err) {
      toast({ title: 'Erreur', description: errorMessage(err), variant: 'destructive' });
    }
  };

  return (
    <select
      value={profile.groupe_id ?? ''}
      onChange={handleChange}
      disabled={switchGroup.isPending}
      aria-label="Groupe actif"
      title="Groupe actif"
      className={`max-w-[11rem] truncate text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 ${className}`}
    >
      {groups.map((g) => (
        <option key={g.id} value={g.id}>{g.nom}</option>
      ))}
    </select>
  );
}
