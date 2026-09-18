// src/pages/groups/components/EditGroupCard.tsx
import { useState } from 'react';
import { Group } from '../../../types';
import { useUpdateGroup } from '../../../hooks/useGroups';
import { useToast, errorMessage } from '../../../hooks/useToast';
import { Edit2 } from 'lucide-react';

interface EditGroupCardProps {
  group: Group;
}

export function EditGroupCard({ group }: EditGroupCardProps) {
  const [editing, setEditing] = useState(false);
  const [nom, setNom] = useState(group.nom);
  const [description, setDescription] = useState(group.description ?? '');
  const [saving, setSaving] = useState(false);
  const updateGroup = useUpdateGroup(group.id);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateGroup.mutateAsync({ nom, description });
      setEditing(false);
    } catch (err) {
      toast({ title: 'Erreur', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 mt-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{group.nom}</p>
          <p className="text-xs text-gray-500 line-clamp-1">{group.description || 'Aucune description'}</p>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition shrink-0"
        >
          <Edit2 className="h-3.5 w-3.5" /> Modifier
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-blue-200 rounded-lg p-4 mt-3 space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Nom du groupe</label>
        <input
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          disabled={saving}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          disabled={saving}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setEditing(false)}
          disabled={saving}
          className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
        >
          Annuler
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !nom.trim()}
          className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}
