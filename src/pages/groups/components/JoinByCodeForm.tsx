// src/pages/groups/components/JoinByCodeForm.tsx
import { FormEvent } from 'react';
import { KeyRound } from 'lucide-react';

interface JoinByCodeFormProps {
  code: string;
  submitting: boolean;
  onCodeChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
}

export function JoinByCodeForm({ code, submitting, onCodeChange, onSubmit }: JoinByCodeFormProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-5 mb-8 border border-gray-200">
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
        <div className="flex-1">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <KeyRound className="h-4 w-4" />
            J'ai un code d'accès
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
            placeholder="ex: A1B2C3"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
          />
        </div>
        <button
          type="submit"
          disabled={submitting || !code.trim()}
          className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition font-medium disabled:bg-gray-400"
        >
          {submitting ? 'Vérification...' : 'Rejoindre'}
        </button>
      </form>
    </div>
  );
}
