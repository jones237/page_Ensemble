// src/pages/groups/components/CreateGroupModal.tsx
import { FormEvent } from 'react';

interface CreateGroupModalProps {
  nom: string;
  description: string;
  submitting: boolean;
  onNomChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: (e: FormEvent) => void;
}

export function CreateGroupModal({
  nom,
  description,
  submitting,
  onNomChange,
  onDescriptionChange,
  onCancel,
  onSubmit,
}: CreateGroupModalProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8 border-l-4 border-blue-600">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        ✨ Créer un Nouveau Groupe
      </h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nom du groupe *
          </label>
          <input
            type="text"
            value={nom}
            onChange={(e) => onNomChange(e.target.value)}
            placeholder="ex: Club de Lecture Église"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={submitting}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Décrivez votre groupe..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={submitting}
          />
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 px-6 py-2 border border-gray-300 text-gray-900 font-medium rounded-lg hover:bg-gray-50 transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
          >
            {submitting ? 'Création...' : '✓ Créer'}
          </button>
        </div>
      </form>
    </div>
  );
}
