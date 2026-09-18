// src/pages/groups/components/AccessCodeCard.tsx
import { useState } from 'react';
import { useAdminGroupCode, useGenerateAccessCode } from '../../../hooks/useGroups';
import { useToast, errorMessage } from '../../../hooks/useToast';
import { KeyRound, Copy, RefreshCw } from 'lucide-react';

interface AccessCodeCardProps {
  groupId: string;
  groupNom: string;
}

export function AccessCodeCard({ groupId, groupNom }: AccessCodeCardProps) {
  const { data, isLoading } = useAdminGroupCode(groupId);
  const generate = useGenerateAccessCode(groupId);
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleCopy = async () => {
    if (!data?.code_acces) return;
    await navigator.clipboard.writeText(data.code_acces);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generate.mutateAsync();
    } catch (err) {
      toast({ title: 'Erreur', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="bg-white border border-blue-200 rounded-lg p-4 mt-3">
      <p className="text-sm font-semibold text-gray-900 mb-2">
        <KeyRound className="inline h-4 w-4 mr-1.5 -mt-0.5" />
        Code d'accès — {groupNom}
      </p>
      <p className="text-xs text-gray-500 mb-3">
        Partagez ce code pour laisser des personnes rejoindre directement, sans passer par une demande.
      </p>
      {data?.code_acces ? (
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-lg font-mono font-bold tracking-widest text-gray-900">
            {data.code_acces}
          </code>
          <button
            onClick={handleCopy}
            className="px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm flex items-center gap-1.5"
          >
            <Copy className="h-4 w-4" />
            {copied ? 'Copié !' : 'Copier'}
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            title="Générer un nouveau code (l'ancien ne fonctionnera plus)"
            className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50"
        >
          {generating ? 'Génération...' : "Générer un code d'accès"}
        </button>
      )}
    </div>
  );
}
