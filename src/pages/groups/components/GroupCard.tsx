// src/pages/groups/components/GroupCard.tsx
import { Group } from '../../../types';
import { Check, Clock, DoorOpen, X } from 'lucide-react';

interface GroupCardProps {
  group: Group;
  isMember: boolean;
  isAdmin: boolean;
  hasPendingRequest: boolean;
  isJoining: boolean;
  isLeaving: boolean;
  onJoin: () => void;
  onCancelRequest: () => void;
  onLeave: () => void;
}

export function GroupCard({
  group,
  isMember,
  isAdmin,
  hasPendingRequest,
  isJoining,
  isLeaving,
  onJoin,
  onCancelRequest,
  onLeave,
}: GroupCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition overflow-hidden">
      <div className="h-32 bg-gradient-to-br from-blue-500 to-indigo-600 p-4 text-white">
        <h3 className="text-2xl font-bold mb-1">{group.nom}</h3>
        <p className="text-sm opacity-90 line-clamp-2">
          {group.description || 'Aucune description'}
        </p>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200">
          {group.admin?.avatar_url ? (
            <img
              src={group.admin.avatar_url}
              alt={group.admin.nom_complet}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              {group.admin?.nom_complet?.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-900">
              {group.admin?.nom_complet}
            </p>
            <p className="text-xs text-gray-500">Administrateur</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {isMember && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
              <Check className="h-3 w-3" />
              Membre
            </span>
          )}
          {isAdmin && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
              👑 Admin
            </span>
          )}
          {hasPendingRequest && !isMember && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
              <Clock className="h-3 w-3" />
              En attente
            </span>
          )}
        </div>

        {isMember ? (
          <div className="space-y-2">
            <a
              href="/catalog"
              className="block w-full text-center bg-gray-100 text-gray-900 py-2 px-4 rounded-lg hover:bg-gray-200 transition font-medium"
            >
              📚 Voir le Catalogue
            </a>
            {!isAdmin && (
              <button
                onClick={onLeave}
                disabled={isLeaving}
                className="w-full flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-red-600 py-1.5 transition"
              >
                <DoorOpen className="h-3.5 w-3.5" />
                {isLeaving ? 'Traitement...' : 'Quitter ce groupe'}
              </button>
            )}
          </div>
        ) : hasPendingRequest ? (
          <button
            onClick={onCancelRequest}
            className="w-full flex items-center justify-center gap-2 bg-white border border-amber-300 text-amber-700 py-2 px-4 rounded-lg hover:bg-amber-50 transition font-medium"
          >
            <X className="h-4 w-4" />
            Annuler la demande
          </button>
        ) : (
          <button
            onClick={onJoin}
            disabled={isJoining}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium disabled:bg-gray-400"
          >
            {isJoining ? 'Envoi...' : '➕ Demander à rejoindre'}
          </button>
        )}
      </div>
    </div>
  );
}
