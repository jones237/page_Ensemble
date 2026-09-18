// src/pages/groups/components/PendingRequestsPanel.tsx
import { useState } from 'react';
import { UseMutationResult } from '@tanstack/react-query';
import { useApproveJoinRequest, usePendingJoinRequests, useRejectJoinRequest } from '../../../hooks/useGroups';
import { useToast, errorMessage } from '../../../hooks/useToast';

interface PendingRequestsPanelProps {
  groupId: string;
  groupNom: string;
}

export function PendingRequestsPanel({ groupId, groupNom }: PendingRequestsPanelProps) {
  const { data: requests, isLoading } = usePendingJoinRequests(groupId);
  const approve = useApproveJoinRequest();
  const reject = useRejectJoinRequest();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (isLoading || !requests || requests.length === 0) return null;

  const handle = async (mutation: UseMutationResult<void, Error, string>, id: string) => {
    setBusyId(id);
    try {
      await mutation.mutateAsync(id);
    } catch (err) {
      toast({ title: 'Erreur', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white border border-amber-200 rounded-lg p-4 mt-3">
      <p className="text-sm font-semibold text-gray-900 mb-3">
        {requests.length} demande{requests.length > 1 ? 's' : ''} en attente — {groupNom}
      </p>
      <div className="space-y-2">
        {requests.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 bg-amber-50 rounded-lg px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{r.user?.nom_complet}</p>
              {r.message && <p className="text-xs text-gray-500 truncate">{r.message}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handle(approve, r.id)}
                disabled={busyId === r.id}
                className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                Accepter
              </button>
              <button
                onClick={() => handle(reject, r.id)}
                disabled={busyId === r.id}
                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                Refuser
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
